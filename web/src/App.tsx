import { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Lang } from "@shared/schema";
import { createMatcher, type ZipTable } from "./matcher";
import { loadBundle, loadZips } from "./data/load";
import { useStrings } from "./i18n";
import { Privacy } from "./pages/Privacy";
import { addFeed, buildBoard, removeFeed, type Session, type Tab } from "./journey/board";
import { sessionFromPreset, type Preset } from "./journey/presets";
import { Login } from "./journey/Login";
import { Shell } from "./journey/Shell";
import { Modal } from "./journey/ui";

function trialFromHash() {
  return /^#\/?trial\/(NCT\d{8})$/.exec(window.location.hash)?.[1] ?? null;
}

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [zips, setZips] = useState<ZipTable>({});
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [feedId, setFeedId] = useState("all");
  const [openTrial, setOpenTrial] = useState<string | null>(trialFromHash);
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const pushedTrial = useRef(false);
  const t = useStrings(lang);

  useEffect(() => {
    const onHash = () => {
      setOpenTrial(trialFromHash());
      if (!trialFromHash()) pushedTrial.current = false;
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    void Promise.all([loadBundle(lang), loadZips()])
      .then(([data, zipData]) => {
        if (cancelled) return;
        if (Object.keys(zipData).length === 0) {
          setError(true);
          return;
        }
        setBundle(data);
        setZips(zipData);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, retry]);

  const matcher = useMemo(() => (bundle ? createMatcher(bundle, zips) : null), [bundle, zips]);
  const board = useMemo(
    () => (matcher && session ? buildBoard(matcher.match(session.profile), session) : null),
    [matcher, session],
  );

  function changeLanguage(value: Lang) {
    setLang(value);
    setSession((s) => (s ? { ...s, profile: { ...s.profile, lang: value } } : null));
  }
  function clearTrial() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpenTrial(null);
    pushedTrial.current = false;
  }
  function login(preset: Preset) {
    setSession(sessionFromPreset(preset));
    setName(preset.name);
    setLang(preset.profile.lang);
    setTab("feed");
    setFeedId("all");
  }
  function logout() {
    setSession(null);
    setName("");
    setPrivacy(false);
    clearTrial();
  }
  function open(id: string) {
    if (openTrial) window.history.replaceState(null, "", `#trial/${id}`);
    else {
      pushedTrial.current = true;
      window.location.hash = `trial/${id}`;
    }
    setOpenTrial(id);
  }
  function closeTrial() {
    if (pushedTrial.current) window.history.back();
    else clearTrial();
  }
  function selectTab(value: Tab) {
    setTab(value);
    clearTrial();
  }
  function selectFeed(id: string) {
    setFeedId(id);
    setTab("feed");
    clearTrial();
  }
  function deleteFeed(id: string) {
    setSession((s) => (s ? removeFeed(s, id) : s));
    if (feedId === id) setFeedId("all");
  }

  if (error)
    return (
      <main className="mx-auto max-w-lg p-8">
        <p role="alert">{t("journey.loadError")}</p>
        <button className="btn-primary mt-4" onClick={() => setRetry((n) => n + 1)}>
          {t("journey.retry")}
        </button>
      </main>
    );
  if (!bundle || !matcher)
    return (
      <main role="status" className="p-8 text-muted">
        {t("journey.loading")}
      </main>
    );
  if (!session || !board)
    return <Login lang={lang} bundle={bundle} zips={zips} onLanguage={changeLanguage} onLogin={login} />;

  return (
    <>
      <Shell
        session={session}
        name={name}
        lang={lang}
        board={board}
        tab={tab}
        feedId={feedId}
        openTrial={openTrial}
        onTab={selectTab}
        onFeed={selectFeed}
        onAddFeed={(id) => {
          setSession((s) => (s ? addFeed(s, id) : s));
          selectFeed(id);
        }}
        onRemoveFeed={deleteFeed}
        onOpen={open}
        onCloseTrial={closeTrial}
        onLanguage={changeLanguage}
        onLogout={logout}
        onPrivacy={() => setPrivacy(true)}
      />
      {privacy && (
        <Modal title={t("journey.privacy")} closeLabel={t("journey.close")} onClose={() => setPrivacy(false)}>
          <div className="journey-privacy">
            <Privacy
              lang={lang}
              profile={session.profile}
              onBack={() => setPrivacy(false)}
              onLoadProfile={() => {}}
            />
          </div>
          <p className="px-5 pb-5 text-sm text-muted">{t("journey.sessionNote")}</p>
        </Modal>
      )}
    </>
  );
}
