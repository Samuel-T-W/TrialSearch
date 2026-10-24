import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Llm, MockProvider, extractJson } from "./llm";

const Schema = z.object({ n: z.number() });

describe("extractJson", () => {
  it("pulls JSON out of a fenced block", () => {
    expect(extractJson('text\n```json\n{"n": 1}\n```\nmore')).toBe('{"n": 1}');
  });
  it("pulls JSON out of surrounding prose", () => {
    expect(extractJson('Sure! {"n": 2} hope that helps')).toBe('{"n": 2}');
  });
  it("handles nested braces and strings with braces", () => {
    expect(extractJson('{"a": {"b": "}"}}')).toBe('{"a": {"b": "}"}}');
  });
});

describe("Llm.callJson", () => {
  let cacheDir: string;
  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), "llm-test-"));
    vi.stubEnv("LLM_PROVIDER", "mock");
  });
  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("retries on invalid output, feeding the error back, then succeeds", async () => {
    let calls = 0;
    const provider = new MockProvider(() => {
      calls++;
      // First reply is invalid (wrong type), second is valid.
      return calls === 1 ? '{"n": "not a number"}' : '{"n": 42}';
    });
    const llm = new Llm(provider);
    const out = await llm.callJson({ system: "s", user: "u", schema: Schema, noCache: true });
    expect(out).toEqual({ n: 42 });
    expect(calls).toBe(2);
  });

  it("throws after 3 failed attempts", async () => {
    let calls = 0;
    const provider = new MockProvider(() => {
      calls++;
      return '{"n": "still bad"}';
    });
    const llm = new Llm(provider);
    await expect(llm.callJson({ system: "s", user: "u", schema: Schema, noCache: true })).rejects.toThrow(
      /failed after 3 attempts/,
    );
    expect(calls).toBe(3);
  });

  it("caches successes so the provider runs once across calls", async () => {
    let calls = 0;
    const provider = new MockProvider(() => {
      calls++;
      return '{"n": 7}';
    });
    const llm = new Llm(provider);
    // Unique prompt per test run so a leftover on-disk cache file never masks the miss.
    const user = `cache-user-${Date.now()}-${Math.random()}`;
    const a = await llm.callJson({ system: "cache-sys", user, schema: Schema });
    const b = await llm.callJson({ system: "cache-sys", user, schema: Schema });
    expect(a).toEqual({ n: 7 });
    expect(b).toEqual({ n: 7 });
    expect(calls).toBe(1);
  });
});
