// compile.ts = sem_map over trials (plan 6.1).
//
// One LLM call per trial -> condition ids, checks[] (minus age/sex), and plain
// English + Spanish title/summary. Age and sex checks are generated in code from
// the structured API fields, never by the LLM. Master-protocol / missing-criteria
// trials get flags and no LLM checks. Output validates against CompiledTrial.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { type CompiledTrial, type LocalizedText, RawTrial, type Site } from "../shared/schema";
import { CONDITIONS, MED_CLASSES } from "../shared/vocab";
import { KNOWN_CONDITION_IDS, detectFlags, finalizeChecks, normalizeSex, parseAgeYears, structuralChecks } from "./checks";
import { DEFAULT_COMPILE_MODEL, Llm } from "./llm";

export { normalizeSex, parseAgeYears } from "./checks";

const DEMO_SCOPE_IDS = new Set(CONDITIONS.filter((c) => c.demo).map((c) => c.id));

// --- Prompt (rules copied verbatim from plan 6.1) ------------------------------

const COMPILE_SYSTEM = `You compile clinical-trial eligibility criteria into structured checks a patient-matching app can evaluate. You output ONLY JSON.

Rules:
- Split the criteria into atomic rules. One rule per check.
- Map to a condition or medication check only when the rule clearly names something in the vocab. Otherwise use a question with a plain yes/no question a patient can answer, or clinician if it needs a lab value, imaging, or a doctor's judgment.
- If the text says "see master protocol" or criteria are missing, emit no checks and set the flag.
- If unsure, emit unparsed with confidence "low". Never guess an exclusion.
- plain lines: second person, under 20 words, no jargon, about 6th-grade reading level.
- Copy sourceText verbatim.

Do NOT emit age or sex checks; those come from structured fields outside your control.
Only use condition ids and medication class ids from the vocab lists you are given. For a question check, write the plain question text; an id is assigned later.`;

/** Schema for exactly what the LLM returns (ids assigned by us afterwards). */
const LlmCheck = z.object({
  polarity: z.enum(["include", "exclude"]),
  kind: z.enum(["condition", "medication", "question", "clinician", "unparsed"]),
  params: z.record(z.string(), z.unknown()).default({}),
  sourceText: z.string(),
  plain: z.object({ en: z.string().min(1), es: z.string().optional() }).catchall(z.string()),
  confidence: z.enum(["high", "low"]),
});
const LlmOut = z.object({
  conditionIds: z.array(z.string()).default([]),
  title: z.object({ en: z.string().min(1), es: z.string().optional() }).catchall(z.string()),
  summary: z.object({ en: z.string().min(1), es: z.string().optional() }).catchall(z.string()),
  checks: z.array(LlmCheck).default([]),
});
export type LlmOut = z.infer<typeof LlmOut>;

function vocabBlock(): string {
  const conds = CONDITIONS.map((c) => `${c.id}: ${c.label} (${c.synonyms.join(", ")})`).join("\n");
  const meds = MED_CLASSES.map((m) => `${m.id}: ${m.label} (${m.brands.join(", ")})`).join("\n");
  return `CONDITIONS (id: label (synonyms)):\n${conds}\n\nMED_CLASSES (id: label (brands)):\n${meds}`;
}

function userPrompt(t: RawTrial): string {
  return `Compile this trial. Return JSON with keys: conditionIds (string[]), title ({en, es}), summary ({en, es}), checks (array).

VOCAB:
${vocabBlock()}

TRIAL:
nctId: ${t.nctId}
title: ${t.briefTitle}
conditions: ${t.conditions.join(", ") || "(none listed)"}
summary: ${t.briefSummary ?? "(none)"}
eligibilityCriteria:
${t.eligibilityCriteria ?? "(none)"}

Each check object: { polarity: "include"|"exclude", kind: "condition"|"medication"|"question"|"clinician"|"unparsed", params, sourceText, plain: {en, es}, confidence: "high"|"low" }.
- condition params: { conditionIds: string[] }
- medication params: { medClassIds: string[], withinDays?: number, minDays?: number }
- question params: { question: "the plain yes/no question in English" }
- clinician/unparsed params: {} or a short descriptor.`;
}

export interface CompileDeps {
  llm?: Llm;
  model?: string;
}

