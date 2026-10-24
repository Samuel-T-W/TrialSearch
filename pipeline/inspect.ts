// Match inspector: runs the real matcher in-process for every test persona and
// writes one static page that shows profile -> trials -> why.
//
//   npm run inspect          -> docs/match-inspector.html (open it in a browser)
//
// Trials come from the store (data/store/trials/) plus the 7 fixture trials.
// No network, no LLM: the same code the phone runs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CompiledTrial, Profile } from "../shared/schema";
import { conditionById, medClassById } from "../shared/vocab";
import { createMatcher, haversineMiles, type ZipTable } from "../web/src/matcher/index";
import { loadFixtureTrials } from "./fixture";
import { PERSONAS } from "./personas";
import { loadStore } from "./store";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "docs", "match-inspector.html");

export function loadAll() {
  const store = loadStore();
  const fixture = loadFixtureTrials();
  const origin = new Map<string, "store" | "fixture">();
  const trials: CompiledTrial[] = [];
  for (const t of store.trials) { trials.push(t); origin.set(t.nctId, "store"); }
  for (const t of fixture) if (!origin.has(t.nctId)) { trials.push(t); origin.set(t.nctId, "fixture"); }
  const zips: ZipTable = JSON.parse(readFileSync(join(ROOT, "web", "public", "data", "ma-zips.json"), "utf8"));
  return { trials, origin, zips, questions: store.questions, storeErrors: store.errors };
}

/** Why the hard filter dropped a trial that shares a condition (mirrors the matcher). */
function dropReason(t: CompiledTrial, p: Profile, zips: ZipTable): string | null {
  if (t.ageMin !== undefined && p.age < t.ageMin) return `age ${p.age} < min ${t.ageMin}`;
  if (t.ageMax !== undefined && p.age > t.ageMax) return `age ${p.age} > max ${t.ageMax}`;
  if (t.sex !== "ALL" && p.sex !== "OTHER" && p.sex !== t.sex) return `trial is ${t.sex} only`;
  const home = zips[p.zip];
  if (!home) return `ZIP ${p.zip} unknown`;
  const miles = Math.min(...t.sites.map((s) => haversineMiles(home[0], home[1], s.lat, s.lon)));
  if (miles > p.maxMiles) return `nearest site ${miles.toFixed(0)} mi > limit ${p.maxMiles} mi`;
  return null;
}

export function runPersonas() {
  const { trials, origin, zips, questions, storeErrors } = loadAll();
  const matcher = createMatcher({ trials }, zips);
  const qText = new Map(questions.map((q) => [q.id, q.text.en]));

  const results = PERSONAS.map((persona) => {
    const p = persona.profile;
    const out = matcher.match(p); // the in-process "API call"
    const shown = new Set([...out.matches, ...out.notAFit].map((r) => r.trial.nctId));
    const dropped = trials
      .filter((t) => !shown.has(t.nctId))
      .filter((t) => t.conditionIds.some((c) => p.conditionIds.includes(c)) || (p.healthyVolunteer && t.healthyVolunteers))
      .map((t) => ({ nctId: t.nctId, title: t.title.en, reason: dropReason(t, p, zips) ?? "filtered" }));
    const card = (r: (typeof out.matches)[number]) => ({
      nctId: r.trial.nctId,
      origin: origin.get(r.trial.nctId),
      title: r.trial.title[p.lang] ?? r.trial.title.en,
      titleEn: r.trial.title.en,
      phase: r.trial.phase,
      site: `${r.nearestSite.facility}, ${r.nearestSite.city}`,
      miles: Math.round(r.distanceMiles * 10) / 10,
      met: r.metCount, unknown: r.unknownCount, total: r.checks.length,
      excludedBy: r.excludedBy
        ? { id: r.excludedBy.check.id, text: `${r.excludedBy.check.polarity === "include" ? "Required, not met" : "Rules you out"}: ${r.excludedBy.check.plain.en}` }
        : null,
      checks: r.checks.map((c) => ({
        id: c.check.id, status: c.status, kind: c.check.kind, polarity: c.check.polarity,
        confidence: c.check.confidence, plain: c.check.plain.en, source: c.check.sourceText,
      })),
      json: r.trial,
    });
    return {
      persona: {
        ...persona,
        conditions: p.conditionIds.map((id) => conditionById(id)?.label ?? id),
        meds: p.meds.map((m) => `${medClassById(m.medClassId)?.label ?? m.medClassId}${m.sinceDays ? ` (${m.sinceDays} days)` : ""}`),
        answers: Object.entries(p.answers).map(([q, a]) => ({ q: qText.get(q) ?? q, a })),
      },
      matches: out.matches.map(card),
      notAFit: out.notAFit.map(card),
      nextQuestions: out.nextQuestions.map((n) => ({ ...n, text: qText.get(n.questionId) ?? n.questionId })),
      dropped,
    };
  });

  const counts = { total: trials.length, store: [...origin.values()].filter((o) => o === "store").length, fixture: [...origin.values()].filter((o) => o === "fixture").length };
  return { results, counts, storeErrors };
}

