// ===== Area 3: Library, Subscription settings, subscribe, OPML, Orphaned, first run =====
(() => {
  const DEF = { speed: 1.2, skipIntro: 0, skipOutro: 0, volumeBoost: false, threshold: 30 };
  const secFmt = (v) => (v >= 60 ? (v % 60 ? Math.floor(v / 60) + " min " + (v % 60) + " s" : v / 60 + " min") : v + " s");
  const OV = {
    speed: { label: "Speed", opts: [0.8, 1, 1.1, 1.2, 1.3, 1.5, 1.75, 2, 2.5, 3], fmt: (v) => v + "×" },
    skipIntro: { label: "Skip intro", opts: [0, 10, 15, 20, 30, 45, 60, 90, 120], fmt: (v) => (v ? "First " + secFmt(v) : "Off") },
    skipOutro: { label: "Skip outro", opts: [0, 10, 15, 20, 30, 45, 60, 90, 120], fmt: (v) => (v ? "Last " + secFmt(v) : "Off") },
    volumeBoost: { label: "Volume boost", opts: [false, true], fmt: (v) => (v ? "On" : "Off") },
    threshold: { label: "Counts as Played", opts: [0, 15, 30, 60, 90, 120, 300], fmt: (v) => (v ? "Within " + secFmt(v) + " of the end" : "Only at the very end"), short: (v) => (v ? secFmt(v) + " before end" : "At the end") }
  };
  const RULES = [["never", "Never", "Stream only. Manual Downloads still work."], ["onEntry", "When added to a Playlist", "Downloads each Episode that becomes an Entry anywhere."], ["allNew", "As soon as published", "Downloads every new Episode, even before you add it."]];
  const RULE_SHORT = { never: "Doesn’t download", onEntry: "Downloads when added", allNew: "Downloads every new Episode" };
  const KEEP = [null, 1, 2, 3, 5, 10, 20];
  const SUBS0 = {
    kit: { rule: "onEntry", keep: null, ov: {}, since: "3 Mar 2025" },
    orb: { rule: "allNew", keep: 5, ov: { speed: 1 }, since: "12 Jan 2024" },
    moe: { rule: "onEntry", keep: null, ov: { speed: 1.5 }, since: "8 Aug 2025" },
    fld: { rule: "never", keep: null, ov: {}, since: "21 Jun 2025" },
    led: { rule: "onEntry", keep: null, ov: {}, since: "2 Feb 2026" },
    law: { rule: "onEntry", keep: null, ov: {}, since: "14 Apr 2026" },
    com: { rule: "allNew", keep: 3, ov: { skipIntro: 45, threshold: 90 }, since: "30 Sep 2026" },
    qh: { rule: "allNew", keep: 2, ov: { speed: 1, volumeBoost: true }, since: "5 May 2025" },
    eng: { rule: "never", keep: null, ov: {}, since: "19 Oct 2026" },
    nlf: { rule: "never", keep: null, ov: { skipOutro: 60, threshold: 120 }, since: "1 Aug 2026" }
  };
  const OTHER_DEVICE = { kit: "onEntry", orb: "onEntry", moe: "onEntry", fld: "allNew", led: "never", law: "onEntry", com: "onEntry", qh: "never", eng: "onEntry", nlf: "never" };
  const DIR = [
    { id: "d1", t: "Garden Hour", a: "Ruth Ellery", n: 312, c: "#4f7a3a" },
    { id: "d2", t: "The Quiet Garden", a: "Maya Fenn", n: 48, c: "#6b8f5e" },
    { id: "d3", t: "Weekend Woodworking", a: "Hollis & Grace", n: 112, c: "#9a6b3c" },
    { id: "d4", t: "The History of Bread", a: "Ivo Marsh", n: 76, c: "#b88a3e" },
    { id: "d5", t: "Moth Light", a: "Lantern Fiction", n: 24, c: "#3e3a6e" },
    { id: "d6", t: "Pocket Philosophy", a: "Dr. Anwen Price", n: 205, c: "#7a3a5e" },
    { id: "d7", t: "Tidewater", a: "Coastal Radio Co-op", n: 89, c: "#2f6f80" },
    { id: "d8", t: "Gardeners’ Question Hour", a: "Allotment Media", n: 640, c: "#3d6b4f" },
    { id: "orb", t: "Orbit Notes", a: "Lena Varga", n: 241, c: "#2f4b8f", subscribed: true },
    { id: "eng", t: "Small Engines", a: "Dale Pruitt", n: 58, c: "#5d6b2a", subscribed: true }
  ];
  const ORPH0 = [
    { id: "o1", t: "Ep 212: The 3 a.m. caller", why: "Entry in Commute" },
    { id: "o2", t: "Ep 198: Lighthouse frequencies", why: "Starred" },
    { id: "o3", t: "Ep 190: Snow on the line", why: "Entry in Default and Replay · Starred" }
  ];
  const OPML = [["Orbit Notes", true], ["Small Engines", true], ["Quiet Hours", true], ["Garden Hour"], ["Weekend Woodworking"], ["Pocket Philosophy"], ["Tidewater"], ["The History of Bread"], ["Moth Light"], ["Signal & Noise"], ["Fermentation Station"], ["Old Radio Archive"], ["Birdsong Daily"], ["The Map Room"]];
  const dev = () => (S.device === "phone" ? DEVICE.phone : DEVICE.desktop);
  const unplayed = (pid) => EPS.filter((e) => e.p === pid && !e.pl).length;
  const total = (pid) => ({ kit: 186, orb: 241, moe: 133, fld: 24, led: 97, law: 62, com: 41, qh: 152, eng: 58, nlf: 310 })[pid];
  const sheet = (inner, { z = 0, h = "", label = "Dialog" } = {}) => `<div class="scrim" data-a="closeTop" style="z-index:${20 + z}"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" style="z-index:${21 + z};${h ? "height:" + h : ""}"><div class="grab"></div>${inner}</div>`;
  const modal = (inner, { cls = "", z = 0, label = "Dialog" } = {}) => `<div class="scrim" data-a="closeTop" style="z-index:${20 + z}"></div><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" style="z-index:${21 + z}">${inner}</div>`;
  const dirArt = (d, s = 48) => `<span class="art" aria-hidden="true" style="width:${s}px;height:${s}px;background:${d.c};font-size:${Math.round(s / 3.4)}px">${initials(d.t)}</span>`;
  const ruleLine = (sub) => RULE_SHORT[sub.rule] + (sub.rule === "allNew" && sub.keep ? `, keeps ${sub.keep}` : "");
  const ovCount = (sub) => Object.keys(sub.ov).length;
  const val = (sub, k) => (sub.ov[k] !== undefined ? sub.ov[k] : DEF[k]);

  // ---------- Settings pieces ----------
  function ruleSection(st, pid, style) {
    const sub = st.subs[pid];
    const keepRow = sub.rule === "allNew" ? `<div class="gr" style="flex-wrap:wrap;row-gap:2px"><span class="grow m">Keep at most</span><span class="stepper"><button aria-label="Fewer" data-a="keep" data-v="-">−</button><span aria-live="polite">${sub.keep ? sub.keep : "No limit"}</span><button aria-label="More" data-a="keep" data-v="+">+</button></span><span class="xs muted" style="flex-basis:100%;padding-bottom:4px">Older automatic downloads are removed. Entries, Starred and Manual Downloads don’t count.</span></div>` : "";
    return `<div class="gl label row gap8">${ic(S.device === "phone" ? "phone" : "laptop", 14)}Downloads on this ${dev()}</div>
      <div class="group" role="radiogroup">${RULES.map(([v, l, d]) => `<button class="gr" role="radio" aria-checked="${sub.rule === v}" data-a="rule" data-v="${v}"><span class="radio ${sub.rule === v ? "on" : ""}"></span><span class="grow"><span class="m" style="display:block">${l}</span><span class="xs muted">${d}</span></span></button>`).join("")}${keepRow}</div>
      <p class="help">Each Device has its own rule. On your ${S.device === "phone" ? DEVICE.desktop : DEVICE.phone}: “${RULES.find((r) => r[0] === OTHER_DEVICE[pid])[1]}”.</p>`;
  }
  // A: rows that open a picker sheet (like the player’s speed menu).
  function ovRowsA(st, pid) {
    const sub = st.subs[pid];
    const row = (k) => { const custom = sub.ov[k] !== undefined; return `<button class="gr" data-a="openPicker" data-v="${k}"><span class="grow m">${OV[k].label}</span><span class="${custom ? "" : "muted"}" style="${custom ? "color:var(--primary);font-weight:600" : ""}">${custom ? OV[k].fmt(sub.ov[k]) : "Default · " + OV[k].fmt(DEF[k])}</span><span class="muted">${ic("right", 16)}</span></button>`; };
    return `<div class="gl label">Played</div><div class="group">${row("threshold")}</div><p class="help">When you stop this close to the end, the Episode counts as Played.</p>
      <div class="gl label">Playback for this podcast</div><div class="group">${["speed", "skipIntro", "skipOutro", "volumeBoost"].map(row).join("")}</div><p class="help">“Default” follows your Playback Settings, so changing those changes these.</p>`;
  }
  function pickerA(st, pid, k) {
    const sub = st.subs[pid];
    const cur = sub.ov[k];
    const opt = (v, l, on) => `<button class="gr" data-a="setOv" data-v="${k}:${v}" role="menuitemradio" aria-checked="${on}"><span class="grow">${l}</span>${on ? `<span class="check">${ic("check")}</span>` : ""}</button>`;
    return `<div class="group">${opt("default", `Use default (${OV[k].fmt(DEF[k])})`, cur === undefined)}</div><div class="gl label">Just for ${esc(POD[pid].t)}</div><div class="group">${OV[k].opts.map((v) => opt(v, OV[k].fmt(v), cur === v)).join("")}</div>`;
  }
  // B: inline steppers with Reset.
  function ovRowsB(st, pid) {
    const sub = st.subs[pid];
    const row = (k) => {
      const custom = sub.ov[k] !== undefined, v = val(sub, k);
      const control = k === "volumeBoost" ? sw(v, "ovBool", k, OV[k].label) : `<span class="stepper"><button aria-label="Less ${OV[k].label}" data-a="ovStep" data-v="${k}:-">−</button><span style="min-width:${k === "threshold" ? 70 : 64}px" aria-live="polite">${k === "threshold" ? (v ? secFmt(v) : "End") : k === "speed" ? v + "×" : v ? secFmt(v) : "Off"}</span><button aria-label="More ${OV[k].label}" data-a="ovStep" data-v="${k}:+">+</button></span>`;
      return `<div class="gr"><span class="grow"><span class="m" style="display:block">${OV[k].label}</span>${custom ? `<span class="xs" style="color:var(--primary);font-weight:600">Just for this podcast</span><span class="xs muted"> · default ${(OV[k].short || OV[k].fmt)(DEF[k])}</span>` : `<span class="xs muted">Your default</span>`}</span>${custom ? `<button class="btn btn-t" style="padding:0 6px;font-size:14px" data-a="ovReset" data-v="${k}" aria-label="Reset ${OV[k].label} to default">Reset</button>` : ""}${control}</div>`;
    };
    return `<div class="gl label">Played</div><div class="group">${row("threshold")}</div><p class="help">Stopping this close to the end counts as Played.</p><div class="gl label">Playback</div><div class="group">${["speed", "skipIntro", "skipOutro", "volumeBoost"].map(row).join("")}</div>`;
  }
  // C: “same as everywhere” or “for this podcast”, spelled out.
  function ovRowsC(st, pid) {
    const sub = st.subs[pid];
    const block = (k) => {
      const custom = sub.ov[k] !== undefined, v = val(sub, k);
      return `<div class="gr" style="flex-direction:column;align-items:stretch;gap:6px;padding-top:12px;padding-bottom:12px"><span class="m">${OV[k].label}</span>${seg([["default", "Default (" + (OV[k].short || OV[k].fmt)(DEF[k]) + ")"], ["custom", "For this podcast"]], custom ? "custom" : "default", "ovMode", "full").replace(/data-v="(default|custom)"/g, (m, x) => `data-v="${k}:${x}"`)}
        ${custom ? (k === "volumeBoost" ? `<div class="row" style="justify-content:space-between"><span class="sm">Boost quiet voices</span>${sw(v, "ovBool", k, OV[k].label)}</div>` : `<div class="row" style="justify-content:space-between"><span class="sm muted">${OV[k].fmt(v)}</span><span class="stepper"><button aria-label="Less" data-a="ovStep" data-v="${k}:-">−</button><span>${k === "speed" ? v + "×" : v ? secFmt(v) : "Off"}</span><button aria-label="More" data-a="ovStep" data-v="${k}:+">+</button></span></div>`) : ""}</div>`;
    };
    return `<div class="gl label">Played</div><div class="group">${block("threshold")}</div><div class="gl label">Playback</div><div class="group">${["speed", "skipIntro", "skipOutro", "volumeBoost"].map(block).join("")}</div>`;
  }
  const actionsSection = (st, pid) => `<div class="gl label">Episodes</div><div class="group"><button class="gr" data-a="markAll" data-v="${pid}"><span class="grow"><span class="m" style="display:block">Mark all Played</span><span class="xs muted">${plural(unplayed(pid), "unplayed Episode")}</span></span></button><button class="gr" data-a="askUnsub" data-v="${pid}" style="color:var(--danger)"><span class="grow m">Unsubscribe…</span></button></div>`;
  const podHead = (pid, big) => `<div class="row gap12">${art(pid, big ? 72 : 56)}<span class="grow"><span class="${big ? "h2" : "h3"}" style="display:block">${esc(POD[pid].t)}</span><span class="sm muted">${esc(POD[pid].a)}</span><span class="xs muted" style="display:block">${total(pid)} Episodes · subscribed ${SUBS0[pid].since}</span></span></div>`;
  function unsubAlert(st, pid) {
    const keeps = pid === "fld" ? 2 : 1;
    return `<div class="scrim" style="z-index:26" data-a="closeTop"></div><div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="usT" style="z-index:27"><h2 class="h3" id="usT" style="font-size:17px">Unsubscribe from ${esc(POD[pid].t)}?</h2>
      <ul class="sm muted" style="margin:8px 0 16px;padding-left:18px"><li>Its ${total(pid)} Episodes leave your Library and Views.</li><li>${plural(keeps, "Episode")} you added to a Playlist or Starred ${keeps === 1 ? "stays" : "stay"} as Orphaned until you remove ${keeps === 1 ? "it" : "them"}.</li><li>Its downloads are removed from every Device, apart from the Orphaned ${keeps === 1 ? "one" : "ones"}.</li></ul>
      <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" id="usCancel" data-a="closeTop">Cancel</button><button class="btn btn-d" data-a="doUnsub" data-v="${pid}">Unsubscribe</button></div></div>`;
  }

  // ---------- Subscribe ----------
  const isUrl = (q) => /^(https?:\/\/|www\.)|\.(xml|rss)$|\/feed/i.test(q.trim());
  function dirResults(st, q, compact) {
    q = q.trim();
    if (!q) return "";
    if (isUrl(q)) {
      const ok = /wood/i.test(q) || !/bad|broken/i.test(q);
      return ok ? `<div class="card row mt12" style="padding:12px;gap:12px">${dirArt(DIR[2], 56)}<span class="grow"><span class="xs muted m" style="display:block">Feed found</span><span class="m">Weekend Woodworking</span><span class="xs muted" style="display:block">Hollis & Grace · 112 Episodes · newest 2 days ago</span></span>${subBtn(st, "d3")}</div>`
        : `<div class="card mt12" style="padding:14px;border-color:#f3c9c4"><div class="m" style="color:var(--danger)">Couldn’t read a podcast at that address</div><p class="sm muted" style="margin:4px 0 0">Check it’s the feed (RSS) address, not the podcast’s web page. It often ends in .xml or /feed.</p></div>`;
    }
    const res = DIR.filter((d) => (d.t + " " + d.a).toLowerCase().includes(q.toLowerCase()));
    if (!res.length) return `<div class="dashed mt12" style="padding:20px;text-align:center"><div class="m">No podcasts found for “${esc(q)}”</div><div class="sm muted mt4">Try fewer words, or paste the feed address if you have it.</div></div>`;
    return `<div class="${compact ? "" : "mt8"}">${res.map((d) => `<div class="lrow" style="min-height:68px">${dirArt(d)}<span class="grow"><span class="m trunc" style="display:block">${hl(d.t, q)}</span><span class="xs muted trunc" style="display:block">${esc(d.a)} · ${d.n} Episodes</span></span>${subBtn(st, d.id)}</div>`).join("")}</div>`;
  }
  const subBtn = (st, id) => {
    const d = DIR.find((x) => x.id === id);
    return d.subscribed || st.added.includes(id) ? `<span class="badge green" style="min-height:32px;padding:0 10px">${ic("check", 14)}Subscribed</span>` : `<button class="btn btn-s" style="min-height:40px" data-a="subscribe" data-v="${id}" aria-label="Subscribe to ${esc(d.t)}">Subscribe</button>`;
  };
  const searchInput = (st, ph, id = "dirQ", a = "dirQ") => `<div style="position:relative"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><label class="sr" for="${id}">${ph}</label><input id="${id}" type="search" data-in="${a}" value="${esc(st.q)}" placeholder="${ph}" style="padding-left:40px" autocomplete="off"></div>`;

  // ---------- OPML ----------
  function opmlPanel(st) {
    const o = st.opml;
    if (o.step === "choose") return `<div class="dashed" style="padding:24px;text-align:center">${ic("file", 28)}<div class="m mt8">Choose an OPML file</div><p class="sm muted" style="margin:4px 0 14px">Most podcast apps can export your subscriptions as one, usually in Settings under Export or Backup.</p><button class="btn btn-p" data-a="opmlChoose">${ic("upload", 18)}Choose file…</button></div>`;
    if (o.step === "review") {
      const n = OPML.filter((x, i) => !x[1] && o.picked[i]).length;
      return `<div class="row gap8"><span style="color:var(--muted)">${ic("file", 18)}</span><span class="grow sm"><b>podcasts-export.opml</b> · ${OPML.length} podcasts, ${OPML.filter((x) => x[1]).length} already subscribed</span></div>
        <div class="group mt12">${OPML.map((x, i) => `<label class="gr" style="cursor:${x[1] ? "default" : "pointer"};min-height:48px"><input type="checkbox" ${x[1] || o.picked[i] ? "checked" : ""} ${x[1] ? "disabled" : ""} data-a="opmlTog" data-v="${i}"><span class="grow ${x[1] ? "muted" : ""}">${esc(x[0])}</span>${x[1] ? '<span class="xs muted">Already subscribed</span>' : ""}</label>`).join("")}</div>
        <div class="row mt16" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" data-a="opmlCancel">Cancel</button><button class="btn btn-p" data-a="opmlImport" ${n ? "" : "disabled"}>Subscribe to ${n}</button></div>`;
    }
    return `<div class="card" style="padding:14px"><div class="row gap8"><span style="color:var(--pos)">${ic("check")}</span><span class="m">${plural(o.done, "Subscription")} added</span></div><p class="sm muted" style="margin:4px 0 0">Their Episodes are now in your Library. Downloads follow each one’s Download Rule on this ${dev()}: “When added to a Playlist” to start with.</p></div>
      <div class="card mt12" style="padding:14px;border-color:#f3c9c4"><div class="m">1 couldn’t be added</div><div class="row mt8"><span class="grow sm">Old Radio Archive<br><span class="muted">The feed address no longer works.</span></span><button class="btn btn-s" data-a="noop">Try again</button></div></div>
      <div class="row mt16" style="justify-content:flex-end"><button class="btn btn-p" data-a="opmlCancel">Done</button></div>`;
  }

  // ---------- Orphaned ----------
  function orphPanel(st) {
    if (!st.orph.length) return `<div class="dashed" style="padding:24px;text-align:center"><div class="m">No Orphaned Episodes</div><p class="sm muted" style="margin:4px 0 0">When you unsubscribe, Episodes you added to a Playlist or Starred stay here.</p></div>`;
    return `<p class="sm muted" style="margin:0 0 10px">From podcasts you unsubscribed from. Each stays because it’s an Entry or Starred; nothing else from the podcast remains.</p>
      <div class="group">${st.orph.map((o) => `<div class="gr" style="min-height:64px"><span class="art" aria-hidden="true" style="width:40px;height:40px;background:#6b6f7d;font-size:12px">NS</span><span class="grow"><span class="sm m clamp2">${esc(o.t)}</span><span class="xs muted">Night Shift Radio · ${o.why}</span></span><button class="btn btn-t danger" style="padding:0 6px" data-a="askOrph" data-v="${o.id}">Remove</button></div>`).join("")}</div>
      <div class="row mt12 sm"><span class="grow muted">Unsubscribed from Night Shift Radio on 2 Nov.</span><button class="btn btn-t" data-a="noop">Subscribe again</button></div>`;
  }
  const orphAlert = (st, id) => { const o = st.orph.find((x) => x.id === id); return `<div class="scrim" style="z-index:26" data-a="closeTop"></div><div class="alert" role="alertdialog" aria-modal="true" style="z-index:27"><h2 class="h3" style="font-size:17px">Remove “${esc(o.t)}”?</h2><p class="sm muted" style="margin:8px 0 16px">It leaves every Playlist (${esc(o.why.replace(" · Starred", "").replace("Entry in ", "") || "none")}), loses its Star and its downloads, and can’t be found again unless you subscribe to Night Shift Radio again.</p><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" data-a="closeTop">Cancel</button><button class="btn btn-d" data-a="doOrph" data-v="${id}">Remove</button></div></div>`; };

  // ---------- Library lists ----------
  const subIds = (st) => PODS.map((p) => p.id).filter((id) => st.subs[id]);
  function subRow(st, pid, a = "openPod", noRule = false) {
    const sub = st.subs[pid];
    const cur = S.variant === "B" && S.device === "desktop" && st.pod === pid;
    return `<button class="lrow" data-a="${a}" data-v="${pid}" ${cur ? 'aria-current="true" style="background:var(--accent);border-radius:10px"' : ""}>${art(pid, 48)}<span class="grow"><span class="m trunc" style="display:block">${esc(POD[pid].t)}</span><span class="xs muted trunc" style="display:block">${unplayed(pid)} unplayed${noRule ? (sub.rule === "allNew" && sub.keep ? " · keeps " + sub.keep : "") : " · " + ruleLine(sub)}${ovCount(sub) ? " · " + plural(ovCount(sub), "custom setting") : ""}</span></span><span class="muted">${ic("right", 16)}</span></button>`;
  }
  function podEpisodes(pid) {
    return EPS.filter((e) => e.p === pid).sort((a, b) => a.d - b.d).map((e) => (S.device === "phone" ? epRowPhone(e) : "")).join("") || "";
  }
  function firstRunA(isDesk) {
    return `<div style="padding:${isDesk ? "48px 32px" : "24px 20px"};max-width:560px;${isDesk ? "margin:0 auto" : ""}"><div class="card" style="padding:24px;text-align:center"><div class="tile" style="margin:0 auto;width:56px;height:56px;border-radius:16px">${ic("library", 28)}</div><h2 class="h2 mt12">No Subscriptions yet</h2><p class="sm muted" style="margin:6px 0 18px">Subscribe to a podcast and its Episodes appear in your Views, ready to add to a Playlist.</p><div class="col gap8"><button class="btn btn-p" data-a="openAdd">${ic("search", 18)}Find a podcast</button><button class="btn btn-s" data-a="openOpml">${ic("upload", 18)}Import from another app (OPML)</button></div></div><p class="help" style="text-align:center">You can also paste a feed address in Find a podcast.</p></div>`;
  }

  // ================= Render =================
  function render(variant, dv, st) {
    const isDesk = dv === "desktop";
    let body = "", overlay = "", right = "";
    const pid = st.pod;
    const empty = st.first;

    if (variant === "A") {
      if (st.screen === "pod") {
        body = `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${isDesk ? "" : back("Library", "toList")}${podHead(pid, isDesk)}<div class="row gap8 mt12"><button class="btn btn-s" data-a="openSettings">${ic("sliders", 18)}Settings</button><button class="btn btn-t" data-a="markAll" data-v="${pid}">Mark all Played</button></div><p class="xs muted" style="margin:8px 0 0">${ruleLine(st.subs[pid])} on this ${dev()} · Speed ${OV.speed.fmt(val(st.subs[pid], "speed"))}</p></header>
          <div style="padding:0 12px">${isDesk ? `<div class="px20" style="padding:0 20px">${epTable(EPS.filter((e) => e.p === pid))}</div>` : podEpisodes(pid)}</div>`;
      } else if (st.screen === "add") {
        body = `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${back("Library", "toList")}<h1 class="h1" tabindex="-1">Find a podcast</h1></header><div class="px20" style="${isDesk ? "max-width:720px" : ""}">${searchInput(st, "Podcast name, or paste a feed address")}<p class="xs muted" style="margin:6px 2px 0">Searches the podcast directory. To search Episodes you already have, use Search in Views.</p>${dirResults(st, st.q)}</div>`;
      } else if (st.screen === "opml") {
        body = `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${back("Library", "toList")}<h1 class="h1" tabindex="-1">Import OPML</h1></header><div class="px20" style="${isDesk ? "max-width:640px" : ""}">${opmlPanel(st)}</div>`;
      } else if (st.screen === "orphans") {
        body = `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${back("Library", "toList")}<h1 class="h1" tabindex="-1">Orphaned Episodes</h1></header><div class="px20" style="${isDesk ? "max-width:720px" : ""}">${orphPanel(st)}</div>`;
      } else {
        const ids = subIds(st);
        body = `<header class="hdr row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">Library</h1><div class="row gap4">${isDesk ? `<button class="btn btn-o" data-a="openOpml">${ic("upload", 16)}Import OPML…</button><button class="btn btn-p" data-a="openAdd">${ic("plus", 16)}Add podcast</button>` : `<button class="ib" aria-label="Add podcast" data-a="openAdd" style="color:var(--primary)">${ic("plus", 22)}</button><button class="ib" aria-label="More" data-a="moreA">${ic("more")}</button>`}</div></header>
          ${empty ? firstRunA(isDesk) : `<div style="padding:0 ${isDesk ? 24 : 12}px">${isDesk ? `<p class="sm muted" style="margin:0 8px 8px">${plural(ids.length, "Subscription")} · downloads shown for this ${dev()}</p>` : ""}${ids.map((id) => subRow(st, id)).join("")}</div>
          <div style="padding:16px ${isDesk ? 24 : 12}px 0"><div class="label" style="padding:0 8px 4px">Not in your Subscriptions</div><button class="lrow" data-a="openOrph"><span class="tile" style="background:var(--sec);color:var(--muted)">${ic("info")}</span><span class="grow"><span class="m" style="display:block">Orphaned Episodes</span><span class="xs muted">Kept because they’re Entries or Starred</span></span><span class="sm muted">${st.orph.length}</span><span class="muted">${ic("right", 16)}</span></button></div>`}`;
        if (st.more) overlay += `<div class="scrim" style="background:transparent" data-a="closeTop"></div><div class="menu" style="right:12px;top:60px"><button data-a="openOpml">${ic("upload", 18)}Import OPML…</button><button data-a="noop">${ic("dl", 18)}Export OPML…</button><button data-a="noop">${ic("check", 18)}Mark everything Played…</button></div>`;
      }
      if (st.settings) {
        const sub = st.subs[pid];
        const inner = `<div class="shd" style="${isDesk ? "" : "padding-left:8px"}">${isDesk ? `<h2 class="h2 grow">Settings for ${esc(POD[pid].t)}</h2><button class="ib" aria-label="Close" data-a="closeTop">${ic("x")}</button>` : `<span style="width:64px"></span><h2 class="h3 grow" style="text-align:center">Settings</h2><button class="btn btn-t" data-a="closeTop">Done</button>`}</div>
          <div class="sbody">${isDesk ? "" : podHead(pid)}${ruleSection(st, pid)}${ovRowsA(st, pid)}${actionsSection(st, pid)}</div>${isDesk ? `<div class="sfoot"><button class="btn btn-p" data-a="closeTop">Done</button></div>` : ""}`;
        overlay += isDesk ? modal(inner, { label: "Subscription settings" }) : sheet(inner, { h: "92%", label: "Subscription settings" });
        if (st.picker) {
          const k = st.picker;
          const pin = `<div class="shd">${isDesk ? "" : ""}<h2 class="h3 grow">${OV[k].label}</h2><button class="btn btn-t" data-a="closePicker">Done</button></div><div class="sbody">${pickerA(st, pid, k)}</div>`;
          overlay += isDesk ? modal(pin, { cls: "narrow", z: 3, label: OV[k].label }) : sheet(pin, { z: 3, h: "70%", label: OV[k].label });
        }
        void sub;
      }
    }

    if (variant === "B") {
      const segTop = `<div class="${isDesk ? "" : "px20"}" style="margin-bottom:10px">${seg([["subs", "Subscriptions"], ["orph", `Orphaned (${st.orph.length})`]], st.listTab, "listTab", "full")}</div>`;
      const q = st.q.trim();
      const listCol = () => {
        if (empty) return `<div style="padding:${isDesk ? "8px 0" : "8px 20px"}"><h2 class="h2">Add your first podcast</h2><p class="sm muted" style="margin:4px 0 12px">Search the directory or paste a feed address. Its Episodes show up in your Views.</p>${searchInput(st, "Podcast name or feed address")}${dirResults(st, st.q)}${q ? "" : `<button class="btn btn-t mt12" style="padding:0" data-a="openOpml">${ic("upload", 18)}Moving from another app? Import OPML</button>`}${st.opml ? `<div class="mt12">${opmlPanel(st)}</div>` : ""}</div>`;
        const mine = subIds(st).filter((id) => !q || POD[id].t.toLowerCase().includes(q.toLowerCase()));
        return `<div style="padding:0 ${isDesk ? 0 : 20}px 10px">${searchInput(st, "Search or paste a feed address")}</div>
          ${q ? `<div style="padding:0 ${isDesk ? 0 : 12}px">${isUrl(q) ? "" : `<div class="label" style="padding:8px 8px 4px">Your Subscriptions (${mine.length})</div>${mine.map((id) => subRow(st, id)).join("") || '<p class="help" style="padding:0 8px">None match.</p>'}`}<div class="label" style="padding:16px 8px 4px">${isUrl(q) ? "Subscribe by address" : "Subscribe to more"}</div><div style="padding:0 8px">${dirResults(st, q, true)}</div></div>`
            : `${segTop}<div style="padding:0 ${isDesk ? 0 : 12}px">${st.listTab === "orph" ? `<div style="padding:0 8px">${orphPanel(st)}</div>` : subIds(st).map((id) => subRow(st, id)).join("") + `<div id="opmlBox" style="padding:16px 8px">${st.opml ? opmlPanel(st) : `<button class="btn btn-t" style="padding:0" data-a="openOpml">${ic("upload", 18)}Import OPML from another app</button>`}</div>`}</div>`}`;
      };
      const detail = () => `<header class="hdr" style="${isDesk ? "padding:24px 28px 8px" : "padding-top:4px"}">${isDesk ? "" : back("Library", "toList")}${podHead(pid, isDesk)}</header><div class="${isDesk ? "" : "px20"}" style="${isDesk ? "padding:0 28px" : ""}">${seg([["eps", "Episodes"], ["settings", "Settings"]], st.podTab, "podTab", "full")}</div>
        ${st.podTab === "settings" ? `<div style="padding:0 ${isDesk ? 28 : 20}px 20px">${ruleSection(st, pid)}${ovRowsB(st, pid)}${actionsSection(st, pid)}</div>` : `<div style="padding:8px ${isDesk ? 20 : 12}px">${isDesk ? epTable(EPS.filter((e) => e.p === pid)) : podEpisodes(pid)}</div>`}`;
      if (isDesk) {
        body = empty ? `<div style="max-width:600px;margin:0 auto;padding:48px 24px"><h1 class="h1" tabindex="-1" style="margin-bottom:12px">Library</h1>${listCol()}</div>` : `<div style="display:grid;grid-template-columns:380px minmax(0,1fr);height:100%"><div style="border-right:1px solid var(--line);overflow-y:auto;padding:24px 20px"><h1 class="h1" tabindex="-1" style="margin-bottom:12px">Library</h1>${listCol()}</div><div style="overflow-y:auto">${empty ? "" : detail()}</div></div>`;
      } else {
        body = st.screen === "pod" ? detail() : `<header class="hdr"><h1 class="h1" tabindex="-1">Library</h1></header>${listCol()}`;
      }
    }

    if (variant === "C") {
      const groups = [["allNew", "Downloads every new Episode"], ["onEntry", "Downloads when added to a Playlist"], ["never", "Doesn’t download"]];
      const firstC = `<div class="card" style="padding:18px;margin:0 ${isDesk ? 0 : 20}px 12px"><div class="row" style="justify-content:space-between"><h2 class="h3" style="font-size:17px">Set up PodList</h2><button class="btn btn-t" style="padding:0 4px" data-a="skipSetup">Skip</button></div>
        <ol style="list-style:none;margin:10px 0 0;padding:0" class="col gap8">${[["Add podcasts", "Search, paste a feed address, or import OPML.", st.added.length > 0, "openAddC"], ["Choose downloads for this " + dev(), "New Subscriptions start with “When added to a Playlist”.", st.setupDl, "setupDl"], ["Make your first View", "For example: new this week, not started.", false, "noop"]].map(([t, d, done, a], i) => `<li><button class="row gap12" style="width:100%;min-height:52px;text-align:left" data-a="${a}"><span class="radio ${done ? "on" : ""}" style="${done ? "background:var(--pos);border-color:var(--pos)" : ""}">${done ? "" : ""}</span><span class="grow"><span class="m" style="display:block;${done ? "text-decoration:line-through;color:var(--muted)" : ""}">${i + 1}. ${t}</span><span class="xs muted">${d}</span></span><span class="muted">${ic("right", 16)}</span></button></li>`).join("")}</ol></div>`;
      if (st.screen === "settings" && !isDesk) {
        body = `<header class="hdr" style="padding-top:4px">${back("Library", "toList")}${podHead(pid)}</header><div class="px20">${ruleSection(st, pid)}${ovRowsC(st, pid)}${actionsSection(st, pid)}<div style="height:16px"></div></div>`;
      } else if (st.screen === "orphans" || st.screen === "opml") {
        body = `<header class="hdr" style="${isDesk ? "" : "padding-top:4px"}">${back("Library", "toList")}<h1 class="h1" tabindex="-1">${st.screen === "opml" ? "Import OPML" : "Orphaned Episodes"}</h1></header><div class="px20" style="max-width:720px">${st.screen === "opml" ? opmlPanel(st) : orphPanel(st)}</div>`;
      } else if (isDesk) {
        const ids = subIds(st);
        const sel = st.bulk;
        const wide = !st.settings;
        body = `<header class="hdr row" style="justify-content:space-between"><div><h1 class="h1" tabindex="-1">Library</h1><p class="sm muted" style="margin:4px 0 0">${plural(ids.length, "Subscription")} · downloads and settings for this ${dev()}</p></div><div class="row gap8"><button class="btn btn-o" data-a="openOrphC">Orphaned (${st.orph.length})</button><button class="btn btn-p" data-a="openAddC">${ic("plus", 16)}Add</button></div></header>
          ${st.first && !st.added.length ? `<div style="padding:0 32px;max-width:640px">${firstC}</div>` : `<div class="px20">${sel.length ? `<div class="card row" style="padding:8px 8px 8px 14px;margin-bottom:8px;background:var(--accent);border-color:#cdd7f5"><span class="sm b">${sel.length} selected</span><span class="sp"></span><label class="row gap8 sm">Downloads on this ${dev()}<select id="bulkRule" data-in="bulkRule" style="height:36px;width:auto;font-size:14px">${RULES.map(([v, l]) => `<option value="${v}" ${st.bulkRule === v ? "selected" : ""}>${l}</option>`).join("")}</select></label><button class="btn btn-p" data-a="bulkApply">Apply to ${sel.length}</button><button class="btn btn-t" data-a="bulkClear">Clear</button></div>` : ""}
          <table class="tbl" style="table-layout:fixed"><colgroup><col style="width:36px"><col><col style="width:84px"><col style="width:230px">${wide ? '<col style="width:120px"><col style="width:80px">' : ""}<col style="width:48px"></colgroup><thead><tr><th><input type="checkbox" aria-label="Select all" data-a="bulkAll" ${sel.length === ids.length ? "checked" : ""}></th><th>Podcast</th><th>Unplayed</th><th>Downloads on this ${dev()}</th>${wide ? "<th>Keep at most</th><th>Speed</th>" : ""}<th><span class="sr">Settings</span></th></tr></thead><tbody>
          ${ids.map((id) => { const sub = st.subs[id]; return `<tr class="${sel.includes(id) || (st.settings && st.pod === id) ? "sel" : ""}" ${st.settings && st.pod === id ? 'aria-current="true"' : ""}><td><input type="checkbox" aria-label="Select ${esc(POD[id].t)}" data-a="bulkTog" data-v="${id}" ${sel.includes(id) ? "checked" : ""}></td><td><div class="row gap12">${art(id, 36)}<div class="grow"><div class="m trunc">${esc(POD[id].t)}</div><div class="xs muted trunc">${ovCount(sub) ? plural(ovCount(sub), "custom setting") : "All defaults"}</div></div></div></td><td class="tab-num">${unplayed(id)}</td>
            <td><select id="r-${id}" aria-label="Downloads for ${esc(POD[id].t)}" data-in="ruleRow" data-pid="${id}" style="height:34px;font-size:14px">${RULES.map(([v, l]) => `<option value="${v}" ${sub.rule === v ? "selected" : ""}>${l}</option>`).join("")}</select></td>${wide ? `<td class="muted">${sub.rule === "allNew" ? (sub.keep ? sub.keep + " Episodes" : "No limit") : "—"}</td><td class="tab-num ${sub.ov.speed !== undefined ? "" : "muted"}">${OV.speed.fmt(val(sub, "speed"))}</td>` : ""}<td><button class="ib" aria-label="Settings for ${esc(POD[id].t)}" data-a="openSetC" data-v="${id}">${ic("sliders", 18)}</button></td></tr>`; }).join("")}</tbody></table></div>`}`;
        if (st.settings) right = `<div style="padding:20px"><div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="label">Subscription settings</span><button class="ib" aria-label="Close" data-a="closeTop">${ic("x")}</button></div>${podHead(pid)}${ruleSection(st, pid)}${ovRowsC(st, pid)}${actionsSection(st, pid)}</div>`;
      } else {
        const ids = subIds(st);
        body = `<header class="hdr row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">Library</h1><button class="btn btn-s" style="min-height:40px" data-a="openAddC">${ic("plus", 18)}Add</button></header>
          ${st.first && !st.added.length ? firstC : `<p class="sm muted px20" style="margin:0 0 4px">${ic("phone", 14)} Grouped by what downloads on this ${dev()}.</p>${groups.map(([g, l]) => { const its = ids.filter((id) => st.subs[id].rule === g); return its.length ? `<div class="label" style="padding:16px 20px 2px">${l} · ${its.length}</div><div style="padding:0 12px">${its.map((id) => subRow(st, id, "openSetC", true)).join("")}</div>` : ""; }).join("")}
          <div style="padding:16px 12px 0"><button class="lrow" data-a="openOrphC"><span class="tile" style="background:var(--sec);color:var(--muted)">${ic("info")}</span><span class="grow"><span class="m" style="display:block">Orphaned Episodes</span><span class="xs muted">Kept because they’re Entries or Starred</span></span><span class="sm muted">${st.orph.length}</span><span class="muted">${ic("right", 16)}</span></button></div>`}`;
      }
      if (st.addSheet) {
        const t = st.addTab;
        const inner = `<div class="shd"><h2 class="${isDesk ? "h2" : "h3"} grow">Add podcasts</h2><button class="btn btn-t" data-a="closeTop">Done</button></div><div class="sbody">${seg([["search", "Search"], ["url", "Feed address"], ["opml", "OPML file"]], t, "addTab", "full")}<div class="mt12">${t === "search" ? searchInput(st, "Podcast name") + dirResults(st, st.q) : t === "url" ? `<label class="col gap4"><span class="sm m">Feed (RSS) address</span><input id="urlIn" type="url" data-in="dirQ" value="${esc(st.q)}" placeholder="https://example.com/feed.xml"></label><p class="help">Paste it from the podcast’s website. It often ends in .xml or /feed.</p>${dirResults(st, st.q)}` : opmlPanel(st)}</div></div>`;
        overlay += isDesk ? modal(inner, { label: "Add podcasts" }) : sheet(inner, { h: "88%", label: "Add podcasts" });
      }
    }

    if (st.unsub) overlay += unsubAlert(st, st.unsub);
    if (st.orphAsk) overlay += orphAlert(st, st.orphAsk);
    if (st.toast) overlay += toast(st.toast, null);
    if (isDesk) return desk({ sel: "library", main: `<div style="height:100%">${body}</div>`, right, overlay, ...(st.first ? { views: [], playlists: [{ id: "def", name: "Default", n: 0 }], noPlayer: true } : {}) });
    return phone({ tab: "library", content: scroll(body + '<div style="height:12px"></div>'), overlay, mini: !st.first });
  }

  AREAS.library = {
    title: "Library & Subscriptions",
    variants: {
      A: { name: "List, podcast page, settings sheet", caption: "Library is a plain list with Add (+) and an Orphaned row at the end; a podcast page holds its Episodes and a Settings button that opens one sheet: Download Rule for this Device, Played threshold, then Playback overrides as rows that open pickers (like the speed menu). Familiar and tidy; settings are two taps deep.", screens: [["list", "Library"], ["pod", "Podcast page"], ["settings", "Settings sheet"], ["picker", "Override picker"], ["add", "Find a podcast"], ["url", "Paste a feed address"], ["opml", "Import OPML"], ["orphans", "Orphaned"], ["unsub", "Unsubscribe"], ["first", "First run"]] },
      B: { name: "One search field, inline settings", caption: "A single field searches your Subscriptions, the directory and feed addresses at once; a podcast has Episodes and Settings tabs, with inline steppers that say “Your default” or offer Reset. Desktop is list + detail. Fewest screens, but the shared field mixes “mine” and “new”.", screens: [["list", "Library"], ["search", "Unified search"], ["url", "Paste a feed address"], ["settings", "Settings tab"], ["orphans", "Orphaned"], ["opml", "Import OPML"], ["first", "First run"]] },
      C: { name: "Grouped by Download Rule", caption: "The Library is organised by what downloads on this Device; desktop is a table with an inline Download Rule per row and bulk edit. Settings spell out “Default” vs “For this podcast” per item. Add is one sheet with Search · Feed address · OPML, and first run is a skippable checklist. Best for managing storage, busiest to look at.", screens: [["list", "Library by Download Rule"], ["settings", "Settings"], ["bulk", "Bulk Download Rules"], ["add", "Add sheet"], ["opml", "Import OPML"], ["orphans", "Orphaned"], ["first", "First run checklist"]] }
    },
    questions: [
      "What Download Rule does a new Subscription get on each Device: Never, or “When added to a Playlist” (mocks assume the latter)? Should subscribing ask?",
      "Back Catalogue: when you subscribe (or import OPML), do old Episodes arrive unplayed and flood “Not Played” Views, or should there be a “mark older ones Played” choice?",
      "Should a Device show other Devices’ Download Rules (mocks show one line, read-only), or only its own?",
      "Is the Played threshold always “seconds before the end”, or also a percentage for very long or very short Episodes?",
      "Which directory is searched (Podcast Index, Apple)? Is search done by the server or the Device?",
      "Removing an Orphaned Episode removes its Entries and Star. Is that the only way to remove it, or does un-Starring / removing the last Entry make it disappear on its own?",
      "First run: should the empty app also seed starter Views (e.g. “New this week”) so the Views tab isn’t blank after the first subscribe?",
      "Unsubscribe removes downloads on every Device, not only this one. Correct?"
    ],
    init(variant, screen, dv) {
      const st = { screen0: screen, screen: "list", subs: clone(SUBS0), pod: "com", q: "", added: [], orph: clone(ORPH0), opml: null, settings: false, picker: null, listTab: "subs", podTab: "eps", bulk: [], bulkRule: "onEntry", addSheet: false, addTab: "search", toast: null, first: false };
      const s = screen;
      if (s === "pod") st.screen = "pod";
      if (s === "settings" || s === "picker" || s === "unsub") { st.screen = variant === "C" ? "settings" : "pod"; st.settings = variant !== "B"; st.podTab = "settings"; if (variant === "C" && dv === "desktop") st.screen = "list"; }
      if (variant === "B" && dv === "desktop" && s !== "first") st.screen = "pod";
      if (variant === "B" && (s === "list") && dv === "phone") st.screen = "list";
      if (s === "picker") st.picker = "speed";
      if (s === "unsub") st.unsub = "com";
      if (s === "add") { if (variant === "C") st.addSheet = true; else st.screen = "add"; st.q = "garden"; }
      if (s === "search") { st.q = "garden"; st.screen = dv === "desktop" ? "pod" : "list"; }
      if (s === "url") { st.q = "https://feeds.example.net/weekend-woodworking.xml"; if (variant === "A") st.screen = "add"; }
      if (s === "opml") { st.opml = { step: "review", picked: OPML.map(() => true) }; if (variant === "A" || variant === "C") st.screen = "opml"; else st.scrollTo = "opmlBox"; }
      if (s === "orphans") { if (variant === "B") st.listTab = "orph"; else st.screen = "orphans"; }
      if (s === "first") { st.first = true; st.subs = {}; st.orph = []; st.screen = "list"; }
      if (s === "bulk") { st.bulk = ["fld", "eng", "nlf"]; st.bulkRule = "onEntry"; }
      if (variant === "C" && dv === "desktop" && (s === "settings" || s === "unsub")) st.settings = true;
      return st;
    },
    esc(st) { return AREAS.library.actions.closeTop() !== false; },
    render,
    actions: {
      toList() { const st = S.st; st.screen = "list"; st.q = ""; st.opml = null; },
      openPod(v) { const st = S.st; st.pod = v; st.screen = "pod"; st.q = ""; st.podTab = S.variant === "B" ? st.podTab : "eps"; },
      openSettings() { S.st.settings = true; },
      openPicker(k) { S.st.picker = k; },
      closePicker() { S.st.picker = null; },
      setOv(v) { const [k, x] = v.split(":"); const sub = S.st.subs[S.st.pod]; if (x === "default") delete sub.ov[k]; else sub.ov[k] = x === "true" ? true : x === "false" ? false : +x; },
      ovStep(v) { const [k, d] = v.split(":"); const sub = S.st.subs[S.st.pod]; const o = OV[k].opts; const i = o.indexOf(val(sub, k)); const n = o[Math.max(0, Math.min(o.length - 1, i + (d === "+" ? 1 : -1)))]; if (n === DEF[k] && S.variant === "B") delete sub.ov[k]; else sub.ov[k] = n; },
      ovReset(k) { delete S.st.subs[S.st.pod].ov[k]; },
      ovBool(k) { const sub = S.st.subs[S.st.pod]; const n = !val(sub, k); if (n === DEF[k] && S.variant === "B") delete sub.ov[k]; else sub.ov[k] = n; },
      ovMode(v) { const [k, m] = v.split(":"); const sub = S.st.subs[S.st.pod]; if (m === "default") delete sub.ov[k]; else if (sub.ov[k] === undefined) sub.ov[k] = DEF[k]; },
      rule(v) { const sub = S.st.subs[S.st.pod]; sub.rule = v; if (v === "allNew" && sub.keep === null) sub.keep = 5; },
      keep(d) { const sub = S.st.subs[S.st.pod]; const i = KEEP.indexOf(sub.keep); sub.keep = KEEP[Math.max(0, Math.min(KEEP.length - 1, i + (d === "+" ? 1 : -1)))]; },
      markAll(pid) { S.st.toast = `Marked ${plural(unplayed(pid), "Episode")} of ${esc(POD[pid].t)} Played`; },
      askUnsub(pid) { S.st.unsub = pid; S.st.focus = "usCancel"; },
      doUnsub(pid) { const st = S.st; delete st.subs[pid]; st.unsub = null; st.settings = false; st.screen = "list"; st.pod = subIds(st)[0]; st.orph = [...st.orph, { id: "o" + Date.now(), t: POD[pid].t + ": an Episode in a Playlist", why: "Entry in Default" }]; st.toast = `Unsubscribed from ${esc(POD[pid].t)}. 1 Episode stays as Orphaned.`; },
      openAdd() { const st = S.st; if (S.variant === "C") { st.addSheet = true; return; } st.screen = "add"; st.q = ""; st.focus = "dirQ"; },
      openAddC() { S.st.addSheet = true; S.st.addTab = "search"; S.st.focus = "dirQ"; },
      addTab(v) { S.st.addTab = v; if (v === "opml" && !S.st.opml) S.st.opml = { step: "choose", picked: OPML.map(() => true) }; S.st.q = ""; },
      dirQ(v) { S.st.q = v; },
      subscribe(id) { const st = S.st; const d = DIR.find((x) => x.id === id); st.added.push(id); st.toast = `Subscribed to ${esc(d.t)}. Its ${d.n} Episodes are in your Library.`; },
      openOpml() { const st = S.st; st.more = false; st.opml = { step: "choose", picked: OPML.map(() => true) }; if (S.variant === "A") st.screen = "opml"; else st.scrollTo = "opmlBox"; },
      opmlChoose() { S.st.opml.step = "review"; },
      opmlTog(i) { const o = S.st.opml; o.picked[i] = !o.picked[i]; },
      opmlImport() { const o = S.st.opml; o.done = OPML.filter((x, i) => !x[1] && o.picked[i]).length - 1; o.step = "done"; S.st.added.push("opml"); },
      opmlCancel() { const st = S.st; st.opml = null; if (S.variant !== "B" && !st.addSheet) st.screen = "list"; if (st.addSheet) st.addSheet = false; },
      openOrph() { S.st.screen = "orphans"; },
      openOrphC() { S.st.screen = "orphans"; },
      askOrph(id) { S.st.orphAsk = id; },
      doOrph(id) { const st = S.st; st.orph = st.orph.filter((o) => o.id !== id); st.orphAsk = null; st.toast = "Removed from your Library"; },
      listTab(v) { S.st.listTab = v; },
      podTab(v) { S.st.podTab = v; },
      openSetC(v) { const st = S.st; st.pod = v; if (S.device === "desktop") st.settings = true; else st.screen = "settings"; },
      bulkTog(id) { const b = S.st.bulk; S.st.bulk = b.includes(id) ? b.filter((x) => x !== id) : [...b, id]; },
      bulkAll() { const st = S.st; const ids = subIds(st); st.bulk = st.bulk.length === ids.length ? [] : ids; },
      bulkClear() { S.st.bulk = []; },
      bulkRule(v) { S.st.bulkRule = v; return false; },
      bulkApply() { const st = S.st; st.bulk.forEach((id) => (st.subs[id].rule = st.bulkRule)); st.toast = `Downloads on this ${dev()} set to “${RULES.find((r) => r[0] === st.bulkRule)[1]}” for ${plural(st.bulk.length, "Subscription")}`; st.bulk = []; },
      ruleRow(v, el) { S.st.subs[el.dataset.pid].rule = v; },
      skipSetup() { S.st.first = false; S.st.subs = clone(SUBS0); S.st.toast = "Setup hidden. Find it again in Settings › Get started."; },
      setupDl() { S.st.setupDl = true; },
      moreA() { S.st.more = !S.st.more; },
      closeTop() {
        const st = S.st;
        if (st.unsub) { st.unsub = null; return; }
        if (st.orphAsk) { st.orphAsk = null; return; }
        if (st.picker) { st.picker = null; return; }
        if (st.more) { st.more = false; return; }
        if (st.settings) { st.settings = false; return; }
        if (st.addSheet) { st.addSheet = false; return; }
        if (st.toast) { st.toast = null; return; }
        return false;
      }
    }
  };
})();
