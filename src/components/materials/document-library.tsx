"use client";

import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  FileUp,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { z } from "zod";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/documents/config";
import type { OwnedDocument } from "@/lib/documents/queries";

type SubjectOption = { id: string; name: string } | null;

const ownedDocumentSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().nullable(),
  subjectName: z.string().nullable(),
  category: z.string(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  status: z.enum(["uploaded", "queued", "processing", "ready", "failed"]),
  error: z.string().nullable(),
  uploadedAt: z.string(),
  processedAt: z.string().nullable(),
  extractedTextChars: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  processingAttempts: z.number().int().nonnegative(),
});

const categoryLabels: Record<DocumentCategory, string> = {
  lecture_notes: "Lecture notes",
  textbook: "Textbook chapter",
  slides: "Slides",
  syllabus: "Syllabus",
  other: "Other / past paper",
};

const activeStatuses = new Set(["uploaded", "queued", "processing"]);

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatus(status: OwnedDocument["status"]) {
  switch (status) {
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    case "processing":
      return "Processing";
    case "queued":
      return "Queued";
    case "uploaded":
      return "Uploaded";
  }
}

function statusClass(status: OwnedDocument["status"]) {
  switch (status) {
    case "ready":
      return "border-emerald-200/15 bg-emerald-200/[0.06] text-emerald-100";
    case "failed":
      return "border-rose-200/15 bg-rose-200/[0.06] text-rose-100";
    case "processing":
    case "queued":
    case "uploaded":
      return "border-amber-200/15 bg-amber-200/[0.06] text-amber-100";
  }
}

function errorFromResponse(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "The request could not be completed. Refresh the page and try again.";
}

