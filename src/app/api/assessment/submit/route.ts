import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  gradedAttemptSchema,
  quizSubmissionSchema,
} from "@/lib/assessment/submission-validation";

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
  const submission = quizSubmissionSchema.safeParse(body);
  if (!submission.success) {
    return NextResponse.json(
      { error: submission.error.issues[0]?.message ?? "Quiz submission is invalid." },
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
    return NextResponse.json({ error: "Sign in before submitting this quiz." }, { status: 401 });
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Quiz grading requires the server-only SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const { data, error } = await admin.rpc("submit_quiz_attempt", {
    p_user_id: user.id,
    p_quiz_id: submission.data.quizId,
    p_responses: submission.data.responses.map(({ questionId, answer }) => ({
      question_id: questionId,
      response_text: answer,
    })),
  });
  if (error) {
    if (error.code === "42501" || /quiz not found/i.test(error.message)) {
      return NextResponse.json({ error: "This quiz was not found in your account." }, { status: 404 });
    }
    if (error.code === "23505" || /already been submitted/i.test(error.message)) {
      return NextResponse.json(
        { error: "This quiz has already been submitted with different answers." },
        { status: 409 },
      );
    }
    if (error.code === "22023") {
      return NextResponse.json({ error: "One or more submitted answers are invalid." }, { status: 400 });
    }
    return NextResponse.json({ error: "Quiz grading could not be completed. Retry shortly." }, { status: 503 });
  }

  const attempt = gradedAttemptSchema.safeParse(data);
  if (!attempt.success) {
    return NextResponse.json(
      { error: "The graded result returned an unexpected format. Contact support." },
      { status: 503 },
    );
  }
  return NextResponse.json(attempt.data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
