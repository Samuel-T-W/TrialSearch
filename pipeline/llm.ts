// One LLM wrapper for the whole pipeline.
//
// Two providers behind a tiny interface so Bedrock (or anything else) can swap in
// by implementing `complete()` only:
//   - 'anthropic' (default when ANTHROPIC_API_KEY is set; model COMPILE_MODEL, default claude-haiku-5-5)
//   - 'deepseek'  (default when DEEPSEEK_API_KEY is set; DEEPSEEK_MODEL, default deepseek-flash)
//   - 'mock'      (LLM_PROVIDER=mock; a deterministic responder fn, used by tests and no-key runs)
//
// callJson<T>() asks the model for JSON, zod-validates it, and retries up to 3 times,
// feeding the validation error back into the prompt. Successful calls are cached on
// disk keyed by sha256(model + system + user + input), so reruns are free.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";

export const CACHE_DIR = join(import.meta.dirname, "..", "data", "cache", "llm");

// Claude names in COMPILE_MODEL/EVAL_MODEL are ignored when DeepSeek is selected,
// so copying .env.example unchanged never sends a Claude model id to DeepSeek.
function pickModel(envVal: string | undefined, claudeDefault: string): string {
  const ds = selectedProvider() === "deepseek";
  if (ds) return envVal?.startsWith("deepseek") ? envVal : process.env.DEEPSEEK_MODEL || "deepseek-flash";
  return envVal || claudeDefault;
}
export const DEFAULT_COMPILE_MODEL = pickModel(process.env.COMPILE_MODEL, "claude-haiku-5-5");
export const DEFAULT_EVAL_MODEL = pickModel(process.env.EVAL_MODEL, "claude-sonnet-5-5");

/** The only thing a provider must implement. Return the model's raw text. */
export interface LlmProvider {
  name: string;
  complete(args: { system: string; user: string; model: string }): Promise<string>;
}

/** A deterministic responder for the mock provider: map a request to raw text. */
export type MockResponder = (args: { system: string; user: string; model: string }) => string;

export class MockProvider implements LlmProvider {
  name = "mock";
  constructor(private responder: MockResponder) {}
  async complete(args: { system: string; user: string; model: string }): Promise<string> {
    return this.responder(args);
  }
}

export class AnthropicProvider implements LlmProvider {
  name = "anthropic";
  private client: any;
  constructor(apiKey: string) {
    // Imported lazily so the SDK never loads for mock/no-key runs.
    // (require is fine here: CJS interop is enabled.)
    const Anthropic = require("@anthropic-ai/sdk").default ?? require("@anthropic-ai/sdk");
    this.client = new Anthropic({ apiKey });
  }
  async complete(args: { system: string; user: string; model: string }): Promise<string> {
    const resp = await this.client.messages.create({
      model: args.model,
      max_tokens: 4096,
      system: args.system,
      messages: [{ role: "user", content: args.user }],
    });
    const parts = (resp.content ?? []) as Array<{ type: string; text?: string }>;
    return parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("");
  }
}

/** DeepSeek via its OpenAI-compatible chat API. Plain fetch, no SDK. */
export class DeepSeekProvider implements LlmProvider {
  name = "deepseek";
  constructor(
    private apiKey: string,
    private baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  ) {}
  async complete(args: { system: string; user: string; model: string }): Promise<string> {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: args.model,
        max_tokens: 8192,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        stream: false,
      }),
    });
    if (!resp.ok) {
      // Never echo the key; the body is the API's own error text.
      const body = await resp.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${resp.status}: ${body.slice(0, 300)}`);
    }
    const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

/** Which provider the environment selects, without building it. */
export function selectedProvider(): "mock" | "anthropic" | "deepseek" | "none" {
  const forced = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (forced === "mock" || forced === "anthropic" || forced === "deepseek") return forced;
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

let cachedMockResponder: MockResponder | undefined;
/** Tests install their deterministic responder here before constructing an Llm. */
export function setMockResponder(fn: MockResponder) {
  cachedMockResponder = fn;
}

/** Choose a provider from the environment. 'mock' wins when asked for explicitly or when no key. */
export function defaultProvider(): LlmProvider {
  const sel = selectedProvider();
  if (sel === "mock") {
    return new MockProvider(cachedMockResponder ?? (() => "{}"));
  }
  if (sel === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("LLM_PROVIDER=deepseek but DEEPSEEK_API_KEY is not set.");
    return new DeepSeekProvider(key);
  }
  if (sel === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.");
    return new AnthropicProvider(key);
  }
  // No provider configured: fall back to mock so nothing crashes without a key.
  return new MockProvider(cachedMockResponder ?? (() => "{}"));
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Pull the first JSON object/array out of a model response that may wrap it in prose or fences. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.search(/[[{]/);
  if (start === -1) return text.trim();
  // Walk to the matching close bracket so trailing prose is dropped.
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1).trim();
    }
  }
  return text.slice(start).trim();
}

export interface CallJsonArgs<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model?: string;
  /** Skip the disk cache (tests use this to force the provider to run). */
  noCache?: boolean;
  /** Extra input folded into the cache key (e.g. a raw record), without bloating the prompt. */
  cacheInput?: string;
}

export class Llm {
  constructor(
    private provider: LlmProvider = defaultProvider(),
    private model: string = DEFAULT_COMPILE_MODEL,
  ) {}

  get providerName() {
    return this.provider.name;
  }

  private cachePath(key: string) {
    return join(CACHE_DIR, `${key}.json`);
  }

  /** Ask for JSON, validate with zod, retry up to 3 times feeding the error back. */
  async callJson<T>(args: CallJsonArgs<T>): Promise<T> {
    const model = args.model ?? this.model;
    const cacheKey = sha256([model, args.system, args.user, args.cacheInput ?? ""].join("\u0000"));
    const cacheFile = this.cachePath(cacheKey);

    if (!args.noCache && existsSync(cacheFile)) {
      const raw = JSON.parse(readFileSync(cacheFile, "utf8"));
      const parsed = args.schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      // Stale/invalid cache: fall through and recompute.
    }

    let lastErr = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const user =
        attempt === 1
          ? args.user
          : `${args.user}\n\nYour previous reply failed validation with this error:\n${lastErr}\nReturn ONLY corrected JSON that satisfies the schema. No prose, no code fences.`;
      let text: string;
      try {
        text = await this.provider.complete({ system: args.system, user, model });
      } catch (e: any) {
        lastErr = `provider error: ${e?.message ?? e}`;
        continue;
      }
      let obj: unknown;
      try {
        obj = JSON.parse(extractJson(text));
      } catch (e: any) {
        lastErr = `not valid JSON: ${e?.message ?? e}. Got: ${text.slice(0, 400)}`;
        continue;
      }
      const parsed = args.schema.safeParse(obj);
      if (parsed.success) {
        if (!args.noCache) {
          mkdirSync(CACHE_DIR, { recursive: true });
          writeFileSync(cacheFile, JSON.stringify(parsed.data, null, 2));
        }
        return parsed.data;
      }
      lastErr = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    throw new Error(`callJson failed after 3 attempts. Last error: ${lastErr}`);
  }
}
