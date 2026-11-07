// PROTOTYPE — throwaway. Shared data, icons, app chrome, routing and events.
"use strict";

// ---------- Sample data (all invented) ----------
const PODS = [
  { id: "kit", t: "The Slow Kitchen", a: "Mara Okafor", c: "#b4532a" },
  { id: "orb", t: "Orbit Notes", a: "Lena Varga", c: "#2f4b8f" },
  { id: "moe", t: "Margins of Error", a: "Sam Whitlock & Priya Das", c: "#7a3f86" },
  { id: "fld", t: "Field Recordings", a: "Tomas Lind", c: "#3c6e47" },
  { id: "led", t: "Ledger & Lantern", a: "The Lantern Collective", c: "#8a6a1f" },
  { id: "law", t: "Byte Sized Law", a: "Ines Moreau", c: "#335f6b" },
  { id: "com", t: "The Long Commute", a: "Northlight Audio", c: "#a33a4a" },
  { id: "qh", t: "Quiet Hours", a: "June Ashby", c: "#4a4f7a" },
  { id: "eng", t: "Small Engines", a: "Dale Pruitt", c: "#5d6b2a" },
  { id: "nlf", t: "Northern Line Football", a: "Kofi & Ade", c: "#1f6f8b" }
];
const POD = Object.fromEntries(PODS.map((p) => [p.id, p]));
const initials = (t) => t.replace(/^The /, "").split(/[\s&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// d = days since Published, m = minutes, pos = minutes in (in some Entry), q = Playlists it is an Entry in
const EPS = [
  ["kit", "Bread that waits for you: the case for cold proving", 0, 52, 0, 0, 0, [], "Overnight dough, fridge temperatures and why patience beats yeast."],
  ["orb", "The long quiet of Voyager 2", 1, 64, 0, 0, 1, ["Default"], "Fifty years out and still talking: power budgets and the last instruments."],
  ["moe", "Polling the unpollable", 1, 41, 1, 0, 0, [], "Why response rates fell below 2% and what pollsters weight instead."],
  ["fld", "Rain on the moor", 2, 47, 0, 0, 0, ["Default"], "Ninety minutes of rain recorded on Dartmoor, edited down to forty-seven."],
  ["qh", "The lighthouse keeper's ledger", 2, 44, 0, 0, 0, ["Default"], "A slow bedtime story about counting ships and keeping the lamp."],
  ["led", "Tulips, twice", 3, 58, 0, 27, 0, ["Default"], "The 1637 tulip crash, and the 1980s rerun nobody remembers. Budget bubbles."],
  ["law", "Who owns your voice?", 3, 23, 0, 0, 0, [], "Voice cloning, consent and the first court rulings on synthetic speech."],
  ["com", "Episode 41: The signal box", 4, 31, 0, 0, 0, ["Commute"], "Ada finds the logbook. Part of season three."],
  ["eng", "Carburettors without fear", 4, 36, 0, 0, 0, ["Default"], "Float bowls, jets and the one screw you should never touch."],
  ["nlf", "Derby week, again", 5, 72, 0, 18, 0, ["Commute"], "Predictions, regrets and a long argument about full-backs."],
  ["kit", "A budget pantry in ten jars", 6, 38, 0, 0, 1, [], "Beans, grains and spices that cover most weeknight cooking on a budget."],
  ["orb", "Ask Orbit: can you hear a black hole?", 7, 29, 1, 0, 0, [], "Listener questions on sonification and gravitational waves."],
  ["moe", "The budget, line by line", 8, 66, 0, 12, 0, ["Deep dives"], "A walk through the autumn budget and the numbers behind the headlines."],
  ["fld", "Dawn chorus, Białowieża", 9, 61, 0, 0, 1, [], "The last old-growth forest in lowland Europe, recorded at 4 a.m."],
  ["led", "The first paper money", 10, 49, 1, 0, 0, [], "Song dynasty jiaozi and the invention of trust."],
  ["law", "Terms of service nobody reads", 11, 19, 0, 0, 0, [], "Clickwrap, browsewrap and what a court will actually enforce."],
  ["com", "Episode 40: Crossing at Hale", 11, 33, 1, 0, 0, [], "The train stops where it shouldn't."],
  ["qh", "Snowfall over the harbour", 12, 52, 0, 0, 0, [], "Gentle narration for winding down."],
  ["eng", "Two-stroke or four?", 13, 27, 0, 0, 0, [], "Mowers, mopeds and the mixing ratio."],
  ["nlf", "Transfer window post-mortem", 14, 58, 1, 0, 0, [], "Who bought well, who panicked, who forgot."],
  ["kit", "Stock, broth and the difference", 16, 44, 1, 0, 0, [], "Bones, time and the gelatine test."],
  ["orb", "Moons with oceans", 17, 55, 0, 0, 0, ["Deep dives"], "Europa, Enceladus and the missions headed their way."],
  ["moe", "Margins live: election night lessons", 19, 82, 0, 40, 0, ["Deep dives"], "Recorded in front of an audience in Leeds."],
  ["fld", "Ice cracking on Lake Baikal", 21, 38, 0, 0, 1, [], "Hydrophones under the ice in February."],
  ["led", "Debasement: a short history of shaving coins", 23, 51, 0, 0, 0, [], "Clipping, sweating and the budget crises behind them."],
  ["law", "Can a robot sign a contract?", 25, 22, 1, 0, 0, [], "Agency law meets software agents."],
  ["com", "Episode 39: The far platform", 25, 30, 1, 0, 0, [], "Season three begins."],
  ["qh", "The night ferry", 26, 48, 0, 0, 0, ["Replay"], "A slow crossing, told quietly."],
  ["eng", "Chainsaw chains, sharpened properly", 28, 24, 0, 0, 0, [], "File angles and depth gauges."],
  ["nlf", "Season preview", 30, 64, 1, 0, 0, [], "Everyone finishes fourth."],
  ["kit", "Ferments for beginners", 33, 46, 1, 0, 1, [], "Sauerkraut first, then everything else."],
  ["orb", "What the JWST saw first", 36, 58, 1, 0, 0, [], "A year of deep-field images, explained."],
  ["moe", "How to read a chart that lies", 40, 37, 1, 0, 1, ["Replay"], "Truncated axes, cherry-picked windows and budget charts."],
  ["fld", "Wind turbines at night", 45, 40, 0, 0, 0, [], "Low hum, high blades."],
  ["led", "Why gold?", 52, 63, 0, 0, 0, [], "Scarcity, shine and a very long habit."],
  ["law", "Privacy by default, explained", 58, 26, 1, 0, 0, [], "What the regulation actually requires."]
].map((e, i) => ({ id: "e" + i, p: e[0], t: e[1], d: e[2], m: e[3], pl: !!e[4], pos: e[5], st: !!e[6], q: e[7], n: e[8] }));

const PLAYLISTS = [
  { id: "def", name: "Default", n: 9, active: true, cop: true, isDefault: true },
  { id: "com", name: "Commute", n: 6, cop: false },
  { id: "deep", name: "Deep dives", n: 4, cop: false },
  { id: "rep", name: "Replay", n: 2, cop: false }
];
const VIEWS0 = [
  { id: "v1", name: "New this week", f: { published: { tag: "LastDays", days: 7 }, played: "notPlayed" }, sort: "publishedDesc", limit: null },
  { id: "v2", name: "Short and unplayed", f: { played: "notPlayed", maxDuration: 30 }, sort: "durationAsc", limit: 20 },
  { id: "v3", name: "Starred", f: { starred: true }, sort: "publishedDesc", limit: null },
  { id: "v4", name: "Not in a Playlist yet", f: { published: { tag: "LastDays", days: 30 }, played: "unplayed", notInAnyPlaylist: true }, sort: "publishedDesc", limit: null },
  { id: "v5", name: "Sleep", f: { podcasts: { mode: "include", ids: ["qh", "fld"] }, played: "notPlayed" }, sort: "publishedAsc", limit: null }
];
const DEVICE = { phone: "Pixel 8", desktop: "MacBook Air" };
// What the player shows; an area may change it before drawing.
let NOWP;
const NOWP0 = { p: "orb", t: "The long quiet of Voyager 2", pl: "Default", at: "37:02", left: "−26:58", pct: 58 };

// ---------- Formatting ----------
const TODAY = new Date(2026, 10, 7);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateOf = (d) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - d);
const fmtPub = (d) => {
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  const dt = dateOf(d);
  if (d < 7) return DAYS[dt.getDay()];
  return dt.getDate() + " " + MONTHS[dt.getMonth()];
};
const fmtLen = (m) => (m >= 60 ? Math.floor(m / 60) + " h " + (m % 60 ? (m % 60) + " min" : "") : m + " min").trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");
const snip = (text, q) => { const i = text.toLowerCase().indexOf(q.toLowerCase()); return i > 30 ? "…" + text.slice(i - 24) : text; };
const hl = (text, q) => {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
};

// ---------- View filtering (mirrors packages/domain/src/View.ts) ----------
const SORTS = { publishedDesc: "Newest first", publishedAsc: "Oldest first", durationAsc: "Shortest first", durationDesc: "Longest first" };
function matches(e, f) {
  if (f.published) {
    if (f.published.tag === "LastDays" && e.d >= f.published.days) return false;
    if (f.published.tag === "Between") {
      if (f.published.from != null && e.d > f.published.from) return false;
      if (f.published.to != null && e.d < f.published.to) return false;
    }
  }
  if (f.podcasts) {
    const inSet = f.podcasts.ids.includes(e.p);
    if (f.podcasts.mode === "include" ? !inSet : inSet) return false;
  }
  if (f.text) {
    const q = f.text.toLowerCase();
    if (![e.t, e.n, POD[e.p].t].some((s) => s.toLowerCase().includes(q))) return false;
  }
  if (f.played === "unplayed" && (e.pl || e.pos > 0)) return false;
  if (f.played === "inProgress" && (e.pl || e.pos === 0)) return false;
  if (f.played === "played" && !e.pl) return false;
  if (f.played === "notPlayed" && e.pl) return false;
  if (f.starred === true && !e.st) return false;
  if (f.starred === false && e.st) return false;
  if (f.notInAnyPlaylist && e.q.length) return false;
  if (f.minDuration && e.m < f.minDuration) return false;
  if (f.maxDuration && e.m > f.maxDuration) return false;
  return true;
}
function runView(f, sort, limit) {
  const all = EPS.filter((e) => matches(e, f));
  const by = { publishedDesc: (a, b) => a.d - b.d, publishedAsc: (a, b) => b.d - a.d, durationAsc: (a, b) => a.m - b.m, durationDesc: (a, b) => b.m - a.m }[sort || "publishedDesc"];
  all.sort(by);
  return { total: all.length, rows: limit ? all.slice(0, limit) : all };
}
const COND_TYPES = [
  ["published", "Published", "A date range, or the last few days"],
  ["podcasts", "Podcasts", "Only some podcasts, or all but some"],
  ["text", "Text", "Words in the title, show notes or podcast name"],
  ["played", "Played state", "Not started, In progress or Played"],
  ["starred", "Starred", "Starred, or not Starred"],
  ["notInAnyPlaylist", "Not in any Playlist", "Episodes that aren’t an Entry anywhere"],
  ["duration", "Duration", "Longer than, shorter than, or between"]
];
function condSummary(k, f) {
  switch (k) {
    case "published": {
      const p = f.published;
      if (p.tag === "LastDays") return "Published in the last " + plural(p.days, "day");
      return "Published between " + (p.from != null ? fmtPub(p.from) : "any time") + " and " + (p.to != null ? fmtPub(p.to).toLowerCase() : "today");
    }
    case "podcasts": {
      const names = f.podcasts.ids.map((id) => POD[id].t);
      const list = names.length > 2 ? names.slice(0, 2).join(", ") + " and " + (names.length - 2) + " more" : names.join(" and ");
      return (f.podcasts.mode === "include" ? "Only from " : "Not from ") + list;
    }
    case "text": return "Mentions “" + f.text + "”";
    case "played": return { unplayed: "Not started", inProgress: "In progress", played: "Played", notPlayed: "Not Played" }[f.played];
    case "starred": return f.starred ? "Starred" : "Not Starred";
    case "notInAnyPlaylist": return "Not in any Playlist";
    case "duration": {
      const a = f.minDuration, b = f.maxDuration;
      if (a && b) return "Between " + a + " and " + b + " min";
      if (a) return "At least " + a + " min";
      return "At most " + b + " min";
    }
  }
}
const condKeys = (f) => COND_TYPES.map((c) => c[0]).filter((k) => (k === "duration" ? f.minDuration || f.maxDuration : f[k] !== undefined));
function defaultCond(k) {
  return { published: { published: { tag: "LastDays", days: 14 } }, podcasts: { podcasts: { mode: "include", ids: [] } }, text: { text: "" }, played: { played: "notPlayed" }, starred: { starred: true }, notInAnyPlaylist: { notInAnyPlaylist: true }, duration: { maxDuration: 30 } }[k];
}
function dropCond(f, k) {
  const g = { ...f };
  if (k === "duration") { delete g.minDuration; delete g.maxDuration; } else delete g[k];
  return g;
}
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------- Icons (lucide paths) ----------
const IC = {
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  listMusic: '<path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>', plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  play: '<path d="M6 3.5v17l14-8.5z" fill="currentColor"/>', pause: '<rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  dl: '<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  more: '<circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  rewind: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  audio: '<path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3"/>',
  grip: '<circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>',
  pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  listPlus: '<path d="M11 12H3M16 6H3M16 18H3M18 9v6M21 12h-6"/>',
  listStart: '<path d="M16 12H3M16 18H3M10 6H3M21 18V8a2 2 0 0 0-2-2h-5"/><path d="m16 8-2-2 2-2"/>',
  listEnd: '<path d="M16 12H3M16 6H3M10 18H3M21 6v10a2 2 0 0 1-2 2h-5"/><path d="m16 16-2 2 2 2"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
};
const ic = (n, s = 20, extra = "") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${IC[n]}</svg>`;
const art = (pid, s = 48) => {
  const p = POD[pid] || { t: pid, c: "#6b6f7d" };
  return `<span class="art" aria-hidden="true" style="width:${s}px;height:${s}px;background:${p.c};font-size:${Math.round(s / 3.4)}px;border-radius:${s >= 64 ? 14 : 10}px">${initials(p.t)}</span>`;
};
const sw = (on, a, v, label) => `<button class="swhit" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-a="${a}" data-v="${v ?? ""}"><span class="sw" aria-checked="${on}"></span></button>`;
const seg = (opts, cur, a, cls = "") => `<div class="seg ${cls}" role="group">${opts.map(([v, l]) => `<button aria-pressed="${String(v) === String(cur)}" data-a="${a}" data-v="${v}">${l}</button>`).join("")}</div>`;
const back = (label, a, v = "") => `<button class="backlink" data-a="${a}" data-v="${v}">${ic("left", 20)}${esc(label)}</button>`;

// Episode rows as the app draws them today (EpisodeRow.tsx)
function epRowPhone(e, q) {
  return `<div class="ep ${e.pl ? "played" : ""}">${art(e.p, 48)}<div class="grow"><div class="t clamp2">${hl(e.t, q)}</div>
  <div class="xs muted trunc mt4">${e.pl ? '<span style="color:var(--pos);font-weight:500">✓ Played · </span>' : ""}${e.st ? '<span style="color:var(--star)">★ </span>' : ""}${hl(POD[e.p].t, q)} · ${fmtPub(e.d)} · ${fmtLen(e.m)}${e.pos ? " · " + (e.m - e.pos) + " min left" : ""}</div>
  ${q && !e.t.toLowerCase().includes(q.toLowerCase()) && e.n.toLowerCase().includes(q.toLowerCase()) ? `<div class="xs muted mt4 clamp2">Notes: ${hl(snip(e.n, q), q)}</div>` : ""}</div>
  <button class="ib" aria-label="Add ${esc(e.t)} to a Playlist" data-a="noop">${ic("plus")}</button><button class="ib play" aria-label="Play ${esc(e.t)}" data-a="noop">${ic("play", 18)}</button></div>`;
}
function epTable(rows, q, opts = {}) {
  if (!rows.length) return `<div class="dashed" style="padding:28px;text-align:center;margin-top:8px"><div class="m">No Episodes match</div><div class="sm muted mt4">${opts.empty || "Try removing a condition."}</div></div>`;
  return `<table class="tbl" style="table-layout:fixed"><colgroup><col style="width:36px"><col><col style="width:96px"><col style="width:84px"><col style="width:188px"></colgroup><thead><tr><th><span class="sr">Select</span></th><th>Episode</th><th>Published</th><th>Length</th><th style="text-align:right">Actions</th></tr></thead><tbody>${rows
    .map((e) => `<tr><td><input type="checkbox" aria-label="Select ${esc(e.t)}"></td><td><div class="row gap12">${art(e.p, 40)}<div class="grow"><div class="m trunc" style="${e.pl ? "color:var(--muted)" : ""}">${hl(e.t, q)}</div><div class="xs muted trunc">${e.pl ? '<span style="color:var(--pos)">✓ Played · </span>' : ""}${e.pos ? `<span>${e.m - e.pos} min left · </span>` : ""}${hl(POD[e.p].t, q)}${q && !e.t.toLowerCase().includes(q.toLowerCase()) && e.n.toLowerCase().includes(q.toLowerCase()) ? " · Notes: …" + hl(e.n.slice(Math.max(0, e.n.toLowerCase().indexOf(q.toLowerCase()) - 20)), q) : ""}</div></div></div></td><td class="muted tab-num">${fmtPub(e.d)}</td><td class="muted tab-num">${fmtLen(e.m)}</td>
    <td><div class="row" style="gap:0;justify-content:flex-end"><button class="ib" aria-label="Play Next" title="Play Next" data-a="noop">${ic("listStart", 18)}</button><button class="ib" aria-label="Play Last" title="Play Last" data-a="noop">${ic("listEnd", 18)}</button><button class="ib" aria-label="Star" title="Star" data-a="noop" style="${e.st ? "color:var(--star)" : ""}">${ic("star", 18, e.st ? 'fill="currentColor"' : "")}</button><button class="ib play" aria-label="Play" title="Play now" data-a="noop" style="margin-left:6px">${ic("play", 18)}</button></div></td></tr>`)
    .join("")}</tbody></table>`;
}

// ---------- App chrome ----------
function miniPlayer() {
  return `<section class="mini dark" aria-label="Now playing"><button class="row grow" style="gap:12px" data-a="noop" aria-label="Open Now Playing">${art(NOWP.p, 44)}<span class="grow"><span class="sm b trunc" style="display:block">${esc(NOWP.t)}</span><span class="xs trunc" style="display:block;color:var(--pmuted)">${esc(POD[NOWP.p].t)} · ${esc(NOWP.pl)}</span></span></button>
  <button class="ib" aria-label="Back 15 seconds" data-a="noop">${ic("rewind", 20)}</button><button class="pp" aria-label="Play" data-a="noop">${ic("play", 18)}</button><button class="ib" aria-label="Forward 30 seconds" data-a="noop" style="transform:scaleX(-1)">${ic("rewind", 20)}</button><span class="prog"><i style="width:${NOWP.pct}%"></i></span></section>`;
}
function phone({ tab, content, overlay = "", mini = true }) {
  const t = [["views", "Views", "filter"], ["playlists", "Playlists", "listMusic"], ["library", "Library", "library"]];
  return `<div class="app phone">${content}${mini ? miniPlayer() : ""}<nav class="tabs" aria-label="Sections">${t
    .map(([k, l, i]) => `<button data-a="tab" data-v="${k}" ${tab === k ? 'aria-current="page"' : ""}><span class="pill">${ic(i, 22)}</span>${l}</button>`)
    .join("")}</nav>${overlay}</div>`;
}
function desk({ sel, main, right = "", overlay = "", views = VIEWS0, searchSel = false, playlists = PLAYLISTS, noPlayer = false }) {
  return `<div class="app desk" ${noPlayer ? 'style="grid-template-rows:minmax(0,1fr) 0px"' : ""}><nav class="side" aria-label="Library and lists"><div class="brand">PodList</div>
  <button class="search" data-a="deskSearch" ${searchSel ? 'aria-current="page" style="background:var(--accent);color:var(--fg)"' : ""}>${ic("search", 16)}<span class="grow trunc">Search the Library</span><span class="kbd">⌘K</span></button>
  <div class="sh"><span class="label">Views</span><button class="ib" aria-label="New View" data-a="newView">${ic("plus", 16)}</button></div>
  ${views.length ? "" : '<p class="sm muted" style="padding:4px 10px;margin:0">No Views yet</p>'}${views.map((v) => `<button class="si" data-a="openView" data-v="${v.id}" ${sel === v.id ? 'aria-current="page"' : ""}><span class="trunc">${esc(v.name)}</span>${v.unsaved ? '<span class="badge">Unsaved</span>' : ""}</button>`).join("")}
  <div class="sh"><span class="label">Playlists</span><button class="ib" aria-label="New Playlist" data-a="noop">${ic("plus", 16)}</button></div>
  ${playlists.map((p) => `<button class="si" data-a="openPlaylist" data-v="${p.id}" ${sel === p.id ? 'aria-current="page"' : ""}><span class="row gap8 trunc"><span class="trunc">${esc(p.name)}</span>${p.active ? `<span style="color:var(--pos)" title="Active Playlist">${ic("audio", 15)}</span>` : ""}</span><span class="xs muted">${p.n}</span></button>`).join("")}
  <div class="sp"></div>
  <button class="si" data-a="openLibrary" ${sel === "library" ? 'aria-current="page"' : ""}><span class="row gap8">${ic("library", 16)}Library</span></button>
  <button class="si" data-a="noop"><span class="row gap8">${ic("gear", 16)}Settings</span></button></nav>
  <div class="dmain"><div class="pane">${main}</div>${right ? `<aside class="rpanel">${right}</aside>` : ""}</div>
  ${noPlayer ? "" : `<section class="pbar dark" aria-label="Now playing"><div class="row">${art(NOWP.p, 48)}<div class="grow"><div class="sm b trunc">${esc(NOWP.t)}</div><div class="xs trunc" style="color:var(--pmuted)">${esc(POD[NOWP.p].t)} · ${esc(NOWP.pl)}</div></div></div>
  <div class="col gap4"><div class="row" style="justify-content:center;gap:6px"><button class="ib" aria-label="Back 15 seconds" data-a="noop">${ic("rewind")}</button><button class="pp" aria-label="Play" data-a="noop">${ic("play", 18)}</button><button class="ib" aria-label="Forward 30 seconds" data-a="noop" style="transform:scaleX(-1)">${ic("rewind")}</button></div>
  <div class="row xs tab-num" style="gap:10px;color:var(--pmuted)"><span>${NOWP.at}</span><div class="track grow"><i style="width:${NOWP.pct}%"></i></div><span>${NOWP.left}</span></div></div>
  <div class="row" style="justify-content:flex-end"><button class="btn" style="color:#fff" data-a="noop">${ic("listMusic")} 8 <span style="color:var(--pmuted);font-weight:400">up next</span></button></div></section>`}${overlay}</div>`;
}
const scroll = (html, style = "") => `<div class="scroll" style="${style}">${html}</div>`;
const toast = (msg, undoA) => `<div class="toast" role="status"><span class="grow">${msg}</span>${undoA ? `<button class="btn" data-a="${undoA}">Undo</button>` : ""}<button class="ib" style="color:#fff;width:40px;height:40px" aria-label="Dismiss" data-a="toastOff">${ic("x", 18)}</button></div>`;

// ---------- Areas, routing and events ----------
const AREAS = {};
const AREA_ORDER = ["view-editor", "playlists", "library"];
const S = { area: "view-editor", variant: "A", device: "phone", screen: null, st: null };
let A = {}; // actions for the current area: name -> (value, el, event)

function parseHash() {
  const [area, vd, screen] = location.hash.replace(/^#/, "").split("/");
  const out = { area: AREAS[area] ? area : "view-editor", variant: "A", device: "phone", screen: null };
  if (vd) {
    const [v, d] = vd.split("-");
    if (/^[ABC]$/.test(v)) out.variant = v;
    if (d === "desktop" || d === "phone") out.device = d;
  }
  const scr = AREAS[out.area].variants[out.variant].screens;
  out.screen = scr.some((s) => s[0] === screen) ? screen : scr[0][0];
  return out;
}
function go(area, variant, device, screen) {
  const h = `#${area}/${variant}-${device}${screen ? "/" + screen : ""}`;
  if (location.hash !== h) location.hash = h;
  else load();
}
function load() {
  Object.assign(S, parseHash());
  S.st = AREAS[S.area].init(S.variant, S.screen, S.device);
  render();
}
function chrome() {
  const ar = AREAS[S.area];
  document.getElementById("areas").innerHTML = AREA_ORDER.filter((k) => AREAS[k]).map((k) => `<button aria-pressed="${k === S.area}" data-chrome="area" data-v="${k}">${AREAS[k].title}</button>`).join("");
  document.getElementById("variants").innerHTML = ["A", "B", "C"].filter((v) => ar.variants[v]).map((v) => `<button aria-pressed="${v === S.variant}" data-chrome="variant" data-v="${v}">${v} · ${ar.variants[v].name}</button>`).join("");
  document.getElementById("devices").innerHTML = [["phone", "Phone 390"], ["desktop", "Desktop 1280"]].map(([k, l]) => `<button aria-pressed="${k === S.device}" data-chrome="device" data-v="${k}">${l}</button>`).join("");
  const v = ar.variants[S.variant];
  document.getElementById("notes").innerHTML = `<h2>${ar.title}: jump to a state in ${S.variant}</h2><div class="jump">${v.screens.map(([k, l]) => `<button aria-pressed="${k === S.st.screen0}" data-chrome="screen" data-v="${k}">${l}</button>`).join("")}</div>
  <h2>Variants</h2><div class="vgrid">${["A", "B", "C"].filter((k) => ar.variants[k]).map((k) => `<div class="v ${k === S.variant ? "cur" : ""}"><b>${k} — ${ar.variants[k].name}</b><p>${ar.variants[k].caption}</p></div>`).join("")}</div>
  <h2>Open questions</h2><div class="q"><ol>${ar.questions.map((q) => `<li>${q}</li>`).join("")}</ol></div>
  <p class="xs" style="color:var(--chrome-muted);margin-top:18px">Throwaway prototype. All podcasts and Episodes are invented. Interactions keep state in memory only; switching variant or reloading resets it. Esc closes the top sheet or dialog.</p>`;
}
function render() {
  const ar = AREAS[S.area];
  A = Object.assign({}, COMMON, ar.actions);
  const active = document.activeElement;
  const fid = active && active.id && active.closest("#stage") ? active.id : null;
  const sel = fid && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
  const stage = document.getElementById("stage");
  stage.className = S.device;
  NOWP = NOWP0;
  stage.innerHTML = ar.render(S.variant, S.device, S.st);
  chrome();
  if (fid) {
    const el = document.getElementById(fid);
    if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
  } else if (S.st.focus) {
    const el = document.getElementById(S.st.focus);
    if (el) el.focus({ preventScroll: true });
  }
  S.st.focus = null;
  if (S.st.scrollTo) { const el = document.getElementById(S.st.scrollTo); const sc = el && el.closest(".scroll, .pane"); if (sc) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 120; S.st.scrollTo = null; }
}
const COMMON = {
  noop() { return false; },
  tab(v) { go({ views: "view-editor", playlists: "playlists", library: "library" }[v], S.variant, S.device); return false; },
  openView() { go("view-editor", S.variant, S.device); return false; },
  openPlaylist() { go("playlists", S.variant, S.device); return false; },
  openLibrary() { go("library", S.variant, S.device); return false; },
  newView() { go("view-editor", S.variant, S.device, "new"); return false; },
  deskSearch() { go("view-editor", S.variant, S.device, "search"); return false; },
  toastOff() { S.st.toast = null; }
};
document.addEventListener("click", (ev) => {
  const c = ev.target.closest("[data-chrome]");
  if (c) {
    const v = c.dataset.v;
    if (c.dataset.chrome === "area") go(v, "A", S.device);
    if (c.dataset.chrome === "variant") go(S.area, v, S.device);
    if (c.dataset.chrome === "device") go(S.area, S.variant, v, S.st.screen0);
    if (c.dataset.chrome === "screen") go(S.area, S.variant, S.device, v);
    return;
  }
  const el = ev.target.closest("#stage [data-a]");
  if (!el) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  if (el.tagName !== "INPUT") ev.preventDefault();
  if (fn.call(A, el.dataset.v, el, ev) !== false) render();
});
document.addEventListener("input", (ev) => {
  const el = ev.target.closest("#stage [data-in]");
  if (!el) return;
  const fn = A[el.dataset.in];
  if (fn && fn.call(A, el.value, el, ev) !== false) render();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && AREAS[S.area].esc && AREAS[S.area].esc(S.st)) { ev.preventDefault(); render(); }
});
window.addEventListener("hashchange", load);