function html(data: ReturnType<typeof runPersonas>) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TrialSearch - match inspector</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--ink:#1c1c1c;--mute:#666;--line:#ddd;--ok:#0a7d3b;--no:#b3261e;--unk:#8a6d00;--acc:#0f6e6e}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--card:#1e1e1e;--ink:#eee;--mute:#aaa;--line:#333;--ok:#5fd28c;--no:#ff8a80;--unk:#e6c35c;--acc:#5ec8c8}}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
header{padding:14px 20px;border-bottom:1px solid var(--line);background:var(--card)}header h1{margin:0;font-size:18px}header p{margin:4px 0 0;color:var(--mute);font-size:13px}
.wrap{display:grid;grid-template-columns:260px 1fr;min-height:calc(100vh - 64px)}
nav{border-right:1px solid var(--line);padding:10px;background:var(--card)}
nav button{display:block;width:100%;text-align:left;padding:10px;margin:0 0 6px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);cursor:pointer;font:inherit}
nav button[aria-current=true]{border-color:var(--acc);outline:2px solid var(--acc)}
nav small{display:block;color:var(--mute)}
main{padding:16px 20px;max-width:1100px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:0 0 14px}
h2{margin:0 0 6px;font-size:20px}h3{margin:18px 0 8px;font-size:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 16px}
.k{color:var(--mute);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;border:1px solid var(--line);font-size:12px;margin:2px 4px 2px 0}
.fixture{border-color:var(--unk);color:var(--unk)}.store{border-color:var(--acc);color:var(--acc)}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-top:1px solid var(--line);padding:6px;vertical-align:top;text-align:left}
.met{color:var(--ok)}.not_met{color:var(--no);font-weight:600}.unknown{color:var(--unk)}
.src{color:var(--mute);font-size:12px}
details summary{cursor:pointer;color:var(--acc)}pre{overflow:auto;max-height:420px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px}
.excl{border-left:4px solid var(--no)}.match{border-left:4px solid var(--ok)}
@media (max-width:760px){.wrap{grid-template-columns:1fr}nav{border-right:0;border-bottom:1px solid var(--line)}}
</style></head><body>
<header><h1>TrialSearch - match inspector</h1><p id="meta"></p></header>
<div class="wrap"><nav id="nav" aria-label="Test patients"></nav><main id="main"></main></div>
<script id="data" type="application/json">${json}</script>
<script>
const D=JSON.parse(document.getElementById("data").textContent);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const icon={met:"✅ met",not_met:"❌ not met",unknown:"❓ unknown"};
document.getElementById("meta").textContent=\`Matched in-process against \${D.counts.total} compiled trials (\${D.counts.store} real from data/store, \${D.counts.fixture} hand-written fixture). Same matcher code the phone runs. Generated \${new Date().toLocaleString()}.\`;
const nav=document.getElementById("nav");
D.results.forEach((r,i)=>{const b=document.createElement("button");b.innerHTML=\`<b>\${esc(r.persona.name)}</b><small>\${r.matches.length} match · \${r.notAFit.length} not a fit</small>\`;b.onclick=()=>show(i);nav.appendChild(b)});
function trialCard(t,cls){return \`<div class="card \${cls}">
<div><span class="pill \${t.origin}">\${t.origin}</span><span class="pill">\${esc(t.phase.join(", "))}</span><b>\${esc(t.nctId)}</b></div>
<h3 style="margin:6px 0">\${esc(t.title)}</h3>\${t.title!==t.titleEn?\`<div class="src">\${esc(t.titleEn)}</div>\`:""}
<div class="src">Nearest site: \${esc(t.site)} · \${t.miles} mi · \${t.met} of \${t.total} rules met, \${t.unknown} unknown</div>
\${t.excludedBy?\`<p class="not_met">Not a fit because: \${esc(t.excludedBy.text)} <span class="src">(\${esc(t.excludedBy.id)})</span></p>\`:""}
<table><thead><tr><th>Result</th><th>Rule</th><th>Kind</th><th>Original trial text</th></tr></thead><tbody>
\${t.checks.map(c=>\`<tr><td class="\${c.status}">\${icon[c.status]}</td><td>\${c.polarity==="exclude"?"<b>excl</b> ":""}\${esc(c.plain)}</td><td>\${esc(c.kind)}\${c.confidence==="low"?" (low conf.)":""}</td><td class="src">\${esc(c.source)}</td></tr>\`).join("")}
</tbody></table>
<details><summary>Trial JSON</summary><pre>\${esc(JSON.stringify(t.json,null,2))}</pre></details></div>\`}
function show(i){
 [...nav.children].forEach((b,j)=>b.setAttribute("aria-current",String(i===j)));
 const r=D.results[i],p=r.persona,pr=p.profile;
 document.getElementById("main").innerHTML=\`
<div class="card"><h2>\${esc(p.name)}</h2><p>\${esc(p.about)}</p>
<div class="grid">
<div><div class="k">Age / sex</div>\${pr.age} · \${pr.sex}</div>
<div><div class="k">ZIP / distance</div>\${pr.zip} · up to \${pr.maxMiles} mi</div>
<div><div class="k">Language</div>\${pr.lang}</div>
<div><div class="k">Healthy volunteer</div>\${pr.healthyVolunteer?"yes":"no"}</div>
<div><div class="k">Conditions</div>\${p.conditions.map(c=>\`<span class="pill">\${esc(c)}</span>\`).join("")||"none"}</div>
<div><div class="k">Medicines</div>\${p.meds.map(c=>\`<span class="pill">\${esc(c)}</span>\`).join("")||"none"}</div>
</div>
\${p.answers.length?\`<div class="k" style="margin-top:8px">Answers</div><ul>\${p.answers.map(a=>\`<li>\${esc(a.q)} <b>\${esc(String(a.a))}</b></li>\`).join("")}</ul>\`:""}
<details><summary>Profile JSON (the matcher's input)</summary><pre>\${esc(JSON.stringify(pr,null,2))}</pre></details></div>
<h3>✅ Possible matches (\${r.matches.length})</h3>\${r.matches.map(t=>trialCard(t,"match")).join("")||"<p>None.</p>"}
\${r.nextQuestions.length?\`<div class="card"><b>Next questions to narrow it down</b><ul>\${r.nextQuestions.map(q=>\`<li>\${esc(q.text)} <span class="src">affects \${q.affects} trial(s)</span></li>\`).join("")}</ul></div>\`:""}
<h3>❌ Not a fit (\${r.notAFit.length})</h3>\${r.notAFit.map(t=>trialCard(t,"excl")).join("")||"<p>None.</p>"}
<h3>Filtered out before rules (\${r.dropped.length})</h3>
<div class="card">\${r.dropped.length?\`<table><tbody>\${r.dropped.map(d=>\`<tr><td><b>\${esc(d.nctId)}</b></td><td>\${esc(d.title)}</td><td class="not_met">\${esc(d.reason)}</td></tr>\`).join("")}</tbody></table>\`:"No same-condition trials were filtered out."}</div>\`;
 main.scrollTop=0;}
show(0);
</script></body></html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = runPersonas();
  for (const e of data.storeErrors) console.error(`store: skipped ${e}`);
  for (const r of data.results) {
    console.log(`\n${r.persona.name} (${r.persona.profile.age} ${r.persona.profile.sex}, ${r.persona.profile.zip}, ${r.persona.conditions.join(", ") || "healthy"})`);
    for (const m of r.matches) console.log(`  ✅ ${m.nctId}  ${m.miles} mi  ${m.met}/${m.total} met  ${m.titleEn}`);
    for (const m of r.notAFit) console.log(`  ❌ ${m.nctId}  ${m.excludedBy?.text}`);
    for (const d of r.dropped) console.log(`  ·  ${d.nctId}  dropped: ${d.reason}`);
  }
  mkdirSync(join(ROOT, "docs"), { recursive: true });
  writeFileSync(OUT, html(data));
  console.log(`\nwrote ${OUT}  (${data.counts.total} trials: ${data.counts.store} store, ${data.counts.fixture} fixture)`);
}
