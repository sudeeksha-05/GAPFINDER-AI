import "server-only";

import { z } from "zod";
import { EMBEDDING_DIMENSIONS } from "@/lib/documents/config";
import { createEmbeddings } from "@/lib/documents/embeddings";
import { retrievalInputSchema } from "@/lib/documents/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const evidenceSchema = z.object({
  chunk_id: z.string().uuid(),
  document_id: z.string().uuid(),
  document_name: z.string(),
  subject_id: z.string().nullable(),
  subject_name: z.string().nullable(),
  chunk_index: z.number().int().nonnegative(),
  page_number: z.number().int().positive().nullable(),
  section_heading: z.string().nullable(),
  source_reference: z.string().nullable(),
  extracted_text: z.string().min(1),
  similarity: z.number().min(0).max(1),
  matched_topic_id: z.string().nullable(),
});

export type RetrievedEvidence = {
  chunkId: string;
  documentId: string;
  documentName: string;
  subjectId: string | null;
  subjectName: string | null;
  chunkIndex: number;
  pageNumber: number | null;
  sectionHeading: string | null;
  sourceReference: string | null;
  text: string;
  similarity: number;
};

export type RetrievalResult =
  | { status: "evidence"; evidence: RetrievedEvidence[] }
  | {
      status: "insufficient_evidence";
      evidence: [];
      message: string;
    };

export async function retrieveStudyEvidence(input: unknown): Promise<RetrievalResult> {
  const parsedInput = retrievalInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "Invalid evidence search request.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Could not verify the account session: ${authError.message}`);
  if (!user) throw new Error("Sign in before searching private study materials.");

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    throw new Error(
      "Private semantic retrieval requires the server-only SUPABASE_SERVICE_ROLE_KEY. Configure it before searching.",
    );
  }
  const [queryEmbedding] = await createEmbeddings([parsedInput.data.query]);
  if (queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("The query embedding dimensions do not match stored document vectors.");
  }
  const { data, error } = await admin.rpc("match_document_chunks", {
    p_user_id: user.id,
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: parsedInput.data.topK,
    match_threshold: parsedInput.data.threshold,
    filter_subject_id: parsedInput.data.subjectId ?? null,
    filter_document_ids: parsedInput.data.documentIds ?? null,
    filter_topic_id: parsedInput.data.topicId ?? null,
  });
  if (error) {
    if (/function|migration|vector|schema cache|does not exist/i.test(error.message)) {
      throw new Error(
        "Semantic retrieval is not configured. Apply the Stage 4 migration and verify the pgvector extension.",
      );
    }
    throw new Error("Private study materials could not be searched. Retry shortly.");
  }

  const parsedRows = z.array(evidenceSchema).safeParse(data);
  if (!parsedRows.success) {
    throw new Error("Semantic retrieval returned incomplete source metadata.");
  }
  const filteredRows = parsedRows.data.filter(
    (row) =>
      row.similarity >= parsedInput.data.threshold &&
      (!parsedInput.data.subjectId || row.subject_id === parsedInput.data.subjectId) &&
      (!parsedInput.data.documentIds ||
        parsedInput.data.documentIds.includes(row.document_id)) &&
      (!parsedInput.data.topicId ||
        row.matched_topic_id === parsedInput.data.topicId),
  );
  if (!filteredRows.length) {
    return {
      status: "insufficient_evidence",
      evidence: [],
      message:
        "Insufficient relevant source material was found in your processed uploads. No unsupported answer should be generated.",
    };
  }

  return {
    status: "evidence",
    evidence: filteredRows.map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentName: row.document_name,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      chunkIndex: row.chunk_index,
      pageNumber: row.page_number,
      sectionHeading: row.section_heading,
      sourceReference: row.source_reference,
      text: row.extracted_text,
      similarity: row.similarity,
    })),
  };
}
