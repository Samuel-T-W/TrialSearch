import { useState } from "react";
import type { Lang } from "@shared/schema";
import { pickLang } from "@shared/schema";
import { explain, type MatchOutput, type TrialResult } from "../matcher";
import { useStrings } from "../i18n";
import { EnglishOnlyTag, phaseKey, phaseLabel } from "../components/common";

const STATUS_ICON: Record<string, string> = { met: "✅", not_met: "❌", unknown: "❓" };

function findResult(result: MatchOutput | null, nctId: string): TrialResult | undefined {
  if (!result) return undefined;
  return (
    result.matches.find((r) => r.trial.nctId === nctId) ??
    result.notAFit.find((r) => r.trial.nctId === nctId)
  );
}

export function TrialDetail({
  lang,
  result,
  nctId,
  saved,
  onToggleSave,
  onBack,
}: {
  lang: Lang;
  result: MatchOutput | null;
  nctId: string;
  saved: boolean;
  onToggleSave: () => void;
  onBack: () => void;
}) {
  const t = useStrings(lang);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const r = findResult(result, nctId);

  if (!r) {
    return (
      <div className="px-5 py-6">
        <button className="btn-ghost -ml-2 px-2 py-1 text-sm" onClick={onBack}>
          ← {t("back")}
        </button>
        <p className="mt-4 text-slate-600">—</p>
      </div>
    );
  }

  const title = pickLang(r.trial.title, lang);
  const summary = pickLang(r.trial.summary, lang);
  const rows = explain(r, lang);
  const pk = phaseKey(r.trial.phase);
  const statusLabel = (s: string) =>
    s === "met" ? t("trial.met") : s === "not_met" ? t("trial.notMet") : t("trial.unknown");

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      <header>
        <button className="btn-ghost -ml-2 px-2 py-1 text-sm" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {title.text}
          {title.fallback && <EnglishOnlyTag lang={lang} />}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
            {t("results.phase")} {phaseLabel(r.trial.phase)}
          </span>
          <span className="text-slate-500">{t(`phaseExplain.${pk}`)}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          📍 {r.nearestSite.facility}, {r.nearestSite.city} ·{" "}
          {t("results.milesAway", { miles: Math.round(r.distanceMiles) })}
        </p>
      </header>

      <section>
        <h2 className="field-label">{t("trial.summary")}</h2>
        <p className="text-base leading-relaxed text-slate-800">
          {summary.text}
          {summary.fallback && <EnglishOnlyTag lang={lang} />}
        </p>
      </section>

      <section>
        <h2 className="field-label">{t("trial.rules")}</h2>
        <ul className="flex flex-col gap-2" data-testid="rule-list">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-3" data-testid={`rule-${row.status}`}>
              <div className="flex items-start gap-2">
                <span aria-hidden className="text-lg leading-6">
                  {STATUS_ICON[row.status]}
                </span>
                <div className="flex-1">
                  <p className="text-base text-slate-800">
                    {row.text}
                    {row.englishOnly && <EnglishOnlyTag lang={lang} />}
                  </p>
                  <span className="text-xs font-medium text-slate-400">{statusLabel(row.status)}</span>
                  <div>
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-brand-dark underline"
                      onClick={() => setOpen((o) => ({ ...o, [row.id]: !o[row.id] }))}
                    >
                      {open[row.id] ? t("trial.hideSource") : t("trial.showSource")}
                    </button>
                    {open[row.id] && (
                      <blockquote className="mt-1 border-l-2 border-slate-300 pl-2 text-xs italic text-slate-500">
                        {row.sourceText}
                      </blockquote>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <button
          type="button"
          className={saved ? "btn-secondary w-full" : "btn-primary w-full"}
          data-testid="toggle-save"
          onClick={onToggleSave}
        >
          {saved ? `✓ ${t("trial.removeFromSummary")}` : `🖨️ ${t("trial.addToSummary")}`}
        </button>
        <a
          className="btn-secondary w-full"
          href={r.trial.officialUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          🔗 {t("trial.officialPage")}
        </a>
        {r.trial.contact && (r.trial.contact.phone || r.trial.contact.email) && (
          <div className="card text-sm text-slate-700">
            <span className="field-label">{t("trial.contact")}</span>
            {r.trial.contact.name && <div>{r.trial.contact.name}</div>}
            {r.trial.contact.phone && <div>📞 {r.trial.contact.phone}</div>}
            {r.trial.contact.email && <div>✉️ {r.trial.contact.email}</div>}
          </div>
        )}
      </section>
    </div>
  );
}
