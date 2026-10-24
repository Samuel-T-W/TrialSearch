import type { Lang } from "@shared/schema";
import { useStrings } from "../i18n";

export function Disclaimer({ lang }: { lang: Lang }) {
  const t = useStrings(lang);
  return (
    <p className="no-print border-t border-line px-5 py-5 text-sm text-muted" role="note">
      {t("disclaimer")}
    </p>
  );
}

export function EnglishOnlyTag({ lang }: { lang: Lang }) {
  const t = useStrings(lang);
  if (lang === "en") return null;
  return (
    <span className="ml-1 rounded bg-st-archive-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
      {t("englishOnly")}
    </span>
  );
}

/** Normalize the ClinicalTrials.gov phase code to a known i18n key. */
export function phaseKey(phase: string[]): string {
  const p = (phase[0] ?? "").toUpperCase().replace(/\s+/g, "_");
  const known = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "NA"];
  return known.includes(p) ? p : "unknown";
}

export function phaseLabel(phase: string[]): string {
  const p = (phase[0] ?? "").toUpperCase();
  if (p === "NA" || p === "") return "N/A";
  return p.replace("EARLY_PHASE1", "Early Phase 1").replace(/PHASE(\d)/, "Phase $1");
}
