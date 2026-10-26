import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_MODEL,
  MAX_CONCURRENT_EMBEDDING_BATCHES,
  MAX_DOCUMENT_CHUNKS,
  STORAGE_BUCKET,
} from "@/lib/documents/config";
import {
  DocumentProcessingError,
  extractDocumentText,
} from "@/lib/documents/extraction";
import { chunkExtractedPages, countExtractedCharacters } from "@/lib/documents/chunking";
import {
  createEmbeddings,
  EmbeddingProviderError,
} from "@/lib/documents/embeddings";

type StoredChunk = {
  chunk_index: number;
  content_hash: string | null;
  embedding_model: string | null;
  embedding_dimensions: number | null;
};

export function getChunksNeedingEmbeddings(
  chunks: ReturnType<typeof chunkExtractedPages>,
  hashes: string[],
  storedChunks: StoredChunk[],
) {
  const existingByIndex = new Map(
    storedChunks.map((chunk) => [chunk.chunk_index, chunk]),
  );
  return chunks.flatMap((chunk, index) => {
    const existing = existingByIndex.get(index);
    return existing?.content_hash === hashes[index] &&
      existing.embedding_model === EMBEDDING_MODEL &&
      existing.embedding_dimensions === 1536
      ? []
      : [{ chunk, index }];
  });
}

function contentHash(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function safeProcessingError(error: unknown) {
  if (error instanceof DocumentProcessingError || error instanceof EmbeddingProviderError) {
    return error.message;
  }
  if (
    error instanceof Error &&
    /bucket|migration|function|does not exist|schema cache|pgvector|service_role/i.test(error.message)
  ) {
    return "Document processing is not fully configured. Apply the Stage 4 database migration and verify the private study-materials bucket.";
  }
  return "Document processing could not be completed. Check the document and service configuration, then retry.";
}

export async function processOwnedDocument(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  documentId: string,
) {
  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_document_processing",
    { p_user_id: userId, p_document_id: documentId },
  );
  if (claimError) throw new Error(safeProcessingError(claimError));

  if (!claimed) {
    const { data: current, error } = await supabase
      .from("documents")
      .select("processing_status")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(safeProcessingError(error));
    if (!current) throw new Error("Document not found.");
    return { status: current.processing_status as string, alreadyProcessing: true };
  }

  try {
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id,storage_path,mime_type")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();
    if (documentError || !document) {
      throw new Error("The document could not be found in your account.");
    }

    const { data: storedFile, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(document.storage_path);
    if (downloadError || !storedFile) {
      throw new Error("The private stored file could not be read. Try deleting and uploading it again.");
    }

    const pages = await extractDocumentText(
      new Uint8Array(await storedFile.arrayBuffer()),
      document.mime_type,
    );
    const chunks = chunkExtractedPages(pages);
    if (!chunks.length) {
      throw new DocumentProcessingError("No readable text was found in this document.");
    }
    if (chunks.length > MAX_DOCUMENT_CHUNKS) {
      throw new DocumentProcessingError(
        "This document has too much extractable text for one processing job. Split it into smaller files and retry.",
      );
    }

    const { data: storedChunks, error: chunksError } = await supabase
      .from("document_chunks")
      .select("chunk_index,content_hash,embedding_model,embedding_dimensions")
      .eq("document_id", documentId)
      .eq("user_id", userId);
    if (chunksError) throw new Error(safeProcessingError(chunksError));

    const hashes = chunks.map((chunk) => contentHash(chunk.extractedText));
    const chunksNeedingEmbeddings = getChunksNeedingEmbeddings(
      chunks,
      hashes,
      (storedChunks ?? []) as StoredChunk[],
    );

    const batches = Array.from(
      { length: Math.ceil(chunksNeedingEmbeddings.length / EMBEDDING_BATCH_SIZE) },
      (_, index) =>
        chunksNeedingEmbeddings.slice(
          index * EMBEDDING_BATCH_SIZE,
          (index + 1) * EMBEDDING_BATCH_SIZE,
        ),
    );
    for (
      let offset = 0;
      offset < batches.length;
      offset += MAX_CONCURRENT_EMBEDDING_BATCHES
    ) {
      const wave = batches.slice(offset, offset + MAX_CONCURRENT_EMBEDDING_BATCHES);
      const results = await Promise.allSettled(
        wave.map(async (batch) => {
          const embeddings = await createEmbeddings(
            batch.map(({ chunk }) => chunk.extractedText),
          );
          const pChunks = batch.map(({ chunk, index }, batchIndex) => ({
            chunk_index: index,
            page_number: chunk.pageNumber,
            section_heading: chunk.sectionHeading,
            extracted_text: chunk.extractedText,
            source_reference: chunk.sourceReference,
            content_hash: hashes[index],
            embedding: JSON.stringify(embeddings[batchIndex]),
          }));
          const { error: saveError } = await admin.rpc(
            "save_document_processing_chunks",
            {
              p_user_id: userId,
              p_document_id: documentId,
              p_chunks: pChunks,
              p_embedding_model: EMBEDDING_MODEL,
            },
          );
          if (saveError) throw new Error(safeProcessingError(saveError));
        }),
      );
      const failed = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (failed) throw failed.reason;
    }

    const { error: completeError } = await admin.rpc(
      "complete_document_processing",
      {
        p_user_id: userId,
        p_document_id: documentId,
        p_extracted_text_chars: countExtractedCharacters(pages),
        p_chunk_count: chunks.length,
        p_embedding_model: EMBEDDING_MODEL,
      },
    );
    if (completeError) throw new Error(safeProcessingError(completeError));

    return { status: "ready", alreadyProcessing: false };
  } catch (error) {
    const safeMessage = safeProcessingError(error);
    const { error: failError } = await admin.rpc(
      "fail_document_processing",
      { p_user_id: userId, p_document_id: documentId, p_error_message: safeMessage },
    );
    if (failError) {
      throw new Error(
        "Document processing failed, and its status could not be updated. Refresh the document list before retrying.",
      );
    }
    throw new Error(safeMessage);
  }
}
