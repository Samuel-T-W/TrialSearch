// `npm run data` -- builds the bundles the phone downloads. Makes NO LLM calls.
//
//   DATA_SOURCE=store    -> every trial file in data/store/trials/ (default)
//   DATA_SOURCE=fixture  -> the 7 hand-written demo trials
//
// Trials get into the store by any route: written by an agent, by hand, or by the
// optional LLM pipeline (`npm run compile:store`, needs DEEPSEEK_API_KEY or
// ANTHROPIC_API_KEY). The app itself never calls an LLM or any other API.
import "dotenv/config";
import { buildFixture } from "./fixture";
import { buildFromStore } from "./store";

const source = (process.argv[2] ?? process.env.DATA_SOURCE ?? "store").toLowerCase();

if (source === "fixture") {
  buildFixture();
} else if (source === "store") {
  buildFromStore();
} else {
  console.error(`Unknown DATA_SOURCE "${source}". Use "store" or "fixture".`);
  process.exit(1);
}
