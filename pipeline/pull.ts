// Pull recruiting Massachusetts trials from ClinicalTrials.gov API v2 (plan 5.1).
//
// Public API, no key. Paginates with pageToken, keeps only locations in
// Massachusetts that carry a geoPoint, and trims each study to a RawTrial.
// Writes data/raw/trials.json and a 50-trial data/raw/sample.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { RawTrial, type Site } from "../shared/schema";

const API = "https://clinicaltrials.gov/api/v2/studies";
const RAW_DIR = join(import.meta.dirname, "..", "data", "raw");
const TRIALS_PATH = join(RAW_DIR, "trials.json");
const SAMPLE_PATH = join(RAW_DIR, "sample.json");

const FIELDS = [
  "IdentificationModule",
  "ConditionsModule",
  "DesignModule",
  "DescriptionModule",
  "EligibilityModule",
  "ContactsLocationsModule",
].join(",");

type AnyObj = Record<string, any>;

/** Keep only MA sites that have coordinates. */
function massachusettsSites(study: AnyObj): Site[] {
  const locs: AnyObj[] = study?.protocolSection?.contactsLocationsModule?.locations ?? [];
  const out: Site[] = [];
  for (const l of locs) {
    if (l?.state !== "Massachusetts") continue;
    const gp = l?.geoPoint;
    if (typeof gp?.lat !== "number" || typeof gp?.lon !== "number") continue;
    out.push({
      facility: String(l.facility ?? "Study site"),
      city: String(l.city ?? ""),
      zip: l.zip ? String(l.zip) : undefined,
      lat: gp.lat,
      lon: gp.lon,
    });
  }
  return out;
}

function firstContact(study: AnyObj): RawTrial["contact"] {
  const contacts: AnyObj[] =
    study?.protocolSection?.contactsLocationsModule?.centralContacts ?? [];
  const c = contacts[0];
  if (!c) return undefined;
  const out = {
    name: c.name ? String(c.name) : undefined,
    phone: c.phone ? String(c.phone) : undefined,
    email: c.email ? String(c.email) : undefined,
  };
  return out.name || out.phone || out.email ? out : undefined;
}

/** Trim one API study record to a RawTrial, or null if it has no usable MA site. */
export function toRawTrial(study: AnyObj): RawTrial | null {
  const ps = study?.protocolSection ?? {};
  const idm = ps.identificationModule ?? {};
  const nctId = idm.nctId;
  if (!nctId) return null;

  const sites = massachusettsSites(study);
  if (sites.length === 0) return null;

  const elig = ps.eligibilityModule ?? {};
  const raw: RawTrial = {
    nctId: String(nctId),
    briefTitle: String(idm.briefTitle ?? nctId),
    officialTitle: idm.officialTitle ? String(idm.officialTitle) : undefined,
    conditions: (ps.conditionsModule?.conditions ?? []).map(String),
    phases: (ps.designModule?.phases ?? []).map(String),
    briefSummary: ps.descriptionModule?.briefSummary
      ? String(ps.descriptionModule.briefSummary)
      : undefined,
    eligibilityCriteria: elig.eligibilityCriteria ? String(elig.eligibilityCriteria) : undefined,
    minimumAge: elig.minimumAge ? String(elig.minimumAge) : undefined,
    maximumAge: elig.maximumAge ? String(elig.maximumAge) : undefined,
    sex: elig.sex ? String(elig.sex) : undefined,
    healthyVolunteers:
      typeof elig.healthyVolunteers === "boolean"
        ? elig.healthyVolunteers
        : elig.healthyVolunteers === "y"
          ? true
          : elig.healthyVolunteers === "n"
            ? false
            : undefined,
    locations: sites,
    contact: firstContact(study),
  };
  const parsed = RawTrial.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function pull(opts: { pageSize?: number } = {}): Promise<RawTrial[]> {
  const pageSize = opts.pageSize ?? 1000;
  const trials: RawTrial[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let page = 0;

  do {
    const url = new URL(API);
    url.searchParams.set("query.locn", "Massachusetts");
    url.searchParams.set("filter.overallStatus", "RECRUITING");
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("fields", FIELDS);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`ClinicalTrials.gov returned ${res.status} ${res.statusText}`);
    }
    const body: AnyObj = await res.json();
    const studies: AnyObj[] = body.studies ?? [];
    for (const s of studies) {
      const t = toRawTrial(s);
      if (t && !seen.has(t.nctId)) {
        seen.add(t.nctId);
        trials.push(t);
      }
    }
    pageToken = body.nextPageToken;
    page++;
    console.log(`  page ${page}: +${studies.length} studies, ${trials.length} MA trials so far`);
  } while (pageToken);

  return trials;
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export async function runPull() {
  console.log("Pulling recruiting Massachusetts trials from ClinicalTrials.gov v2...");
  const trials = await pull();
  writeJson(TRIALS_PATH, trials);
  writeJson(SAMPLE_PATH, trials.slice(0, 50));
  console.log(`Wrote ${trials.length} trials to ${TRIALS_PATH}`);
  console.log(`Wrote ${Math.min(50, trials.length)} trials to ${SAMPLE_PATH}`);
  return trials;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPull().catch((e) => {
    console.error("Pull failed:", e.message);
    console.error("Note the fallback (portal starter zip) in docs/DECISIONS.md.");
    process.exit(1);
  });
}
