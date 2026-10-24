// Hand-written trials for tests and the development inspector only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CompiledTrial } from "../shared/schema";

export const FIXTURE_PATH = join(import.meta.dirname, "..", "data", "fixtures", "compiled.sample.json");

export function loadFixtureTrials(): CompiledTrial[] {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")).trials;
}
