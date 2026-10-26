import { NextResponse } from "next/server";
import { z } from "zod";
import { generateGroundedQuestions, diagnosticQuestionInputSchema } from "@/lib/assessment/question-generation";
import { retrieveStudyEvidence } from "@/lib/documents/retrieval";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const referenceSchema = z.object({ id: z.string(), name: z.string() });
const topicSchema = z.object({ id: z.string(), name: z.string(), subject_id: z.string() });
const historySchema = z.array(z.object({ prompt: z.string() }));

function citationReference(evidence: {
  pageNumber: number | null;
  sectionHeading: string | null;
  sourceReference: string | null;
}) {
  return (
    evidence.sectionHeading ??
    evidence.sourceReference ??
    (evidence.pageNumber ? `Page ${evidence.pageNumber}` : null)
  );
}

export async function POST(request: Request) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsedInput = diagnosticQuestionInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json(
      { error: parsedInput.error.issues[0]?.message ?? "Choose a valid question setup." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: "Could not verify your account session." }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "Sign in to generate questions from your materials." }, { status: 401 });
  }

  try {
    const [{ data: subjectData, error: subjectError }, { data: topicData, error: topicError }] =
      await Promise.all([
        supabase
          .from("subjects")
          .select("id,name")
          .eq("id", parsedInput.data.subjectId)
          .maybeSingle(),
        supabase
          .from("topics")
          .select("id,name,subject_id")
          .eq("id", parsedInput.data.topicId)
          .eq("subject_id", parsedInput.data.subjectId)
          .maybeSingle(),
      ]);
    if (subjectError || topicError) {
      return NextResponse.json({ error: "Subject and topic options could not be loaded." }, { status: 503 });
    }
    const subject = referenceSchema.safeParse(subjectData);
    const topic = topicSchema.safeParse(topicData);
    if (!subject.success || !topic.success) {
      return NextResponse.json(
        { error: "Choose a topic that belongs to the selected subject." },
        { status: 400 },
      );
    }

    const { data: historyData, error: historyError } = await supabase
      .from("quiz_questions")
      .select("prompt")
      .eq("user_id", user.id)
      .eq("topic_id", topic.data.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (historyError) {
      return NextResponse.json({ error: "Recent question history could not be loaded." }, { status: 503 });
    }
    const history = historySchema.safeParse(historyData);
    if (!history.success) {
      return NextResponse.json({ error: "Recent question history returned an invalid format." }, { status: 503 });
    }

    const evidenceResult = await retrieveStudyEvidence({
      query: `Find source passages that teach ${topic.data.name} in ${subject.data.name}. Focus on facts and concepts suitable for a ${parsedInput.data.difficulty} diagnostic question.`,
      subjectId: subject.data.id,
      topK: 12,
      threshold: 0.35,
    });
    if (evidenceResult.status === "insufficient_evidence") {
      return NextResponse.json({
        status: "insufficient_evidence",
        message: "More processed study material for this subject and topic is needed before questions can be generated.",
      });
    }

    const questions = await generateGroundedQuestions({
      subjectName: subject.data.name,
      topicName: topic.data.name,
      difficulty: parsedInput.data.difficulty,
      count: parsedInput.data.count,
      evidence: evidenceResult.evidence,
      recentPrompts: history.data.map(({ prompt }) => prompt),
    });

    const admin = createSupabaseAdminClient();
    const quizId = crypto.randomUUID();
    const { error: quizError } = await admin.from("quizzes").insert({
      id: quizId,
      user_id: user.id,
      subject_id: subject.data.id,
      title: `${topic.data.name} diagnostic`,
      status: "ready",
    });
    if (quizError) {
      return NextResponse.json({ error: "The generated quiz could not be saved." }, { status: 503 });
    }

    const questionIds = questions.map(() => crypto.randomUUID());
    const questionRows = questions.map((question, index) => ({
      id: questionIds[index],
      user_id: user.id,
      quiz_id: quizId,
      subject_id: subject.data.id,
      topic_id: topic.data.id,
      question_type: "multiple_choice",
      difficulty: parsedInput.data.difficulty,
      prompt: question.prompt,
      choices: question.options,
      source_chunk_id: question.evidence.chunkId,
      source_reference: citationReference(question.evidence),
      question_order: index,
    }));
    const { error: questionsError } = await admin
      .from("quiz_questions")
      .insert(questionRows);
    const { error: keysError } = questionsError
      ? { error: null }
      : await admin.from("quiz_question_keys").insert(
          questions.map((question, index) => ({
            question_id: questionIds[index],
            quiz_id: quizId,
            user_id: user.id,
            answer_key: question.correctAnswer,
            grading_rubric: question.explanation,
          })),
        );
    if (questionsError || keysError) {
      const { error: cleanupError } = await admin
        .from("quizzes")
        .delete()
        .eq("id", quizId)
        .eq("user_id", user.id);
      if (cleanupError) {
        console.error("Could not clean up a partially saved generated quiz.", cleanupError);
        return NextResponse.json(
          { error: "The quiz was only partially saved. Contact support before retrying." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Generated questions could not be saved." }, { status: 503 });
    }

    return NextResponse.json(
      {
        status: "generated",
        quizId,
        subject: subject.data.name,
        topic: topic.data.name,
        difficulty: parsedInput.data.difficulty,
        questions: questions.map((question, index) => ({
          id: questionIds[index],
          prompt: question.prompt,
          options: question.options,
          source: {
            documentName: question.evidence.documentName,
            pageNumber: question.evidence.pageNumber,
            sectionHeading: question.evidence.sectionHeading,
            sourceReference: question.evidence.sourceReference,
          },
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Question generation could not be completed. Retry shortly.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
