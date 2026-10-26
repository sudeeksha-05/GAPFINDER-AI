import { describe, expect, it } from "vitest";
import { chunkExtractedPages } from "@/lib/documents/chunking";
import { extractDocumentText } from "@/lib/documents/extraction";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
} from "@/lib/documents/config";
import { validateDocumentFile } from "@/lib/documents/validation";

describe("document upload validation", () => {
  it("rejects unsupported formats, empty files, and mismatched content types", () => {
    expect(validateDocumentFile({ name: "study.exe", type: "", size: 100 })).toMatchObject({
      valid: false,
      error: expect.stringContaining("Unsupported"),
    });
    expect(validateDocumentFile({ name: "study.pdf", type: "application/pdf", size: 0 })).toMatchObject({
      valid: false,
      error: expect.stringContaining("empty"),
    });
    expect(validateDocumentFile({ name: "study.pdf", type: "text/plain", size: 100 })).toMatchObject({
      valid: false,
      error: expect.stringContaining("does not match"),
    });
  });

  it("accepts allowed document types and enforces the configured size limit", () => {
    expect(validateDocumentFile({ name: "notes.txt", type: "text/plain", size: 12 })).toMatchObject({
      valid: true,
      mimeType: "text/plain",
    });
    expect(
      validateDocumentFile({
        name: "large.pdf",
        type: "application/pdf",
        size: DEFAULT_MAX_UPLOAD_BYTES + 1,
      }),
    ).toMatchObject({ valid: false, error: expect.stringContaining("upload limit") });
  });
});

describe("server-side text extraction", () => {
  it("extracts valid UTF-8 TXT text", async () => {
    const bytes = new TextEncoder().encode("\uFEFF  Linear regression notes  ");
    await expect(extractDocumentText(bytes, "text/plain")).resolves.toEqual([
      { pageNumber: null, text: "Linear regression notes" },
    ]);
  });

  it("rejects empty and unreadable text documents", async () => {
    await expect(extractDocumentText(new Uint8Array(), "text/plain")).rejects.toThrow(
      "empty",
    );
    await expect(
      extractDocumentText(new Uint8Array([0xff, 0xfe]), "text/plain"),
    ).rejects.toThrow("valid UTF-8");
  });

  it("rejects invalid or image-only PDFs without inventing page evidence", async () => {
    await expect(
      extractDocumentText(new TextEncoder().encode("not a pdf"), "application/pdf"),
    ).rejects.toThrow("not a valid PDF");
    await expect(
      extractDocumentText(new TextEncoder().encode("%PDF-"), "application/pdf"),
    ).rejects.toThrow("could not be read");
  });
});

describe("source-aware overlapping chunks", () => {
  it("keeps chunks non-empty, bounded, overlapping, and attributed to PDF pages", () => {
    const text = Array.from({ length: 70 }, (_, index) => `concept${index}`).join(" ");
    const chunks = chunkExtractedPages(
      [{ pageNumber: 7, text }],
      { maxChars: 120, overlapChars: 24 },
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.extractedText.length <= 120)).toBe(true);
    expect(chunks.every((chunk) => chunk.pageNumber === 7)).toBe(true);
    expect(chunks.every((chunk) => chunk.sourceReference === "Page 7")).toBe(true);
    expect(chunks.every((chunk) => chunk.extractedText.trim().length > 0)).toBe(true);
    expect(chunks[1].extractedText.split(" ")).toContain(
      chunks[0].extractedText.split(" ").at(-1),
    );
  });

  it("drops whitespace and exact duplicate chunks", () => {
    const chunks = chunkExtractedPages(
      [
        { pageNumber: null, text: "same source passage" },
        { pageNumber: null, text: "   " },
        { pageNumber: null, text: "same source passage" },
      ],
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].sourceReference).toBeNull();
  });
});
