// ===== Area 1: View editor and Search results =====
(() => {
  const DSTEPS = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120];
  const LSTEPS = [null, 5, 10, 20, 50, 100];
  const step = (arr, cur, dir) => { const i = Math.max(0, arr.indexOf(cur)); return arr[Math.min(arr.length - 1, Math.max(0, i + (dir === "+" ? 1 : -1)))]; };
  const isoOf = (d) => { const x = dateOf(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
  const daysFromIso = (s) => Math.round((TODAY - new Date(s + "T00:00")) / 864e5);

  const valid = (k, f) => {
    if (k === "podcasts") return f.podcasts && f.podcasts.ids.length > 0;
    if (k === "text") return !!(f.text && f.text.trim());
    if (k === "duration") return !!(f.minDuration || f.maxDuration);
    return true;
  };
  const viewFromDraft = (d) => runView(d.f, d.sort, d.limit);
  const summaryLine = (f) => { const ks = condKeys(f); return ks.length ? ks.map((k) => condSummary(k, f)).join(" · ") : "Every Episode in the Library"; };

  // Radio list: big rows (44px+) with an optional second line.
  const radios = (opts, cur, a) => `<div class="group" role="radiogroup">${opts
    .map(([v, l, d]) => `<button class="gr" role="radio" aria-checked="${String(v) === String(cur)}" data-a="${a}" data-v="${v}"><span class="radio ${String(v) === String(cur) ? "on" : ""}"></span><span class="grow"><span class="m" style="display:block">${l}</span>${d ? `<span class="xs muted">${d}</span>` : ""}</span></button>`)
    .join("")}</div>`;
  const stepper = (label, val, a, fmt) => `<div class="row" style="justify-content:space-between;min-height:52px"><span class="m">${label}</span><span class="stepper"><button aria-label="Less: ${label}" data-a="${a}" data-v="-">−</button><span aria-live="polite">${fmt(val)}</span><button aria-label="More: ${label}" data-a="${a}" data-v="+">+</button></span></div>`;
  const minFmt = (v) => (v ? v + " min" : "Any");

  // The editor for one condition (or sort / limit). Edits the draft live.
  function condEditor(k, d, opts = {}) {
    const f = d.f;
    switch (k) {
      case "published": {
        const p = f.published || { tag: "LastDays", days: 14 };
        const cur = p.tag === "LastDays" ? p.days : "between";
        return radios([[7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"], ["between", "Between two dates"]], cur, "pubDays") +
          (p.tag === "Between" ? `<div class="row gap12 mt12"><label class="grow"><span class="xs muted m">From</span><input id="pubFrom" type="date" data-in="pubFrom" value="${p.from != null ? isoOf(p.from) : ""}"></label><label class="grow"><span class="xs muted m">To</span><input id="pubTo" type="date" data-in="pubTo" value="${p.to != null ? isoOf(p.to) : ""}"></label></div><p class="help">Leave “To” empty for “until today”.</p>` : `<p class="help">Counts from the date the podcast published the Episode, not when PodList first saw it.</p>`);
      }
      case "podcasts": {
        const p = f.podcasts || { mode: "include", ids: [] };
        return seg([["include", "Only these"], ["exclude", "All except these"]], p.mode, "podMode", "full") +
          `<div class="group mt12">${PODS.map((x) => `<label class="gr" style="cursor:pointer"><input type="checkbox" ${p.ids.includes(x.id) ? "checked" : ""} data-a="podTog" data-v="${x.id}">${art(x.id, 32)}<span class="grow trunc">${esc(x.t)}</span></label>`).join("")}</div>
          <p class="help">${p.ids.length ? plural(p.ids.length, "podcast") + " chosen." : "Choose at least one podcast."}</p>`;
      }
      case "text":
        return `<label><span class="sm m">Title, show notes or podcast name contains</span><input id="condText" class="mt4" type="text" data-in="condText" value="${esc(f.text || "")}" placeholder="For example: budget" autocomplete="off"></label><p class="help">Not case-sensitive. One phrase; use another condition to narrow further.</p>`;
      case "played":
        return radios([["unplayed", "Not started", "No Position in any Playlist"], ["inProgress", "In progress", "Started somewhere, not finished"], ["notPlayed", "Not Played", "Not started or in progress"], ["played", "Played", "Finished, or marked Played"]], f.played, "played");
      case "starred":
        return radios([["true", "Starred"], ["false", "Not Starred"]], String(f.starred), "starred");
      case "notInAnyPlaylist":
        return `<p class="sm" style="margin:4px 0">Shows only Episodes that aren’t an Entry in any Playlist. Nothing to set.</p>`;
      case "duration":
        return `<div class="group" style="padding:4px 14px">${stepper("At least", f.minDuration || 0, "durMin", minFmt)}<div style="border-top:1px solid var(--line)"></div>${stepper("At most", f.maxDuration || 0, "durMax", minFmt)}</div>`;
      case "sort":
        return radios(Object.entries(SORTS), d.sort, "sortSet");
      case "limit":
        return radios(LSTEPS.map((n) => [n === null ? "all" : n, n === null ? "All that match" : "The first " + n]), d.limit === null ? "all" : d.limit, "limitSet") + `<p class="help">Counted after sorting: “Newest first” with 20 shows the 20 newest.</p>`;
    }
    return "";
  }
  const condLabel = (k) => (COND_TYPES.find((c) => c[0] === k) || [k, { sort: "Sort", limit: "Show at most" }[k]])[1];

  // Shared editing actions (all act on st.draft).
  const edActions = {
    pubDays(v) { const d = S.st.draft; d.f.published = v === "between" ? { tag: "Between", from: 30, to: null } : { tag: "LastDays", days: +v }; },
    pubFrom(v) { S.st.draft.f.published.from = v ? daysFromIso(v) : null; },
    pubTo(v) { S.st.draft.f.published.to = v ? daysFromIso(v) : null; },
    podMode(v) { S.st.draft.f.podcasts.mode = v; },
    podTog(v) { const p = S.st.draft.f.podcasts; p.ids = p.ids.includes(v) ? p.ids.filter((x) => x !== v) : [...p.ids, v]; },
    condText(v) { S.st.draft.f.text = v; },
    played(v) { S.st.draft.f.played = v; },
    starred(v) { S.st.draft.f.starred = v === "true"; },
    durMin(v) { const f = S.st.draft.f; f.minDuration = step(DSTEPS, f.minDuration || 0, v) || undefined; },
    durMax(v) { const f = S.st.draft.f; f.maxDuration = step(DSTEPS, f.maxDuration || 0, v) || undefined; },
    sortSet(v) { S.st.draft.sort = v; },
    limitSet(v) { S.st.draft.limit = v === "all" ? null : +v; },
    vname(v) { S.st.draft.name = v; return false; },
    removeCond(k) { S.st.draft.f = dropCond(S.st.draft.f, k); },
    q(v) { S.st.q = v; }
  };
  const newDraft = (v) => (v ? { id: v.id, name: v.name, f: clone(v.f), sort: v.sort, limit: v.limit } : { id: null, name: "", f: {}, sort: "publishedDesc", limit: null });
  const saveDraft = (st) => {
    const d = st.draft;
    const name = d.name.trim() || "Untitled View";
    if (d.id) st.views = st.views.map((v) => (v.id === d.id ? { ...v, name, f: clone(d.f), sort: d.sort, limit: d.limit } : v));
    else { d.id = "n" + Date.now(); st.views = [...st.views.filter((v) => !v.unsaved), { id: d.id, name, f: clone(d.f), sort: d.sort, limit: d.limit }]; }
    return st.views.find((v) => v.id === d.id);
  };

  // ---------- Common screens ----------
  function viewsListPhone(st, searchHtml) {
    return scroll(`<header class="hdr row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">Views</h1><button class="btn btn-t" data-a="newView">New View</button></header>
      <div class="px20" style="margin-bottom:8px">${searchHtml}</div>
      <div style="padding:0 12px">${st.views.map((v) => {
        const r = runView(v.f, v.sort, v.limit);
        return `<button class="lrow" data-a="openView" data-v="${v.id}"><span class="tile">${ic("filter")}</span><span class="grow"><span class="m" style="display:block;font-size:16px">${esc(v.name)}</span><span class="xs muted trunc" style="display:block;margin-top:2px">${esc(summaryLine(v.f))}</span></span><span class="sm muted tab-num">${r.rows.length}</span><span class="muted">${ic("right", 16)}</span></button>`;
      }).join("")}</div>`);
  }
  const searchButton = `<button class="row gap8" data-a="openSearch" style="height:44px;border-radius:12px;background:#ecebe6;color:var(--muted);padding:0 12px;width:100%">${ic("search", 18)}Search the Library</button>`;
  function viewPhone(st, v, extra = "") {
    const r = runView(v.f, v.sort, v.limit);
    return scroll(`<header class="hdr" style="padding-top:4px">${back("Views", "toList")}<div class="row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">${esc(v.name)}</h1><button class="btn btn-t" data-a="editView">Edit</button></div><p class="sm muted" style="margin:6px 0 0">${esc(summaryLine(v.f))} · ${SORTS[v.sort]}</p></header>${extra}<div style="padding:0 12px">${r.rows.map((e) => epRowPhone(e)).join("") || `<div class="dashed" style="margin:8px;padding:24px;text-align:center"><div class="m">No Episodes match right now</div><div class="sm muted mt4">New Episodes appear here when they match. Edit the View to widen it.</div></div>`}</div>`);
  }
  function viewDesk(st, v, actionsHtml = "") {
    const r = runView(v.f, v.sort, v.limit);
    return `<header class="hdr"><div class="row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">${esc(v.name)}</h1><div class="row gap8">${actionsHtml}</div></div><p class="sm muted" style="margin:6px 0 0">${esc(summaryLine(v.f))} · ${SORTS[v.sort]}${v.limit ? " · first " + v.limit : ""} · ${plural(r.rows.length, "Episode")}</p></header>
      <div class="px20 row" style="justify-content:flex-end;padding-bottom:8px"><label class="row gap8 sm muted">Next / Last go to <select style="height:36px;width:auto;font-size:14px"><option>Default (active)</option><option>Commute</option></select></label></div><div class="px20">${epTable(r.rows)}</div>`;
  }
  const curView = (st) => st.views.find((v) => v.id === st.cur) || st.views[0];

  // Sheet / modal wrappers
  const sheet = (inner, { z = 0, h = "", label = "Dialog" } = {}) => `<div class="scrim" data-a="sheetScrim" style="z-index:${20 + z}"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" style="z-index:${21 + z};${h ? "height:" + h : ""}"><div class="grab"></div>${inner}</div>`;
  const modal = (inner, { cls = "", z = 0, label = "Dialog" } = {}) => `<div class="scrim" data-a="sheetScrim" style="z-index:${20 + z}"></div><div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}" style="z-index:${21 + z}">${inner}</div>`;

  // ================= Variant A: editor sheet with condition rows =================
  function edBodyA(st, desk) {
    const d = st.draft;
    const ks = condKeys(d.f);
    const row = (k) => {
      const open = desk && st.open === k;
      return `<div class="gr" style="flex-wrap:wrap;${open ? "background:#fbfaf8" : ""}"><button class="grow col" style="min-height:44px;justify-content:center" data-a="${desk ? "toggleOpen" : "openCond"}" data-v="${k}" aria-expanded="${open}"><span class="xs muted m">${condLabel(k)}</span><span class="m">${esc(valid(k, d.f) ? condSummary(k, d.f) : "Not set yet")}</span></button>
        ${desk ? `<span class="muted" style="transform:rotate(${open ? 180 : 0}deg)">${ic("down", 16)}</span>` : `<span class="muted">${ic("right", 16)}</span>`}<button class="ib" aria-label="Remove ${condLabel(k)}" data-a="removeCond" data-v="${k}">${ic("x", 18)}</button>
        ${open ? `<div style="flex-basis:100%;padding:4px 0 12px">${condEditor(k, d)}</div>` : ""}</div>`;
    };
    const unused = COND_TYPES.filter(([k]) => !ks.includes(k));
    return `<label class="col gap4"><span class="label">Name</span><input id="vname" type="text" data-in="vname" value="${esc(d.name)}" placeholder="For example: Short and unplayed"></label>
      <div class="gl label">Show Episodes that match all of these</div>
      <div class="group">${ks.map(row).join("")}
        <div style="position:relative"><button class="gr" style="color:var(--primary);font-weight:600" data-a="${desk ? "toggleAddMenu" : "openAdd"}" aria-expanded="${!!st.addMenu}" ${unused.length ? "" : "disabled"}>${ic("plus", 18)}Add a condition</button>
        ${desk && st.addMenu ? `<div class="menu" style="left:8px;top:48px;width:360px">${unused.map(([k, l, dsc]) => `<button data-a="addCond" data-v="${k}" style="flex-direction:column;align-items:flex-start;justify-content:center;min-height:48px"><span class="m">${l}</span><span class="xs muted">${dsc}</span></button>`).join("")}</div>` : ""}</div></div>
      ${ks.length ? "" : `<p class="help">No conditions yet, so this View shows every Episode in the Library.</p>`}
      <div class="gl label">Order</div>
      <div class="group">${["sort", "limit"].map((k) => {
        const open = desk && st.open === k;
        const val = k === "sort" ? SORTS[d.sort] : d.limit ? "The first " + d.limit : "All that match";
        return `<div class="gr" style="flex-wrap:wrap"><button class="grow row" style="min-height:44px;justify-content:space-between" data-a="${desk ? "toggleOpen" : "openCond"}" data-v="${k}" aria-expanded="${open}"><span class="m">${condLabel(k)}</span><span class="muted">${val}</span></button><span class="muted">${ic(desk ? "down" : "right", 16)}</span>${open ? `<div style="flex-basis:100%;padding:4px 0 12px">${condEditor(k, d)}</div>` : ""}</div>`;
      }).join("")}</div>
      ${d.id ? `<div class="mt24"><button class="btn btn-t danger" style="padding:0 4px" data-a="askDelete">${ic("trash", 18)}Delete View</button></div>` : ""}`;
  }
  function countFoot(st) {
    const r = viewFromDraft(st.draft);
    return `<span class="grow" aria-live="polite"><b class="tab-num">${plural(r.total, "Episode")}</b> <span class="muted">match now${st.draft.limit && r.total > st.draft.limit ? ", showing " + st.draft.limit : ""}</span></span>`;
  }
  function overlayA_phone(st) {
    if (!st.draft) return "";
    let html = sheet(`<div class="shd" style="padding-left:8px"><button class="btn btn-t" data-a="edCancel">Cancel</button><h2 class="h3 grow" style="text-align:center">${st.draft.id ? "Edit View" : "New View"}</h2><button class="btn btn-t" data-a="edSave">Save</button></div>
      <div class="sbody">${edBodyA(st, false)}</div><div class="sfoot row">${countFoot(st)}<button class="btn btn-s" data-a="openPreview">Preview</button></div>`, { h: "94%", label: "Edit View" });
    const sub = st.sub;
    if (sub && sub.kind === "add") {
      const unused = COND_TYPES.filter(([k]) => !condKeys(st.draft.f).includes(k));
      html += sheet(`<div class="shd"><h2 class="h3 grow">Add a condition</h2><button class="btn btn-t" data-a="subCancel">Cancel</button></div><div class="sbody"><div class="group">${unused.map(([k, l, dsc]) => `<button class="gr" data-a="addCond" data-v="${k}"><span class="grow"><span class="m" style="display:block">${l}</span><span class="xs muted">${dsc}</span></span><span class="muted">${ic("right", 16)}</span></button>`).join("")}</div></div>`, { z: 4, label: "Add a condition" });
    }
    if (sub && sub.kind === "cond") {
      const ok = valid(sub.k, st.draft.f);
      html += sheet(`<div class="shd" style="padding-left:8px"><button class="btn btn-t" data-a="subCancel">${sub.isNew ? "Back" : "Cancel"}</button><h2 class="h3 grow" style="text-align:center">${condLabel(sub.k)}</h2><button class="btn btn-t" data-a="subDone" ${ok ? "" : "disabled"}>${sub.isNew ? "Add" : "Done"}</button></div><div class="sbody">${condEditor(sub.k, st.draft)}</div><div class="sfoot row">${countFoot(st)}</div>`, { z: 4, label: condLabel(sub.k) });
    }
    if (sub && sub.kind === "preview") {
      const r = viewFromDraft(st.draft);
      html += sheet(`<div class="shd"><h2 class="h3 grow">Preview · ${plural(r.total, "Episode")}</h2><button class="btn btn-t" data-a="subCancel">Done</button></div><div class="sbody" style="padding:0 8px">${r.rows.slice(0, 8).map((e) => epRowPhone(e)).join("") || '<p class="help" style="padding:20px">No Episodes match yet.</p>'}${r.rows.length > 8 ? `<p class="help" style="text-align:center">and ${r.rows.length - 8} more</p>` : ""}</div>`, { z: 4, h: "70%", label: "Preview" });
    }
    if (sub && sub.kind === "delete") html += deleteAlert(st, 4);
    return html;
  }
  const deleteAlert = (st, z) => `<div class="scrim" style="z-index:${22 + z}" data-a="subCancel"></div><div class="alert" role="alertdialog" aria-modal="true" aria-labelledby="dlT" style="z-index:${23 + z}"><h2 class="h3" id="dlT" style="font-size:17px">Delete “${esc(st.draft.name)}”?</h2><p class="sm muted" style="margin:8px 0 16px">The View goes away on every Device. No Episodes, Entries or downloads change.</p><div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" data-a="subCancel" id="dlCancel">Cancel</button><button class="btn btn-d" data-a="doDelete">Delete View</button></div></div>`;

  function searchResultsPhoneA(st) {
    const r = st.q.trim() ? runView({ text: st.q.trim() }, "publishedDesc") : { total: 0, rows: [] };
    return scroll(`<header class="hdr" style="padding-top:4px">${back("Views", "toList")}<h1 class="h1" tabindex="-1">Search</h1></header>
      <div class="px20"><label class="sr" for="q">Search the Library</label><div style="position:relative"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><input id="q" type="search" data-in="q" value="${esc(st.q)}" placeholder="Titles, show notes, podcasts" style="padding-left:40px"></div>
      <p class="xs muted" style="margin:6px 2px 0">Searches every Episode in your Library. To find new podcasts, use Library.</p>
      ${st.q.trim() ? `<div class="row mt12" style="justify-content:space-between"><span class="sm"><b>${plural(r.total, "Episode")}</b> <span class="muted">mention “${esc(st.q.trim())}”</span></span><button class="btn btn-s" data-a="promote">${ic("filter", 16)}Save as View</button></div>` : ""}</div>
      <div style="padding:4px 12px">${st.q.trim() ? (r.rows.map((e) => epRowPhone(e, st.q.trim())).join("") || `<div class="dashed mt12" style="padding:24px;text-align:center"><div class="m">Nothing in your Library mentions “${esc(st.q)}”</div><div class="sm muted mt4">Check the spelling, or search for a podcast to subscribe to in Library.</div></div>`) : `<p class="help" style="padding:12px 8px">Type to search. Results update as you type.</p>`}</div>`);
  }
  function searchDesk(st, extraBtn = "") {
    const q = st.q.trim();
    const r = q ? runView({ text: q }, "publishedDesc") : { total: 0, rows: [] };
    return `<header class="hdr"><h1 class="h1" tabindex="-1">Search</h1></header><div class="px20"><div class="row gap12"><div class="grow" style="position:relative;max-width:560px"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><label class="sr" for="q">Search the Library</label><input id="q" type="search" data-in="q" value="${esc(st.q)}" placeholder="Titles, show notes, podcasts" style="padding-left:40px"></div>${q ? `<button class="btn btn-p" data-a="promote">${ic("filter", 16)}Save as View…</button>` : ""}${extraBtn}</div>
      <p class="sm muted" style="margin:8px 0 12px">${q ? `<b style="color:var(--fg)">${plural(r.total, "Episode")}</b> in your Library mention “${esc(q)}” in the title, show notes or podcast name.` : "Searches every Episode in your Library."}</p>${q ? epTable(r.rows, q, { empty: "Check the spelling, or find a new podcast in Library." }) : ""}</div>`;
  }

  function renderA(dev, st) {
    if (dev === "phone") {
      let content;
      if (st.screen === "search") content = searchResultsPhoneA(st);
      else if (st.screen === "view") content = viewPhone(st, curView(st));
      else content = viewsListPhone(st, searchButton);
      return phone({ tab: "views", content, overlay: overlayA_phone(st) + (st.toast ? toast(st.toast) : "") });
    }
    let main = st.screen === "search" ? searchDesk(st) : viewDesk(st, curView(st), `<button class="btn btn-o" data-a="editView">${ic("sliders", 16)}Edit View</button>`);
    let overlay = "";
    if (st.draft) {
      overlay = modal(`<div class="shd"><h2 class="h2 grow">${st.draft.id ? "Edit View" : "New View"}</h2><button class="ib" aria-label="Close" data-a="edCancel">${ic("x")}</button></div><div class="sbody">${edBodyA(st, true)}</div>
        <div class="sfoot" style="align-items:center">${countFoot(st)}<button class="btn btn-s" data-a="edCancel">Cancel</button><button class="btn btn-p" data-a="edSave">Save</button></div>`, { cls: "wide", label: "Edit View" });
      if (st.sub && st.sub.kind === "delete") overlay += deleteAlert(st, 4);
    }
    return desk({ sel: st.screen === "search" ? null : st.cur, main, overlay: overlay + (st.toast ? toast(st.toast) : ""), views: st.views, searchSel: st.screen === "search" });
  }

  // ================= Variant B: the View is its own editor (chips over live results) =================
  function chipsB(st, desk) {
    const d = st.draft, ks = condKeys(d.f);
    const pop = (k) => (desk && st.chip === k ? `<div class="pop" role="dialog" aria-label="${condLabel(k)}" style="left:0;top:44px">${k === "add" ? addList(d) : `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="h3">${condLabel(k)}</span><button class="btn btn-t" data-a="chipClose">Done</button></div>${condEditor(k, d)}`}</div>` : "");
    const chip = (k) => `<span style="position:relative;display:inline-block"><span class="chip" ${k === "text" && st.screen === "search" ? 'style="padding-right:12px"' : ""}><button class="row" style="gap:4px;min-height:36px;color:inherit" data-a="chipOpen" data-v="${k}" aria-expanded="${st.chip === k}">${esc(valid(k, d.f) ? condSummary(k, d.f) : condLabel(k) + "…")}${ic("down", 14)}</button>${k === "text" && st.screen === "search" ? "" : `<button class="x" aria-label="Remove ${condLabel(k)}" data-a="removeCond" data-v="${k}">${ic("x", 14)}</button>`}</span>${pop(k)}</span>`;
    const sortChip = `<span style="position:relative;display:inline-block"><button class="chip add" style="border-style:solid!important" data-a="chipOpen" data-v="sort" aria-expanded="${st.chip === "sort"}">${SORTS[d.sort]}${d.limit ? " · first " + d.limit : ""} ${ic("down", 14)}</button>${desk && st.chip === "sort" ? `<div class="pop" style="left:0;top:44px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="h3">Order</span><button class="btn btn-t" data-a="chipClose">Done</button></div>${condEditor("sort", d)}<div class="gl label">Show at most</div>${condEditor("limit", d)}</div>` : ""}</span>`;
    return `<div class="row" style="flex-wrap:wrap;gap:8px">${ks.map(chip).join("")}<span style="position:relative;display:inline-block"><button class="chip add" data-a="chipOpen" data-v="add" aria-expanded="${st.chip === "add"}">${ic("plus", 14)}${ks.length ? "Add" : "Add a condition"}</button>${pop("add")}</span><span class="sp" style="flex:0 0 4px"></span>${sortChip}</div>`;
  }
  const addList = (d) => { const unused = COND_TYPES.filter(([k]) => !condKeys(d.f).includes(k)); return `<div class="col">${unused.map(([k, l, dsc]) => `<button class="row" style="min-height:48px;padding:4px 8px;border-radius:8px;align-items:flex-start;flex-direction:column;justify-content:center;gap:0" data-a="addCond" data-v="${k}"><span class="m">${l}</span><span class="xs muted">${dsc}</span></button>`).join("")}</div>`; };
  const dirty = (st) => { if (st.screen === "search") return false; const v = curView(st); return JSON.stringify([v.name, v.f, v.sort, v.limit]) !== JSON.stringify([st.draft.name, st.draft.f, st.draft.sort, st.draft.limit]); };
  function renderB(dev, st) {
    const d = st.draft;
    const r = viewFromDraft(d);
    const isSearch = st.screen === "search";
    const q = isSearch ? (d.f.text || "").trim() : "";
    const unsavedBar = dirty(st) ? `<div class="row card" style="padding:6px 6px 6px 14px;margin-top:12px;background:var(--accent);border-color:#cdd7f5"><span class="grow sm"><b>Changed</b> · not saved yet</span><button class="btn btn-t" data-a="revertB">Discard</button><button class="btn btn-p" data-a="saveB">Save</button></div>` : "";
    if (dev === "phone") {
      let content, overlay = "";
      if (st.screen === "list") {
        content = viewsListPhone(st, `<label class="sr" for="q">Search the Library</label><div style="position:relative"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><input id="q" type="search" data-in="qB" value="" placeholder="Search the Library" style="padding-left:40px;background:#ecebe6;border-color:transparent"></div>`);
      } else {
        const head = isSearch
          ? `<header class="hdr" style="padding-top:4px">${back("Views", "toList")}<label class="sr" for="q">Search the Library</label><div style="position:relative"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><input id="q" type="search" data-in="qB" value="${esc(d.f.text || "")}" style="padding-left:40px"></div></header>`
          : `<header class="hdr" style="padding-top:4px">${back("Views", "toList")}<div class="row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">${esc(d.name)}</h1><button class="ib" aria-label="More for this View" data-a="moreB">${ic("more")}</button></div></header>`;
        content = scroll(`${head}<div class="px20">${chipsB(st, false)}${unsavedBar}<div class="row mt12" style="justify-content:space-between;min-height:44px"><span class="sm" aria-live="polite"><b class="tab-num">${plural(r.total, "Episode")}</b>${isSearch ? ` <span class="muted">in your Library</span>` : ""}</span>${isSearch && q ? `<button class="btn btn-s" data-a="promoteB">${ic("filter", 16)}Save as View</button>` : ""}</div></div>
          <div style="padding:0 12px">${r.rows.map((e) => epRowPhone(e, q)).join("") || `<div class="dashed" style="margin:8px;padding:24px;text-align:center"><div class="m">No Episodes match</div><div class="sm muted mt4">Remove a condition to widen it.</div></div>`}</div>`);
        if (st.chip) {
          const k = st.chip;
          const ok = k === "add" || k === "sort" || valid(k, d.f);
          overlay = sheet(k === "add" ? `<div class="shd"><h2 class="h3 grow">Add a condition</h2><button class="btn btn-t" data-a="chipClose">Cancel</button></div><div class="sbody">${addList(d)}</div>`
            : `<div class="shd"><h2 class="h3 grow">${k === "sort" ? "Order" : condLabel(k)}</h2><button class="btn btn-t" data-a="chipClose" ${ok ? "" : "disabled"}>Done</button></div><div class="sbody">${k === "sort" ? condEditor("sort", d) + '<div class="gl label">Show at most</div>' + condEditor("limit", d) : condEditor(k, d)}<p class="help" aria-live="polite">The list behind updates as you change this: ${plural(r.total, "Episode")} now.</p></div>`, { h: k === "podcasts" || k === "sort" ? "72%" : "", label: condLabel(k) });
        }
        if (st.more) overlay += `<div class="scrim" style="background:transparent" data-a="moreB"></div><div class="menu" style="right:12px;top:64px"><button data-a="renameB">${ic("pencil", 18)}Rename</button><button data-a="noop">${ic("plus", 18)}Duplicate</button><button class="danger" data-a="noop">${ic("trash", 18)}Delete View</button></div>`;
        if (st.naming) overlay += nameDialog(st, false);
      }
      return phone({ tab: "views", content, overlay: overlay + (st.toast ? toast(st.toast) : "") });
    }
    // desktop
    let main;
    if (st.screen === "list") main = viewDesk(st, curView(st));
    else main = `<header class="hdr">${isSearch ? `<div class="row gap12"><div class="grow" style="position:relative;max-width:560px"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><label class="sr" for="q">Search the Library</label><input id="q" type="search" data-in="qB" value="${esc(d.f.text || "")}" style="padding-left:40px"></div></div>` : `<div class="row" style="justify-content:space-between"><h1 class="h1" tabindex="-1">${esc(d.name)}</h1><div class="row gap8"><button class="btn btn-o" data-a="renameB">Rename</button><button class="ib" aria-label="More" data-a="noop">${ic("more")}</button></div></div>`}</header>
      <div class="px20" style="position:relative;z-index:2">${chipsB(st, true)}${unsavedBar}</div>
      <div class="px20 row" style="justify-content:space-between;padding-top:12px;padding-bottom:8px"><span class="sm" aria-live="polite"><b class="tab-num">${plural(r.total, "Episode")}</b>${d.limit && r.total > d.limit ? ` <span class="muted">· showing the first ${d.limit}</span>` : ""}</span><div class="row gap8">${isSearch && q ? `<button class="btn btn-p" data-a="promoteB">${ic("filter", 16)}Save as View…</button>` : ""}<label class="row gap8 sm muted">Next / Last go to <select style="height:36px;width:auto;font-size:14px"><option>Default (active)</option><option>Commute</option></select></label></div></div>
      <div class="px20">${epTable(r.rows, q)}</div>`;
    let overlay = st.naming ? nameDialog(st, true) : "";
    if (st.chip) overlay = `<div class="scrim" style="background:transparent;z-index:1" data-a="chipClose"></div>` + overlay;
    return desk({ sel: isSearch ? null : st.cur, main, views: st.views, searchSel: isSearch, overlay: overlay + (st.toast ? toast(st.toast) : "") });
  }
  const nameDialog = (st, isDesk) => `<div class="scrim" style="z-index:26" data-a="nameCancel"></div><div class="alert" role="dialog" aria-modal="true" aria-labelledby="nmT" style="z-index:27"><h2 class="h3" id="nmT" style="font-size:17px">${st.naming === "rename" ? "Rename View" : "Save as a View"}</h2>${st.naming === "rename" ? "" : `<p class="sm muted" style="margin:6px 0 0">Keeps these conditions and shows the latest matches whenever you open it.</p>`}<label class="col gap4 mt12"><span class="sm m">Name</span><input id="nameIn" type="text" data-in="vname" value="${esc(st.draft.name)}"></label><div class="row mt16" style="justify-content:flex-end;gap:8px"><button class="btn btn-s" data-a="nameCancel">Cancel</button><button class="btn btn-p" data-a="nameSave">${st.naming === "rename" ? "Rename" : "Save View"}</button></div></div>`;

  // ================= Variant C: every condition is a fixed row (settings form) =================
  const C_ROWS = [["published", "Published"], ["podcasts", "Podcasts"], ["text", "Mentions"], ["played", "Played"], ["starred", "Starred"], ["notInAnyPlaylist", "In a Playlist"], ["duration", "Length"]];
  function cValue(k, d) {
    const f = d.f;
    switch (k) {
      case "published": return !f.published ? "Any time" : f.published.tag === "LastDays" ? "Last " + f.published.days + " days" : (f.published.from != null ? fmtPub(f.published.from) : "Any") + " – " + (f.published.to != null ? fmtPub(f.published.to) : "today");
      case "podcasts": return !f.podcasts || !f.podcasts.ids.length ? "All podcasts" : (f.podcasts.mode === "include" ? "Only " : "All except ") + plural(f.podcasts.ids.length, "podcast");
      case "text": return f.text || "";
      case "played": return f.played ? condSummary("played", f) : "Any";
      case "starred": return f.starred === undefined ? "Any" : f.starred ? "Starred" : "Not Starred";
      case "notInAnyPlaylist": return f.notInAnyPlaylist ? "Not in any Playlist" : "Any";
      case "duration": return f.minDuration || f.maxDuration ? condSummary("duration", f) : "Any length";
      case "sort": return SORTS[d.sort];
      case "limit": return d.limit ? "The first " + d.limit : "All";
    }
  }
  const isSet = (k, d) => (k === "duration" ? !!(d.f.minDuration || d.f.maxDuration) : k === "sort" ? d.sort !== "publishedDesc" : k === "limit" ? d.limit !== null : d.f[k] !== undefined && !(k === "podcasts" && !d.f.podcasts.ids.length) && !(k === "text" && !d.f.text));
  function pickerC(k, d) {
    const anyRow = (label) => `<div class="group" style="margin-bottom:12px"><button class="gr" data-a="cAny" data-v="${k}"><span class="grow m">${label}</span>${isSet(k, d) ? "" : `<span class="check">${ic("check")}</span>`}</button></div>`;
    const checks = (opts, cur, a) => `<div class="group">${opts.map(([v, l, dsc]) => `<button class="gr" data-a="${a}" data-v="${v}" aria-pressed="${String(v) === String(cur)}"><span class="grow"><span class="m" style="display:block">${l}</span>${dsc ? `<span class="xs muted">${dsc}</span>` : ""}</span>${String(v) === String(cur) ? `<span class="check">${ic("check")}</span>` : ""}</button>`).join("")}</div>`;
    const f = d.f;
    switch (k) {
      case "published": { const p = f.published; const cur = !p ? "" : p.tag === "LastDays" ? p.days : "between"; return anyRow("Any time") + checks([[7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"], ["between", "Between two dates"]], cur, "cPub") + (p && p.tag === "Between" ? `<div class="row gap12 mt12"><label class="grow"><span class="xs muted m">From</span><input id="pubFrom" type="date" data-in="pubFrom" value="${p.from != null ? isoOf(p.from) : ""}"></label><label class="grow"><span class="xs muted m">To</span><input id="pubTo" type="date" data-in="pubTo" value="${p.to != null ? isoOf(p.to) : ""}"></label></div>` : ""); }
      case "podcasts": { const p = f.podcasts; return `${seg([["all", "All"], ["include", "Only these"], ["exclude", "All except"]], p ? p.mode : "all", "cPodMode", "full")}${p ? `<div class="group mt12">${PODS.map((x) => `<label class="gr" style="cursor:pointer"><input type="checkbox" ${p.ids.includes(x.id) ? "checked" : ""} data-a="podTog" data-v="${x.id}">${art(x.id, 32)}<span class="grow trunc">${esc(x.t)}</span></label>`).join("")}</div>` : `<p class="help">Every Subscription, including ones you add later.</p>`}`; }
      case "played": return anyRow("Any") + checks([["unplayed", "Not started", "No Position in any Playlist"], ["inProgress", "In progress", "Started somewhere, not finished"], ["notPlayed", "Not Played", "Not started or in progress"], ["played", "Played"]], f.played, "played");
      case "starred": return anyRow("Any") + checks([["true", "Starred"], ["false", "Not Starred"]], f.starred === undefined ? "" : String(f.starred), "starred");
      case "notInAnyPlaylist": return anyRow("Any") + checks([["1", "Not in any Playlist", "Hides Episodes that are an Entry somewhere"]], f.notInAnyPlaylist ? "1" : "", "cNotIn");
      case "duration": return anyRow("Any length") + condEditor("duration", d);
      case "sort": return checks(Object.entries(SORTS), d.sort, "sortSet");
      case "limit": return checks(LSTEPS.map((n) => [n === null ? "all" : n, n === null ? "All" : "The first " + n]), d.limit === null ? "all" : d.limit, "limitSet") + `<p class="help">Counted after sorting.</p>`;
    }
    return "";
  }
  function formC(st, isDesk) {
    const d = st.draft;
    const row = (k, l) => {
      if (k === "text") return `<label class="gr"><span class="m" style="width:110px;flex:none">${l}</span><input id="cText" type="text" data-in="condText" value="${esc(d.f.text || "")}" placeholder="Any words" style="border:0;height:40px;padding:0;background:transparent"></label>`;
      if (isDesk) return `<div class="gr"><span class="m" style="width:110px;flex:none">${l}</span><span class="grow">${deskControlC(k, d)}</span></div>`;
      return `<button class="gr" data-a="cPick" data-v="${k}"><span class="m grow">${l}</span><span class="${isSet(k, d) ? "" : "muted"} trunc" style="max-width:180px;${isSet(k, d) ? "color:var(--primary);font-weight:500" : ""}">${esc(cValue(k, d))}</span><span class="muted">${ic("right", 16)}</span></button>`;
    };
    return `<div class="group"><label class="gr"><span class="m" style="width:110px;flex:none">Name</span><input id="vname" type="text" data-in="vname" value="${esc(d.name)}" placeholder="${st.screen === "search" ? "Name it to save" : "Untitled View"}" style="border:0;height:40px;padding:0;background:transparent"></label></div>
      <div class="gl label">Show Episodes where</div><div class="group">${C_ROWS.map(([k, l]) => row(k, l)).join("")}</div><p class="help">Every row must match. Rows left at “Any” don’t narrow anything.</p>
      <div class="gl label">Order</div><div class="group">${row("sort", "Sort")}${row("limit", "Show")}</div>
      ${d.id && st.screen !== "search" ? `<div class="mt16"><button class="btn btn-t danger" style="padding:0 4px" data-a="askDelete">${ic("trash", 18)}Delete View</button></div>` : ""}`;
  }
  function deskControlC(k, d) {
    const f = d.f;
    const sel = (id, a, opts, cur) => `<select id="${id}" data-in="${a}" style="height:36px;font-size:14px">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
    switch (k) {
      case "published": { const p = f.published; return sel("cPub", "cPubSel", [["any", "Any time"], [7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"], ["between", "Between two dates…"]], !p ? "any" : p.tag === "LastDays" ? p.days : "between") + (p && p.tag === "Between" ? `<div class="row gap8 mt8"><input id="pubFrom" aria-label="From" type="date" data-in="pubFrom" value="${p.from != null ? isoOf(p.from) : ""}" style="height:36px"><input id="pubTo" aria-label="To" type="date" data-in="pubTo" value="${p.to != null ? isoOf(p.to) : ""}" style="height:36px"></div>` : ""); }
      case "podcasts": { const p = f.podcasts; return sel("cPodSel", "cPodSel", [["all", "All podcasts"], ["include", "Only these…"], ["exclude", "All except…"]], p ? p.mode : "all") + (p ? `<div class="row mt8" style="flex-wrap:wrap;gap:4px">${PODS.map((x) => `<label class="chip" style="cursor:pointer;padding:0 10px;${p.ids.includes(x.id) ? "" : "background:var(--sec);color:var(--fg)"}"><input type="checkbox" class="sr" ${p.ids.includes(x.id) ? "checked" : ""} data-a="podTog" data-v="${x.id}">${p.ids.includes(x.id) ? ic("check", 14) : ""}${esc(x.t)}</label>`).join("")}</div>` : ""); }
      case "played": return sel("cPlayed", "cPlayedSel", [["any", "Any"], ["unplayed", "Not started"], ["inProgress", "In progress"], ["notPlayed", "Not Played (not started or in progress)"], ["played", "Played"]], f.played || "any");
      case "starred": return sel("cStar", "cStarSel", [["any", "Any"], ["true", "Starred"], ["false", "Not Starred"]], f.starred === undefined ? "any" : String(f.starred));
      case "notInAnyPlaylist": return sel("cNot", "cNotSel", [["any", "Any"], ["1", "Not in any Playlist"]], f.notInAnyPlaylist ? "1" : "any");
      case "duration": return `<div class="col gap4"><label class="row gap8"><span class="sm muted" style="width:64px">At least</span>${sel("cMin", "cMinSel", DSTEPS.map((n) => [n, n ? n + " min" : "Any"]), f.minDuration || 0)}</label><label class="row gap8"><span class="sm muted" style="width:64px">At most</span>${sel("cMax", "cMaxSel", DSTEPS.map((n) => [n, n ? n + " min" : "Any"]), f.maxDuration || 0)}</label></div>`;
      case "sort": return sel("cSort", "sortSet", Object.entries(SORTS), d.sort);
      case "limit": return sel("cLimit", "limitSet", LSTEPS.map((n) => [n === null ? "all" : n, n === null ? "All that match" : "The first " + n]), d.limit === null ? "all" : d.limit);
    }
  }
  function renderC(dev, st) {
    const d = st.draft;
    const r = viewFromDraft(d);
    const isSearch = st.screen === "search";
    if (dev === "phone") {
      let content;
      if (st.screen === "pick") {
        content = scroll(`<header class="hdr" style="padding-top:4px">${back(isSearch || st.fromSearch ? "Search" : "Edit View", "cBack")}<h1 class="h1" tabindex="-1">${condLabel(st.pick === "notInAnyPlaylist" ? "notInAnyPlaylist" : st.pick)}</h1></header><div class="px20">${pickerC(st.pick, d)}<p class="help mt12" aria-live="polite">${plural(r.total, "Episode")} match with this.</p></div>`);
      } else if (st.screen === "list") {
        content = viewsListPhone(st, searchButton);
      } else if (st.screen === "view") {
        content = viewPhone(st, curView(st));
      } else if (st.screen === "searchResults") {
        const q = (d.f.text || "").trim();
        content = scroll(`<header class="hdr" style="padding-top:4px">${back("Views", "toList")}<div style="position:relative"><span style="position:absolute;left:12px;top:12px;color:var(--muted)">${ic("search", 20)}</span><label class="sr" for="q">Search the Library</label><input id="q" type="search" data-in="condText" value="${esc(d.f.text || "")}" style="padding-left:40px"></div></header>
          <div class="px20"><div class="card row" style="padding:10px 10px 10px 14px"><span class="grow"><span class="xs muted m" style="display:block">${d.id ? "Preview, not saved yet" : "Unsaved View"}</span><span class="sm"><b>${plural(r.total, "Episode")}</b> ${esc(summaryLine(d.f))}</span></span><button class="btn btn-s" data-a="cRefine">Refine</button></div></div>
          <div style="padding:4px 12px">${r.rows.map((e) => epRowPhone(e, q)).join("")}</div>`);
      } else {
        content = scroll(`<header class="hdr row" style="padding-top:4px;justify-content:space-between"><button class="btn btn-t" style="padding:0 4px" data-a="cCancel">Cancel</button><button class="btn btn-t" style="padding:0 4px" data-a="cSave">${isSearch ? "Save as View" : "Save"}</button></header>
          <div class="px20"><h1 class="h1" tabindex="-1">${isSearch ? "Refine search" : d.id ? "Edit View" : "New View"}</h1>
          <div class="card row mt12" style="padding:10px 10px 10px 14px;background:var(--accent);border-color:#cdd7f5" aria-live="polite"><span class="grow sm">Matches <b class="tab-num">${plural(r.total, "Episode")}</b> now${d.limit && r.total > d.limit ? `, shows ${d.limit}` : ""}</span><button class="btn btn-t" data-a="cSee">See them</button></div>
          <div class="mt12">${formC(st, false)}</div><div style="height:16px"></div></div>`);
      }
      return phone({ tab: "views", content, overlay: (st.sub && st.sub.kind === "delete" ? deleteAlert(st, 0) : "") + (st.toast ? toast(st.toast) : "") });
    }
    const q = (d.f.text || "").trim();
    const main = `<div style="display:grid;grid-template-columns:420px minmax(0,1fr);height:100%">
      <div style="border-right:1px solid var(--line);overflow-y:auto;padding:24px 24px 32px;background:#fbfaf8"><div class="row" style="justify-content:space-between"><h1 class="h2" tabindex="-1">${isSearch ? "Search" : d.id ? "Edit View" : "New View"}</h1>${isSearch ? '<span class="badge">Unsaved View</span>' : ""}</div>
        <div class="mt12">${formC(st, true)}</div>
        <div class="row mt16" style="justify-content:flex-end;gap:8px">${isSearch ? `<button class="btn btn-p" data-a="cSave">Save as View</button>` : `<button class="btn btn-s" data-a="cCancel">Revert</button><button class="btn btn-p" data-a="cSave">Save</button>`}</div></div>
      <div style="overflow-y:auto;padding:24px 24px 32px"><div class="row" style="justify-content:space-between;margin-bottom:10px"><span aria-live="polite"><b class="tab-num" style="font-size:17px">${plural(r.total, "Episode")}</b> <span class="muted sm">match${d.limit && r.total > d.limit ? `, showing ${d.limit}` : ""} · ${SORTS[d.sort]}</span></span><label class="row gap8 sm muted">Next / Last go to <select style="height:36px;width:auto;font-size:14px"><option>Default (active)</option><option>Commute</option></select></label></div>${epTable(r.rows, q)}</div></div>`;
    const views = isSearch ? [{ id: "search", name: "Search: " + (q || "…"), unsaved: true }, ...st.views] : st.views;
    return desk({ sel: isSearch ? "search" : d.id, main, views, overlay: (st.sub && st.sub.kind === "delete" ? deleteAlert(st, 0) : "") + (st.toast ? toast(st.toast) : "") });
  }

  AREAS["view-editor"] = {
    title: "View editor & Search",
    variants: {
      A: { name: "Editor sheet", caption: "Editing opens a sheet (phone) or dialog (desktop) listing only the conditions in use, each a row with its own editor and an “Add a condition” list. Calm and familiar, with a live count and Preview, but you edit away from the results.", screens: [["list", "Views list"], ["edit", "Edit a View"], ["add", "Add a condition"], ["new", "New View (empty)"], ["search", "Search results"]] },
      B: { name: "Chips over results", caption: "A View is its own editor: conditions are chips above the live Episode list, each opening a small editor; changes show at once and a bar offers Save or Discard. Search is the same screen with a text chip and Save as View. Fastest to tune, but chips wrap and crowd on a phone.", screens: [["view", "A View"], ["chip", "Chip editor open"], ["add", "Adding a condition"], ["search", "Search results"], ["save", "Save search as View"]] },
      C: { name: "Settings form", caption: "Every condition is always present as a row set to “Any” until changed, so there is nothing to add or remove and the flat AND is obvious. Phone drills into pickers; desktop shows the form beside live results, and a Search is literally an unsaved View in the sidebar. Most explicit, but longest.", screens: [["edit", "Edit a View"], ["pick", "Picker (phone)"], ["search", "Search as unsaved View"], ["new", "New View"]] }
    },
    questions: [
      "Played state: the model has unplayed / inProgress / played. Does “unplayed” include In progress Episodes? These mocks add a fourth choice, “Not Played” (either), which most Views seem to want.",
      "Should the editor show a live count (A, C) or live results (B, C desktop)? A live count implies evaluating the View on every keystroke on the phone.",
      "Text condition and Search: do they match show notes as well as titles and podcast names? Mocks assume yes and say so in the help text.",
      "Is “Not Starred” a real need, or should Starred be a single on/off condition?",
      "B saves edits to an existing View only on Save. Should edits apply immediately instead (no Discard), as Views are cheap to rebuild?",
      "Saving a Search: is the name required, or does it default to the search text (mocks prefill it)? Can Views be reordered in the list?",
      "Do Orphaned Episodes appear in Views and Search? CONTEXT says “nothing else from that podcast remains in the Library”, which reads as no."
    ],
    init(variant, screen, dev) {
      const st = { screen0: screen, screen, views: clone(VIEWS0), cur: "v2", draft: null, sub: null, q: "", toast: null, open: null, addMenu: false, chip: null };
      if (variant === "A") {
        if (screen === "list") st.screen = dev === "desktop" ? "view" : "list";
        if (screen === "edit" || screen === "add") { st.screen = "view"; st.draft = newDraft(curView(st)); if (screen === "add") { if (dev === "phone") st.sub = { kind: "add" }; else st.addMenu = true; } }
        if (screen === "new") { st.screen = "view"; st.draft = newDraft(null); }
        if (screen === "search") st.q = "budget";
      }
      if (variant === "B") {
        st.cur = "v1";
        st.draft = newDraft(curView(st));
        if (screen === "chip") { st.screen = "view"; st.chip = "played"; st.draft.f.played = "unplayed"; }
        if (screen === "add") { st.screen = "view"; st.chip = "add"; }
        if (screen === "search" || screen === "save") { st.screen = "search"; st.draft = newDraft(null); st.draft.f.text = "budget"; if (screen === "save") { st.naming = "save"; st.draft.name = "budget"; } }
      }
      if (variant === "C") {
        st.draft = newDraft(curView(st));
        if (screen === "pick") { if (dev === "phone") { st.screen = "pick"; st.pick = "played"; } else st.screen = "edit"; }
        if (screen === "new") { st.draft = newDraft(null); st.screen = "edit"; }
        if (screen === "search") { st.draft = newDraft(null); st.draft.f.text = "budget"; st.screen = dev === "phone" ? "searchResults" : "search"; }
      }
      return st;
    },
    esc(st) {
      if (st.naming) { st.naming = null; return true; }
      if (st.more) { st.more = false; return true; }
      if (st.chip) { st.chip = null; return true; }
      if (st.addMenu) { st.addMenu = false; return true; }
      if (st.sub) { this.actions.subCancel(); return true; }
      if (st.draft && S.variant === "A") { st.draft = null; return true; }
      return false;
    },
    render(variant, dev, st) { return variant === "A" ? renderA(dev, st) : variant === "B" ? renderB(dev, st) : renderC(dev, st); },
    actions: Object.assign({}, edActions, {
      sheetScrim() { const st = S.st; if (st.sub) this.subCancel(); else if (S.variant === "A") st.draft = null; else st.chip = null; },
      toList() { const st = S.st; st.screen = "list"; st.chip = null; if (S.variant !== "A") st.draft = newDraft(curView(st)); },
      openView(v) {
        const st = S.st; st.cur = v; st.chip = null; st.toast = null;
        if (S.variant === "C") { st.draft = newDraft(curView(st)); st.screen = S.device === "phone" ? "view" : "edit"; return; }
        if (S.variant === "B") { st.draft = newDraft(curView(st)); }
        st.screen = "view";
      },
      newView() { const st = S.st; if (S.variant === "A") { st.draft = newDraft(null); st.focus = "vname"; } else if (S.variant === "B") { st.draft = newDraft(null); st.draft.name = "New View"; st.screen = "view"; st.views = [...st.views, { id: "tmp", name: "New View", f: {}, sort: "publishedDesc", limit: null }]; st.cur = "tmp"; st.draft.id = "tmp"; st.chip = "add"; } else { st.draft = newDraft(null); st.screen = "edit"; st.focus = "vname"; } },
      editView() { const st = S.st; st.draft = newDraft(curView(st)); st.open = null; if (S.variant === "C") st.screen = "edit"; },
      openSearch() { const st = S.st; if (S.variant === "C") { st.draft = newDraft(null); st.draft.f.text = ""; st.screen = "searchResults"; st.focus = "q"; return; } st.screen = "search"; st.focus = "q"; },
      deskSearch() { const st = S.st; st.chip = null; if (S.variant === "B") { st.draft = newDraft(null); st.draft.f.text = ""; st.screen = "search"; } else if (S.variant === "C") { st.draft = newDraft(null); st.draft.f.text = ""; st.screen = "search"; st.focus = "cText"; return; } else st.screen = "search"; st.focus = "q"; },
      edCancel() { S.st.draft = null; S.st.sub = null; S.st.addMenu = false; },
      edSave() { const st = S.st; const v = saveDraft(st); st.cur = v.id; st.screen = "view"; st.draft = null; st.sub = null; st.toast = `Saved “${esc(v.name)}”`; },
      openCond(k) { S.st.sub = { kind: "cond", k, before: clone(S.st.draft) }; },
      toggleOpen(k) { S.st.open = S.st.open === k ? null : k; S.st.addMenu = false; },
      toggleAddMenu() { S.st.addMenu = !S.st.addMenu; },
      openAdd() { S.st.sub = { kind: "add" }; },
      openPreview() { S.st.sub = { kind: "preview" }; },
      addCond(k) {
        const st = S.st; const before = clone(st.draft);
        Object.assign(st.draft.f, clone(defaultCond(k)));
        if (S.variant === "A") { if (S.device === "phone") st.sub = { kind: "cond", k, isNew: true, before }; else { st.open = k; st.addMenu = false; } }
        if (S.variant === "B") st.chip = k;
        if (k === "text") st.focus = S.variant === "A" && S.device === "phone" ? "condText" : "condText";
      },
      subCancel() { const st = S.st; if (st.sub && st.sub.before) st.draft = st.sub.before; st.sub = st.sub && st.sub.isNew ? { kind: "add" } : null; },
      subDone() { S.st.sub = null; },
      askDelete() { S.st.sub = { kind: "delete" }; S.st.focus = "dlCancel"; },
      doDelete() { const st = S.st; const name = st.draft.name; st.views = st.views.filter((v) => v.id !== st.draft.id); st.cur = st.views[0].id; st.draft = S.variant === "A" ? null : newDraft(st.views[0]); st.sub = null; st.screen = S.variant === "C" && S.device === "desktop" ? "edit" : "list"; st.toast = `Deleted “${esc(name)}”`; },
      promote() { const st = S.st; st.draft = newDraft(null); st.draft.name = st.q.trim(); st.draft.f.text = st.q.trim(); st.focus = "vname"; },
      // B
      chipOpen(k) { const st = S.st; st.chip = st.chip === k ? null : k; if (k === "text") st.focus = "condText"; },
      chipClose() { const st = S.st; const k = st.chip; if (k && k !== "add" && k !== "sort" && !valid(k, st.draft.f)) st.draft.f = dropCond(st.draft.f, k); st.chip = null; },
      revertB() { S.st.draft = newDraft(curView(S.st)); },
      saveB() { const st = S.st; saveDraft(st); st.toast = `Saved “${esc(st.draft.name)}”`; },
      qB(v) { const st = S.st; if (st.screen !== "search") { st.draft = newDraft(null); st.screen = "search"; } st.draft.f.text = v; st.focus = "q"; },
      promoteB() { const st = S.st; st.naming = "save"; st.draft.name = (st.draft.f.text || "").trim(); st.focus = "nameIn"; },
      renameB() { S.st.naming = "rename"; S.st.more = false; S.st.focus = "nameIn"; },
      moreB() { S.st.more = !S.st.more; },
      nameCancel() { const st = S.st; if (st.naming === "rename") st.draft.name = curView(st).name; st.naming = null; },
      nameSave() { const st = S.st; const wasSearch = st.screen === "search"; const v = saveDraft(st); st.cur = v.id; st.naming = null; st.screen = "view"; st.draft = newDraft(v); st.toast = wasSearch ? `Saved “${esc(v.name)}” to Views` : `Renamed to “${esc(v.name)}”`; },
      // C
      cPick(k) { S.st.fromSearch = S.st.screen === "search"; S.st.prev = S.st.screen; S.st.screen = "pick"; S.st.pick = k; },
      cBack() { S.st.screen = S.st.prev || "edit"; },
      cAny(k) { const st = S.st; if (k === "limit") st.draft.limit = null; else if (k === "sort") st.draft.sort = "publishedDesc"; else st.draft.f = dropCond(st.draft.f, k); },
      cPub(v) { this.pubDays(v); },
      cPodMode(v) { const f = S.st.draft.f; if (v === "all") delete f.podcasts; else f.podcasts = { mode: v, ids: f.podcasts ? f.podcasts.ids : [] }; },
      cNotIn(v) { const f = S.st.draft.f; if (f.notInAnyPlaylist) delete f.notInAnyPlaylist; else f.notInAnyPlaylist = true; },
      cPubSel(v) { if (v === "any") delete S.st.draft.f.published; else this.pubDays(v); },
      cPodSel(v) { this.cPodMode(v); },
      cPlayedSel(v) { if (v === "any") delete S.st.draft.f.played; else S.st.draft.f.played = v; },
      cStarSel(v) { if (v === "any") delete S.st.draft.f.starred; else S.st.draft.f.starred = v === "true"; },
      cNotSel(v) { if (v === "any") delete S.st.draft.f.notInAnyPlaylist; else S.st.draft.f.notInAnyPlaylist = true; },
      cMinSel(v) { S.st.draft.f.minDuration = +v || undefined; },
      cMaxSel(v) { S.st.draft.f.maxDuration = +v || undefined; },
      cCancel() { const st = S.st; if (st.screen === "search") { st.screen = "searchResults"; return; } st.draft = newDraft(curView(st)); if (S.device === "phone") st.screen = "list"; },
      cSee() { const st = S.st; st.screen = "searchResults"; },
      cRefine() { S.st.screen = S.st.draft.id ? "edit" : "search"; },
      cSave() {
        const st = S.st;
        if ((st.screen === "search" || st.screen === "searchResults") && !st.draft.name.trim()) { st.draft.name = (st.draft.f.text || "Search").trim(); }
        const v = saveDraft(st); st.cur = v.id; st.draft = newDraft(v); st.toast = `Saved “${esc(v.name)}”`; st.screen = S.device === "phone" ? "view" : "edit";
      }
    })
  };
})();
