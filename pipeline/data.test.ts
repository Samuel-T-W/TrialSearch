// data-source switch: the build reads files only and never needs a key.
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

describe("data switch", () => {
  it("rejects an unknown DATA_SOURCE", () => {
    const r = run("pipeline/data.ts", ["nope"], {});
    expect(r.status).not.toBe(0);
    expect(r.err).toMatch(/store.*fixture/);
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
