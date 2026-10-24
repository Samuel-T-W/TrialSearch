import { useState } from "react";
import { pickLang, type Lang, type Question } from "@shared/schema";
import { conditionById } from "@shared/vocab";
import { useStrings } from "../i18n";
import { EnglishOnlyTag, phaseKey } from "../components/common";
import type { BoardItem, Verdict } from "./board";
import { Icon } from "./ui";

/** Format a bare 10-digit US number as (774) 364-2523; leave anything else alone. */
function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : phone;
}

type Answer = boolean | "unsure";
const verdictStyle = {
  unsure: "bg-st-feed-bg text-st-feed",
  qualified: "bg-st-qualified-bg text-st-qualified",
  not_qualified: "bg-st-not-qualified-bg text-st-not-qualified",
};

/** Right-hand panel: summary, the trial's questions, official link, and the study contact. */
export function TrialPanel({
  item,
  lang,
  questions,
  answers,
  registered,
  preview,
  onSave,
  onRegister,
}: {
  item: BoardItem;
  lang: Lang;
  questions: Question[];
  answers: Record<string, Answer>;
  registered: boolean;
  /** Verdict this trial would get with these answers, without saving them. */
  preview: (answers: Record<string, Answer>) => Verdict;
  onSave: (answers: Record<string, Answer>) => void;
  onRegister: () => void;
}) {
  const t = useStrings(lang);
  const { trial, nearestSite, distanceMiles } = item.result;
  // Every patient question this trial asks, answered or not, in check order (so answers can be corrected).
  const questionIds = [
    ...new Set(
      item.result.checks
        .filter((c) => c.answerable)
        .map((c) => (c.check.params as { questionId: string }).questionId),
    ),
  ];
  // Answers are a draft until saved, so cards do not jump between tabs mid-edit.
  const [draft, setDraft] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(questionIds.filter((id) => id in answers).map((id) => [id, answers[id]])),
  );
  const dirty = questionIds.some((id) => draft[id] !== answers[id]);
  const verdict = dirty ? preview({ ...answers, ...draft }) : item.verdict;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const choices: [Answer, string][] = [
    [true, t("results.yes")],
    [false, t("results.no")],
    ["unsure", t("results.unsure")],
  ];
  const title = pickLang(trial.title, lang);
  const summary = pickLang(trial.summary, lang);
  const contact = trial.contact;
  const hasContact = !!contact && !!(contact.name || contact.phone || contact.email);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl leading-snug">
          {title.text}
          {title.fallback && <EnglishOnlyTag lang={lang} />}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="rounded-md bg-paper px-2 py-0.5 font-bold">
            {t(`journey.phases.${phaseKey(trial.phase)}`)}
          </span>
          <span>{trial.nctId}</span>
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted">
          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {nearestSite.facility}, {nearestSite.city} ·{" "}
            {distanceMiles < 1
              ? t("journey.distanceNear")
              : t("journey.distance", { miles: Math.round(distanceMiles) })}
          </span>
        </p>
        {trial.conditionIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {trial.conditionIds.map((id) => (
              <span key={id} className="rounded-md bg-paper px-2 py-1 text-xs text-muted">
                {conditionById(id)?.label ?? id}
              </span>
            ))}
          </div>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t("trial.summary")}</h3>
        <p className="leading-relaxed">
          {summary.text}
          {summary.fallback && <EnglishOnlyTag lang={lang} />}
        </p>
      </section>

      <section data-testid="trial-questions">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">{t("journey.questionsTitle")}</h3>
        <p className="mb-3 text-sm text-muted">{t("journey.questionsHint")}</p>
        <p
          role="status"
          className={`mb-4 rounded-xl p-3 text-sm font-bold ${verdictStyle[verdict]}`}
        >
          {t(`journey.verdict.${verdict}`)}
        </p>
        {questionIds.length > 0 && (
          <ol className="flex flex-col gap-3">
            {questionIds.map((id) => {
              const q = byId.get(id);
              const text = q ? pickLang(q.text, lang) : { text: id, fallback: false };
              return (
                <li key={id} className="rounded-2xl border border-line p-4">
                  <fieldset>
                    <legend className="font-bold leading-snug">
                      {text.text}
                      {text.fallback && <EnglishOnlyTag lang={lang} />}
                    </legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {choices.map(([value, label]) => {
                        const on = draft[id] === value;
                        return (
                          <button
                            key={String(value)}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setDraft((d) => ({ ...d, [id]: value }))}
                            className={`rounded-xl border px-4 py-2 text-sm font-bold ${on ? "border-brand bg-brand text-surface" : "border-line hover:border-brand"}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>
        )}
        {dirty && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm font-bold text-st-feed">{t("journey.unsaved")}</p>
            <button
              type="button"
              className="btn-primary w-full justify-center"
              data-testid="save-answers"
              onClick={() => onSave(draft)}
            >
              {t("journey.saveAnswers")}
            </button>
          </div>
        )}
        {!dirty && item.verdict === "qualified" && (
          <div className="mt-4">
            {registered ? (
              <p className="flex items-center gap-2 font-bold text-st-registered">
                <Icon name="registered" />
                {t("journey.interestSent")}
              </p>
            ) : (
              <button type="button" className="btn-primary w-full justify-center" onClick={onRegister}>
                {t("journey.sendInterest")}
              </button>
            )}
          </div>
        )}
      </section>

      <a
        className="btn-secondary w-full justify-center"
        href={trial.officialUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        {t("trial.officialPage")} ↗
      </a>

      <section className="rounded-2xl border border-line p-5" data-testid="trial-contact">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">{t("trial.contact")}</h3>
        {hasContact ? (
          <div className="flex flex-col gap-2 text-sm">
            {contact.name && <p className="font-bold">{contact.name}</p>}
            {contact.phone && (
              <a className="text-brand underline" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                {prettyPhone(contact.phone)}
              </a>
            )}
            {contact.email && (
              <a className="break-all text-brand underline" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("journey.noContact")}</p>
        )}
      </section>
    </div>
  );
}
