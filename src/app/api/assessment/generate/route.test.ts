import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  retrieveStudyEvidence: vi.fn(),
  generateGroundedQuestions: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  serverFrom: vi.fn(),
  adminFrom: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/documents/retrieval", () => ({
  retrieveStudyEvidence: mocks.retrieveStudyEvidence,
}));
vi.mock("@/lib/assessment/question-generation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/assessment/question-generation")>();
  return { ...actual, generateGroundedQuestions: mocks.generateGroundedQuestions };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: () => ({ url: "https://example.test", publishableKey: "public" }),
}));

import { POST } from "@/app/api/assessment/generate/route";

const authenticatedUserId = "11111111-1111-4111-8111-111111111111";
const evidence = {
  chunkId: "22222222-2222-4222-8222-222222222222",
  documentId: "33333333-3333-4333-8333-333333333333",
  documentName: "Owned notes.pdf",
  subjectId: "machine-learning",
  subjectName: "Machine Learning",
  chunkIndex: 0,
  pageNumber: 2,
  sectionHeading: "Regression",
  sourceReference: "Page 2",
  text: "Regression source passage.",
  similarity: 0.9,
};

function makeServerQuery(table: string) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: [], error: null })),
    maybeSingle: vi.fn(async () => ({
      data:
        table === "subjects"
          ? { id: "machine-learning", name: "Machine Learning" }
          : { id: "machine-learning-topic-1", name: "Regression", subject_id: "machine-learning" },
      error: null,
    })),
  };
  return query;
}

function makeAdminQuery() {
  return {
    insert: mocks.insert,
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/assessment/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("authenticated diagnostic generation endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: authenticatedUserId } },
      error: null,
    });
    mocks.serverFrom.mockImplementation((table: string) => makeServerQuery(table));
    mocks.insert.mockResolvedValue({ error: null });
    mocks.adminFrom.mockImplementation(() => makeAdminQuery());
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.serverFrom,
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ from: mocks.adminFrom });
    mocks.retrieveStudyEvidence.mockResolvedValue({ status: "evidence", evidence: [evidence] });
    mocks.generateGroundedQuestions.mockResolvedValue([
      {
        prompt: "What concept does this passage explain?",
        options: ["Regression", "Clustering", "Trees", "Images"],
        correctAnswer: "Regression",
        explanation: "The passage explicitly names regression.",
        evidence,
      },
    ]);
  });

  it("uses only the authenticated account for retrieval and saved quiz rows", async () => {
    const response = await POST(
      makeRequest({
        subjectId: "machine-learning",
        topicId: "machine-learning-topic-1",
        difficulty: "beginner",
        count: 1,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.questions[0]).not.toHaveProperty("correctAnswer");
    expect(payload.questions[0]).not.toHaveProperty("explanation");
    expect(payload.questions[0].source).toMatchObject({
      documentName: "Owned notes.pdf",
      pageNumber: 2,
      sectionHeading: "Regression",
    });
    expect(mocks.retrieveStudyEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: "machine-learning" }),
    );
    const inserts = mocks.insert.mock.calls.map(([rows]) => rows);
    expect(inserts).toHaveLength(3);
    expect(inserts[0]).toMatchObject({ user_id: authenticatedUserId });
    expect(inserts[1][0]).toMatchObject({
      user_id: authenticatedUserId,
      source_chunk_id: evidence.chunkId,
      source_reference: "Regression",
    });
    expect(inserts[2][0]).toMatchObject({ user_id: authenticatedUserId });
  });

  it("returns an honest insufficient-evidence state without saving a quiz", async () => {
    mocks.retrieveStudyEvidence.mockResolvedValue({
      status: "insufficient_evidence",
      evidence: [],
      message: "Not enough source text.",
    });
    const response = await POST(
      makeRequest({
        subjectId: "machine-learning",
        topicId: "machine-learning-topic-1",
        difficulty: "beginner",
        count: 1,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("insufficient_evidence");
    expect(mocks.generateGroundedQuestions).not.toHaveBeenCalled();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied owner id and never searches or saves it", async () => {
    const response = await POST(
      makeRequest({
        subjectId: "machine-learning",
        topicId: "machine-learning-topic-1",
        difficulty: "beginner",
        count: 1,
        userId: "99999999-9999-4999-8999-999999999999",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.retrieveStudyEvidence).not.toHaveBeenCalled();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("requires an authenticated user before accessing saved content", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(
      makeRequest({
        subjectId: "machine-learning",
        topicId: "machine-learning-topic-1",
        difficulty: "beginner",
        count: 1,
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.retrieveStudyEvidence).not.toHaveBeenCalled();
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
});
