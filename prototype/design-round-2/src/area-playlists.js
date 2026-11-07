// ===== Area 2: Playlist settings and the Rewind flow =====
(() => {
  const E = (id) => EPS[+id.slice(1)];
  // Minutes since Thu 5 Nov 00:00. Thu = 0, Fri = 1440, Sat (today) = 2880.
  const DAYN = ["Thu 5 Nov", "Fri 6 Nov", "Sat 7 Nov"];
  const DAYREL = ["Thursday · 5 Nov", "Yesterday · Fri 6 Nov", "Today · Sat 7 Nov"];
  const at = (day, h, m) => day * 1440 + h * 60 + m;
  const fmtT = (abs) => { const m = ((abs % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ":" + String(mm).padStart(2, "0") + " " + (h < 12 ? "am" : "pm"); };
  const fmtDT = (abs) => DAYN[Math.floor(abs / 1440)].slice(0, 3) + " " + fmtT(abs);
  const fmtPos = (min) => (min >= 60 ? Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0") + ":00" : min + ":00");

  // The Default Playlist's Listening Timeline, as stretches of continuous playback (oldest first).
  const STR = [
    { id: "s6", ep: "e20", a: at(0, 7, 40), b: at(0, 8, 24), from: 0, to: 44, fin: true },
    { id: "s5", ep: "e11", a: at(1, 18, 10), b: at(1, 18, 39), from: 0, to: 29, fin: true },
    { id: "s4", ep: "e1", a: at(1, 23, 20), b: at(1, 23, 59), from: 25, to: 64, fin: true },
    { id: "s3", ep: "e4", a: at(2, 0, 0), b: at(2, 0, 44), from: 0, to: 44, fin: true },
    { id: "s2", ep: "e3", a: at(2, 0, 44), b: at(2, 1, 31), from: 0, to: 47, fin: true },
    { id: "s1", ep: "e5", a: at(2, 1, 31), b: at(2, 1, 58), from: 0, to: 27, fin: false, why: "Paused" }
  ];
  // Deliberate edits made in the same period (kept by any Rewind).
  const EDITS = [
    { a: at(0, 8, 30), kind: "add", ep: "e13", text: "You added “Dawn chorus, Białowieża” with Play Last" },
    { a: at(2, 8, 5), kind: "add", ep: "e8", text: "You added “Carburettors without fear” with Play Next" },
    { a: at(2, 8, 7), kind: "played", ep: "e2", text: "You marked “Polling the unpollable” Played" }
  ];
  const DEFAULT_T = at(1, 23, 45);
  const ENTRIES0 = { def: ["e5", "e8", "e6", "e17", "e18", "e13", "e0", "e15", "e21"], com: ["e9", "e7", "e16", "e19", "e10", "e6"], deep: ["e12", "e21", "e22", "e1"], rep: ["e27", "e32"] };
  const POS0 = { e5: 27, e9: 18, e12: 12, e22: 40 };

  function copOn(st, v) {
    const p = plOf(st, v); p.cop = !p.cop; st.copNote = 0;
    if (p.cop) { const before = st.entries[v].length; st.entries[v] = st.entries[v].filter((id) => !E(id).pl); st.copNote = before - st.entries[v].length; }
  }
  function plan(t) {
    const st = STR.find((s) => s.a <= t && t < s.b) || STR.find((s) => s.a <= t && t <= s.b) || STR.find((s) => s.a > t) || STR[STR.length - 1];
    const pos = st.from + Math.max(0, Math.min(st.to - st.from, t - st.a));
    return { t, st, pos, undone: STR.filter((s) => s.fin && s.b > t), reset: STR.filter((s) => !s.fin && s.a > t), kept: EDITS.filter((e) => e.a > t) };
  }
  function applyRewind(st, t) {
    const p = plan(t);
    const cur = st.entries.def;
    const restored = p.undone.map((s) => s.ep).filter((id) => !cur.includes(id));
    st.entries.def = [...restored, ...cur];
    st.restored = restored;
    st.cursor = p.st.ep; st.pos[p.st.ep] = p.pos;
    p.reset.forEach((s) => (st.pos[s.ep] = s.from));
    st.rewoundTo = t;
  }

  // ---------- Playlist detail ----------
  const plOf = (st, id) => st.playlists.find((p) => p.id === id);
  function entryRow(st, id, idx, plId, isDesk) {
    const e = E(id);
    const cur = plId === "def" && st.cursor === id;
    const pos = st.pos[id] || 0;
    const back = st.restored && st.restored.includes(id) && plId === "def";
    const pct = Math.round((pos / e.m) * 100);
    return `<li class="row" style="gap:12px;padding:10px 8px;border-radius:12px;${cur ? "background:var(--accent)" : ""}"><span class="xs b" style="width:${isDesk ? 56 : 48}px;text-align:center;letter-spacing:.06em;color:${cur ? "var(--primary)" : "var(--muted)"}">${cur ? "RESUME" : idx + 1}</span>${art(e.p, 44)}
      <span class="grow"><span class="sm m clamp2">${esc(e.t)}</span><span class="row mt4" style="gap:8px">${back ? '<span class="badge blue">Back from Rewind</span>' : ""}${e.pl && plId !== "def" ? '<span class="badge green">✓ Played</span>' : ""}<span class="prog grow"><i style="width:${pct}%"></i></span><span class="xs muted tab-num">${pos ? fmtLen(e.m - pos) + " left" : fmtLen(e.m)}</span></span></span>
      <button class="ib" style="color:var(--primary)" aria-label="Play ${esc(e.t)} from here" data-a="noop">${ic("play", 18)}</button>${isDesk ? `<span class="muted" style="cursor:grab" aria-hidden="true">${ic("grip", 18)}</span>` : ""}</li>`;
  }
  const entriesList = (st, plId, isDesk) => `<ol style="list-style:none;margin:0;padding:0 12px">${st.entries[plId].map((id, i) => entryRow(st, id, i, plId, isDesk)).join("")}</ol>`;
  const tabsSeg = (cur, extra = []) => seg([["entries", "Entries"], ["history", "History"], ["timeline", S.device === "phone" ? "Timeline" : "Listening Timeline"], ...extra], cur, "plTab", "full");
  function historyList() {
    return `<div style="padding:0 20px">${STR.filter((s) => s.fin).reverse().map((s) => { const e = E(s.ep); return `<div class="lrow" style="min-height:60px">${art(e.p, 40)}<span class="grow"><span class="sm m trunc" style="display:block">${esc(e.t)}</span><span class="xs muted">Finished ${fmtDT(s.b)}</span></span></div>`; }).join("")}</div>`;
  }
  function plHeader(st, plId, isDesk, actions) {
    const p = plOf(st, plId);
    return `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${isDesk ? "" : back("Playlists", "toPlList")}<div class="row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">${esc(p.name)}</h1><div class="row gap4">${actions || ""}</div></div>
      <p class="sm muted" style="margin:6px 0 0">${p.active ? '<span style="color:var(--pos);font-weight:600">● Active</span> · ' : ""}${plural(st.entries[plId].length, "Entry", "Entries")} · ${p.cop ? "Clear on Played" : "Keeps Played Entries"}</p></header>`;
  }

  // ---------- Rewind summary (what will be undone) ----------
  function planHtml(st, t, opts = {}) {
    const p = plan(t);
    const e = E(p.st.ep);
    const li = (inner) => `<li class="row" style="gap:10px;padding:6px 0;align-items:flex-start">${inner}</li>`;
    const sec = (title, items, tone) => (items.length ? `<div class="mt16"><div class="sm b" style="color:${tone || "var(--fg)"}">${title}</div><ul style="list-style:none;margin:4px 0 0;padding:0">${items.join("")}</ul></div>` : "");
    return `<div class="card row" style="padding:12px;gap:12px">${art(e.p, 48)}<span class="grow"><span class="xs muted m" style="display:block">Playback goes back to</span><span class="m clamp2">${esc(e.t)}</span><span class="sm muted">at ${fmtPos(p.pos)}, where it was ${fmtDT(t)}</span></span></div>
      ${sec(`Becomes unplayed and returns to ${esc(plOf(st, "def").name)} (${p.undone.length})`, p.undone.map((s) => li(`${art(E(s.ep).p, 28)}<span class="grow sm"><span class="m">${esc(E(s.ep).t)}</span><br><span class="muted">Finished ${fmtDT(s.b)}${st.entries.def.includes(s.ep) ? "" : " · its Entry comes back"}</span></span>`)), "var(--fg)")}
      ${sec(`Position goes back (${p.reset.length})`, p.reset.map((s) => li(`${art(E(s.ep).p, 28)}<span class="grow sm"><span class="m">${esc(E(s.ep).t)}</span><br><span class="muted tab-num">${fmtPos(s.to).replace(/:00$/, "")}:15 → ${s.from ? fmtPos(s.from) : "the start"}</span></span>`)))}
      ${sec(`Kept: your own changes since (${p.kept.length})`, p.kept.map((k) => li(`<span style="color:var(--pos);margin-top:2px">${ic("check", 16)}</span><span class="grow sm">${esc(k.text)} <span class="muted">· ${fmtDT(k.a)}</span></span>`)), "var(--pos)")}
      ${opts.noFoot ? "" : `<p class="xs muted mt16" style="margin-bottom:0">Only ${esc(plOf(st, "def").name)} changes. Other Playlists, Stars and Episodes you marked Played yourself stay as they are.</p>`}`;
  }
  const planShort = (t) => { const p = plan(t); return [p.undone.length ? plural(p.undone.length, "finished Episode") + " back" : null, p.reset.length ? plural(p.reset.length, "Position") + " reset" : null, p.kept.length ? "keeps " + plural(p.kept.length, "change") + " of yours" : null].filter(Boolean).join(" · ") || "Nothing to undo"; };

  // ---------- Settings content ----------
  function settingsBody(st, plId, mode) {
    const p = plOf(st, plId);
    const playedHere = st.entries[plId].filter((id) => E(id).pl).length;
    const nameRow = p.isDefault
      ? `<div class="group"><div class="gr"><span class="m" style="width:72px">Name</span><span class="grow muted">Default</span></div></div><p class="help">The Default Playlist always exists; it can’t be renamed or deleted.</p>`
      : `<label class="col gap4"><span class="label">Name</span><input id="plName" type="text" data-in="plName" value="${esc(st.nameDraft ?? p.name)}"></label>`;
    return `${nameRow}
      <div class="gl label">When an Episode is Played</div>
      <div class="group"><div class="gr" style="align-items:flex-start;padding-top:12px;padding-bottom:12px"><span class="grow"><span class="m" style="display:block">Clear on Played</span><span class="sm muted">Its Entry leaves this Playlist as soon as the Episode becomes Played, wherever you finished it.</span></span>${sw(p.cop, "toggleCop", plId, "Clear on Played")}</div></div>
      ${st.copNote && p.cop ? `<p class="help" role="status" style="color:var(--warn)">${ic("info", 14)} ${plural(st.copNote, "Entry", "Entries")} that ${st.copNote === 1 ? "was" : "were"} already Played left this Playlist just now.</p>` : `<p class="help">${p.cop ? "Played Entries leave on their own." : "Played Entries stay until you remove them."}${playedHere ? ` ${plural(playedHere, "Entry", "Entries")} here ${playedHere === 1 ? "is" : "are"} already Played.` : ""}</p>`}
      ${p.isDefault ? "" : `<div class="${mode === "page" ? "gl" : "mt24"}">${mode === "page" ? '<div class="label" style="padding-bottom:6px">Danger zone</div>' : ""}<button class="btn ${mode === "page" ? "btn-o" : "btn-t"} danger" style="${mode === "page" ? "color:var(--danger)" : "padding:0 4px"}" data-a="askDeletePl" data-v="${plId}">${ic("trash", 18)}Delete Playlist…</button></div>`}`;
  }
  function deletePlAlert(st, plId, z = 6) {
    const p = plOf(st, plId);
    const n = st.entries[plId].length;
    return `<div class="scrim" style="z-index:${20 + z}" data-a="cancelDelete"></div><div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="dpT" style="z-index:${21 + z}"><h2 class="h3" id="dpT" style="font-size:17px">Delete “${esc(p.name)}”?</h2>
      <ul class="sm muted" style="margin:8px 0 16px;padding-left:18px"><li>Its ${plural(n, "Entry", "Entries")}, their Positions, History and Listening Timeline go, on every Device.</li><li>The Episodes stay in your Library, Played or not as they are now.</li><li>2 downloads on this ${S.device === "phone" ? DEVICE.phone : DEVICE.desktop} that nothing else needs will be removed. Starred ones stay.</li></ul>
      <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" id="dpCancel" data-a="cancelDelete">Cancel</button><button class="btn btn-d" data-a="doDeletePl" data-v="${plId}">Delete Playlist</button></div></div>`;
  }
  const sheet = (inner, { z = 0, h = "", label = "Dialog" } = {}) => `<div class="scrim" data-a="closeTop" style="z-index:${20 + z}"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" style="z-index:${21 + z};${h ? "height:" + h : ""}"><div class="grab"></div>${inner}</div>`;
  const modal = (inner, { cls = "", z = 0, label = "Dialog" } = {}) => `<div class="scrim" data-a="closeTop" style="z-index:${20 + z}"></div><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" style="z-index:${21 + z}">${inner}</div>`;

  // ---------- Timelines ----------
  const byDay = (items) => { const g = {}; items.forEach((it) => { const d = Math.floor(it.a / 1440); (g[d] = g[d] || []).push(it); }); return Object.keys(g).sort((a, b) => b - a).map((d) => [d, g[d]]); };
  const momentsOf = (s) => { const out = [s.a]; for (let t = Math.ceil((s.a + 1) / 5) * 5; t < s.b; t += 5) out.push(t); out.push(s.b); return out; };

  // A: stretches; a stretch expands to its moments.
  function timelineA(st, isDesk) {
    const rows = byDay([...STR].reverse());
    return `<div class="${isDesk ? "px20" : ""}" style="${isDesk ? "" : "padding:0 16px"}"><p class="sm muted" style="margin:0 0 4px">What ${esc(plOf(st, "def").name)} was playing, kept for 30 days. Choose a stretch, then the moment to Rewind to.</p>${rows.map(([d, items]) => `<div class="gl label">${DAYREL[d]}</div><div class="group">${items.map((s) => {
      const e = E(s.ep); const open = st.openStretch === s.id;
      return `<div id="str-${s.id}" style="border-bottom:1px solid var(--line)"><button class="gr" style="border:0" data-a="openStretch" data-v="${s.id}" aria-expanded="${open}">${art(e.p, 40)}<span class="grow"><span class="sm m clamp2">${esc(e.t)}</span><span class="xs muted tab-num">${fmtT(s.a)} – ${fmtT(s.b)} · ${fmtPos(s.from)} → ${fmtPos(s.to)}</span></span><span class="badge ${s.fin ? "green" : ""}">${s.fin ? "Finished" : s.why}</span><span class="muted" style="transform:rotate(${open ? 180 : 0}deg)">${ic("down", 16)}</span></button>
        ${open ? `<div style="padding:0 14px 14px"><div class="xs muted m" style="margin-bottom:6px">Rewind to…</div><div class="row" style="flex-wrap:wrap;gap:6px">${momentsOf(s).map((t) => `<button class="btn btn-o" style="min-height:44px;padding:0 12px;font-weight:500;font-size:14px;border-radius:10px" data-a="pickMoment" data-v="${t}"><span class="tab-num">${fmtT(t)}</span><span class="xs muted tab-num">${fmtPos(s.from + (t - s.a))}</span></button>`).join("")}</div></div>` : ""}</div>`;
    }).join("")}</div>`).join("")}<div style="height:16px"></div></div>`;
  }
  // B: every moment is a row, with edits interleaved; picking one strikes everything after it.
  function timelineB(st, isDesk) {
    const t0 = st.sel;
    const items = [];
    STR.forEach((s) => momentsOf(s).filter((t) => !(t === s.b && STR.some((o) => o.a === t))).forEach((t) => items.push({ kind: "m", a: t, s })));
    EDITS.forEach((e) => items.push({ kind: "e", a: e.a, e }));
    items.sort((x, y) => y.a - x.a);
    let lastStretch = null;
    const rows = byDay(items).map(([d, its]) => `<div class="gl label" style="padding-left:${isDesk ? 0 : 4}px">${DAYREL[d]}</div>${its.map((it) => {
      const after = t0 != null && it.a > t0;
      if (it.kind === "e") return `<div class="row" style="gap:10px;min-height:44px;padding:4px 12px;margin:2px 0;border-radius:10px;background:${after ? "var(--postint)" : "transparent"}"><span style="color:${after ? "var(--pos)" : "var(--muted)"}">${ic(it.e.kind === "add" ? "listPlus" : "check", 18)}</span><span class="grow sm">${esc(it.e.text)}</span><span class="xs muted tab-num">${fmtT(it.a)}</span>${after ? '<span class="badge green">Kept</span>' : ""}</div>`;
      const s = it.s, e = E(s.ep);
      const head = lastStretch !== s.id ? (lastStretch = s.id, `<div class="row ${after ? "struck" : ""}" style="gap:10px;padding:10px 12px 4px">${art(e.p, 28)}<span class="grow sm m trunc t">${esc(e.t)}</span>${s.fin ? `<span class="badge ${after && t0 < s.b ? "red" : "green"}">${after ? "Finish undone" : "Finished"}</span>` : ""}</div>`) : "";
      const sel = t0 === it.a;
      return `${head}<button class="row ${after ? "struck" : ""}" role="radio" aria-checked="${sel}" data-a="selMoment" data-v="${it.a}" style="gap:12px;min-height:44px;width:100%;padding:0 12px 0 50px;border-radius:10px;${sel ? "background:var(--accent);box-shadow:inset 0 0 0 1.5px var(--primary)" : ""}"><span class="radio ${sel ? "on" : ""}"></span><span class="grow tab-num strk">${fmtT(it.a)}</span><span class="xs muted tab-num strk">${it.a === s.b && s.fin ? "end" : "at " + fmtPos(s.from + (it.a - s.a))}</span></button>`;
    }).join("")}`).join("");
    return `<div role="radiogroup" aria-label="Moments to Rewind to" style="padding:0 ${isDesk ? 0 : 12}px">${rows}</div>`;
  }
  // C: a log of events (newest first), each with “Rewind to here”.
  function eventsC() {
    const ev = [];
    STR.forEach((s) => {
      const e = E(s.ep);
      ev.push({ a: s.a, t: s.from ? `Resumed “${e.t}” at ${fmtPos(s.from)}` : `Started “${e.t}”`, p: e.p, rw: s.a });
      if (s.fin) ev.push({ a: s.b, t: `Finished “${e.t}”`, sub: "Became Played · left the Playlist (Clear on Played)", p: e.p, rw: s.b - 1, fin: true });
      else ev.push({ a: s.b, t: `${s.why} “${e.t}” at ${s.to}:15`, p: e.p, rw: s.b });
    });
    EDITS.forEach((x) => ev.push({ a: x.a, t: x.text, edit: true }));
    return ev.sort((x, y) => y.a - x.a || (x.fin ? -1 : 1));
  }
  function timelineC(st, isDesk) {
    return `<div style="padding:0 ${isDesk ? 32 : 16}px"><div class="card" style="padding:12px 14px"><div class="sm m">Rewind to a time</div><div class="row gap8 mt8" style="flex-wrap:wrap"><label class="sr" for="rwDay">Day</label><select id="rwDay" data-in="rwDay" style="width:auto;flex:1 1 120px">${[2, 1, 0].map((d) => `<option value="${d}" ${st.rwDay == d ? "selected" : ""}>${DAYREL[d].split(" · ")[0]}</option>`).join("")}</select><label class="sr" for="rwTime">Time</label><input id="rwTime" type="time" data-in="rwTime" value="${st.rwTime}" style="width:auto;flex:1 1 120px"><button class="btn btn-p" data-a="rwAtTime" style="${isDesk ? "" : "flex:1 1 100%"}">Review Rewind</button></div><p class="xs muted" style="margin:6px 0 0">Or choose an event below. Rewinding to it returns to the moment just before it.</p></div>
      ${byDay(eventsC()).map(([d, its]) => `<div class="gl label">${DAYREL[d]}</div><div class="group">${its.map((x) => `<div class="gr" style="align-items:center"><span class="xs muted tab-num" style="width:${isDesk ? 64 : 56}px;flex:none">${fmtT(x.a)}</span>${x.edit ? `<span class="tile" style="width:28px;height:28px;border-radius:8px;background:var(--postint);color:var(--pos)">${ic("pencil", 14)}</span>` : art(x.p, 28)}<span class="grow sm"><span class="${x.fin ? "m" : ""}">${esc(x.t)}</span>${x.sub ? `<br><span class="xs muted">${x.sub}</span>` : ""}${x.edit ? '<br><span class="xs" style="color:var(--pos)">Your change: a Rewind keeps it</span>' : ""}</span>${x.edit ? "" : `<button class="btn btn-t" style="padding:0 6px;font-size:14px;gap:4px" data-a="pickMoment" data-v="${x.rw}" aria-label="Rewind to before: ${esc(x.t)}">${ic("rewind", 16)}${isDesk ? "Rewind to here" : "Rewind"}</button>`}</div>`).join("")}</div>`).join("")}<div style="height:16px"></div></div>`;
  }

  function confirmBody(st, t) {
    return `<div class="shd"><h2 class="h3 grow" id="rwT" style="font-size:17px">Rewind ${esc(plOf(st, "def").name)} to ${fmtDT(t)}?</h2>${S.device === "desktop" ? `<button class="ib" aria-label="Close" data-a="closeTop">${ic("x")}</button>` : ""}</div><div class="sbody">${planHtml(st, t)}</div>
      <div class="sfoot row" style="gap:8px;justify-content:flex-end"><button class="btn btn-s" data-a="closeTop" id="rwCancel" ${S.device === "phone" ? 'style="flex:1"' : ""}>Cancel</button><button class="btn btn-p" data-a="doRewind" data-v="${t}" ${S.device === "phone" ? 'style="flex:1"' : ""}>${ic("rewind", 18)}Rewind</button></div>`;
  }

  const plCounts = (st) => st.playlists.map((p) => ({ ...p, n: st.entries[p.id].length }));
  // ---------- Render ----------
  function render(variant, dev, st) {
    const isDesk = dev === "desktop";
    const p = plOf(st, st.pl);
    if (st.cursor === "e1") NOWP = { p: "orb", t: "The long quiet of Voyager 2", pl: "Default", at: fmtPos(st.pos.e1), left: "−" + (64 - st.pos.e1) + ":00", pct: Math.round((st.pos.e1 / 64) * 100) };
    else NOWP = { p: "led", t: "Tulips, twice", pl: "Default", at: "27:15", left: "−30:45", pct: 47 };
    let body = "", overlay = "";
    const setBtn = variant === "A" ? `<button class="${isDesk ? "btn btn-o" : "ib"}" aria-label="Playlist settings" data-a="openSettings">${ic(isDesk ? "sliders" : "more", 18)}${isDesk ? "Settings" : ""}</button>` : "";
    const rewindBtn = variant === "B" && st.pl === "def" ? `<button class="${isDesk ? "btn btn-o" : "btn btn-s"}" data-a="openRewindB" style="${isDesk ? "" : "min-height:40px;padding:0 12px"}">${ic("rewind", 16)}Rewind…</button>` : "";
    const moreB = variant === "B" ? `<button class="ib" aria-label="More for this Playlist" data-a="moreB">${ic("more")}</button>` : "";
    const gearC = variant === "C" && !isDesk ? `<button class="ib" aria-label="Playlist settings" data-a="openSettingsC">${ic("gear")}</button>` : "";

    if (variant === "B" && st.screen === "rewindB") {
      // Dedicated Rewind screen
      const t0 = st.sel;
      if (!isDesk) {
        const content = `<header class="hdr" style="padding-top:4px">${back(p.name, "closeRewindB")}<h1 class="h1" tabindex="-1">Rewind</h1><p class="sm muted" style="margin:4px 0 0">Choose the moment to go back to. Everything after it that playback did is undone; your own changes are kept.</p></header>${scroll(timelineB(st, false) + '<div style="height:12px"></div>')}
          <div style="padding:10px 16px;border-top:1px solid var(--line);background:var(--card)"><div class="sm" aria-live="polite">${t0 != null ? `<b>${fmtDT(t0)}</b> · <span class="muted">${planShort(t0)}</span>` : '<span class="muted">No moment chosen yet</span>'}</div><button class="btn btn-p mt8" style="width:100%" data-a="reviewB" ${t0 == null ? "disabled" : ""}>${ic("rewind", 18)}Review Rewind</button></div>`;
        if (st.confirm != null) overlay = sheet(confirmBody(st, st.confirm), { z: 4, h: "86%", label: "Confirm Rewind" });
        return phone({ tab: "playlists", content: `<div class="col" style="flex:1;min-height:0">${content}</div>`, mini: false, overlay });
      }
      const main = `<div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;height:100%"><div style="overflow-y:auto;padding:28px 32px">${back(p.name, "closeRewindB")}<h1 class="h1" tabindex="-1">Rewind ${esc(p.name)}</h1><p class="sm muted" style="margin:4px 0 8px">Choose the moment to go back to. Struck-through playback is undone; your own changes (green) are kept.</p>${timelineB(st, true)}</div>
        <aside style="border-left:1px solid var(--line);background:#fbfaf8;overflow-y:auto;padding:28px 24px;display:flex;flex-direction:column"><h2 class="h2">What changes</h2>${t0 != null ? `<div class="mt12">${planHtml(st, t0)}</div><div class="sp"></div><button class="btn btn-p mt16" data-a="reviewB">${ic("rewind", 18)}Rewind to ${fmtDT(t0)}</button>` : '<p class="sm muted">Choose a moment on the left to see exactly what a Rewind would undo.</p>'}</aside></div>`;
      if (st.confirm != null) overlay = `<div class="scrim" style="z-index:24" data-a="closeTop"></div><div class="alert" role="alertdialog" aria-modal="true" style="z-index:25"><h2 class="h3" style="font-size:17px">Rewind ${esc(p.name)} to ${fmtDT(st.confirm)}?</h2><p class="sm muted" style="margin:8px 0 16px">${planShort(st.confirm)}. Playback resumes from “${esc(E(plan(st.confirm).st.ep).t)}” at ${fmtPos(plan(st.confirm).pos)}.</p><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" data-a="closeTop" id="rwCancel">Cancel</button><button class="btn btn-p" data-a="doRewind" data-v="${st.confirm}">Rewind</button></div></div>`;
      return desk({ sel: st.pl, main, overlay, playlists: plCounts(st) });
    }

    // Playlist detail
    const tabs = variant === "C" && isDesk ? tabsSeg(st.tab, [["settings", "Settings"]]) : tabsSeg(st.tab);
    let inner;
    if (st.tab === "entries") inner = entriesList(st, st.pl, isDesk);
    else if (st.tab === "history") inner = historyList();
    else if (st.tab === "timeline") inner = st.pl !== "def" ? `<p class="help px20">Switch to Default to try Rewind in this mock-up.</p>` : variant === "C" ? timelineC(st, isDesk) : variant === "B" ? `<div class="${isDesk ? "px20" : ""}" style="${isDesk ? "" : "padding:0 16px"}"><div class="card row" style="padding:12px 14px;margin-bottom:4px"><span class="grow sm">Fell asleep, or lost your place? Go back to any moment in the last 30 days.</span><button class="btn btn-p" data-a="openRewindB">Rewind…</button></div></div>${historyLike(st)}` : timelineA(st, isDesk);
    else if (st.tab === "settings") inner = `<div class="px20" style="max-width:640px">${settingsBody(st, st.pl, "page")}</div>`;
    const clearRowB = variant === "B" ? `<div class="${isDesk ? "px20" : "px20"}" style="margin-bottom:8px"><div class="group"><div class="gr"><span class="grow"><span class="m">Clear on Played</span><span class="xs muted" style="display:block">${p.cop ? "Played Entries leave this Playlist" : "Played Entries stay here"}</span></span>${sw(p.cop, "toggleCop", st.pl, "Clear on Played")}</div></div>${st.copNote && p.cop ? `<p class="help" role="status" style="color:var(--warn)">${ic("info", 14)} ${plural(st.copNote, "Entry", "Entries")} that ${st.copNote === 1 ? "was" : "were"} already Played left just now.</p>` : ""}</div>` : "";
    const titleB = variant === "B" && st.renaming ? `<input id="plName" type="text" data-in="plName" value="${esc(st.nameDraft ?? p.name)}" aria-label="Playlist name" style="font:600 26px 'Space Grotesk',Inter,sans-serif;height:48px"><div class="row gap8 mt8"><button class="btn btn-s" data-a="cancelRename">Cancel</button><button class="btn btn-p" data-a="saveName">Rename</button></div>` : "";
    const header = titleB ? `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${isDesk ? "" : back("Playlists", "toPlList")}${titleB}</header>` : plHeader(st, st.pl, isDesk, rewindBtn + setBtn + moreB + gearC);
    const plPicker = "";
    body = `${header}${plPicker}${clearRowB}<div class="px20" style="margin-bottom:12px">${tabs}</div>${inner}`;
    if (!isDesk && st.screen === "plList") {
      body = `<header class="hdr row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">Playlists</h1><button class="btn btn-t" data-a="noop">New Playlist</button></header><div style="padding:0 12px">${st.playlists.map((x) => `<button class="lrow" data-a="openPlaylist" data-v="${x.id}"><span class="tile">${ic("listMusic")}</span><span class="grow"><span class="row gap8"><span class="m" style="font-size:16px">${esc(x.name)}</span>${x.active ? '<span class="badge green">Paused</span>' : ""}</span><span class="xs muted" style="display:block;margin-top:2px">${plural(st.entries[x.id].length, "Entry", "Entries")} · ${x.cop ? "Clear on Played" : "Keeps Played Entries"}</span></span><span class="muted">${ic("right", 16)}</span></button>`).join("")}</div>`;
    }
    if (variant === "C" && !isDesk && st.screen === "settingsC") {
      body = `<header class="hdr" style="padding-top:4px">${back(p.name, "closeSettingsC")}<h1 class="h1" tabindex="-1">Playlist settings</h1></header><div class="px20">${settingsBody(st, st.pl, "page")}</div>`;
    }

    // Overlays
    if (st.settings) {
      const inner2 = `<div class="shd" ${isDesk ? "" : 'style="padding-left:8px"'}>${isDesk ? `<h2 class="h2 grow">Playlist settings</h2><button class="ib" aria-label="Close" data-a="saveName">${ic("x")}</button>` : `<span style="width:64px"></span><h2 class="h3 grow" style="text-align:center">Playlist settings</h2><button class="btn btn-t" data-a="saveName">Done</button>`}</div><div class="sbody">${settingsBody(st, st.pl, "sheet")}</div>${isDesk ? `<div class="sfoot"><button class="btn btn-p" data-a="saveName">Done</button></div>` : ""}`;
      overlay += isDesk ? modal(inner2, { cls: "narrow", label: "Playlist settings" }) : sheet(inner2, { label: "Playlist settings" });
    }
    if (st.more) overlay += `<div class="scrim" style="background:transparent" data-a="closeTop"></div><div class="menu" style="right:${isDesk ? 32 : 12}px;top:${isDesk ? 80 : 96}px">${p.isDefault ? "" : `<button data-a="renameB">${ic("pencil", 18)}Rename</button>`}${st.pl === "def" ? `<button data-a="openRewindB">${ic("rewind", 18)}Rewind…</button>` : ""}<button data-a="noop">${ic("listPlus", 18)}Add Episodes…</button>${p.isDefault ? "" : `<button class="danger" data-a="askDeletePl" data-v="${st.pl}">${ic("trash", 18)}Delete Playlist…</button>`}</div>`;
    if (st.confirm != null) overlay += isDesk ? modal(confirmBody(st, st.confirm), { z: 4, label: "Confirm Rewind" }) : sheet(confirmBody(st, st.confirm), { z: 4, h: "86%", label: "Confirm Rewind" });
    if (st.deleting) overlay += deletePlAlert(st, st.deleting);
    if (st.toast) overlay += toast(st.toast, st.undoable ? "undoRewind" : null);
    if (isDesk) return desk({ sel: st.pl, main: body, overlay, playlists: plCounts(st) });
    return phone({ tab: "playlists", content: scroll(body + '<div style="height:12px"></div>'), overlay });
  }
  // B's Timeline tab: a compact read-only list, the Rewind screen does the choosing.
  function historyLike(st) {
    return `<div style="padding:0 20px">${[...STR].reverse().map((s) => { const e = E(s.ep); return `<div class="lrow" style="min-height:60px">${art(e.p, 40)}<span class="grow"><span class="sm m trunc" style="display:block">${esc(e.t)}</span><span class="xs muted tab-num">${fmtDT(s.a)} – ${fmtT(s.b)} · ${fmtPos(s.from)} → ${fmtPos(s.to)}</span></span><span class="badge ${s.fin ? "green" : ""}">${s.fin ? "Finished" : s.why}</span></div>`; }).join("")}</div>`;
  }

  AREAS.playlists = {
    title: "Playlist settings & Rewind",
    variants: {
      A: { name: "Expand a stretch", caption: "The Listening Timeline tab lists stretches of playback by day; open one to pick a moment (5-minute steps), then a sheet spells out what comes back, what resets and what is kept. Settings live in one sheet behind ⋯. Compact and close to the data, but finding a moment takes two taps.", screens: [["entries", "Playlist (Default)"], ["settings", "Settings sheet (Commute)"], ["cop", "Turning on Clear on Played"], ["delete", "Delete confirmation"], ["timeline", "Listening Timeline"], ["moment", "Choosing a moment"], ["confirm", "Rewind confirmation"], ["after", "After Rewind"]] },
      B: { name: "Rewind screen with live strike-through", caption: "Rewind is its own screen: every moment is a row, your edits sit between them, and choosing one strikes through the playback that would be undone and marks your edits Kept. Clear on Played is a visible switch on the Playlist; rename is in place. Most legible effect, but the longest list.", screens: [["entries", "Playlist with inline Clear on Played"], ["rename", "Rename in place"], ["rewind", "Rewind screen"], ["picked", "Moment chosen"], ["confirm", "Final confirmation"], ["after", "After Rewind"]] },
      C: { name: "Event log", caption: "The Timeline reads as a story of events (started, finished, became Played, your edits), each with “Rewind to here”, plus a day-and-time field for in-between moments. Settings are a page of their own (a fourth tab on desktop). Explains what happened overnight best; events are derived, not stored.", screens: [["entries", "Playlist"], ["settings", "Settings page"], ["timeline", "Event log"], ["confirm", "Rewind confirmation"], ["after", "After Rewind"]] }
    },
    questions: [
      "Where do restored Entries go? Mocks put them back before the Cursor’s old Entry in their original order, so “Carburettors” (added with Play Next this morning) now sits after “Tulips, twice”, not right after the Cursor.",
      "Positions of Entries that playback only started after the moment (“Tulips, twice”, 27:15): reset to where they were, or left alone? CONTEXT only says the Cursor’s Position goes back.",
      "Can a Rewind itself be undone (mocks show Undo in the toast), or is Rewinding forward again the way back?",
      "If an Episode undone here was also finished through another Playlist since, does it stay Played? (Played is Episode-level.)",
      "Should the Timeline group by calendar day or by listening session? A night’s listening spans midnight, so “last night” is split across Yesterday and Today.",
      "Granularity: the Timeline keeps a point a minute; are 5-minute moments (A, B) fine, or should the exact minute be pickable (C’s time field)?",
      "Turning Clear on Played on with Played Entries already present: do they leave immediately (mocks say yes and tell you), or only Episodes Played from now on?",
      "Deleting the Active Playlist: does Default become Active, and what happens to playback in progress?"
    ],
    init(variant, screen, dev) {
      const st = { screen0: screen, screen: "detail", pl: "def", tab: "entries", playlists: clone(PLAYLISTS), entries: clone(ENTRIES0), pos: { ...POS0 }, cursor: "e5", sel: null, confirm: null, settings: false, deleting: null, openStretch: null, rwDay: 1, rwTime: "23:45", toast: null };
      const s = screen;
      if (s === "settings" || s === "cop" || s === "delete") { st.pl = "com"; if (variant === "A") st.settings = true; if (variant === "C") { if (dev === "phone") st.screen = "settingsC"; else st.tab = "settings"; } }
      if (s === "cop") copOn(st, "com");
      if (s === "delete") st.deleting = "com";
      if (s === "rename") { st.pl = "com"; st.renaming = true; }
      if (s === "timeline" || s === "moment") st.tab = "timeline";
      if (s === "moment") { st.openStretch = "s4"; st.scrollTo = "str-s4"; }
      if (s === "confirm") { if (variant === "B") { st.screen = "rewindB"; st.sel = DEFAULT_T; } else st.tab = "timeline"; st.openStretch = variant === "A" ? "s4" : null; st.confirm = DEFAULT_T; }
      if (s === "rewind") st.screen = "rewindB";
      if (s === "picked") { st.screen = "rewindB"; st.sel = DEFAULT_T; }
      if (s === "after") { applyRewind(st, DEFAULT_T); st.toast = `Rewound Default to ${fmtDT(DEFAULT_T)}`; st.undoable = true; }
      return st;
    },
    esc(st) { return AREAS.playlists.actions.closeTop() !== false; },
    actions: {
      plTab(v) { S.st.tab = v; },
      toPlList() { const st = S.st; st.screen = "plList"; st.renaming = false; st.settings = false; },
      tab(v) { if (v === "playlists") { S.st.screen = "plList"; return; } return COMMON.tab(v); },
      openPlaylist(v) { const st = S.st; if (!plOf(st, v)) return; st.pl = v; st.screen = "detail"; st.renaming = false; st.nameDraft = null; },
      pickPl(v) { const st = S.st; st.pl = v; st.renaming = false; st.nameDraft = null; if (st.tab === "settings" && false) st.tab = "entries"; },
      openSettings() { S.st.settings = true; S.st.nameDraft = null; },
      openSettingsC() { S.st.screen = "settingsC"; },
      closeSettingsC() { S.st.screen = "detail"; },
      plName(v) { S.st.nameDraft = v; return false; },
      saveName() { const st = S.st; const p = plOf(st, st.pl); if (st.nameDraft && st.nameDraft.trim()) p.name = st.nameDraft.trim(); st.nameDraft = null; st.settings = false; st.renaming = false; },
      cancelRename() { S.st.renaming = false; S.st.nameDraft = null; },
      renameB() { S.st.renaming = true; S.st.more = false; S.st.focus = "plName"; },
      toggleCop(v) { copOn(S.st, v); },
      askDeletePl(v) { S.st.deleting = v; S.st.more = false; S.st.focus = "dpCancel"; },
      cancelDelete() { S.st.deleting = null; },
      doDeletePl(v) { const st = S.st; const name = plOf(st, v).name; st.playlists = st.playlists.filter((p) => p.id !== v); st.deleting = null; st.settings = false; st.screen = "detail"; st.pl = "def"; st.tab = "entries"; st.toast = `Deleted “${esc(name)}”`; st.undoable = false; },
      moreB() { S.st.more = !S.st.more; },
      openStretch(v) { S.st.openStretch = S.st.openStretch === v ? null : v; S.st.scrollTo = "str-" + v; },
      pickMoment(v) { S.st.confirm = +v; S.st.focus = "rwCancel"; },
      selMoment(v) { S.st.sel = +v; },
      openRewindB() { const st = S.st; st.more = false; st.pl = "def"; st.screen = "rewindB"; st.sel = null; },
      closeRewindB() { S.st.screen = "detail"; S.st.confirm = null; },
      reviewB() { S.st.confirm = S.st.sel; S.st.focus = "rwCancel"; },
      rwDay(v) { S.st.rwDay = +v; return false; },
      rwTime(v) { S.st.rwTime = v; return false; },
      rwAtTime() { const st = S.st; const [h, m] = (st.rwTime || "0:0").split(":").map(Number); st.confirm = at(st.rwDay, h, m); st.focus = "rwCancel"; },
      doRewind(v) { const st = S.st; applyRewind(st, +v); st.confirm = null; st.screen = "detail"; st.tab = "entries"; st.pl = "def"; st.toast = `Rewound ${esc(plOf(st, "def").name)} to ${fmtDT(+v)}`; st.undoable = true; },
      undoRewind() { const st = S.st; st.entries = clone(ENTRIES0); st.pos = { ...POS0 }; st.cursor = "e5"; st.restored = null; st.toast = "Rewind undone"; st.undoable = false; },
      closeTop() {
        const st = S.st;
        if (st.deleting) { st.deleting = null; return; }
        if (st.confirm != null) { st.confirm = null; return; }
        if (st.more) { st.more = false; return; }
        if (st.settings) { st.settings = false; st.nameDraft = null; return; }
        if (st.renaming) { st.renaming = false; return; }
        if (st.toast) { st.toast = null; return; }
        return false;
      }
    },
    render
  };
})();
