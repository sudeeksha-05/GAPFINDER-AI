import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  DOCUMENT_CATEGORIES,
  STORAGE_BUCKET,
  STORAGE_BUCKET_MAX_BYTES,
  getMaxUploadBytes,
} from "@/lib/documents/config";
import {
  validateDocumentFile,
} from "@/lib/documents/validation";
import { getOwnedDocuments } from "@/lib/documents/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const uploadMetadataSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).default("other"),
  subjectId: z.string().min(1).max(120).nullable().optional(),
});

function safeFilename(name: string) {
  return name
    .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
    .replace(/\.\./g, "_")
    .trim()
    .slice(0, 255);
}

export async function GET() {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return NextResponse.json({ error: "Could not verify your session." }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Sign in to view your documents." }, { status: 401 });

  try {
    const documents = await getOwnedDocuments(user.id);
    return NextResponse.json({ documents }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (listError) {
    return NextResponse.json(
      { error: listError instanceof Error ? listError.message : "Document list unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) return NextResponse.json({ error: "Could not verify your session." }, { status: 401 });
  if (!user) return NextResponse.json({ error: "Sign in before uploading a document." }, { status: 401 });
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Document uploads require the server-only SUPABASE_SERVICE_ROLE_KEY. Configure it before uploading." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload request was not valid multipart form data." }, { status: 400 });
  }
  const formMetadata = uploadMetadataSchema.safeParse({
    category: formData.get("category") ?? "other",
    subjectId: formData.get("subjectId") || null,
  });
  if (!formMetadata.success) {
    return NextResponse.json({ error: "Choose a valid document category and subject." }, { status: 400 });
  }

  const candidate = formData.get("file");
  if (!(candidate instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF, TXT, or DOCX file to upload." }, { status: 400 });
  }
  let maxBytes: number;
  try {
    maxBytes = getMaxUploadBytes();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload size is not configured." },
      { status: 500 },
    );
  }
  const validation = validateDocumentFile(candidate);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  if (candidate.size > STORAGE_BUCKET_MAX_BYTES || candidate.size > maxBytes) {
    return NextResponse.json(
      { error: `The upload limit is ${Math.floor(maxBytes / (1024 * 1024))} MB.` },
      { status: 413 },
    );
  }

  const fileBytes = new Uint8Array(await candidate.arrayBuffer());
  if (
    validation.extension === ".pdf" &&
    new TextDecoder().decode(fileBytes.slice(0, 5)) !== "%PDF-"
  ) {
    return NextResponse.json({ error: "The selected file is not a valid PDF." }, { status: 400 });
  }
  if (
    validation.extension === ".docx" &&
    !(fileBytes[0] === 0x50 && fileBytes[1] === 0x4b)
  ) {
    return NextResponse.json({ error: "The selected file is not a valid DOCX archive." }, { status: 400 });
  }
  if (validation.extension === ".txt") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(fileBytes);
    } catch {
      return NextResponse.json({ error: "TXT files must contain valid UTF-8 text." }, { status: 400 });
    }
  }
  const filename = safeFilename(candidate.name);
  const documentId = crypto.randomUUID();
  const storagePath = `${user.id}/${documentId}/${filename}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: validation.mimeType,
      cacheControl: "0",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: "The file could not be stored privately. Check the Storage bucket and owner policies." },
      { status: 503 },
    );
  }

  const { error: recordError } = await admin.rpc("create_document_record", {
    p_user_id: user.id,
    p_document_id: documentId,
    p_category: formMetadata.data.category,
    p_storage_path: storagePath,
    p_original_filename: filename,
    p_mime_type: validation.mimeType,
    p_file_size_bytes: candidate.size,
    p_subject_id: formMetadata.data.subjectId ?? null,
  });
  if (recordError) {
    const { error: cleanupError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      return NextResponse.json(
        { error: "The upload record could not be created, and private-file cleanup needs administrator attention." },
        { status: 503 },
      );
    }
    const message = /study goal|subject/i.test(recordError.message)
      ? "Select a subject in your active study goal before associating this file."
      : "The document record could not be created. Apply the document-ingestion migration and retry.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: created, error: createdError } = await supabase
    .from("documents")
    .select("id,subject_id,category,original_filename,mime_type,file_size_bytes,processing_status,uploaded_at,extracted_text_chars,chunk_count,processing_attempts")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (createdError || !created) {
    return NextResponse.json(
      { error: "The private file was uploaded but its metadata could not be refreshed. Reload your document list." },
      { status: 503 },
    );
  }

  return NextResponse.json({ document: created }, { status: 201 });
}
