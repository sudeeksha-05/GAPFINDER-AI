import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmbeddings: vi.fn(),
}));

vi.mock("@/lib/documents/embeddings", () => ({
  createEmbeddings: mocks.createEmbeddings,
}));

import {
  getChunksNeedingEmbeddings,
  processOwnedDocument,
} from "@/lib/documents/processing";
import { chunkExtractedPages } from "@/lib/documents/chunking";

describe("retry-safe chunk embedding selection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reuses embeddings for unchanged chunks and regenerates only changed content", () => {
    const chunks = chunkExtractedPages([
      { pageNumber: 1, text: "Unchanged study content." },
      { pageNumber: 2, text: "Changed study content." },
    ]);
    const hashes = chunks.map((chunk) =>
      createHash("sha256").update(chunk.extractedText, "utf8").digest("hex"),
    );
    const selected = getChunksNeedingEmbeddings(chunks, hashes, [
      {
        chunk_index: 0,
        content_hash: hashes[0],
        embedding_model: "text-embedding-3-small",
        embedding_dimensions: 1536,
      },
      {
        chunk_index: 1,
        content_hash: "old-content-hash",
        embedding_model: "text-embedding-3-small",
        embedding_dimensions: 1536,
      },
    ]);

    expect(selected.map(({ index }) => index)).toEqual([1]);
  });
});

describe("processing job claims", () => {
  it("does not repeat work when another request already claimed the document", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { processing_status: "processing" },
        error: null,
      }),
    };
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn(() => query),
    } as unknown as SupabaseClient;

    await expect(
      processOwnedDocument(
        supabase,
        supabase,
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ),
    ).resolves.toEqual({ status: "processing", alreadyProcessing: true });
    expect(mocks.createEmbeddings).not.toHaveBeenCalled();
  });
});
