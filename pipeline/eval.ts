// eval.ts = accuracy report (plan 6.4).
//
// Reads data/labels/eval.jsonl: a hand-labeled (or model-drafted) set of trials,
// one JSON object per line. Each record names a trial's criteria and, per
// criterion, the expected check kind and polarity. We compile the same trials
// and compare, reporting:
//   - per-criterion kind accuracy
//   - exclusion precision & recall (a wrong exclusion hides a trial, so separate)
//   - share routed to unparsed / clinician
// Output: docs/EVAL_REPORT.md with a table and three example failures.
//
// A second mode (EVAL_DRAFT=1) uses EVAL_MODEL to DRAFT labels from raw text once
// a key exists, independent of the compile output. Without a key, the hand-written
// labels file lets eval run today against the mock.
//
// ---- eval.jsonl format ----
// Each line is one labeled trial:
//   {
//     "nctId": "NCT...",
//     "raw": { ...RawTrial fields enough to compile... },
//     "criteria": [
//       { "sourceText": "verbatim criterion", "kind": "condition|medication|question|clinician|unparsed|age|sex",
//         "polarity": "include|exclude" }
//     ]
//   }
// We match a labeled criterion to a compiled check by normalized sourceText.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { type CheckKind, RawTrial } from "../shared/schema";
import { compileTrial } from "./compile";
import { DEFAULT_EVAL_MODEL, Llm, setMockResponder } from "./llm";
import { mockResponder } from "./mock-responder";

const LABELS_PATH = join(import.meta.dirname, "..", "data", "labels", "eval.jsonl");
const REPORT_PATH = join(import.meta.dirname, "..", "docs", "EVAL_REPORT.md");

const LabelCriterion = z.object({
  sourceText: z.string(),
  kind: z.enum(["age", "sex", "condition", "medication", "question", "clinician", "unparsed"]),
  polarity: z.enum(["include", "exclude"]),
});
const LabelRecord = z.object({
  nctId: z.string(),
  raw: RawTrial,
  criteria: z.array(LabelCriterion),
});
export type LabelRecord = z.infer<typeof LabelRecord>;

export function parseLabels(text: string): LabelRecord[] {
  const out: LabelRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("//") || s.startsWith("#")) continue;
    out.push(LabelRecord.parse(JSON.parse(s)));
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface EvalMetrics {
  trials: number;
  criteria: number;
  kindCorrect: number;
  kindAccuracy: number;
  // exclusion = polarity "exclude"
  exclTruePos: number;
  exclFalsePos: number;
  exclFalseNeg: number;
  exclPrecision: number;
  exclRecall: number;
  unparsedShare: number;
  clinicianShare: number;
  matched: number;
  unmatched: number;
  failures: { nctId: string; sourceText: string; expected: string; got: string }[];
}

