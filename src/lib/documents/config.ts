export const STORAGE_BUCKET = "study-materials";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const CHUNK_SIZE_CHARS = 1400;
export const CHUNK_OVERLAP_CHARS = 180;
export const EMBEDDING_BATCH_SIZE = 64;
export const MAX_CONCURRENT_EMBEDDING_BATCHES = 3;
export const MAX_DOCUMENT_CHUNKS = 600;
export const MAX_PDF_PAGES = 1000;
export const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const STORAGE_BUCKET_MAX_BYTES = 50 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES = {
  pdf: {
    extension: ".pdf",
    mimeType: "application/pdf",
  },
  txt: {
    extension: ".txt",
    mimeType: "text/plain",
  },
  docx: {
    extension: ".docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
} as const;

export const DOCUMENT_CATEGORIES = [
  "lecture_notes",
  "textbook",
  "slides",
  "syllabus",
  "other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export function getMaxUploadBytes() {
  const configured = process.env.DOCUMENT_MAX_UPLOAD_BYTES;
  if (!configured) return DEFAULT_MAX_UPLOAD_BYTES;
  const value = Number(configured);
  if (
    !Number.isSafeInteger(value) ||
    value < 1024 ||
    value > STORAGE_BUCKET_MAX_BYTES
  ) {
    throw new Error(
      `DOCUMENT_MAX_UPLOAD_BYTES must be between 1024 and ${STORAGE_BUCKET_MAX_BYTES}.`,
    );
  }
  return value;
}
