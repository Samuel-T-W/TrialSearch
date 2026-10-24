// Board model: matcher output + session -> the four tabs the journey UI shows.
// Pure TypeScript: no React, no storage, no network.
import type { Profile } from "../../../shared/schema";
import type { MatchOutput, TrialResult } from "../matcher";

export type Verdict = "unsure" | "qualified" | "not_qualified";
export type ArchiveTag = Verdict | "registered";
export type Tab = "feed" | "qualified" | "registered" | "archive";
export type Feed = { id: string; conditionId: string | null }; // null = "everything"
export type Session = {
  profile: Profile; // answers are profile.answers
  registered: string[]; // nctIds, in the order the user registered
  archived: string[]; // nctIds the user archived by hand, in order
  feeds: Feed[]; // always contains { id: "all", conditionId: null } first
};
export type BoardItem = {
  result: TrialResult;
  verdict: Verdict;
  tab: Tab;
  tag?: ArchiveTag; // set only when tab === "archive"
  interestSent?: boolean; // archived trials the user already sent interest to
  openQuestions: string[]; // questionIds of answerable unknown checks, unique, in check order
};
export type Board = Record<Tab, BoardItem[]>;

const ALL_FEED: Feed = { id: "all", conditionId: null };

export function openQuestions(r: TrialResult): string[] {
  const ids = r.checks
    .filter((c) => c.status === "unknown" && c.answerable)
    .map((c) => (c.check.params as { questionId: string }).questionId);
  return [...new Set(ids)];
}

// Unknown checks that are not answerable (clinician, unparsed, low confidence) do not
// block "qualified": the study team confirms those.
export function verdictOf(r: TrialResult): Verdict {
  if (r.checks.some((c) => c.status === "not_met")) return "not_qualified";
  return openQuestions(r).length > 0 ? "unsure" : "qualified";
}

export function buildBoard(m: MatchOutput, s: Session): Board {
  const board: Board = { feed: [], qualified: [], registered: [], archive: [] };
  const handArchived: BoardItem[] = [];
  const autoArchived: BoardItem[] = [];
  const registered: BoardItem[] = [];

  for (const result of [...m.matches, ...m.notAFit]) {
    const id = result.trial.nctId;
    const verdict = verdictOf(result);
    const open = openQuestions(result);
    const sent = s.registered.includes(id);
    const item = (tab: Tab, tag?: ArchiveTag): BoardItem => {
      const base: BoardItem = { result, verdict, tab, openQuestions: open };
      return tag ? { ...base, tag, ...(sent && { interestSent: true }) } : base;
    };

    // A registered trial stays registered until a later answer rules the user out;
    // then it drops to the archive, still marked "interest sent".
    if (s.archived.includes(id)) handArchived.push(item("archive", verdict));
    else if (sent && verdict !== "not_qualified") registered.push(item("registered"));
    else if (verdict === "not_qualified") autoArchived.push(item("archive", "not_qualified"));
    else if (verdict === "qualified") board.qualified.push(item("qualified"));
    else board.feed.push(item("feed"));
  }

  const rank = (x: BoardItem, list: string[]) => list.indexOf(x.result.trial.nctId);
  board.registered = registered.sort((a, b) => rank(a, s.registered) - rank(b, s.registered));
  handArchived.sort((a, b) => rank(b, s.archived) - rank(a, s.archived)); // most recent first
  board.archive = [...handArchived, ...autoArchived];
  return board;
}

export function feedItems(board: Board, feed: Feed): BoardItem[] {
  if (feed.conditionId === null) return board.feed;
  return board.feed.filter((i) => i.result.trial.conditionIds.includes(feed.conditionId as string));
}

export function newSession(profile: Profile): Session {
  return { profile, registered: [], archived: [], feeds: [ALL_FEED] };
}

export function answer(s: Session, questionId: string, value: boolean | "unsure"): Session {
  return { ...s, profile: { ...s.profile, answers: { ...s.profile.answers, [questionId]: value } } };
}

export function register(s: Session, nctId: string): Session {
  return s.registered.includes(nctId) ? s : { ...s, registered: [...s.registered, nctId] };
}

export function archive(s: Session, nctId: string): Session {
  return s.archived.includes(nctId) ? s : { ...s, archived: [...s.archived, nctId] };
}

export function restore(s: Session, nctId: string): Session {
  return { ...s, archived: s.archived.filter((id) => id !== nctId) };
}

export function addFeed(s: Session, conditionId: string): Session {
  if (s.feeds.some((f) => f.id === conditionId)) return s;
  return { ...s, feeds: [...s.feeds, { id: conditionId, conditionId }] };
}

export function removeFeed(s: Session, feedId: string): Session {
  if (feedId === ALL_FEED.id) return s;
  return { ...s, feeds: s.feeds.filter((f) => f.id !== feedId) };
}

/** nctIds whose tab changed between two boards. */
export function settledBy(before: Board, after: Board): string[] {
  const tabs = (b: Board) => new Map((Object.keys(b) as Tab[]).flatMap((t) => b[t].map((i) => [i.result.trial.nctId, t] as const)));
  const was = tabs(before);
  return [...tabs(after)].filter(([id, tab]) => was.has(id) && was.get(id) !== tab).map(([id]) => id);
}
