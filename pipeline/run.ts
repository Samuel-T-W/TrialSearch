// run.ts = OPTIONAL LLM pipeline that fills data/store/ (plan section 6 run order).
// The app never needs this: `npm run data` only reads the store.
// Run: `npm run compile:store` (needs DEEPSEEK_API_KEY or ANTHROPIC_API_KEY).
//
//   pull (skip if data/raw/trials.json exists, unless --fresh)
//     -> compile -> dedupe -> translate
//     -> writeBundles({source:'live'}) + data/compiled/*.json
//
// Invoked by `npm run data` when DATA_SOURCE=live (see pipeline/data.ts), which
// already checked for an LLM key (DeepSeek or Anthropic). Everything is cached on disk, so reruns
// are cheap.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RawTrial } from "../shared/schema";
import "dotenv/config";
import { buildFromStore, saveToStore } from "./store";
import { loadRawTrials, runCompile } from "./compile";
import { dedupeQuestions } from "./dedupe";
import { runPull } from "./pull";
import { translate } from "./translate";

const RAW_PATH = join(import.meta.dirname, "..", "data", "raw", "trials.json");
const COMPILED_DIR = join(import.meta.dirname, "..", "data", "compiled");

export async function runPipeline(opts: { fresh?: boolean } = {}): Promise<void> {
  const fresh = opts.fresh || process.argv.includes("--fresh");

  // 1. pull
  let raw: RawTrial[];
  if (!fresh && existsSync(RAW_PATH)) {
    raw = loadRawTrials();
    console.log(`pull: reusing ${raw.length} trials from ${RAW_PATH} (use --fresh to re-pull)`);
  } else {
    raw = await runPull();
  }

  // 2. compile
  const compiled = await runCompile({ raw });
  console.log(`compile: ${compiled.length} trials -> checks`);

  if (compiled.length === 0) throw new Error("compile produced 0 trials; check the LLM key and logs above");

  // 3. dedupe
  const deduped = await dedupeQuestions(compiled, { useLlm: true });
  console.log(`dedupe: ${deduped.questions.length} questions in the bank`);

  // 4. translate
  const translated = await translate(deduped.trials, deduped.questions, { useLlm: true });

  // 5. save into the store, then rebuild bundles from the whole store
  saveToStore(translated.trials, translated.questions);
  const res = buildFromStore();
  mkdirSync(COMPILED_DIR, { recursive: true });
  writeFileSync(
    join(COMPILED_DIR, "trials.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), trials: translated.trials }, null, 2),
  );

  console.log("\n=== pipeline summary ===");
  console.log(`  trials pulled:   ${raw.length}`);
  console.log(`  trials compiled: ${translated.trials.length}`);
  console.log(`  questions:       ${translated.questions.length}`);
  console.log(`  bundles:         ${res.outDir}`);
  for (const [lang, size] of Object.entries(res.sizes)) {
    console.log(`    trials.${lang}.json  ${(size / 1024).toFixed(0)} KB`);
  }
  console.log("  Next: npm run eval");
}

// Allow `tsx pipeline/run.ts` directly too.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY && process.env.LLM_PROVIDER !== "mock") {
    console.error("compile:store needs DEEPSEEK_API_KEY or ANTHROPIC_API_KEY in .env. See .env.example.");
    process.exit(1);
  }
  runPipeline().catch((e) => {
    console.error("Pipeline failed:", e.message);
    process.exit(1);
  });
}
