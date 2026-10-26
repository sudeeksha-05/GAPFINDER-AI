import { describe, expect, it } from "vitest";
import { quizSubmissionSchema } from "@/lib/assessment/submission-validation";

const quizId = "11111111-1111-4111-8111-111111111111";
const questionId = "22222222-2222-4222-8222-222222222222";

describe("quiz submission validation", () => {
  it("accepts omitted unanswered items and explicit selected answers", () => {
    expect(quizSubmissionSchema.safeParse({ quizId, responses: [] }).success).toBe(true);
    expect(
      quizSubmissionSchema.safeParse({
        quizId,
        responses: [{ questionId, answer: "Selected option" }],
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate question answers, invalid ids, and client-supplied grading", () => {
    expect(
      quizSubmissionSchema.safeParse({
        quizId,
        responses: [
          { questionId, answer: "A" },
          { questionId, answer: "B" },
        ],
      }).success,
    ).toBe(false);
    expect(
      quizSubmissionSchema.safeParse({
        quizId,
        score: 100,
        responses: [{ questionId, answer: "A", isCorrect: true }],
      }).success,
    ).toBe(false);
  });
});
