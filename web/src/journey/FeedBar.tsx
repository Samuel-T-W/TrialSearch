import { useState } from "react";
import type { Lang } from "@shared/schema";
import { CONDITIONS, conditionById } from "@shared/vocab";
import { useStrings } from "../i18n";
import { feedItems, type Board, type Feed, type Session } from "./board";
import { Modal } from "./ui";

export function feedName(feed: Feed, lang: Lang) {
  return feed.conditionId === null
    ? useStrings(lang)("journey.everything")
    : (conditionById(feed.conditionId)?.label ?? feed.conditionId);
}
export function FeedBar({
  session,
  board,
  lang,
  feedId,
  onSelect,
  onAdd,
  onRemove,
  vertical = false,
}: {
  session: Session;
  board: Board;
  lang: Lang;
  feedId: string;
  onSelect: (id: string) => void;
  onAdd: (condition: string) => void;
  onRemove: (id: string) => void;
  vertical?: boolean;
}) {
  const t = useStrings(lang);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const available = CONDITIONS.filter(
    (c) =>
      !session.feeds.some((f) => f.conditionId === c.id) &&
      `${c.label} ${c.synonyms.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = [
    available.filter((c) => session.profile.conditionIds.includes(c.id)),
    available.filter((c) => !session.profile.conditionIds.includes(c.id)),
  ];
  const current = session.feeds.find((f) => f.id === feedId);
  return (
    <div className={vertical ? "mb-3 ml-6 border-l border-line pl-3" : "border-b border-line px-4 pb-3"}>
      <div
        className={vertical ? "flex flex-col gap-1" : "flex gap-2 overflow-x-auto py-2"}
        aria-label={t("journey.feeds")}
      >
        {session.feeds.map((feed) => (
          <div key={feed.id} className={`flex shrink-0 items-center ${vertical ? "w-full" : ""}`}>
            <button
              aria-current={feedId === feed.id ? "true" : undefined}
              className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-sm ${vertical ? "rounded-xl" : "rounded-full border"} ${feedId === feed.id ? `bg-brand-soft font-bold text-brand-ink ${vertical ? "" : "border-brand"}` : `text-muted hover:bg-paper ${vertical ? "" : "border-line bg-surface"}`}`}
              onClick={() => onSelect(feed.id)}
            >
              <span className={vertical ? "truncate" : "whitespace-nowrap"}>{feedName(feed, lang)}</span>
              <span
                className="tab-count"
                aria-label={t("journey.trialCount", { count: feedItems(board, feed).length })}
              >
                {feedItems(board, feed).length}
              </span>
            </button>
            {vertical && feed.id !== "all" && (
              <button
                className="shrink-0 rounded-lg px-2 text-muted hover:bg-paper"
                aria-label={t("journey.removeFeed", { name: feedName(feed, lang) })}
                onClick={() => onRemove(feed.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className={`shrink-0 px-3 py-2 text-left text-sm font-bold text-brand hover:bg-brand-soft ${vertical ? "w-full rounded-xl" : "whitespace-nowrap rounded-full border border-dashed border-line"}`}
          onClick={() => {
            setSearch("");
            setAdding(true);
          }}
        >
          {t("journey.addFeed")}
        </button>
      </div>
      {!vertical && current && current.id !== "all" && (
        <button
          className="text-sm text-muted underline decoration-line underline-offset-4"
          onClick={() => onRemove(current.id)}
        >
          {t("journey.removeFeed", { name: feedName(current, lang) })}
        </button>
      )}
      {adding && (
        <Modal
          title={t("journey.addFeedTitle")}
          closeLabel={t("journey.close")}
          onClose={() => setAdding(false)}
        >
          <div className="p-5">
            <label className="field-label" htmlFor="feed-search">
              {t("journey.searchConditions")}
            </label>
            <input
              id="feed-search"
              autoFocus
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("journey.searchPlaceholder")}
            />
            {groups.map(
              (conditions, i) =>
                conditions.length > 0 && (
                  <section key={i} className="mt-5">
                    <h3 className="mb-2 text-sm font-bold text-muted">
                      {t(i === 0 ? "journey.yourConditions" : "journey.allConditions")}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {conditions.map((c) => (
                        <button
                          key={c.id}
                          className="flex items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-brand-soft"
                          onClick={() => {
                            onAdd(c.id);
                            setAdding(false);
                          }}
                        >
                          <span>{c.label}</span>
                          <span aria-hidden="true" className="text-brand">
                            ＋
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ),
            )}
            {available.length === 0 && <p className="py-6 text-muted">{t("journey.noConditions")}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
