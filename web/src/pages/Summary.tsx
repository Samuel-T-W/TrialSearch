import type { Lang } from "@shared/schema";
import { pickLang } from "@shared/schema";
import type { MatchOutput, TrialResult } from "../matcher";
import { useStrings } from "../i18n";

function collect(result: MatchOutput | null, nctIds: string[]): TrialResult[] {
  if (!result) return [];
  const all = [...result.matches, ...result.notAFit];
  return nctIds
    .map((id) => all.find((r) => r.trial.nctId === id))
    .filter((r): r is TrialResult => !!r);
}

export function SummaryPage({
  lang,
  result,
  savedTrials,
  onBack,
}: {
  lang: Lang;
  result: MatchOutput | null;
  savedTrials: string[];
  onBack: () => void;
}) {
  const t = useStrings(lang);
  const chosen = collect(result, savedTrials);

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <header className="no-print">
        <button className="btn-ghost -ml-2 px-2 py-1 text-sm" onClick={onBack}>
          ← {t("back")}
        </button>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{t("summary.title")}</h1>
          {chosen.length > 0 && (
            <button className="btn-primary px-4 py-2 text-sm" onClick={() => window.print()}>
              🖨️ {t("summary.print")}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600">{t("summary.subtitle")}</p>
      </header>

      {chosen.length === 0 ? (
        <p className="text-slate-500">{t("summary.empty")}</p>
      ) : (
        <div className="print-sheet card flex flex-col gap-6" data-testid="summary-sheet">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-xl font-bold text-brand-dark">{t("appName")}</h2>
            <p className="text-sm text-slate-500">{t("summary.title")}</p>
          </div>

          {chosen.map((r) => {
            const title = pickLang(r.trial.title, lang);
            const clinician = r.checks.filter(
              (c) => c.status === "unknown" && (c.check.kind === "clinician" || c.check.kind === "unparsed"),
            );
            return (
              <article key={r.trial.nctId} className="flex flex-col gap-2 break-inside-avoid">
                <h3 className="text-lg font-semibold text-slate-900">{title.text}</h3>
                <p className="text-sm text-slate-600">
                  {t("summary.nctLabel")}: <span className="font-mono">{r.trial.nctId}</span>
                </p>
                <p className="text-sm text-slate-600">
                  📍 {r.nearestSite.facility}, {r.nearestSite.city}
                </p>

                {clinician.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("summary.clinicianItems")}</p>
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {clinician.map((c) => (
                        <li key={c.check.id}>
                          {t("summary.ask", { q: c.check.plain[lang] ?? c.check.plain.en })}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.trial.contact && (r.trial.contact.phone || r.trial.contact.email) && (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">{t("summary.contact")}:</span>{" "}
                    {[r.trial.contact.name, r.trial.contact.phone, r.trial.contact.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <a className="text-sm text-brand-dark underline" href={r.trial.officialUrl}>
                  {r.trial.officialUrl}
                </a>
              </article>
            );
          })}

          <p className="border-t border-slate-200 pt-3 text-xs text-slate-400">
            {t("summary.generatedLocally")}
          </p>
          <p className="text-xs text-slate-400">{t("disclaimer")}</p>
        </div>
      )}
    </div>
  );
}
