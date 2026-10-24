// Turns a list of compiled trials into per-language bundles in web/public/data/.
// Both data sources (fixture and live pipeline) end here, so the web app
// never knows or cares where its data came from.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Bundle, CompiledTrial, LANGS, type Lang, type LocalizedText, type Question } from "../shared/schema";

export const WEB_DATA_DIR = join(import.meta.dirname, "..", "web", "public", "data");

/** Keep only `en` + the target language, so each phone downloads one language. */
function slim(t: LocalizedText, lang: Lang): LocalizedText {
  const out: LocalizedText = { en: t.en };
  if (lang !== "en" && t[lang]) out[lang] = t[lang];
  return out;
}

export function writeBundles(opts: {
  trials: CompiledTrial[];
  questions: Question[];
  source: "fixture" | "live";
  outDir?: string;
}) {
  const outDir = opts.outDir ?? WEB_DATA_DIR;
  mkdirSync(outDir, { recursive: true });
  const generatedAt = new Date().toISOString();

  // Validate everything before writing anything. Invalid data never ships.
  const trials = opts.trials.map((t) => CompiledTrial.parse(t) as CompiledTrial);

  const sizes: Record<string, number> = {};
  for (const lang of LANGS) {
    const bundle = {
      lang,
      generatedAt,
      source: opts.source,
      trials: trials.map((t) => ({
        ...t,
        title: slim(t.title, lang),
        summary: slim(t.summary, lang),
        checks: t.checks.map((c) => ({ ...c, plain: slim(c.plain, lang) })),
      })),
      questions: opts.questions.map((q) => ({ ...q, text: slim(q.text, lang) })),
    };
    Bundle.parse(bundle);
    const json = JSON.stringify(bundle);
    writeFileSync(join(outDir, `trials.${lang}.json`), json);
    sizes[lang] = json.length;
  }
  writeFileSync(
    join(outDir, "meta.json"),
    JSON.stringify({ source: opts.source, generatedAt, trialCount: trials.length, langs: LANGS }, null, 2),
  );
  return { outDir, trialCount: trials.length, sizes };
}
