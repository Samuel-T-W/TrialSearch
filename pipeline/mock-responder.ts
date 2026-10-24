// A deterministic mock LLM responder, used by tests and by the no-key
// end-to-end run (LLM_PROVIDER=mock). It inspects the prompt to decide which
// pipeline stage is calling and returns schema-valid JSON with no network.
//
// It is intentionally simple: it keys off marker strings in the system/user
// prompt. It is NOT a model; it just produces well-formed output so the whole
// pipeline can run and be validated without an Anthropic key.
import type { MockResponder } from "./llm";

/** Does the eligibility text mention a term? (case-insensitive) */
function mentions(text: string, ...terms: string[]): boolean {
  const t = text.toLowerCase();
  return terms.some((x) => t.includes(x.toLowerCase()));
}

function compileResponse(user: string): string {
  // Pull the eligibility block for lightweight keyword routing.
  const elig = user.split("eligibilityCriteria:")[1] ?? user;
  const checks: any[] = [];

  if (mentions(elig, "type 2 diabetes", "t2dm")) {
    const exclude = mentions(elig, "exclusion") && mentions(elig, "type 2 diabetes");
    checks.push({
      polarity: exclude ? "exclude" : "include",
      kind: "condition",
      params: { conditionIds: ["t2d"] },
      sourceText: "Type 2 diabetes mellitus",
      plain: {
        en: exclude ? "You cannot join if you have type 2 diabetes." : "You have type 2 diabetes.",
        es: exclude ? "No puede participar si tiene diabetes tipo 2." : "Tiene diabetes tipo 2.",
      },
      confidence: "high",
    });
  }
  if (mentions(elig, "metformin")) {
    checks.push({
      polarity: "include",
      kind: "medication",
      params: { medClassIds: ["metformin"], minDays: 90 },
      sourceText: "On a stable dose of metformin for at least 3 months",
      plain: { en: "You take metformin and have for 3 months.", es: "Toma metformina desde hace 3 meses." },
      confidence: "high",
    });
  }
  if (mentions(elig, "pregnan", "lactating")) {
    checks.push({
      polarity: "exclude",
      kind: "question",
      params: { question: "Are you pregnant, breastfeeding, or planning to get pregnant soon?" },
      sourceText: "Pregnant or lactating",
      plain: { en: "You are not pregnant or breastfeeding.", es: "No está embarazada ni amamantando." },
      confidence: "high",
    });
  }
  if (mentions(elig, "hba1c", "egfr", "creatinine", "ejection fraction")) {
    checks.push({
      polarity: "include",
      kind: "clinician",
      params: { test: "lab value" },
      sourceText: "HbA1c between 7.0% and 10.5%",
      plain: { en: "Your HbA1c is in a set range.", es: "Su HbA1c está en un rango." },
      confidence: "high",
    });
  }
  if (checks.length === 0) {
    checks.push({
      polarity: "include",
      kind: "unparsed",
      params: {},
      sourceText: elig.trim().slice(0, 120) || "See eligibility criteria",
      plain: { en: "Ask the study team if you can join.", es: "Pregunte al equipo del estudio si puede participar." },
      confidence: "low",
    });
  }

  const title = mentions(user, "type 2 diabetes")
    ? { en: "A study for adults with type 2 diabetes", es: "Un estudio para adultos con diabetes tipo 2" }
    : { en: "A clinical research study", es: "Un estudio de investigación clínica" };
  const conditionIds = mentions(user, "type 2 diabetes", "t2dm") ? ["t2d"] : [];

  return JSON.stringify({
    conditionIds,
    title,
    summary: {
      en: "This study is looking for volunteers. The study team decides who can join.",
      es: "Este estudio busca voluntarios. El equipo del estudio decide quién puede participar.",
    },
    checks,
  });
}

function mergeResponse(user: string): string {
  // Group identical normalized questions together.
  const lines = user.split("\n").filter((l) => /^\d+:/.test(l.trim()));
  const byNorm = new Map<string, number[]>();
  for (const l of lines) {
    const m = l.match(/^(\d+):\s*(.*)$/);
    if (!m) continue;
    const idx = Number(m[1]);
    const norm = m[2].toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const arr = byNorm.get(norm) ?? [];
    arr.push(idx);
    byNorm.set(norm, arr);
  }
  return JSON.stringify({ groups: [...byNorm.values()] });
}

function translateResponse(user: string): string {
  // Echo the English with a language tag so output is deterministic & non-empty.
  const body = user.split(":\n").slice(1).join(":\n") || user;
  return JSON.stringify({ text: `[t] ${body.trim().slice(0, 200)}` });
}

function draftResponse(): string {
  return JSON.stringify({ criteria: [] });
}

/** The responder tests and the no-key run install via setMockResponder(). */
export const mockResponder: MockResponder = ({ system, user }) => {
  if (system.includes("compile clinical-trial eligibility")) return compileResponse(user);
  if (system.includes("group yes/no patient-eligibility")) return mergeResponse(user);
  if (system.includes("translate short patient-facing")) return translateResponse(user);
  if (system.includes("label clinical-trial eligibility")) return draftResponse();
  return "{}";
};