export async function evaluate(labels: LabelRecord[], deps: { llm?: Llm } = {}): Promise<EvalMetrics> {
  const llm = deps.llm ?? new Llm();
  let criteria = 0;
  let kindCorrect = 0;
  let matched = 0;
  let unmatched = 0;
  let exclTP = 0;
  let exclFP = 0;
  let exclFN = 0;
  let unparsedCount = 0;
  let clinicianCount = 0;
  let totalChecks = 0;
  const failures: EvalMetrics["failures"] = [];

  for (const rec of labels) {
    const compiled = await compileTrial(rec.raw, { llm });
    const byText = new Map<string, (typeof compiled.checks)[number]>();
    for (const c of compiled.checks) {
      totalChecks++;
      if (c.kind === "unparsed") unparsedCount++;
      if (c.kind === "clinician") clinicianCount++;
      byText.set(norm(c.sourceText), c);
    }

    for (const lab of rec.criteria) {
      criteria++;
      const got = byText.get(norm(lab.sourceText));
      if (!got) {
        unmatched++;
        if (lab.polarity === "exclude") exclFN++;
        failures.length < 20 &&
          failures.push({ nctId: rec.nctId, sourceText: lab.sourceText, expected: `${lab.kind}/${lab.polarity}`, got: "(no matching check)" });
        continue;
      }
      matched++;
      const kindOk = (got.kind as CheckKind) === lab.kind;
      if (kindOk) kindCorrect++;
      else
        failures.length < 20 &&
          failures.push({ nctId: rec.nctId, sourceText: lab.sourceText, expected: `${lab.kind}/${lab.polarity}`, got: `${got.kind}/${got.polarity}` });

      // Exclusion confusion matrix on polarity.
      const gotExcl = got.polarity === "exclude";
      const labExcl = lab.polarity === "exclude";
      if (gotExcl && labExcl) exclTP++;
      else if (gotExcl && !labExcl) exclFP++;
      else if (!gotExcl && labExcl) exclFN++;
    }
  }

  const div = (a: number, b: number) => (b === 0 ? 1 : a / b);
  return {
    trials: labels.length,
    criteria,
    kindCorrect,
    kindAccuracy: div(kindCorrect, matched),
    exclTruePos: exclTP,
    exclFalsePos: exclFP,
    exclFalseNeg: exclFN,
    exclPrecision: div(exclTP, exclTP + exclFP),
    exclRecall: div(exclTP, exclTP + exclFN),
    unparsedShare: div(unparsedCount, totalChecks),
    clinicianShare: div(clinicianCount, totalChecks),
    matched,
    unmatched,
    failures,
  };
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function renderReport(m: EvalMetrics, providerName: string): string {
  const examples = m.failures.slice(0, 3);
  const exampleRows = examples.length
    ? examples
        .map(
          (f, i) =>
            `${i + 1}. **${f.nctId}** - "${f.sourceText}"\n   - expected \`${f.expected}\`, got \`${f.got}\``,
        )
        .join("\n")
    : "_No failures on the labeled set._";

  return `# TrialSearch - Eval Report

Generated: ${new Date().toISOString()}
Compile provider: \`${providerName}\`

Accuracy of the semantic-operator compiler against a hand-labeled set. Exclusion
precision/recall is reported separately because a wrong exclusion hides a trial
from a patient who might qualify.

## Metrics

| Metric | Value |
|---|---|
| Labeled trials | ${m.trials} |
| Labeled criteria | ${m.criteria} |
| Criteria matched to a check | ${m.matched} (${m.unmatched} unmatched) |
| Kind accuracy (on matched) | ${pct(m.kindAccuracy)} (${m.kindCorrect}/${m.matched}) |
| Exclusion precision | ${pct(m.exclPrecision)} |
| Exclusion recall | ${pct(m.exclRecall)} |
| Share routed to \`unparsed\` | ${pct(m.unparsedShare)} |
| Share routed to \`clinician\` | ${pct(m.clinicianShare)} |

Exclusion confusion: TP=${m.exclTruePos}, FP=${m.exclFalsePos}, FN=${m.exclFalseNeg}.

## Example failures

${exampleRows}

---
_Low-confidence or unparsed checks are treated as "ask the study team", never as a hard exclude._
`;
}

// ---- label drafting mode (needs a key) ----

const DraftOut = z.object({
  criteria: z.array(LabelCriterion),
});

export async function draftLabels(raws: RawTrial[], deps: { llm?: Llm } = {}): Promise<LabelRecord[]> {
  const llm = deps.llm ?? new Llm(undefined, DEFAULT_EVAL_MODEL);
  const out: LabelRecord[] = [];
  for (const raw of raws) {
    const d = await llm.callJson({
      system: `You label clinical-trial eligibility criteria for an eval set, independent of any compiler. Split into atomic criteria. For each, give sourceText (verbatim), kind (age|sex|condition|medication|question|clinician|unparsed), polarity (include|exclude). Output ONLY JSON: {"criteria":[...]}.`,
      user: `Label:\n${raw.eligibilityCriteria ?? "(none)"}`,
      schema: DraftOut,
      model: DEFAULT_EVAL_MODEL,
      cacheInput: `draft:${raw.nctId}`,
    });
    out.push({ nctId: raw.nctId, raw, criteria: d.criteria });
  }
  return out;
}

export async function runEval() {
  // So eval runs today without a key: when asked for the mock provider, install
  // the deterministic responder the rest of the pipeline uses.
  if ((process.env.LLM_PROVIDER || "").toLowerCase() === "mock") setMockResponder(mockResponder);

  if (process.env.EVAL_DRAFT === "1") {
    const rawPath = join(import.meta.dirname, "..", "data", "raw", "sample.json");
    const raws = z.array(RawTrial).parse(JSON.parse(readFileSync(rawPath, "utf8"))).slice(0, 40);
    const drafted = await draftLabels(raws);
    const jsonl = drafted.map((r) => JSON.stringify(r)).join("\n");
    writeFileSync(LABELS_PATH, jsonl + "\n");
    console.log(`Drafted ${drafted.length} label records to ${LABELS_PATH}. Spot-check before trusting the report.`);
    return;
  }

  if (!existsSync(LABELS_PATH)) {
    console.error(`No labels at ${LABELS_PATH}. Run with EVAL_DRAFT=1 (needs a key) or add labels by hand.`);
    process.exit(1);
  }
  const labels = parseLabels(readFileSync(LABELS_PATH, "utf8"));
  const llm = new Llm();
  const m = await evaluate(labels, { llm });
  mkdirSync(join(REPORT_PATH, ".."), { recursive: true });
  writeFileSync(REPORT_PATH, renderReport(m, llm.providerName));
  console.log(`Eval: ${m.matched}/${m.criteria} criteria matched, kind accuracy ${pct(m.kindAccuracy)}.`);
  console.log(`Wrote ${REPORT_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEval().catch((e) => {
    console.error("Eval failed:", e.message);
    process.exit(1);
  });
}
