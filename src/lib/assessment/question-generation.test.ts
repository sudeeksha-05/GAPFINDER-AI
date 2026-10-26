import { afterEach, describe, expect, it, vi } from "vitest";
import {
  diagnosticQuestionInputSchema,
  generateGroundedQuestions,
  QuestionGenerationError,
} from "@/lib/assessment/question-generation";
import type { RetrievedEvidence } from "@/lib/documents/retrieval";

const evidence: RetrievedEvidence = {
  chunkId: "11111111-1111-4111-8111-111111111111",
  documentId: "22222222-2222-4222-8222-222222222222",
  documentName: "Course notes.pdf",
  subjectId: "machine-learning",
  subjectName: "Machine Learning",
  chunkIndex: 0,
  pageNumber: 4,
  sectionHeading: "Linear regression",
  sourceReference: "Page 4",
  text: "Linear regression models a continuous outcome using a weighted sum of input features.",
  similarity: 0.82,
};

function mockCompletion(question: Record<string, unknown>) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ questions: [question] }) } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("OPENAI_API_KEY", "test-only-key");
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("diagnostic question generation", () => {
  it("validates subject, topic, difficulty, and bounded question count", () => {
    expect(
      diagnosticQuestionInputSchema.safeParse({
        subjectId: "machine-learning",
        topicId: "machine-learning-topic-1",
        difficulty: "intermediate",
        count: 5,
      }).success,
    ).toBe(true);
    expect(
      diagnosticQuestionInputSchema.safeParse({
        subjectId: "machine-learning",
        topicId: "biology-topic-1",
        difficulty: "impossible",
        count: 50,
      }).success,
    ).toBe(false);
    expect(
      diagnosticQuestionInputSchema.safeParse({
        subjectId: "machine-learning",
        topicId: "machine-learning-topic-1",
        difficulty: "beginner",
        count: 3,
        userId: "another-user",
      }).success,
    ).toBe(false);
  });

  it("does not call the model or fabricate questions when evidence is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      generateGroundedQuestions({
        subjectName: "Machine Learning",
        topicName: "Linear regression",
        difficulty: "beginner",
        count: 1,
        evidence: [],
        recentPrompts: [],
      }),
    ).rejects.toThrow(QuestionGenerationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the cited evidence and maps its source metadata to the question", async () => {
    const fetchMock = mockCompletion({
      prompt: "Which outcome type is modeled by basic linear regression?",
      options: [
        "A continuous outcome",
        "Only unordered categories",
        "A graph structure",
        "A sequence of images",
      ],
      correctOptionIndex: 0,
      explanation: "The source states that linear regression models a continuous outcome.",
      evidenceChunkId: evidence.chunkId,
    });

    const [question] = await generateGroundedQuestions({
      subjectName: "Machine Learning",
      topicName: "Linear regression",
      difficulty: "beginner",
      count: 1,
      evidence: [evidence],
      recentPrompts: [],
    });

    expect(question).toMatchObject({
      correctAnswer: "A continuous outcome",
      explanation: "The source states that linear regression models a continuous outcome.",
      evidence: {
        documentName: "Course notes.pdf",
        pageNumber: 4,
        sectionHeading: "Linear regression",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-only-key",
        }),
      }),
    );
  });

  it("rejects invented citations, malformed choices, and exact recent repeats", async () => {
    const base = {
      prompt: "Which outcome type is modeled by basic linear regression?",
      options: ["Continuous", "Categories", "Graphs", "Images"],
      correctOptionIndex: 0,
      explanation: "The source describes a continuous outcome.",
    };
    mockCompletion({ ...base, evidenceChunkId: "33333333-3333-4333-8333-333333333333" });
    await expect(
      generateGroundedQuestions({
        subjectName: "Machine Learning",
        topicName: "Linear regression",
        difficulty: "beginner",
        count: 1,
        evidence: [evidence],
        recentPrompts: [],
      }),
    ).rejects.toThrow("source or repetition");

    mockCompletion({ ...base, options: ["Same", "same", "Third", "Fourth"], evidenceChunkId: evidence.chunkId });
    await expect(
      generateGroundedQuestions({
        subjectName: "Machine Learning",
        topicName: "Linear regression",
        difficulty: "beginner",
        count: 1,
        evidence: [evidence],
        recentPrompts: [],
      }),
    ).rejects.toThrow();

    mockCompletion({ ...base, evidenceChunkId: evidence.chunkId });
    await expect(
      generateGroundedQuestions({
        subjectName: "Machine Learning",
        topicName: "Linear regression",
        difficulty: "beginner",
        count: 1,
        evidence: [evidence],
        recentPrompts: [base.prompt],
      }),
    ).rejects.toThrow("source or repetition");
  });
});
