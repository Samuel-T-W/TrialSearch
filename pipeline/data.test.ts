// Store-only builds read files and never need an API key.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");

function run(script: string, args: string[], env: Record<string, string | undefined>) {
  try {
    const stdout = execFileSync("npx", ["tsx", join(ROOT, script), ...args], {
      cwd: ROOT,
      env: { ...process.env, ANTHROPIC_API_KEY: undefined, DEEPSEEK_API_KEY: undefined, DATA_SOURCE: undefined, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, out: stdout, err: "" };
  } catch (e: any) {
    return { status: e.status ?? 1, out: e.stdout?.toString() ?? "", err: e.stderr?.toString() ?? "" };
  }
}

describe("store-only data builds", () => {
  it("builds the store trials with no API key, ignoring a leftover DATA_SOURCE", () => {
    const r = run("pipeline/data.ts", [], { DATA_SOURCE: "fixture" });
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/store: wrote \d+ trials/);
  }, 60_000);

  it("rejects any source other than the store", () => {
    const r = run("pipeline/data.ts", ["fixture"], {});
    expect(r.status).not.toBe(0);
    expect(r.err).toContain("Only the store is supported.");
  }, 60_000);

  it("store check runs with no API key", () => {
    const r = run("pipeline/store.ts", ["--check"], {});
    expect(r.out + r.err).toMatch(/valid/);
  }, 60_000);

  it("compile:store without a key exits with a clear message", () => {
    const r = run("pipeline/run.ts", [], { ANTHROPIC_API_KEY: "", DEEPSEEK_API_KEY: "", LLM_PROVIDER: "" });
    expect(r.status).not.toBe(0);
    expect(r.err).toMatch(/DEEPSEEK_API_KEY or ANTHROPIC_API_KEY/);
  }, 60_000);
});
