import "server-only";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const documentRowSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string().nullable(),
  category: z.string(),
  storage_path: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  file_size_bytes: z.number(),
  processing_status: z.enum(["uploaded", "queued", "processing", "ready", "failed"]),
  extraction_error: z.string().nullable(),
  uploaded_at: z.string(),
  processed_at: z.string().nullable(),
  extracted_text_chars: z.number().int(),
  chunk_count: z.number().int(),
  processing_attempts: z.number().int(),
});

const subjectRowSchema = z.object({ id: z.string(), name: z.string() });

export type OwnedDocument = {
  id: string;
  subjectId: string | null;
  subjectName: string | null;
  category: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: "uploaded" | "queued" | "processing" | "ready" | "failed";
  error: string | null;
  uploadedAt: string;
  processedAt: string | null;
  extractedTextChars: number;
  chunkCount: number;
  processingAttempts: number;
};

export async function getOwnedDocuments(userId: string): Promise<OwnedDocument[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id,subject_id,category,storage_path,original_filename,mime_type,file_size_bytes,processing_status,extraction_error,uploaded_at,processed_at,extracted_text_chars,chunk_count,processing_attempts",
    )
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error("Your document list could not be loaded. Refresh and try again.");

  const parsed = z.array(documentRowSchema).safeParse(data);
  if (!parsed.success) {
    throw new Error("Your document list returned unexpected data. Contact support if this persists.");
  }

  const subjectIds = [
    ...new Set(
      parsed.data
        .map((row) => row.subject_id)
        .filter((subjectId): subjectId is string => subjectId !== null),
    ),
  ];
  const subjectNames = new Map<string, string>();
  if (subjectIds.length) {
    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id,name")
      .in("id", subjectIds);
    if (subjectsError) throw new Error("Subject labels could not be loaded.");
    const parsedSubjects = z.array(subjectRowSchema).safeParse(subjects);
    if (!parsedSubjects.success) throw new Error("Subject labels returned unexpected data.");
    parsedSubjects.data.forEach((subject) => subjectNames.set(subject.id, subject.name));
  }

  return parsed.data.map((row) => ({
    id: row.id,
    subjectId: row.subject_id,
    subjectName: row.subject_id ? subjectNames.get(row.subject_id) ?? null : null,
    category: row.category,
    name: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.file_size_bytes,
    status: row.processing_status,
    error: row.extraction_error,
    uploadedAt: row.uploaded_at,
    processedAt: row.processed_at,
    extractedTextChars: row.extracted_text_chars,
    chunkCount: row.chunk_count,
    processingAttempts: row.processing_attempts,
  }));
}
