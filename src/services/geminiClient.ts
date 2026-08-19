import type { GoogleGenAI, Type } from '@google/genai';

/**
 * Thin wrapper around the official Google Gen AI SDK.
 *
 * Everything in RoadmapAI degrades to a deterministic local synthesis when no
 * key is configured, so the app is fully explorable in the published demo. The
 * only difference is the badge in the header and the provenance on generated
 * content.
 */

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();
export const MODEL = (import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.5-flash').trim();

let client: GoogleGenAI | null = null;

export function isAiEnabled(): boolean {
  return API_KEY.length > 0;
}

/**
 * The SDK is ~280kB and is only needed once a generation is actually requested,
 * so it is imported on first use rather than at module load.
 */
async function getClient(): Promise<GoogleGenAI> {
  if (!client) {
    const { GoogleGenAI: GenAI } = await import('@google/genai');
    client = new GenAI({ apiKey: API_KEY });
  }
  return client;
}

/**
 * `Type` is a runtime enum, so importing the real one as a value would pull the
 * whole SDK into the entry chunk and defeat the lazy import above. Its members
 * are plain strings, so they are mirrored here.
 */
export const SchemaType = {
  OBJECT: 'OBJECT' as Type,
  ARRAY: 'ARRAY' as Type,
  STRING: 'STRING' as Type,
  INTEGER: 'INTEGER' as Type,
  NUMBER: 'NUMBER' as Type,
  BOOLEAN: 'BOOLEAN' as Type,
};

export class AiUnavailableError extends Error {
  constructor(message = 'No VITE_GEMINI_API_KEY configured') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

/** Strips markdown fences the model sometimes wraps around JSON. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.search(/[[{]/);
  if (firstBrace > 0) return trimmed.slice(firstBrace);
  return trimmed;
}

export interface GenerateJsonOptions {
  prompt: string;
  systemInstruction: string;
  /** A responseSchema object as accepted by the Gen AI SDK. */
  responseSchema: Record<string, unknown>;
  temperature?: number;
}

/**
 * Runs a structured-output request and parses the result.
 * Throws on any failure so callers can decide whether to fall back.
 */
export async function generateJson<T>({
  prompt,
  systemInstruction,
  responseSchema,
  temperature = 0.6,
}: GenerateJsonOptions): Promise<T> {
  if (!isAiEnabled()) throw new AiUnavailableError();

  const ai = await getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature,
      responseMimeType: 'application/json',
      // The SDK's Schema type is structurally what we pass; cast keeps the
      // call site readable without importing the full type surface.
      responseSchema: responseSchema as never,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Empty response from the model');

  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    throw new Error('Model returned malformed JSON');
  }
}
