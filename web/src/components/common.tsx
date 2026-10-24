import type { Lang } from "@shared/schema";
import { useStrings } from "../i18n";

export function Disclaimer({ lang }: { lang: Lang }) {
  const t = useStrings(lang);
  return (
    <p
      className="no-print sticky bottom-0 z-10 border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
      role="note"
    >
      {t("disclaimer")}
    </p>
  );
}

export function DemoBanner({ lang }: { lang: Lang }) {
  const t = useStrings(lang);
  return (
    <div className="no-print bg-slate-800 px-4 py-1 text-center text-xs font-semibold text-white">
      {t("demoData")}
    </div>
  );
}

export function EnglishOnlyTag({ lang }: { lang: Lang }) {
  const t = useStrings(lang);
  if (lang === "en") return null;
  return (
    <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
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
