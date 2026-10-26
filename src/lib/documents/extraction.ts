import "server-only";

import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { MAX_PDF_PAGES } from "@/lib/documents/config";

export type ExtractedPage = {
  pageNumber: number | null;
  text: string;
};

export class DocumentProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

function decodeText(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, "");
  } catch {
    throw new DocumentProcessingError(
      "This TXT file is not valid UTF-8 text and could not be read.",
    );
  }
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedPage[]> {
  let task: ReturnType<typeof getDocument> | undefined;
  let document: Awaited<ReturnType<typeof getDocument>["promise"]> | undefined;
  try {
    task = getDocument({
      data: bytes,
      useSystemFonts: true,
    });
    document = await task.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new DocumentProcessingError(
        `PDFs are limited to ${MAX_PDF_PAGES} pages. Split this document and retry.`,
      );
    }
    const pages: ExtractedPage[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .flatMap((item) => ("str" in item ? [item.str] : []))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) pages.push({ pageNumber, text });
      page.cleanup();
    }
    return pages;
  } catch (error) {
    if (error instanceof DocumentProcessingError) throw error;
    throw new DocumentProcessingError(
      "The PDF could not be read. It may be encrypted, damaged, or unsupported.",
    );
  } finally {
    await task?.destroy();
  }
}

export async function extractDocumentText(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ExtractedPage[]> {
  if (!bytes.byteLength) {
    throw new DocumentProcessingError("The selected document is empty.");
  }

  if (mimeType === "application/pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      throw new DocumentProcessingError("The selected file is not a valid PDF.");
    }
    const pages = await extractPdf(bytes);
    if (!pages.length) {
      throw new DocumentProcessingError(
        "No selectable text was found in this PDF. Scanned documents need OCR, which is not available yet.",
      );
    }
    return pages;
  }

  if (mimeType === "text/plain") {
    const text = decodeText(bytes).replace(/\u0000/g, "").trim();
    if (!text) throw new DocumentProcessingError("No readable text was found in this file.");
    return [{ pageNumber: null, text }];
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const text = value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
      if (!text) throw new DocumentProcessingError("No readable text was found in this DOCX file.");
      return [{ pageNumber: null, text }];
    } catch (error) {
      if (error instanceof DocumentProcessingError) throw error;
      throw new DocumentProcessingError(
        "The DOCX file could not be read. Confirm it is a valid, unencrypted Word document.",
      );
    }
  }

  throw new DocumentProcessingError(
    "Unsupported document type. Upload a PDF, TXT, or DOCX file.",
  );
}
