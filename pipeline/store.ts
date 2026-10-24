// The trial store: the app's "database".
//
//   data/store/trials/<NCT ID>.json   one CompiledTrial per file (shared/schema.ts)
//   data/store/questions.json         extra yes/no questions the trials reference
//                                     (merged with QUESTION_BANK in shared/vocab.ts)
//
// Anyone (a person, another agent, the optional LLM pipeline) adds trials by
// dropping a file in data/store/trials/. `npm run data` validates every file and
// builds the per-language bundles the phone downloads. Every phone gets the same
// full bundle, so the server never learns which trials matter to a patient.
//
//   npx tsx pipeline/store.ts --check   validate only, write nothing
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CompiledTrial, Question } from "../shared/schema";
import { CONDITIONS, MED_CLASSES, QUESTION_BANK } from "../shared/vocab";
import { writeBundles } from "./bundle";

export const STORE_DIR = join(import.meta.dirname, "..", "data", "store");
export const STORE_TRIALS_DIR = join(STORE_DIR, "trials");
export const STORE_QUESTIONS = join(STORE_DIR, "questions.json");

export type StoreLoad = { trials: CompiledTrial[]; questions: Question[]; errors: string[] };

export function loadStore(): StoreLoad {
  const errors: string[] = [];
  const trials: CompiledTrial[] = [];

  const extra: Question[] = existsSync(STORE_QUESTIONS)
    ? z.array(Question).parse(JSON.parse(readFileSync(STORE_QUESTIONS, "utf8")))
    : [];
  const byId = new Map<string, Question>();
  for (const q of [...QUESTION_BANK, ...extra]) byId.set(q.id, q);

  const conditionIds = new Set(CONDITIONS.map((c) => c.id));
  const medIds = new Set(MED_CLASSES.map((m) => m.id));

  const files = existsSync(STORE_TRIALS_DIR)
    ? readdirSync(STORE_TRIALS_DIR).filter((f) => f.endsWith(".json")).sort()
    : [];
  for (const f of files) {
    const where = `data/store/trials/${f}`;
    let obj: unknown;
    try {
      obj = JSON.parse(readFileSync(join(STORE_TRIALS_DIR, f), "utf8"));
    } catch (e: any) {
      errors.push(`${where}: not valid JSON (${e.message})`);
      continue;
    }
    const parsed = CompiledTrial.safeParse(obj);
    if (!parsed.success) {
      errors.push(`${where}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      continue;
    }
    const t = parsed.data as CompiledTrial;
    const problems: string[] = [];
    if (f !== `${t.nctId}.json`) problems.push(`file name must be ${t.nctId}.json`);
    for (const id of t.conditionIds) if (!conditionIds.has(id)) problems.push(`unknown conditionId "${id}"`);
    for (const c of t.checks) {
      if (!c.id.startsWith(`${t.nctId}#`)) problems.push(`check ${c.id} must start with ${t.nctId}#`);
      const p = c.params as Record<string, unknown>;
      if (c.kind === "condition")
        for (const id of (p.conditionIds as string[]) ?? []) if (!conditionIds.has(id)) problems.push(`${c.id}: unknown conditionId "${id}"`);
      if (c.kind === "medication")
        for (const id of (p.medClassIds as string[]) ?? []) if (!medIds.has(id)) problems.push(`${c.id}: unknown medClassId "${id}"`);
      if (c.kind === "question" && !byId.has(p.questionId as string))
        problems.push(`${c.id}: questionId "${p.questionId}" is not in QUESTION_BANK or data/store/questions.json`);
    }
    if (problems.length) errors.push(`${where}: ${problems.join("; ")}`);
    else trials.push(t);
  }
  return { trials, questions: [...byId.values()], errors };
}

/** Write (or overwrite) trials into the store. Used by the optional LLM pipeline. */
export function saveToStore(trials: CompiledTrial[], questions: Question[] = []) {
  mkdirSync(STORE_TRIALS_DIR, { recursive: true });
  for (const t of trials) writeFileSync(join(STORE_TRIALS_DIR, `${t.nctId}.json`), JSON.stringify(t, null, 2) + "\n");
  if (questions.length) {
    const seeded = new Set(QUESTION_BANK.map((q) => q.id));
    const prev: Question[] = existsSync(STORE_QUESTIONS) ? JSON.parse(readFileSync(STORE_QUESTIONS, "utf8")) : [];
    const merged = new Map(prev.map((q) => [q.id, q]));
    for (const q of questions) if (!seeded.has(q.id)) merged.set(q.id, q);
    writeFileSync(STORE_QUESTIONS, JSON.stringify([...merged.values()], null, 2) + "\n");
  }
}

export function buildFromStore() {
  const { trials, questions, errors } = loadStore();
  for (const e of errors) console.error(`  invalid, skipped: ${e}`);
  if (trials.length === 0) throw new Error("data/store/trials/ has no valid trials. Add some, or run `npm run data:fixture`.");
  const r = writeBundles({ trials, questions, source: "live" });
  console.log(`store: wrote ${r.trialCount} trials to ${r.outDir}${errors.length ? ` (${errors.length} invalid skipped)` : ""}`);
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--check")) {
    const { trials, errors } = loadStore();
    for (const e of errors) console.error(e);
    console.log(`${trials.length} valid, ${errors.length} invalid`);
    process.exit(errors.length ? 1 : 0);
  }
  buildFromStore();
}
