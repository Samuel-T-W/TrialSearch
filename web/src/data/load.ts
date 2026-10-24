import type { Bundle, Lang } from "@shared/schema";
import type { ZipTable } from "../matcher";

/**
 * Load a language bundle from the same origin. The app NEVER fetches anything
 * cross-origin: these are static files served beside index.html.
 */
export async function loadBundle(lang: Lang): Promise<Bundle> {
  const res = await fetch(`data/trials.${lang}.json`, { cache: "no-cache" });
  if (!res.ok) {
    // Fall back to English if a language bundle is missing.
    if (lang !== "en") return loadBundle("en");
    throw new Error(`Could not load trial data (${res.status}).`);
  }
  return (await res.json()) as Bundle;
}

/**
 * Load the MA ZIP -> [lat, lon] table built by the pipeline.
 */
export async function loadZips(): Promise<ZipTable> {
  try {
    const res = await fetch("data/ma-zips.json", { cache: "no-cache" });
    if (res.ok) return (await res.json()) as ZipTable;
  } catch {
    // ZIP data is unavailable.
  }
  return {};
}
