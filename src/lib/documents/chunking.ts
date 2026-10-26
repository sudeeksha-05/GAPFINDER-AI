import {
  CHUNK_OVERLAP_CHARS,
  CHUNK_SIZE_CHARS,
} from "@/lib/documents/config";
import type { ExtractedPage } from "@/lib/documents/extraction";

export type DocumentChunk = {
  chunkIndex: number;
  pageNumber: number | null;
  sectionHeading: string | null;
  extractedText: string;
  sourceReference: string | null;
};

function chunkPage(
  text: string,
  pageNumber: number | null,
  maxChars: number,
  overlapChars: number,
) {
  const normalizedText = text.trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    let end = Math.min(start + maxChars, normalizedText.length);
    if (end < normalizedText.length) {
      const boundary = normalizedText.lastIndexOf(" ", end);
      if (boundary > start + Math.floor(maxChars / 2)) end = boundary;
    }
    const chunk = normalizedText.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalizedText.length) break;

    let nextStart = Math.max(start + 1, end - overlapChars);
    const boundary = normalizedText.lastIndexOf(" ", nextStart);
    if (boundary > start) nextStart = boundary + 1;
    start = Math.max(nextStart, start + 1);
  }

  return chunks.map((value) => ({ pageNumber, text: value }));
}

export function chunkExtractedPages(
  pages: ExtractedPage[],
  options: { maxChars?: number; overlapChars?: number } = {},
) {
  const maxChars = options.maxChars ?? CHUNK_SIZE_CHARS;
  const overlapChars = options.overlapChars ?? CHUNK_OVERLAP_CHARS;
  if (!Number.isInteger(maxChars) || maxChars < 100) {
    throw new Error("Chunk size must be an integer of at least 100 characters.");
  }
  if (
    !Number.isInteger(overlapChars) ||
    overlapChars < 0 ||
    overlapChars >= maxChars
  ) {
    throw new Error("Chunk overlap must be non-negative and smaller than chunk size.");
  }

  const seen = new Set<string>();
  const chunks: DocumentChunk[] = [];
  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    for (const part of chunkPage(text, page.pageNumber, maxChars, overlapChars)) {
      const normalized = `${part.pageNumber ?? "no-page"}:${part.text
        .toLocaleLowerCase()
        .replace(/\s+/g, " ")}`;
      if (!part.text.trim() || seen.has(normalized)) continue;
      seen.add(normalized);
      chunks.push({
        chunkIndex: chunks.length,
        pageNumber: part.pageNumber,
        sectionHeading: null,
        extractedText: part.text,
        sourceReference:
          part.pageNumber === null ? null : `Page ${part.pageNumber}`,
      });
    }
  }
  return chunks;
}

export function countExtractedCharacters(pages: ExtractedPage[]) {
  return pages.reduce((total, page) => total + page.text.trim().length, 0);
}
