// E2E check WITHOUT an Anthropic key: run the whole pipeline (compile -> dedupe
// -> translate -> writeBundles) on the 50-trial sample using the mock provider,
// writing bundles to $KIROCREW_SCRATCH so web/public/data stays on the fixture.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { RawTrial } from "../shared/schema";
import { writeBundles } from "./bundle";
import { compileTrials } from "./compile";
import { dedupeQuestions } from "./dedupe";
import { Llm, MockProvider } from "./llm";
import { mockResponder } from "./mock-responder";
import { translate } from "./translate";

const ROOT = join(import.meta.dirname, "..");
const SAMPLE = join(ROOT, "data", "raw", "sample.json");
const OUT = join(process.env.KIROCREW_SCRATCH || "/tmp", "trialsearch-e2e", "data");

async function main() {
  const raw = z.array(RawTrial).parse(JSON.parse(readFileSync(SAMPLE, "utf8")));
  const llm = new Llm(new MockProvider(mockResponder));

  const compiled = await compileTrials(raw, { llm });
  const { trials, questions } = await dedupeQuestions(compiled, { useLlm: true, llm });
  const t = await translate(trials, questions, { useLlm: true, llm });
  const res = writeBundles({ trials: t.trials, questions: t.questions, source: "live", outDir: OUT });

  console.log(`E2E OK: ${res.trialCount} trials, ${t.questions.length} questions`);
  console.log(`  bundles -> ${res.outDir}`);
  for (const [lang, size] of Object.entries(res.sizes)) {
    console.log(`    trials.${lang}.json  ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((e) => {
  console.error("E2E failed:", e);
  process.exit(1);
});
