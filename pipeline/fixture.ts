// Data source: the hand-written fixture. No network, no API key.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CompiledTrial } from "../shared/schema";
import { QUESTION_BANK } from "../shared/vocab";
import { writeBundles } from "./bundle";

export const FIXTURE_PATH = join(import.meta.dirname, "..", "data", "fixtures", "compiled.sample.json");

export function loadFixtureTrials(): CompiledTrial[] {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")).trials;
}

export function buildFixture() {
  const r = writeBundles({ trials: loadFixtureTrials(), questions: QUESTION_BANK, source: "fixture" });
  console.log(`fixture: wrote ${r.trialCount} trials to ${r.outDir}`);
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) buildFixture();
