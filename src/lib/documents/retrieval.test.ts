import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmbeddings: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/documents/embeddings", () => ({
  createEmbeddings: mocks.createEmbeddings,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { retrieveStudyEvidence } from "@/lib/documents/retrieval";

const vector = Array.from({ length: 1536 }, () => 0.1);
const row = {
  chunk_id: "11111111-1111-4111-8111-111111111111",
  document_id: "22222222-2222-4222-8222-222222222222",
  document_name: "machine-learning-notes.pdf",
  subject_id: "machine-learning",
  subject_name: "Machine Learning",
  chunk_index: 2,
  page_number: 8,
  section_heading: "Decision trees",
  source_reference: "Page 8",
  extracted_text: "Information gain compares candidate splits.",
  similarity: 0.84,
  matched_topic_id: "machine-learning-topic-3",
};

describe("private semantic retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "authenticated-user-id" } },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.createEmbeddings.mockResolvedValue([vector]);
  });

  it("returns explicit insufficient evidence and passes server-enforced subject/document/topic filters", async () => {
    const result = await retrieveStudyEvidence({
      query: "How does information gain compare tree splits?",
      subjectId: "machine-learning",
      documentIds: ["22222222-2222-4222-8222-222222222222"],
      topicId: "machine-learning-topic-3",
      topK: 4,
      threshold: 0.7,
      userId: "tampered-user-id",
    });

    expect(result.status).toBe("insufficient_evidence");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "match_document_chunks",
      expect.objectContaining({
        filter_subject_id: "machine-learning",
        filter_document_ids: ["22222222-2222-4222-8222-222222222222"],
        filter_topic_id: "machine-learning-topic-3",
        match_count: 4,
        match_threshold: 0.7,
      }),
    );
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_user_id: "authenticated-user-id",
    });
  });

  it("returns ranked evidence with source attribution when filters are satisfied", async () => {
    mocks.rpc.mockResolvedValue({ data: [row], error: null });

    const result = await retrieveStudyEvidence({
      query: "Information gain",
      subjectId: "machine-learning",
      topicId: "machine-learning-topic-3",
      threshold: 0.75,
    });

    expect(result.status).toBe("evidence");
    if (result.status === "evidence") {
      expect(result.evidence[0]).toMatchObject({
        documentName: "machine-learning-notes.pdf",
        pageNumber: 8,
        sourceReference: "Page 8",
        similarity: 0.84,
        text: "Information gain compares candidate splits.",
      });
    }
  });

  it("filters a mismatched source or below-threshold result again in application logic", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ...row, subject_id: "biology", similarity: 0.2 }],
      error: null,
    });

    const result = await retrieveStudyEvidence({
      query: "Information gain",
      subjectId: "machine-learning",
      threshold: 0.5,
    });

    expect(result.status).toBe("insufficient_evidence");
  });

  it("rejects unauthenticated and invalid retrieval requests before searching", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(retrieveStudyEvidence({ query: "A valid query" })).rejects.toThrow(
      "Sign in",
    );
    await expect(retrieveStudyEvidence({ query: "x" })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
