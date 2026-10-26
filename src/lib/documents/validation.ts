import { z } from "zod";
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  getMaxUploadBytes,
} from "@/lib/documents/config";

export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

const allowedFileTypes = Object.values(ALLOWED_DOCUMENT_TYPES);

export function validateDocumentFile(file: {
  name: string;
  type: string;
  size: number;
}) {
  const maxBytes = getMaxUploadBytes();
  if (!file.name.trim()) return { valid: false as const, error: "Choose a named file." };
  if (file.size <= 0) return { valid: false as const, error: "The selected file is empty." };
  if (file.size > maxBytes) {
    return {
      valid: false as const,
      error: `The file exceeds the ${Math.ceil(maxBytes / (1024 * 1024))} MB upload limit.`,
    };
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const matchingType = allowedFileTypes.find((type) => type.extension === extension);
  if (!matchingType) {
    return {
      valid: false as const,
      error: "Unsupported file type. Upload a PDF, TXT, or DOCX study file.",
    };
  }
  if (file.type && file.type !== matchingType.mimeType) {
    return {
      valid: false as const,
      error: `The file content type does not match its ${extension} extension.`,
    };
  }
  return {
    valid: true as const,
    extension,
    mimeType: matchingType.mimeType,
  };
}

export function isDocumentCategory(value: string): value is DocumentCategory {
  return DOCUMENT_CATEGORIES.some((category) => category === value);
}

export const retrievalInputSchema = z.object({
  query: z.string().trim().min(3).max(2000),
  subjectId: z.string().min(1).max(120).optional(),
  documentIds: z.array(z.string().uuid()).max(50).optional(),
  topicId: z.string().min(1).max(120).optional(),
  topK: z.number().int().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.35),
});
