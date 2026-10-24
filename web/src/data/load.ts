import type { Bundle, Lang } from "@shared/schema";
import type { ZipTable } from "../matcher";

/**
 * Load a language bundle from the same origin. The app NEVER fetches anything
 * cross-origin: these are static files served beside index.html.
 */
export async function loadBundle(lang: Lang): Promise<Bundle> {
  const res = await fetch(`data/trials.${lang}.json`, { cache: "force-cache" });
  if (!res.ok) {
    // Fall back to English if a language bundle is missing.
    if (lang !== "en") return loadBundle("en");
    throw new Error(`Could not load trial data (${res.status}).`);
  }
  return (await res.json()) as Bundle;
}

/**
 * Load the MA ZIP -> [lat, lon] table. The real file (ma-zips.json) is built by
 * the pipeline; if it is not present yet we fall back to a small dev table so
 * the app still works end to end.
 */
export async function loadZips(): Promise<ZipTable> {
  for (const path of ["data/ma-zips.json", "data/ma-zips.dev.json"]) {
    try {
      const res = await fetch(path, { cache: "force-cache" });
      if (res.ok) return (await res.json()) as ZipTable;
    } catch {
      // try the next path
    }
  }
  return {};
}
