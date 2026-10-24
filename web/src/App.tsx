import { useEffect, useMemo, useState } from "react";
import type { Bundle, Lang, Profile } from "@shared/schema";
import { createMatcher, type MatchOutput, type ZipTable } from "./matcher";
import { loadBundle, loadZips } from "./data/load";
import { useStrings, LANG_NAMES } from "./i18n";
import { Disclaimer, DemoBanner } from "./components/common";
import { Landing } from "./pages/Landing";
import { Intake } from "./pages/Intake";
import { Results } from "./pages/Results";
import { TrialDetail } from "./pages/TrialDetail";
import { SummaryPage } from "./pages/Summary";
import { Privacy } from "./pages/Privacy";

export type Route =
  | { name: "landing" }
  | { name: "intake" }
  | { name: "results" }
  | { name: "trial"; nctId: string }
  | { name: "summary" }
  | { name: "privacy" };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [seg, arg] = h.split("/");
  switch (seg) {
    case "intake":
      return { name: "intake" };
    case "results":
      return { name: "results" };
    case "trial":
      return { name: "trial", nctId: arg ?? "" };
    case "summary":
      return { name: "summary" };
    case "privacy":
      return { name: "privacy" };
    default:
      return { name: "landing" };
  }
}

export function navigate(route: Route) {
  const map: Record<Route["name"], string> = {
    landing: "#/",
    intake: "#/intake",
    results: "#/results",
    trial: "#/trial",
    summary: "#/summary",
    privacy: "#/privacy",
  };
  if (route.name === "trial") window.location.hash = `#/trial/${route.nctId}`;
  else window.location.hash = map[route.name];
}

const DEFAULT_PROFILE: Profile = {
  age: 50,
  sex: "OTHER",
  zip: "",
  maxMiles: 25,
  conditionIds: [],
  meds: [],
  answers: {},
  lang: "en",
  healthyVolunteer: false,
};

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const [lang, setLang] = useState<Lang>("en");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [zips, setZips] = useState<ZipTable>({});
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [savedTrials, setSavedTrials] = useState<string[]>([]);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Load the ZIP table once (shared across languages).
  useEffect(() => {
    void loadZips().then(setZips);
  }, []);

  // Load (or reload) the bundle whenever the language changes.
  useEffect(() => {
    let cancelled = false;
    void loadBundle(lang).then((b) => {
      if (!cancelled) setBundle(b);
    });
    setProfile((p) => ({ ...p, lang }));
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const matcher = useMemo(() => (bundle ? createMatcher(bundle, zips) : null), [bundle, zips]);
  const result: MatchOutput | null = useMemo(
    () => (matcher && profile.zip ? matcher.match(profile) : null),
    [matcher, profile],
  );

  const t = useStrings(lang);
  const isDemo = bundle?.source === "fixture";

  function toggleSaved(nctId: string) {
    setSavedTrials((s) => (s.includes(nctId) ? s.filter((x) => x !== nctId) : [...s, nctId]));
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col bg-slate-50">
      {isDemo && <DemoBanner lang={lang} />}
      <main className="flex-1">
        {route.name === "landing" && (
          <Landing
            lang={lang}
            langNames={LANG_NAMES}
            onPickLang={setLang}
            onStart={() => navigate({ name: "intake" })}
            onPrivacy={() => navigate({ name: "privacy" })}
          />
        )}
        {route.name === "intake" && (
          <Intake
            lang={lang}
            profile={profile}
            onChange={setProfile}
            onSubmit={() => navigate({ name: "results" })}
            onBack={() => navigate({ name: "landing" })}
          />
        )}
        {route.name === "results" && (
          <Results
            lang={lang}
            bundle={bundle}
            result={result}
            profile={profile}
            onAnswer={(qid, ans) =>
              setProfile((p) => ({ ...p, answers: { ...p.answers, [qid]: ans } }))
            }
            onOpenTrial={(nctId) => navigate({ name: "trial", nctId })}
            onBack={() => navigate({ name: "intake" })}
            onSummary={() => navigate({ name: "summary" })}
            savedTrials={savedTrials}
          />
        )}
        {route.name === "trial" && (
          <TrialDetail
            lang={lang}
            result={result}
            nctId={route.nctId}
            saved={savedTrials.includes(route.nctId)}
            onToggleSave={() => toggleSaved(route.nctId)}
            onBack={() => navigate({ name: "results" })}
          />
        )}
        {route.name === "summary" && (
          <SummaryPage
            lang={lang}
            result={result}
            savedTrials={savedTrials}
            onBack={() => navigate({ name: "results" })}
          />
        )}
        {route.name === "privacy" && (
          <Privacy
            lang={lang}
            profile={profile}
            onBack={() => navigate({ name: "landing" })}
            onLoadProfile={(p) => {
              setLang(p.lang);
              setProfile(p);
            }}
          />
        )}
      </main>
      <Disclaimer lang={lang} />
      {route.name !== "summary" && (
        <nav className="no-print flex items-center justify-around border-t border-slate-200 bg-white py-1 text-xs">
          <button className="px-3 py-2 text-slate-600" onClick={() => navigate({ name: "landing" })}>
            {t("nav.home")}
          </button>
          <button className="px-3 py-2 text-slate-600" onClick={() => navigate({ name: "intake" })}>
            {t("nav.intake")}
          </button>
          <button className="px-3 py-2 text-slate-600" onClick={() => navigate({ name: "privacy" })}>
            {t("nav.privacy")}
          </button>
        </nav>
      )}
    </div>
  );
}
