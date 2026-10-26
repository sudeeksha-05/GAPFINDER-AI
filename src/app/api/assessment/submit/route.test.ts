import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: () => ({ url: "https://example.test", publishableKey: "public" }),
}));

import { POST } from "@/app/api/assessment/submit/route";

const authenticatedUserId = "33333333-3333-4333-8333-333333333333";
const quizId = "11111111-1111-4111-8111-111111111111";
const questionId = "22222222-2222-4222-8222-222222222222";
const attempt = {
  attemptId: "44444444-4444-4444-8444-444444444444",
  quizId,
  score: 1,
  maxScore: 2,
  submittedAt: "2026-10-26T10:00:00.000Z",
  questions: [
    {
      questionId,
      prompt: "Question?",
      options: ["Correct", "Wrong A", "Wrong B", "Wrong C"],
      selectedAnswer: "Correct",
      correctAnswer: "Correct",
      isCorrect: true,
      explanation: "Because the source states this.",
      sourceReference: "Notes.pdf · Page 2",
      documentName: "Notes.pdf",
    },
  ],
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/assessment/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("authenticated quiz submission endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: authenticatedUserId } }, error: null });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
    });
    mocks.rpc.mockResolvedValue({ data: attempt, error: null });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("grades only through the server RPC using the authenticated user and returns explanations after grading", async () => {
    const response = await POST(
      makeRequest({
        quizId,
        responses: [{ questionId, answer: "Correct" }],
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.score).toBe(1);
    expect(payload.questions[0]).toMatchObject({
      correctAnswer: "Correct",
      isCorrect: true,
      explanation: "Because the source states this.",
      sourceReference: "Notes.pdf · Page 2",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("submit_quiz_attempt", {
      p_user_id: authenticatedUserId,
      p_quiz_id: quizId,
      p_responses: [{ question_id: questionId, response_text: "Correct" }],
    });
  });

  it("does not call grading for an unauthenticated request or client-supplied score", async () => {
    const invalid = await POST(
      makeRequest({ quizId, score: 100, responses: [{ questionId, answer: "Correct" }] }),
    );
    expect(invalid.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const unauthenticated = await POST(
      makeRequest({ quizId, responses: [{ questionId, answer: "Correct" }] }),
    );
    expect(unauthenticated.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns duplicate-submission conflicts without exposing a second result", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "This quiz has already been submitted" },
    });
    const response = await POST(makeRequest({ quizId, responses: [] }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "This quiz has already been submitted with different answers.",
    });
  });
});