/** Compile a single RawTrial into a CompiledTrial. */
export async function compileTrial(t: RawTrial, deps: CompileDeps = {}): Promise<CompiledTrial> {
  const llm = deps.llm ?? new Llm();
  const model = deps.model ?? DEFAULT_COMPILE_MODEL;

  const ageMin = parseAgeYears(t.minimumAge);
  const ageMax = parseAgeYears(t.maximumAge);
  const sex = normalizeSex(t.sex);
  const flags = detectFlags(t);
  const structural = structuralChecks(t, ageMin, ageMax, sex);

  const sites: Site[] = t.locations;
  const base: Omit<CompiledTrial, "title" | "summary" | "conditionIds" | "checks"> = {
    nctId: t.nctId,
    phase: t.phases,
    healthyVolunteers: t.healthyVolunteers ?? false,
    ageMin,
    ageMax,
    sex,
    sites,
    contact: t.contact,
    flags,
    officialUrl: `https://clinicaltrials.gov/study/${t.nctId}`,
  };

  // Master-protocol / missing criteria -> no LLM checks (plan rule).
  if (flags.length > 0) {
    return {
      ...base,
      title: { en: t.briefTitle },
      summary: { en: t.briefSummary ?? t.briefTitle },
      conditionIds: [],
      checks: finalizeChecks(t.nctId, structural, []),
    };
  }

  const out = await llm.callJson<LlmOut>({
    system: COMPILE_SYSTEM,
    user: userPrompt(t),
    schema: LlmOut,
    model,
    cacheInput: JSON.stringify({ c: t.conditions, e: t.eligibilityCriteria }),
  });

  const conditionIds = out.conditionIds.filter((id) => KNOWN_CONDITION_IDS.has(id));
  const title: LocalizedText = { en: out.title.en };
  for (const [k, v] of Object.entries(out.title)) if (k !== "en" && v) (title as any)[k] = v;
  const summary: LocalizedText = { en: out.summary.en };
  for (const [k, v] of Object.entries(out.summary)) if (k !== "en" && v) (summary as any)[k] = v;

  return {
    ...base,
    title,
    summary,
    conditionIds,
    checks: finalizeChecks(t.nctId, structural, out.checks),
  };
}

/** Compile a list, bounded by COMPILE_CONCURRENCY. */
export async function compileTrials(
  trials: RawTrial[],
  deps: CompileDeps = {},
): Promise<CompiledTrial[]> {
  const { default: pLimit } = await import("p-limit");
  const concurrency = Number(process.env.COMPILE_CONCURRENCY || 16);
  const limit = pLimit(concurrency);
  let done = 0;
  let failed = 0;
  const out = await Promise.all(
    trials.map((t) =>
      limit(async () => {
        let c: CompiledTrial | null = null;
        try {
          c = await compileTrial(t, deps);
        } catch (e: any) {
          // One bad trial must not sink a 3,000-trial run. It is left out of the
          // bundle (never shipped half-valid) and retried free-of-charge next run.
          failed++;
          console.warn(`  skip ${t.nctId}: ${String(e?.message ?? e).slice(0, 200)}`);
        }
        done++;
        if (done % 50 === 0 || done === trials.length) console.log(`  compiled ${done}/${trials.length} (${failed} skipped)`);
        return c;
      }),
    ),
  );
  return out.filter((c): c is CompiledTrial => c !== null);
}

/** COMPILE_SCOPE=demo keeps only trials whose conditions hit a demo condition. */
function inDemoScope(t: RawTrial): boolean {
  const hay = [...t.conditions, t.briefTitle].join(" ").toLowerCase();
  for (const cid of DEMO_SCOPE_IDS) {
    const cond = CONDITIONS.find((c) => c.id === cid)!;
    const terms = [cond.label, ...cond.synonyms].map((s) => s.toLowerCase());
    if (terms.some((term) => hay.includes(term))) return true;
  }
  return false;
}

export function loadRawTrials(path?: string): RawTrial[] {
  const p = path ?? join(import.meta.dirname, "..", "data", "raw", "trials.json");
  const arr = JSON.parse(readFileSync(p, "utf8"));
  return z.array(RawTrial).parse(arr);
}

export async function runCompile(opts: { raw?: RawTrial[]; deps?: CompileDeps } = {}): Promise<CompiledTrial[]> {
  let raw = opts.raw ?? loadRawTrials();
  const scope = (process.env.COMPILE_SCOPE || "all").toLowerCase();
  if (scope === "demo") {
    raw = raw.filter(inDemoScope);
    console.log(`COMPILE_SCOPE=demo: ${raw.length} trials in demo conditions`);
  }
  const cap = Number(process.env.COMPILE_LIMIT || 0);
  if (cap > 0) raw = raw.slice(0, cap);
  console.log(`Compiling ${raw.length} trials...`);
  return compileTrials(raw, opts.deps);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCompile()
    .then((c) => console.log(`Compiled ${c.length} trials`))
    .catch((e) => {
      console.error("Compile failed:", e.message);
      process.exit(1);
    });
}
