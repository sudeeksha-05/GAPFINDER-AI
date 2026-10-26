import "server-only";

import { z } from "zod";
import {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/lib/documents/config";

const responseSchema = z.object({
  data: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      embedding: z.array(z.number()),
    }),
  ),
});

export class EmbeddingProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}

export function assertEmbeddingConfigured() {
  if (!process.env.OPENAI_API_KEY) {
    throw new EmbeddingProviderError(
      "Embedding service is not configured. Set OPENAI_API_KEY on the server before processing documents.",
    );
  }
}

async function embedBatch(texts: string[]) {
  assertEmbeddingConfigured();
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
  } catch {
    throw new EmbeddingProviderError(
      "The embedding service could not be reached. Check network access and retry.",
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new EmbeddingProviderError(
        "The embedding provider rejected the server API key. Check OPENAI_API_KEY.",
      );
    }
    if (response.status === 429) {
      throw new EmbeddingProviderError(
        "The embedding provider is rate-limiting requests. Wait briefly and retry.",
      );
    }
    throw new EmbeddingProviderError(
      "The embedding provider could not process this request. Retry shortly.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new EmbeddingProviderError("The embedding provider returned an invalid response.");
  }
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.data.length !== texts.length) {
    throw new EmbeddingProviderError(
      "The embedding provider returned an incomplete or invalid response.",
    );
  }

  const ordered = [...parsed.data.data].sort((left, right) => left.index - right.index);
  if (
    ordered.some((item, index) =>
      item.index !== index || item.embedding.length !== EMBEDDING_DIMENSIONS,
    )
  ) {
    throw new EmbeddingProviderError(
      `The embedding provider must return ${EMBEDDING_DIMENSIONS}-dimension vectors.`,
    );
  }
  return ordered.map((item) => item.embedding);
}

export async function createEmbeddings(texts: string[]) {
  if (!texts.length) return [];
  const vectors: number[][] = [];
  for (let offset = 0; offset < texts.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    vectors.push(...(await embedBatch(batch)));
  }
  return vectors;
}
