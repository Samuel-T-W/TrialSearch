// `npm run data` builds bundles only from data/store/trials/. Makes NO LLM calls.
// There is no other source: hand-written trials are for tests only.
//
// Trials get into the store by any route: written by an agent, by hand, or by the
// optional LLM pipeline (`npm run compile:store`, needs DEEPSEEK_API_KEY or
// ANTHROPIC_API_KEY). The app itself never calls an LLM or any other API.
import "dotenv/config";
import { buildFromStore } from "./store";

const source = process.argv[2];
if (source !== undefined && source !== "store") {
  console.error(`Unknown data source "${source}". Only the store is supported.`);
  process.exit(1);
}

buildFromStore();
