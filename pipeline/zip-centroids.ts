// Build web/public/data/ma-zips.json (ZIP -> [lat, lon]) from the current
// Census national ZCTA gazetteer (plan 6.5). MA ZCTAs are the 010xx-027xx range.
//
// Public file, no key. The table ships with the app so distance is computed
// locally in the browser. RUN IT NOW and commit the output.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "web", "public", "data", "ma-zips.json");

// National ZCTA gazetteer. Year in the URL is the latest published vintage.
const GAZETTEER_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip";

type ZipTable = Record<string, [number, number]>;

/** MA ZCTAs: 5-digit ZIPs from 01000 through 02799. */
function isMassachusettsZip(zcta: string): boolean {
  if (!/^\d{5}$/.test(zcta)) return false;
  const n = Number(zcta);
  return n >= 1000 && n <= 2799;
}

/**
 * Parse the gazetteer's tab-separated text into a MA ZIP table.
 * Columns: GEOID \t ALAND \t AWATER \t ALAND_SQMI \t AWATER_SQMI \t INTPTLAT \t INTPTLONG
 * (whitespace padded; split on whitespace runs and read the first + last two).
 */
export function parseGazetteer(text: string): ZipTable {
  const out: ZipTable = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/\t/).map((c) => c.trim());
    if (cols.length < 7) continue;
    const zcta = cols[0];
    if (zcta === "GEOID") continue; // header
    if (!isMassachusettsZip(zcta)) continue;
    const lat = Number(cols[cols.length - 2]);
    const lon = Number(cols[cols.length - 1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out[zcta] = [Number(lat.toFixed(5)), Number(lon.toFixed(5))];
  }
  return out;
}

/** Unzip the gazetteer archive in-process (no external tools). */
async function fetchGazetteerText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { accept: "application/zip" } });
  if (!res.ok) throw new Error(`Census gazetteer returned ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // The archive holds a single .txt. Decompress with Node's zlib after locating
  // the local file entry (ZIP stores the deflate stream after a 30-byte header
  // plus the variable-length name and extra fields).
  const { inflateRawSync } = await import("node:zlib");
  const sig = buf.readUInt32LE(0);
  if (sig !== 0x04034b50) throw new Error("not a ZIP archive");
  const method = buf.readUInt16LE(8);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + nameLen + extraLen;
  const compSize = buf.readUInt32LE(18);
  const slice = buf.subarray(dataStart, compSize > 0 ? dataStart + compSize : undefined);
  if (method === 0) return slice.toString("utf8"); // stored
  if (method === 8) return inflateRawSync(slice).toString("utf8"); // deflate
  throw new Error(`unsupported ZIP compression method ${method}`);
}

export async function buildZipCentroids(): Promise<ZipTable> {
  console.log("Fetching Census national ZCTA gazetteer...");
  const text = await fetchGazetteerText(GAZETTEER_URL);
  const table = parseGazetteer(text);
  mkdirSync(join(OUT, ".."), { recursive: true });
  // Compact one-line JSON; sort keys for a stable, diff-friendly file.
  const sorted = Object.fromEntries(Object.keys(table).sort().map((k) => [k, table[k]]));
  writeFileSync(OUT, JSON.stringify(sorted));
  console.log(`Wrote ${Object.keys(sorted).length} MA ZIP centroids to ${OUT}`);
  return sorted;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildZipCentroids().catch((e) => {
    console.error("ZIP centroid build failed:", e.message);
    console.error("Note the fallback in docs/DECISIONS.md.");
    process.exit(1);
  });
}
