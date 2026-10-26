import { z } from "zod";

export const quizSubmissionSchema = z
  .object({
    quizId: z.string().uuid(),
    responses: z
      .array(
        z
          .object({
            questionId: z.string().uuid(),
            answer: z.string().trim().min(1).max(500),
          })
          .strict(),
      )
      .max(10),
  })
  .strict()
  .superRefine((submission, context) => {
    const questionIds = submission.responses.map(({ questionId }) => questionId);
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["responses"],
        message: "Each question may only be answered once.",
      });
    }
  });

export const gradedAttemptSchema = z.object({
  attemptId: z.string().uuid(),
  quizId: z.string().uuid(),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  submittedAt: z.string(),
  questions: z.array(
    z.object({
      questionId: z.string().uuid(),
      prompt: z.string(),
      options: z.array(z.string()).length(4),
      selectedAnswer: z.string().nullable(),
      correctAnswer: z.string(),
      isCorrect: z.boolean(),
      explanation: z.string().nullable(),
      sourceReference: z.string().nullable(),
      documentName: z.string().nullable(),
    }),
  ),
});