export function DocumentLibrary({
  initialDocuments,
  subject,
  maxUploadBytes,
}: {
  initialDocuments: OwnedDocument[];
  subject: SubjectOption;
  maxUploadBytes: number;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [category, setCategory] = useState<DocumentCategory>("lecture_notes");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [listError, setListError] = useState("");

  const refreshDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || !("documents" in payload)) {
        setListError(errorFromResponse(payload));
        return;
      }
      const rows = payload.documents;
      if (!Array.isArray(rows)) {
        setListError("Your document list returned an unexpected response.");
        return;
      }
      const parsedRows = z.array(ownedDocumentSchema).safeParse(rows);
      if (!parsedRows.success) {
        setListError("Your document list returned an unexpected response.");
        return;
      }
      setDocuments(parsedRows.data);
      setListError("");
    } catch {
      setListError("Could not refresh document status. Check your connection and retry.");
    }
  }, []);

  useEffect(() => {
    if (!documents.some((document) => activeStatuses.has(document.status))) return;
    const timer = window.setInterval(() => void refreshDocuments(), 2500);
    return () => window.clearInterval(timer);
  }, [documents, refreshDocuments]);

  async function startProcessing(documentId: string) {
    const response = await fetch(`/api/documents/${documentId}/process`, {
      method: "POST",
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error(errorFromResponse(payload));
  }

  async function uploadFiles(files: FileList | File[]) {
    if (busy) return;
    setBusy(true);
    setErrorMessage("");
    setMessage("");

    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        form.set("category", category);
        if (subject) form.set("subjectId", subject.id);

        const uploadResponse = await fetch("/api/documents", {
          method: "POST",
          body: form,
        });
        const uploadPayload: unknown = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(`${file.name}: ${errorFromResponse(uploadPayload)}`);
        }
        const uploadedDocument = z
          .object({ document: z.object({ id: z.string().uuid() }) })
          .safeParse(uploadPayload);
        if (!uploadedDocument.success) {
          throw new Error(`${file.name}: upload response was incomplete.`);
        }

        await refreshDocuments();
        setMessage(`Uploaded ${file.name}. Extracting text and preparing private source chunks…`);
        try {
          await startProcessing(uploadedDocument.data.document.id);
        } catch (error) {
          await refreshDocuments();
          throw error;
        }
        await refreshDocuments();
        setMessage(`${file.name} was submitted for processing.`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload could not be completed.");
      await refreshDocuments();
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) void uploadFiles(event.target.files);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files);
  }

  async function retry(document: OwnedDocument) {
    setErrorMessage("");
    setMessage(`Retrying ${document.name}…`);
    try {
      await startProcessing(document.id);
      await refreshDocuments();
      setMessage(`Processing ${document.name}. Status will update automatically.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Retry could not be started.");
      await refreshDocuments();
    }
  }

  async function deleteDocument(document: OwnedDocument) {
    setErrorMessage("");
    const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
    const payload: unknown = await response.json();
    if (!response.ok) {
      setErrorMessage(errorFromResponse(payload));
      return;
    }
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setConfirmDelete(null);
    setMessage(`${document.name} and its processed chunks were deleted.`);
  }

  const maxUploadLabel = `${Math.floor(maxUploadBytes / (1024 * 1024))} MB`;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div
          className={`rounded-2xl border border-dashed p-6 text-center transition sm:p-8 ${dragging ? "border-violet-200/60 bg-violet-200/[0.08]" : "border-violet-200/20 bg-violet-200/[0.025]"}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragging(false);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-300/[0.1] text-violet-100">
            <FileUp aria-hidden="true" size={21} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-white">Upload a study document</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Files are stored in your private account and processed on the server. Extracted text is sent to the configured embedding provider to support semantic search.
          </p>
          <div className="mx-auto mt-5 grid max-w-md gap-3 text-left sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-xs font-medium text-slate-300" htmlFor="document-category">
              Document category
              <select
                className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0e18] px-3 text-sm text-slate-200"
                id="document-category"
                onChange={(event) => setCategory(event.target.value as DocumentCategory)}
                value={category}
              >
                {DOCUMENT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>{categoryLabels[value]}</option>
                ))}
              </select>
            </label>
            <button
              className="min-h-11 rounded-xl bg-violet-300 px-4 text-sm font-semibold text-[#11101c] transition hover:bg-violet-200 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              type="button"
            >
              {busy ? "Uploading…" : "Choose files"}
            </button>
          </div>
          <input
            accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={busy}
            multiple
            onChange={onFileChange}
            ref={fileInput}
            type="file"
          />
          <p className="mt-3 text-[11px] text-slate-500">
            PDF, TXT, or DOCX · up to {maxUploadLabel} per file
            {subject ? ` · linked to ${subject.name}` : " · no active subject selected"}
          </p>
          {message ? (
            <p aria-live="polite" className="mx-auto mt-4 max-w-xl rounded-xl border border-cyan-200/10 bg-cyan-200/[0.04] p-3 text-xs leading-5 text-cyan-50/80" role="status">
              {message}
            </p>
          ) : null}
          {errorMessage ? (
            <p aria-live="assertive" className="mx-auto mt-4 max-w-xl rounded-xl border border-rose-200/15 bg-rose-200/[0.04] p-3 text-xs leading-5 text-rose-100" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <section className="surface-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Processing pipeline</h2>
            <span className="sample-pill">PRIVATE · SERVER-SIDE</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A document becomes ready only after text extraction, chunk storage, and embeddings finish.
          </p>
          <ol className="mt-5 space-y-3">
            {["Private upload", "Text extraction", "Overlapping source chunks", "Semantic embeddings", "Ready for retrieval"].map((step, index) => (
              <li className="flex items-center gap-3" key={step}>
                <span className={`flex size-7 items-center justify-center rounded-full border text-[10px] ${index === 4 ? "border-emerald-200/15 bg-emerald-200/[0.07] text-emerald-100" : "border-white/[0.08] bg-white/[0.025] text-slate-500"}`}>
                  {index === 4 ? <Check aria-hidden="true" size={13} /> : `0${index + 1}`}
                </span>
                <span className={`text-xs ${index === 4 ? "text-slate-300" : "text-slate-500"}`}>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[11px] text-slate-600">
            Scanned PDFs need OCR, which is not available. Provider configuration is required for embeddings.
          </p>
        </section>
      </section>

      <section className="surface-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Private document library</h2>
            <p className="mt-1 text-xs text-slate-500">Only documents owned by your signed-in account are shown.</p>
          </div>
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-slate-300 transition hover:bg-white/[0.05]"
            onClick={() => void refreshDocuments()}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={13} /> Refresh
          </button>
        </div>

        {listError ? (
          <div className="mb-4 rounded-xl border border-rose-200/15 bg-rose-200/[0.04] p-3 text-xs leading-5 text-rose-100" role="alert">
            {listError}
          </div>
        ) : null}

        {documents.length ? (
          <div className="space-y-2">
            {documents.map((document) => (
              <article className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3" key={document.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-violet-200/[0.07] text-violet-100">
                    <FileText aria-hidden="true" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{document.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {categoryLabels[document.category as DocumentCategory] ?? "Other"} · {formatFileSize(document.sizeBytes)}
                      {document.subjectName ? ` · ${document.subjectName}` : " · Unassigned subject"}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] ${statusClass(document.status)}`}>
                    {document.status === "processing" ? <LoaderCircle aria-hidden="true" className="mr-1 inline animate-spin" size={11} /> : null}
                    {formatStatus(document.status)}
                  </span>
                  {document.status === "failed" ? (
                    <button
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] text-slate-300 transition hover:bg-white/[0.05]"
                      onClick={() => void retry(document)}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={12} /> Retry
                    </button>
                  ) : null}
                  <button
                    aria-expanded={expanded === document.id}
                    aria-label={`Toggle processing details for ${document.name}`}
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.05]"
                    onClick={() => setExpanded(expanded === document.id ? null : document.id)}
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" className={`transition ${expanded === document.id ? "rotate-180" : ""}`} size={15} />
                  </button>
                  <button
                    aria-label={`Delete ${document.name}`}
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-200/[0.06] hover:text-rose-100"
                    onClick={() => setConfirmDelete(confirmDelete === document.id ? null : document.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </button>
                </div>

                {expanded === document.id ? (
                  <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-2">
                    <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
                      <Clock3 aria-hidden="true" className="mt-0.5 shrink-0" size={13} />
                      Uploaded {new Date(document.uploadedAt).toLocaleString()}
                      {document.processedAt ? ` · processed ${new Date(document.processedAt).toLocaleString()}` : ""}
                    </p>
                    <p className="text-[11px] leading-5 text-slate-400">
                      {document.status === "ready"
                        ? `${document.extractedTextChars.toLocaleString()} extracted characters · ${document.chunkCount} embedded chunks`
                        : `${document.processingAttempts} processing attempt${document.processingAttempts === 1 ? "" : "s"} · ${document.mimeType}`}
                    </p>
                    {document.error ? (
                      <p className="sm:col-span-2 rounded-lg border border-rose-200/10 bg-rose-200/[0.03] p-3 text-xs leading-5 text-rose-100" role="status">
                        <AlertCircle aria-hidden="true" className="mr-1.5 inline" size={13} />
                        {document.error}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {confirmDelete === document.id ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200/10 bg-rose-200/[0.025] p-3">
                    <p className="text-xs text-slate-300">Delete this file and its extracted chunks? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button className="min-h-8 rounded-lg border border-white/10 px-3 text-[11px] text-slate-300" onClick={() => setConfirmDelete(null)} type="button">Cancel</button>
                      <button className="min-h-8 rounded-lg bg-rose-300/90 px-3 text-[11px] font-semibold text-[#1b0b12]" onClick={() => void deleteDocument(document)} type="button">Delete document</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <AlertCircle aria-hidden="true" className="mx-auto text-slate-500" size={20} />
            <p className="mt-2 text-sm text-slate-300">No private documents uploaded yet.</p>
            <p className="mt-1 text-xs text-slate-500">Your real uploaded study files will appear here; demo files are not mixed into this library.</p>
          </div>
        )}
      </section>
    </div>
  );
}
