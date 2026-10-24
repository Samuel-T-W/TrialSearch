import { pickLang, type Lang } from "@shared/schema";
import { conditionById } from "@shared/vocab";
import { useStrings } from "../i18n";
import { phaseKey } from "../components/common";
import type { BoardItem } from "./board";
import { Icon } from "./ui";

const tags = {
  qualified: "bg-st-qualified-bg text-st-qualified",
  unsure: "bg-st-feed-bg text-st-feed",
  not_qualified: "bg-st-not-qualified-bg text-st-not-qualified",
  registered: "bg-st-registered-bg text-st-registered",
};
export function TrialCard({
  item,
  lang,
  selected,
  onOpen,
}: {
  item: BoardItem;
  lang: Lang;
  selected: boolean;
  onOpen: () => void;
}) {
  const t = useStrings(lang);
  const { result: r, tab } = item;
  const answered = new Set(
    r.checks.filter((c) => c.answerable && c.status !== "unknown").map((c) => c.check.params.questionId),
  ).size;
  const total = answered + item.openQuestions.length;
  const confirmations = r.checks.filter((c) => c.status === "unknown" && !c.answerable).length;
  return (
    <button
      onClick={onOpen}
      aria-pressed={selected}
      className={`card w-full text-left transition hover:border-brand ${selected ? "border-brand ring-1 ring-brand" : ""}`}
    >
      <h3 className="line-clamp-2 font-display text-xl leading-snug">{pickLang(r.trial.title, lang).text}</h3>
      <p className="mt-2 truncate text-sm text-muted">{pickLang(r.trial.summary, lang).text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <Icon name="pin" className="h-4 w-4 shrink-0" />
        <span>
          {r.nearestSite.city} ·{" "}
          {r.distanceMiles < 1
            ? t("journey.distanceNear")
            : t("journey.distance", { miles: Math.round(r.distanceMiles) })}
        </span>
        <span aria-hidden="true">·</span>
        <span>{t(`journey.phases.${phaseKey(r.trial.phase)}`)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {r.trial.conditionIds.map((id) => (
          <span key={id} className="rounded-md bg-paper px-2 py-1 text-xs text-muted">
            {conditionById(id)?.label ?? id}
          </span>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-3 text-sm">
        {tab === "feed" && (
          <>
            <p className="font-bold text-st-feed">
              {t(item.openQuestions.length === 1 ? "journey.questionLeft" : "journey.questionsLeft", {
                count: item.openQuestions.length,
              })}
            </p>
            <div
              role="progressbar"
              aria-label={t("journey.progress")}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
              className="mt-2 flex gap-1"
            >
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < answered ? "bg-brand" : "bg-st-feed-bg"}`}
                />
              ))}
            </div>
          </>
        )}
        {tab === "qualified" && (
          <>
            <p className="flex items-center gap-2 font-bold text-st-qualified">
              <Icon name="qualified" />
              {t("journey.youQualify")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t(confirmations === 1 ? "journey.confirmOne" : "journey.confirm", { count: confirmations })}
            </p>
          </>
        )}
        {tab === "registered" && (
          <p className="flex items-center gap-2 font-bold text-st-registered">
            <Icon name="registered" />
            {t("journey.interestSent")}
          </p>
        )}
        {tab === "archive" && (item.tag || item.interestSent) && (
          <div className="flex flex-wrap gap-1.5">
            {item.tag && (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tags[item.tag]}`}>
                {t(`journey.tags.${item.tag}`)}
              </span>
            )}
            {item.interestSent && (
              <span
                data-testid="tag-interest-sent"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${tags.registered}`}
              >
                <Icon name="registered" className="h-3.5 w-3.5" />
                {t("journey.tags.interestSent")}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
