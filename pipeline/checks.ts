// checks.ts = the code-side half of compile: structured age/sex checks, flags,
// and turning raw LLM checks into schema Checks with ids.
import type { Check, LocalizedText, RawTrial } from "../shared/schema";
import { CONDITIONS, MED_CLASSES, QUESTION_BANK } from "../shared/vocab";
import type { LlmOut } from "./compile";

/** Parse a ClinicalTrials.gov age string like "18 Years" / "6 Months" to whole years. */
export function parseAgeYears(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(year|month|week|day)/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("year")) return Math.round(n);
  if (unit.startsWith("month")) return Math.floor(n / 12);
  if (unit.startsWith("week")) return Math.floor(n / 52);
  return Math.floor(n / 365);
}

export function normalizeSex(s?: string): "ALL" | "MALE" | "FEMALE" {
  const v = (s ?? "ALL").toUpperCase();
  if (v === "MALE" || v === "FEMALE") return v;
  return "ALL";
}

/** Age/sex checks are derived here, from structured fields. */
export function structuralChecks(t: RawTrial, ageMin?: number, ageMax?: number, sex?: "ALL" | "MALE" | "FEMALE"): Check[] {
  const out: Check[] = [];
  if (ageMin !== undefined || ageMax !== undefined) {
    const lo = ageMin ?? 0;
    const hi = ageMax ?? 120;
    const en =
      ageMax !== undefined
        ? `You are ${lo} to ${hi} years old.`
        : `You are ${lo} or older.`;
    const es =
      ageMax !== undefined
        ? `Tiene entre ${lo} y ${hi} años.`
        : `Tiene ${lo} años o más.`;
    out.push({
      id: "", // assigned later
      polarity: "include",
      kind: "age",
      params: { min: lo, max: hi },
      sourceText: `Age ${t.minimumAge ?? lo}${t.maximumAge ? ` to ${t.maximumAge}` : " and up"}`,
      plain: { en, es },
      confidence: "high",
    });
  }
  if (sex && sex !== "ALL") {
    const en = sex === "MALE" ? "This study is for men." : "This study is for women.";
    const es = sex === "MALE" ? "Este estudio es para hombres." : "Este estudio es para mujeres.";
    out.push({
      id: "",
      polarity: "include",
      kind: "sex",
      params: { sex },
      sourceText: `Sex: ${sex}`,
      plain: { en, es },
      confidence: "high",
    });
  }
  return out;
}

export const KNOWN_CONDITION_IDS = new Set(CONDITIONS.map((c) => c.id));
const KNOWN_MED_IDS = new Set(MED_CLASSES.map((m) => m.id));

/** A question whose plain text matches a seed in the bank reuses that id. */
function seedQuestionId(questionText: string): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const n = norm(questionText);
  const hit = QUESTION_BANK.find((q) => norm(q.text.en) === n);
  return hit?.id;
}

export function detectFlags(t: RawTrial): ("master_protocol" | "criteria_missing")[] {
  const flags: ("master_protocol" | "criteria_missing")[] = [];
  const crit = (t.eligibilityCriteria ?? "").trim();
  if (/see\s+(the\s+)?master\s+protocol|master\s+protocol\s+for/i.test(crit)) flags.push("master_protocol");
  if (!crit) flags.push("criteria_missing");
  return flags;
}

/** Turn LLM checks into schema Checks, assigning ids and filtering junk vocab ids. */
export function finalizeChecks(nctId: string, structural: Check[], llm: LlmOut["checks"]): Check[] {
  const checks: Check[] = [...structural];
  for (const c of llm) {
    let kind = c.kind;
    let params: Record<string, unknown> = { ...c.params };

    if (kind === "condition") {
      const ids = (Array.isArray(params.conditionIds) ? (params.conditionIds as string[]) : []).filter((id) =>
        KNOWN_CONDITION_IDS.has(id),
      );
      if (ids.length === 0) {
        kind = "unparsed";
        params = {};
      } else {
        params = { conditionIds: ids };
      }
    } else if (kind === "medication") {
      const ids = (Array.isArray(params.medClassIds) ? (params.medClassIds as string[]) : []).filter((id) =>
        KNOWN_MED_IDS.has(id),
      );
      if (ids.length === 0) {
        kind = "unparsed";
        params = {};
      } else {
        const next: Record<string, unknown> = { medClassIds: ids };
        if (typeof params.withinDays === "number") next.withinDays = params.withinDays;
        if (typeof params.minDays === "number") next.minDays = params.minDays;
        params = next;
      }
    } else if (kind === "question") {
      const qtext = typeof params.question === "string" ? params.question : c.plain.en;
      const existing = seedQuestionId(qtext);
      // Provisional id = text; dedupe.ts assigns stable bank ids.
      params = { questionId: existing ?? `pending:${qtext}` };
    }

    const plain: LocalizedText = { en: c.plain.en };
    for (const [k, v] of Object.entries(c.plain)) if (k !== "en" && v) (plain as any)[k] = v;

    checks.push({
      id: "",
      polarity: c.polarity,
      kind,
      params,
      sourceText: c.sourceText,
      plain,
      confidence: kind === "unparsed" ? "low" : c.confidence,
    });
  }
  // Assign sequential ids: `${nctId}#${n}`, starting at 1.
  return checks.map((c, i) => ({ ...c, id: `${nctId}#${i + 1}` }));
}
