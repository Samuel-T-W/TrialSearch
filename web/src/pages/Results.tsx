import { useState } from "react";
import type { Bundle, Lang, Profile } from "@shared/schema";
import { pickLang } from "@shared/schema";
import type { MatchOutput, NextQuestion, TrialResult } from "../matcher";
import { useStrings } from "../i18n";
import { EnglishOnlyTag, phaseKey, phaseLabel } from "../components/common";

function questionText(bundle: Bundle | null, qid: string, lang: Lang): { text: string; fallback: boolean } {
  const q = bundle?.questions.find((x) => x.id === qid);
  if (!q) return { text: qid, fallback: false };
  return pickLang(q.text, lang);
}

function TrialCard({
  r,
  lang,
  onOpen,
}: {
  r: TrialResult;
  lang: Lang;
  onOpen: () => void;
}) {
  const t = useStrings(lang);
  const title = pickLang(r.trial.title, lang);
  const pk = phaseKey(r.trial.phase);
  return (
    <button
      type="button"
      className="card w-full text-left transition hover:border-brand/50"
      data-testid="trial-card"
      onClick={onOpen}
    >
      <h3 className="text-lg font-semibold text-slate-900">
        {title.text}
        {title.fallback && <EnglishOnlyTag lang={lang} />}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {t("results.phase")} {phaseLabel(r.trial.phase)}
        </span>
        <span className="text-xs text-slate-500">{t(`phaseExplain.${pk}`)}</span>
      </div>
      <div className="mt-2 text-sm text-slate-700">
        <div>
          📍 {r.nearestSite.city} · {t("results.milesAway", { miles: Math.round(r.distanceMiles) })}
        </div>
        <div className="mt-1 font-medium text-brand-dark">
          ✅ {t("results.rulesConfirmed", { met: r.metCount, total: r.checks.length })}
        </div>
      </div>
    </button>
  );
}

function NarrowPanel({
  questions,
  bundle,
  lang,
  profile,
  onAnswer,
}: {
  questions: NextQuestion[];
  bundle: Bundle | null;
  lang: Lang;
  profile: Profile;
  onAnswer: (qid: string, ans: boolean | "unsure") => void;
}) {
  const t = useStrings(lang);
  if (questions.length === 0) return null;
  return (
    <section className="card bg-brand-light/40" data-testid="narrow-panel">
      <h2 className="text-lg font-bold text-brand-dark">{t("results.narrow")}</h2>
      <p className="mb-3 text-sm text-slate-600">{t("results.narrowHint")}</p>
      <div className="flex flex-col gap-4">
        {questions.map((q) => {
          const qt = questionText(bundle, q.questionId, lang);
          const current = profile.answers[q.questionId];
          return (
            <div key={q.questionId} data-testid="narrow-question">
              <p className="text-base font-medium text-slate-900">
                {qt.text}
                {qt.fallback && <EnglishOnlyTag lang={lang} />}
              </p>
              <p className="text-xs text-slate-500">
                {q.affects === 1 ? t("results.affectsOne") : t("results.affects", { n: q.affects })}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    ["yes", true],
                    ["no", false],
                    ["unsure", "unsure"],
                  ] as const
                ).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`answer-${q.questionId}-${key}`}
                    aria-pressed={current === val}
                    onClick={() => onAnswer(q.questionId, val)}
                    className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold ${
                      current === val
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {t(`results.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Results({
  lang,
  bundle,
  result,
  profile,
  onAnswer,
  onOpenTrial,
  onBack,
  onSummary,
  savedTrials,
}: {
  lang: Lang;
  bundle: Bundle | null;
  result: MatchOutput | null;
  profile: Profile;
  onAnswer: (qid: string, ans: boolean | "unsure") => void;
  onOpenTrial: (nctId: string) => void;
  onBack: () => void;
  onSummary: () => void;
  savedTrials: string[];
}) {
  const t = useStrings(lang);
  const [showNotFit, setShowNotFit] = useState(false);
  const matches = result?.matches ?? [];
  const notAFit = result?.notAFit ?? [];

  const countText =
    matches.length === 0
      ? t("results.countZero")
      : matches.length === 1
        ? t("results.countOne")
        : t("results.count", { count: matches.length });

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <header>
        <button className="btn-ghost -ml-2 px-2 py-1 text-sm" onClick={onBack}>
          ← {t("back")}
        </button>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{t("results.title")}</h1>
          {savedTrials.length > 0 && (
            <button className="btn-secondary px-3 py-2 text-sm" onClick={onSummary}>
              🖨️ {savedTrials.length}
            </button>
          )}
        </div>
        <p className="mt-1 text-base font-semibold text-brand-dark" data-testid="match-count">
          {countText}
        </p>
      </header>

      <NarrowPanel
        questions={result?.nextQuestions ?? []}
        bundle={bundle}
        lang={lang}
        profile={profile}
        onAnswer={onAnswer}
      />

      <section className="flex flex-col gap-3" data-testid="match-list">
        {matches.map((r) => (
          <TrialCard
            key={r.trial.nctId}
            r={r}
            lang={lang}
            onOpen={() => onOpenTrial(r.trial.nctId)}
          />
        ))}
      </section>

      {notAFit.length > 0 && (
        <section>
          <button
            type="button"
            className="btn-secondary w-full justify-between"
            data-testid="not-a-fit-toggle"
            aria-expanded={showNotFit}
            onClick={() => setShowNotFit((v) => !v)}
          >
            <span>{t("results.notAFit", { count: notAFit.length })}</span>
            <span>{showNotFit ? "▲" : "▼"}</span>
          </button>
          {showNotFit && (
            <div className="mt-2 flex flex-col gap-2" data-testid="not-a-fit-list">
              <p className="text-xs text-slate-500">{t("results.notAFitHint")}</p>
              {notAFit.map((r) => {
                const title = pickLang(r.trial.title, lang);
                const reason = r.excludedBy
                  ? r.excludedBy.check.plain[lang] ?? r.excludedBy.check.plain.en
                  : "";
                return (
                  <button
                    key={r.trial.nctId}
                    type="button"
                    data-testid="not-a-fit-card"
                    data-nct={r.trial.nctId}
                    className="card w-full text-left opacity-80"
                    onClick={() => onOpenTrial(r.trial.nctId)}
                  >
                    <h3 className="text-base font-semibold text-slate-800">{title.text}</h3>
                    <p className="mt-1 text-sm text-red-700">
                      <span className="font-semibold">{t("results.excludedBecause")}</span> {reason}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
