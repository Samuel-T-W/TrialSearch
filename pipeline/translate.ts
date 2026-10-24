// translate.ts = extra languages for the demo conditions (plan 6.3).
//
// en + es come from compile.ts. Here we fill pt, ht, zh, vi for:
//   - trials whose conditionIds intersect DEMO_CONDITION_IDS (title, summary, every check.plain)
//   - the whole question bank
// Public text only, so no privacy impact. One LLM call per text block, cached.
//
// No-LLM / failure fallback: leave the language missing; the app shows the
// English with an "English only" tag (plan section 8).
import { z } from "zod";
import type { CompiledTrial, Lang, LocalizedText, Question } from "../shared/schema";
import { DEMO_CONDITION_IDS } from "../shared/vocab";
import { Llm } from "./llm";

export const EXTRA_LANGS: Lang[] = ["pt", "ht", "zh", "vi"];
const LANG_NAMES: Record<string, string> = {
  pt: "Portuguese",
  ht: "Haitian Creole",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
};

const Translated = z.object({ text: z.string().min(1) });

async function translateOne(llm: Llm, en: string, lang: Lang): Promise<string | undefined> {
  if (!en.trim()) return undefined;
  try {
    const out = await llm.callJson({
      system: `You translate short patient-facing health text into ${LANG_NAMES[lang]}. Keep it plain, second person, about 6th-grade reading level. Output ONLY JSON: {"text": "<translation>"}.`,
      user: `Translate into ${LANG_NAMES[lang]}:\n${en}`,
      schema: Translated,
      cacheInput: `${lang}:${en}`,
    });
    return out.text;
  } catch {
    return undefined;
  }
}

/** Fill every EXTRA_LANG on a LocalizedText (in place on a copy). */
async function fillLangs(llm: Llm, t: LocalizedText): Promise<LocalizedText> {
  const out: LocalizedText = { ...t };
  for (const lang of EXTRA_LANGS) {
    if (out[lang]) continue;
    const v = await translateOne(llm, t.en, lang);
    if (v) out[lang] = v;
  }
  return out;
}

export interface TranslateDeps {
  llm?: Llm;
  /** false = skip translation entirely (fallback / tests). */
  useLlm?: boolean;
}

export interface TranslateResult {
  trials: CompiledTrial[];
  questions: Question[];
}

function isDemoTrial(t: CompiledTrial): boolean {
  return t.conditionIds.some((id) => DEMO_CONDITION_IDS.includes(id));
}

export async function translate(
  trials: CompiledTrial[],
  questions: Question[],
  deps: TranslateDeps = {},
): Promise<TranslateResult> {
  if (!deps.useLlm) return { trials, questions };
  const llm = deps.llm ?? new Llm();

  const outTrials: CompiledTrial[] = [];
  for (const t of trials) {
    if (!isDemoTrial(t)) {
      outTrials.push(t);
      continue;
    }
    outTrials.push({
      ...t,
      title: await fillLangs(llm, t.title),
      summary: await fillLangs(llm, t.summary),
      checks: await Promise.all(t.checks.map(async (c) => ({ ...c, plain: await fillLangs(llm, c.plain) }))),
    });
  }

  const outQuestions: Question[] = [];
  for (const q of questions) {
    outQuestions.push({ ...q, text: await fillLangs(llm, q.text) });
  }

  return { trials: outTrials, questions: outQuestions };
}
