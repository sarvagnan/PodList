
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (this._render) this._render();
  }
  forceUpdate() { if (this._render) this._render(); }
}
const SCREENS = {};
SCREENS["A-phone"] = (() => {

class Component extends DCLogic {
  state = { tab: 'views', view: null, pl: null, ep: null, active: 0, sheet: null, into: 0, toast: '', playing: true, nowId: 'e4', posSec: 1330, nowOpen: false, stars: { e7: true, e12: true, e13: true }, dls: { e4: true }, played: { e12: true } };
  data() {
    const POD = { sn: ['Signal & Noise', '#2F6F6A', 'SN'], lc: ['The Long Commute', '#A64B22', 'LC'], ns: ['Night Shift Histories', '#4B3F8F', 'NS'], ke: ['Kitchen Table Economics', '#76600F', 'KE'], df: ['Deep Field', '#1F5E8A', 'DF'], sh: ['Small Hours', '#7A2E4F', 'SH'] };
    const EP = {
      e1: ['sn', 'Who owns the model weights?', 'Nov 6', 3480, ''],
      e2: ['df', 'The quiet sun problem', 'Nov 5', 2460, ''],
      e3: ['ke', 'Rent, explained with three bowls of rice', 'Nov 5', 1980, ''],
      e4: ['ns', 'The night the bridge lights went out', 'Nov 4', 4324, '50m left'],
      e5: ['sh', 'A lighthouse keeper on twenty years alone', 'Nov 3', 2940, ''],
      e6: ['lc', 'Commuting as a love language', 'Nov 2', 1620, ''],
      e7: ['sn', 'Small models, big phones', 'Nov 1', 2760, ''],
      e8: ['df', 'Counting worms from orbit', 'Oct 28', 2220, ''],
      e9: ['df', 'What the tide gauges missed', 'Oct 21', 3120, ''],
      e10: ['df', 'A brief history of the kilogram', 'Oct 14', 2640, '12m left'],
      e11: ['sh', 'A machine-learning researcher on doubt', 'Oct 30', 3780, ''],
      e12: ['lc', 'Leaving at 5:40', 'Sep 12', 1440, 'Played'],
      e13: ['ns', 'The lamplighters’ strike', 'Aug 3', 3900, ''],
      e14: ['ke', 'Why coins cost more than they’re worth', 'Oct 31', 1142, ''],
      e15: ['lc', 'The bus driver’s map', 'Oct 27', 1320, '']
    };
    const EPART = { e1: '#14524C', e7: '#0E3F3A', e4: '#2A2357', e13: '#3A2C6E' };
    const NOTES = {
      e4: 'In the summer of 1977 a single breaker at a riverside switch house took out the lights on four bridges at once. We follow the night shift crew who were on duty, the reporter who got there first, and the question nobody answered for thirty years: who flipped it?',
      e1: 'When a model is trained on everyone’s writing, who owns the result? A lawyer, an engineer and a novelist argue it out, and mostly disagree about what “owning” even means.',
      e2: 'The sun has been unusually quiet this cycle. What that does to satellites, radio and the auroras, and why forecasters still can’t say when it will wake up.',
      e13: 'In 1907 the city’s lamplighters walked off the job and the streets went dark for nine nights. A history of the strike, the guild that ran it, and the electric lights that ended it anyway.',
      e14: 'Minting a penny costs more than a penny. We follow the metal, the machines and the politics that keep small coins in production.'
    };
    const CHAPTERS = {
      e4: [[0, 'Cold open', '#5B3E8C'], [400, 'The city in 1977', '#8C5B2E'], [1085, 'Blackout at the switch house', '#1E3F66'], [2090, 'Who flipped the breaker', '#7A2440'], [3312, 'Aftermath', '#2E6650']],
      e13: [[0, 'Gaslight', null], [555, 'The guild votes', null], [1720, 'Dark streets', null], [3090, 'Settlement', null]],
      e14: [[0, 'Intro', null], [130, 'The mint', null], [405, 'Melt value', null], [690, 'Pennies and nickels', null]]
    };
    const VIEWS = [
      { n: 'New this week', rule: 'Published in the last 7 days · all podcasts · newest first', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] },
      { n: 'Unplayed science', rule: 'Deep Field · unplayed · newest first', ids: ['e2', 'e8', 'e9', 'e10'] },
      { n: 'Mentions “AI”', rule: 'Title or notes contain “AI” · Signal & Noise, Small Hours', ids: ['e1', 'e7', 'e11'] },
      { n: 'Starred', rule: 'Starred · any podcast · newest first', ids: ['e7', 'e12', 'e13'] },
      { n: 'Under 30 min', rule: 'Shorter than 30m · unplayed · not in any Playlist', ids: ['e6', 'e14', 'e15'] }
    ];
    const PLS = [
      { n: 'Default', rule: 'Clear on Played', cursor: 0, entries: [['e4', 31, '22:10 / 1:12:04'], ['e1', 0, '58:00'], ['e3', 0, '33:00'], ['e2', 0, '41:00'], ['e5', 0, '49:00']] },
      { n: 'Replay', rule: 'Keeps Entries', cursor: 1, entries: [['e12', 100, 'Finished'], ['e13', 19, '12:30 / 1:05:00'], ['e9', 0, '52:00']] },
      { n: 'Morning', rule: 'Clear on Played', cursor: 0, entries: [['e14', 64, '12:10 / 19:02'], ['e6', 0, '27:00'], ['e2', 0, '41:00']] }
    ];
    return { POD, EP, EPART, NOTES, CHAPTERS, VIEWS, PLS };
  }
  flash(msg) {
    this.setState({ toast: msg });
    clearTimeout(this._t);
    this._t = setTimeout(() => this.setState({ toast: '' }), 2600);
  }
  renderVals() {
    const s = this.state;
    const { POD, EP, EPART, NOTES, CHAPTERS, VIEWS, PLS } = this.data();
    const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0'); };
    const short = (sec) => { const m = Math.round(sec / 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm'; };
    const ep = (id) => { const e = EP[id]; const p = POD[e[0]]; return { id, pod: p[0], color: p[1], ini: p[2], t: e[1], date: e[2], dur: e[3], len: short(e[3]), note: e[4], star: !!s.stars[id] }; };
    const art = (id, chIdx) => {
      const ch = CHAPTERS[id];
      if (ch && chIdx !== undefined && chIdx >= 0 && ch[chIdx][2]) return { bg: ch[chIdx][2], kind: 'Chapter art' };
      if (EPART[id]) return { bg: EPART[id], kind: 'Episode art' };
      return { bg: ep(id).color, kind: 'Podcast art' };
    };
    const tab = (on) => 'flex: 1; height: 56px; border: none; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 12px; font-weight: 600; color: ' + (on ? '#2B50C8' : '#5C6070');
    const view = s.view === null ? VIEWS[0] : VIEWS[s.view];
    const pl = s.pl === null ? PLS[0] : PLS[s.pl];
    const act = PLS[s.active];
    const n = ep(s.nowId);
    const chs = CHAPTERS[s.nowId] || [];
    let chIdx = -1;
    chs.forEach((c, i) => { if (s.posSec >= c[0]) chIdx = i; });
    const nArt = art(s.nowId, chIdx);
    const sheetEp = s.sheet ? ep(s.sheet) : { t: '' };
    const playNow = (id) => () => { this.setState({ nowId: id, posSec: 0, playing: true }); this.flash('Playing now in ' + act.n); };
    const openAdd = (id) => () => this.setState({ sheet: id, into: s.active });
    const add = (how) => () => { const e = ep(s.sheet); this.setState({ sheet: null }); this.flash(e.t + ' → ' + PLS[s.into].n + ', ' + how); };
    const seekTo = (sec) => this.setState({ posSec: Math.min(n.dur, Math.max(0, sec)) });
    const blank = { pod: '', t: '', artBg: '#ccc', artKind: '', ini: '', facts: '', inPlaylists: [], notInAny: true, chapters: [], hasChapters: false, notes: '' };
    const detail = (id) => {
      const e = ep(id);
      const a = art(id);
      const inPl = [];
      PLS.forEach((p, pi) => p.entries.forEach((en, i) => { if (en[0] === id) inPl.push({ name: p.n, where: i === p.cursor ? (pi === s.active ? 'Playing now' : 'Cursor here') : 'Entry ' + (i + 1), pct: en[1] + '%', pos: en[2] }); }));
      const starred = !!s.stars[id], dl = !!s.dls[id], played = !!s.played[id];
      return {
        pod: e.pod, t: e.t, artBg: a.bg, artKind: a.kind, ini: e.ini,
        facts: ['Published ' + e.date, e.len, played ? 'Played' : 'Unplayed', dl ? 'Downloaded on this phone' : 'Streams'].join(' · '),
        play: playNow(id), add: openAdd(id),
        starLabel: starred ? 'Starred' : 'Star', starPressed: String(starred), starColor: starred ? '#B5791A' : '#17181C', starFill: starred ? '#B5791A' : 'none', toggleStar: () => this.setState({ stars: { ...s.stars, [id]: !starred } }),
        dlLabel: dl ? 'Saved' : 'Download', dlPressed: String(dl), dlColor: dl ? '#2B50C8' : '#17181C', toggleDl: () => this.setState({ dls: { ...s.dls, [id]: !dl } }),
        playedLabel: played ? 'Played' : 'Unplayed', playedPressed: String(played), playedColor: played ? '#1D6B45' : '#17181C', togglePlayed: () => this.setState({ played: { ...s.played, [id]: !played } }),
        playedColorDark: played ? '#5BD69A' : '#FFFFFF', dlColorDark: dl ? '#7FC4F5' : '#FFFFFF', starColorDark: starred ? '#F2C14E' : '#FFFFFF', starFillDark: starred ? '#F2C14E' : 'none',
        inPlaylists: inPl, notInAny: inPl.length === 0,
        chapters: (CHAPTERS[id] || []).map((c, ci) => ({ at: fmt(c[0]), title: c[1], art: art(id, ci).bg })), hasChapters: !!CHAPTERS[id],
        notes: NOTES[id] || '[Show notes from the feed]'
      };
    };
    const epVals = s.ep ? detail(s.ep) : blank;
    const stack = s.npStack || [];
    const top = stack.length ? stack[stack.length - 1] : { page: 'main' };
    const push = (frame) => this.setState({ npStack: stack.concat([frame]) });
    const openDrawer = (frames) => { this.setState({ nowOpen: true, npEnter: true, npStack: frames }); clearTimeout(this._np); this._np = setTimeout(() => this.setState({ npEnter: false }), 350); };
    const npE = top.page === 'episode' ? detail(top.ep) : blank;
    const pageLabel = (f) => f.page === 'queue' ? act.n : f.page === 'chapters' ? 'Chapters' : f.page === 'episode' ? 'Episode' : 'Now Playing';
    const remaining = act.entries.length - act.cursor - 1;
    return {
      showEpisode: !!s.ep && s.tab !== 'library',
      showViewList: !s.ep && s.tab === 'views' && s.view === null,
      showViewDetail: !s.ep && s.tab === 'views' && s.view !== null,
      showPlList: !s.ep && s.tab === 'playlists' && s.pl === null,
      showPlDetail: !s.ep && s.tab === 'playlists' && s.pl !== null,
      showLibrary: s.tab === 'library',
      views: VIEWS.map((v, i) => ({ name: v.n, rule: v.rule, count: String(v.ids.length), open: () => this.setState({ view: i }) })),
      backToViews: () => this.setState({ view: null }),
      viewName: view.n,
      viewRule: view.rule,
      viewEps: view.ids.map((id) => { const e = ep(id); return { ...e, meta: [e.pod, e.date, e.note || e.len].join(' · '), open: () => this.setState({ ep: id }), play: playNow(id), add: openAdd(id) }; }),
      ep: epVals,
      epBack: s.tab === 'views' ? view.n : pl.n,
      closeEpisode: () => this.setState({ ep: null }),
      playlists: PLS.map((p, i) => ({ name: p.n, isActive: i === s.active, cur: (i === s.active ? 'Now: ' : 'Paused on: ') + ep(p.entries[p.cursor][0]).t, meta: p.entries.length + ' Entries · ' + p.rule, iconBg: i === s.active ? '#DDF2E7' : '#ECEAE5', iconFg: i === s.active ? '#1D6B45' : '#5C6070', open: () => this.setState({ pl: i }) })),
      backToPlaylists: () => this.setState({ pl: null }),
      plName: pl.n,
      plMeta: pl.entries.length + ' Entries · ' + pl.rule,
      plStatus: s.pl === s.active ? 'Playing · Active Playlist' : 'Paused at Entry ' + (pl.cursor + 1),
      plCanActivate: s.pl !== null && s.pl !== s.active,
      activate: () => this.setState({ active: s.pl, nowId: PLS[s.pl].entries[PLS[s.pl].cursor][0], posSec: 0 }),
      entries: pl.entries.map((en, i) => {
        const e = ep(en[0]);
        const isCur = i === pl.cursor;
        const done = en[1] === 100;
        return { ...e, open: () => this.setState({ ep: en[0] }), pct: en[1] + '%', posText: en[2], mark: isCur ? (s.pl === s.active ? 'NOW' : 'HERE') : (done ? '✓' : String(i + 1)), markColor: isCur ? '#2B50C8' : '#5C6070', opacity: done ? '0.55' : '1', rowStyle: 'display: flex; gap: 4px; align-items: center; padding: 8px 4px 8px 0; border-radius: 12px; margin-bottom: 2px; ' + (isCur ? 'background: #E8EDFB' : 'background: transparent') };
      }),
      subs: Object.keys(POD).map((k, i) => ({ name: POD[k][0], color: POD[k][1], ini: POD[k][2], rule: ['Download when added to a Playlist', 'Never download', 'Download all new · keep 5', 'Never download', 'Download when added to a Playlist', 'Never download'][i], unplayed: ['42', '118', '9', '31', '64', '27'][i] + ' unplayed' })),
      np: {
        artBg: nArt.bg, artKind: nArt.kind, ini: n.ini, t: n.t, pod: n.pod, from: act.n,
        chapter: chIdx >= 0 ? 'Ch ' + (chIdx + 1) + ' · ' + chs[chIdx][1] : 'No chapters',
        pct: (100 * s.posSec / n.dur).toFixed(1) + '%', pos: fmt(s.posSec), remaining: '−' + fmt(n.dur - s.posSec),
        ticks: chs.slice(1).map((c) => (100 * c[0] / n.dur).toFixed(1) + '%'),
        noChapters: chs.length === 0
      },
      queueCount: String(remaining),
      queueLabel: remaining + ' up next in ' + act.n,
      openQueue: () => s.nowOpen ? push({ page: 'queue' }) : openDrawer([{ page: 'queue' }]),
      openNow: () => openDrawer([]),
      drawerClass: s.npEnter ? 'np-drawer' : '',
      fadeClass: s.npEnter ? 'np-fade' : '',
      closeNow: () => this.setState({ nowOpen: false, npStack: [] }),
      nowOpen: s.nowOpen,
      openEpisodeFromNow: () => push({ page: 'episode', ep: s.nowId }),
      npGoChapters: () => push({ page: 'chapters' }),
      npMain: top.page === 'main',
      npSub: top.page !== 'main',
      npQueue: top.page === 'queue',
      npChapters: top.page === 'chapters',
      npEpisode: top.page === 'episode',
      npBack: () => this.setState({ npStack: stack.slice(0, -1) }),
      npBackLabel: stack.length > 1 ? pageLabel(stack[stack.length - 2]) : 'Now Playing',
      npHasTitle: top.page === 'queue' || top.page === 'chapters',
      npTitle: top.page === 'queue' ? act.n : 'Chapters',
      npSubtitle: top.page === 'queue' ? remaining + ' up next · ' + act.rule : n.t,
      npEntries: act.entries.map((en, i) => { const e = ep(en[0]); const isCur = i === act.cursor; const done = en[1] === 100; return { t: e.t, color: e.color, ini: e.ini, posText: isCur ? 'Now playing' : en[2], mark: isCur ? 'NOW' : (done ? '✓' : String(i + 1)), markColor: isCur ? '#9FD3F7' : '#A9B6BE', opacity: done ? '0.55' : '1', open: () => push({ page: 'episode', ep: en[0] }), play: () => this.setState({ nowId: en[0], posSec: 0, playing: true, npStack: [] }), rowStyle: 'display: flex; gap: 6px; align-items: center; padding: 6px 4px 6px 0; border-radius: 12px; ' + (isCur ? 'background: #26404E' : 'background: transparent') }; }),
      npOtherPls: PLS.map((p, i) => ({ p, i })).filter((x) => x.i !== s.active).map(({ p, i }) => ({ name: p.n, cur: 'Paused on: ' + ep(p.entries[p.cursor][0]).t, play: () => this.setState({ active: i, nowId: p.entries[p.cursor][0], posSec: 0, npStack: [] }) })),
      npChapterRows: chs.map((c, i) => { const end = i + 1 < chs.length ? chs[i + 1][0] : n.dur; return { title: c[1], at: fmt(c[0]), len: short(end - c[0]), art: art(s.nowId, i).bg, now: i === chIdx ? 'NOW' : '', jump: () => { seekTo(c[0]); this.setState({ npStack: [] }); }, style: 'width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 10px; border: none; border-bottom: 1px solid #2C3D47; border-radius: 10px; color: #FFFFFF; text-align: left; ' + (i === chIdx ? 'background: #26404E' : 'background: transparent') }; }),
      npE,
      npPlayEp: () => this.setState({ nowId: top.ep, posSec: 0, playing: true, npStack: [] }),
      seek: (ev) => { const r = ev.currentTarget.getBoundingClientRect(); seekTo(n.dur * (ev.clientX - r.left) / r.width); },
      back15: () => seekTo(s.posSec - 15),
      fwd30: () => seekTo(s.posSec + 30),
      prevCh: () => { if (chs.length) { const i = s.posSec - chs[Math.max(chIdx, 0)][0] > 3 ? chIdx : chIdx - 1; seekTo(chs[Math.max(i, 0)][0]); } },
      nextCh: () => { if (chs.length && chIdx + 1 < chs.length) seekTo(chs[chIdx + 1][0]); },
      playing: s.playing,
      paused: !s.playing,
      playLabel: s.playing ? 'Pause' : 'Play',
      togglePlay: () => this.setState({ playing: !s.playing }),
      tabViews: tab(s.tab === 'views'),
      tabPlaylists: tab(s.tab === 'playlists'),
      tabLibrary: tab(s.tab === 'library'),
      goViews: () => this.setState(s.tab === 'views' ? { view: null, ep: null } : { tab: 'views', ep: null }),
      goPlaylists: () => this.setState(s.tab === 'playlists' ? { pl: null, ep: null } : { tab: 'playlists', ep: null }),
      goLibrary: () => this.setState({ tab: 'library', ep: null }),
      sheetOpen: !!s.sheet,
      sheetEp,
      intoList: PLS.map((p, i) => ({ name: p.n, note: i === s.active ? 'Playing' : '', selected: i === s.into, checked: String(i === s.into), pick: () => this.setState({ into: i }) })),
      addNext: add('Play Next'),
      addLast: add('Play Last'),
      closeSheet: () => this.setState({ sheet: null }),
      hasToast: !!s.toast,
      toast: s.toast
    };
  }
}

return Component;
})();
SCREENS["A-desktop"] = (() => {

class Component extends DCLogic {
  state = {
    sel: 'view', view: 0, pl: 0, active: 0, target: 0, tab: 0, playing: true, detail: null, menu: null, checked: {}, toast: '', nowId: 'e4', posSec: 1330,
    stars: { e7: true, e12: true, e13: true }, dls: { e4: true }, played: { e12: true },
    pls: [
      { n: 'Default', rule: 'Clear on Played', cursor: 0, entries: [['e4', 31, '22:10 / 1:12:04'], ['e1', 0, ''], ['e3', 0, ''], ['e2', 0, ''], ['e5', 0, '']], hist: [['Yesterday 1:15 am', 'e3x'], ['Yesterday 12:31 am', 'e2x']], tl: [['Tonight 11:42 pm', 'The night the bridge lights went out · Ch 3 · 22:10'], ['Tonight 11:20 pm', 'The night the bridge lights went out · Ch 2 · 6:40'], ['Last night 1:15 am', 'The price of a cup of coffee · Played by playback'], ['Last night 12:31 am', 'Solar wind, explained slowly · Played by playback']] },
      { n: 'Replay', rule: 'Keeps Entries', cursor: 1, entries: [['e12', 100, 'Finished'], ['e13', 19, '12:30 / 1:05:00'], ['e9', 0, '']], hist: [['Sun 8:40 pm', 'e12']], tl: [['Sun 9:02 pm', 'The lamplighters’ strike · Ch 2 · 12:30'], ['Sun 8:40 pm', 'Leaving at 5:40 · Finished']] },
      { n: 'Morning', rule: 'Clear on Played', cursor: 0, entries: [['e14', 64, '12:10 / 19:02'], ['e6', 0, ''], ['e2', 0, '']], hist: [['Today 7:31 am', 'e8']], tl: [['Today 7:48 am', 'Why coins cost more than they’re worth · Ch 4 · 12:10']] }
    ]
  };
  data() {
    const POD = { sn: ['Signal & Noise', '#2F6F6A', 'SN'], lc: ['The Long Commute', '#A64B22', 'LC'], ns: ['Night Shift Histories', '#4B3F8F', 'NS'], ke: ['Kitchen Table Economics', '#76600F', 'KE'], df: ['Deep Field', '#1F5E8A', 'DF'], sh: ['Small Hours', '#7A2E4F', 'SH'] };
    const EP = {
      e1: ['sn', 'Who owns the model weights?', 'Nov 6', 3480, ''],
      e2: ['df', 'The quiet sun problem', 'Nov 5', 2460, ''],
      e2x: ['df', 'Solar wind, explained slowly', 'Oct 29', 2280, ''],
      e3: ['ke', 'Rent, explained with three bowls of rice', 'Nov 5', 1980, ''],
      e3x: ['ke', 'The price of a cup of coffee', 'Oct 29', 1860, ''],
      e4: ['ns', 'The night the bridge lights went out', 'Nov 4', 4324, '50m left'],
      e5: ['sh', 'A lighthouse keeper on twenty years alone', 'Nov 3', 2940, ''],
      e6: ['lc', 'Commuting as a love language', 'Nov 2', 1620, ''],
      e7: ['sn', 'Small models, big phones', 'Nov 1', 2760, ''],
      e8: ['df', 'Counting worms from orbit', 'Oct 28', 2220, ''],
      e9: ['df', 'What the tide gauges missed', 'Oct 21', 3120, ''],
      e10: ['df', 'A brief history of the kilogram', 'Oct 14', 2640, '12m left'],
      e11: ['sh', 'A machine-learning researcher on doubt', 'Oct 30', 3780, ''],
      e12: ['lc', 'Leaving at 5:40', 'Sep 12', 1440, 'Played'],
      e13: ['ns', 'The lamplighters’ strike', 'Aug 3', 3900, ''],
      e14: ['ke', 'Why coins cost more than they’re worth', 'Oct 31', 1142, ''],
      e15: ['lc', 'The bus driver’s map', 'Oct 27', 1320, '']
    };
    const EPART = { e1: '#14524C', e7: '#0E3F3A', e4: '#2A2357', e13: '#3A2C6E' };
    const NOTES = {
      e4: 'In the summer of 1977 a single breaker at a riverside switch house took out the lights on four bridges at once. We follow the night shift crew who were on duty, the reporter who got there first, and the question nobody answered for thirty years: who flipped it?',
      e1: 'When a model is trained on everyone’s writing, who owns the result? A lawyer, an engineer and a novelist argue it out, and mostly disagree about what “owning” even means.',
      e2: 'The sun has been unusually quiet this cycle. What that does to satellites, radio and the auroras, and why forecasters still can’t say when it will wake up.',
      e13: 'In 1907 the city’s lamplighters walked off the job and the streets went dark for nine nights. A history of the strike, the guild that ran it, and the electric lights that ended it anyway.',
      e14: 'Minting a penny costs more than a penny. We follow the metal, the machines and the politics that keep small coins in production.'
    };
    const CHAPTERS = {
      e4: [[0, 'Cold open', '#5B3E8C'], [400, 'The city in 1977', '#8C5B2E'], [1085, 'Blackout at the switch house', '#1E3F66'], [2090, 'Who flipped the breaker', '#7A2440'], [3312, 'Aftermath', '#2E6650']],
      e13: [[0, 'Gaslight', null], [555, 'The guild votes', null], [1720, 'Dark streets', null], [3090, 'Settlement', null]],
      e14: [[0, 'Intro', null], [130, 'The mint', null], [405, 'Melt value', null], [690, 'Pennies and nickels', null]]
    };
    const VIEWS = [
      { n: 'New this week', rules: ['Published · last 7 days', 'All podcasts', 'Newest first'], ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] },
      { n: 'Unplayed science', rules: ['Podcast · Deep Field', 'Unplayed', 'Newest first'], ids: ['e2', 'e8', 'e9', 'e10'] },
      { n: 'Mentions “AI”', rules: ['Text contains “AI”', 'Podcasts · Signal & Noise, Small Hours'], ids: ['e1', 'e7', 'e11'] },
      { n: 'Starred', rules: ['Starred', 'Newest first'], ids: ['e7', 'e12', 'e13'] },
      { n: 'Under 30 min', rules: ['Duration < 30m', 'Unplayed', 'Not in any Playlist'], ids: ['e6', 'e14', 'e15'] }
    ];
    return { POD, EP, EPART, NOTES, CHAPTERS, VIEWS };
  }
  place(epIds, how, plIndex) {
    const pi = plIndex === undefined ? this.state.target : plIndex;
    const pls = this.state.pls.map((p) => ({ ...p, entries: p.entries.slice() }));
    const p = pls[pi];
    const curId = p.entries[p.cursor] ? p.entries[p.cursor][0] : null;
    let offset = 0;
    epIds.forEach((epId) => {
      const existing = p.entries.findIndex((x) => x[0] === epId);
      let item = [epId, 0, ''];
      if (existing >= 0) { item = p.entries[existing]; p.entries.splice(existing, 1); }
      let c = curId ? p.entries.findIndex((x) => x[0] === curId) : 0;
      if (c < 0) c = 0;
      if (how === 'next') { p.entries.splice(c + 1 + offset, 0, item); offset++; p.cursor = c; }
      else { p.entries.push(item); p.cursor = c; }
    });
    this.setState({ pls, menu: null });
    this.flash((epIds.length > 1 ? epIds.length + ' episodes' : 'Added') + ' → ' + p.n + ' · ' + (how === 'next' ? 'Play Next' : 'Play Last'));
  }
  flash(msg) {
    this.setState({ toast: msg });
    clearTimeout(this._t);
    this._t = setTimeout(() => this.setState({ toast: '' }), 2400);
  }
  renderVals() {
    const s = this.state;
    const { POD, EP, EPART, NOTES, CHAPTERS, VIEWS } = this.data();
    const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0'); };
    const short = (sec) => { const m = Math.round(sec / 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm'; };
    const ep = (id) => { const e = EP[id]; const p = POD[e[0]]; return { id, pod: p[0], color: p[1], ini: p[2], t: e[1], date: e[2], dur: e[3], len: short(e[3]), note: e[4] }; };
    const art = (id, chIdx) => {
      const ch = CHAPTERS[id];
      if (ch && chIdx !== undefined && chIdx >= 0 && ch[chIdx][2]) return { bg: ch[chIdx][2], kind: 'Chapter art' };
      if (EPART[id]) return { bg: EPART[id], kind: 'Episode art' };
      return { bg: ep(id).color, kind: 'Podcast art' };
    };
    const navStyle = (on) => 'height: 36px; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; border: none; border-radius: 8px; font-size: 14px; text-align: left; color: #17181C; ' + (on ? 'background: #E8EDFB; font-weight: 600' : 'background: transparent');
    const view = VIEWS[s.view];
    const pl = s.pls[s.pl];
    const target = s.pls[s.target];
    const act = s.pls[s.active];
    const n = ep(s.nowId);
    const chs = CHAPTERS[s.nowId] || [];
    let chIdx = -1;
    chs.forEach((c, i) => { if (s.posSec >= c[0]) chIdx = i; });
    const nArt = art(s.nowId, chIdx);
    const seekTo = (sec) => this.setState({ posSec: Math.min(n.dur, Math.max(0, sec)) });
    const playNow = (id) => () => { this.setState({ nowId: id, posSec: 0, playing: true }); this.flash('Playing now in ' + act.n); };
    const set = (key, id, val) => () => this.setState({ [key]: { ...s[key], [id]: val } });
    const entryRows = (p, isActive, compact) => p.entries.map((en, i) => {
      const e = ep(en[0]);
      const isCur = i === p.cursor;
      const done = en[1] === 100;
      return { ...e, open: () => this.setState({ detail: en[0] }), play: playNow(en[0]), pct: en[1] + '%', posText: en[2] || e.len, mark: isCur ? (isActive ? 'NOW' : 'HERE') : (done ? '✓' : String(i + 1)), markColor: isCur ? '#2B50C8' : '#5C6070', opacity: done ? '0.55' : '1',
        rowStyle: compact ? 'display: flex; gap: 8px; align-items: center; padding: 8px 8px 8px 0; border-radius: 10px; margin-bottom: 2px; ' + (isCur ? 'background: #E8EDFB' : 'background: transparent')
          : 'display: flex; gap: 10px; align-items: center; padding: 10px 12px 10px 0; border-bottom: 1px solid #EFEDE8; ' + (isCur ? 'background: #E8EDFB' : 'background: transparent') };
    });
    const checkedIds = view.ids.filter((id) => s.checked[id]);
    const ICON = {
      played: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17M8 12.5l2.6 2.6L16 9.5',
      dl: 'M12 4v11M7 10l5 5 5-5M5 20h14',
      next: 'M4 6h10M4 18h10M4 12h7M15 9l5 3-5 3z',
      last: 'M4 6h14M4 12h14M4 18h8M18 15v6M15 18h6',
      addto: 'M4 6h11M4 12h7M4 18h7M14 15l3 3 3-3',
      star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'
    };
    const blankD = { artBg: '#ccc', artKind: '', ini: '', pod: '', t: '', facts: '', leftActions: [], rightActions: [], inPlaylists: [], notInAny: true, chapters: [], hasChapters: false, notes: '' };
    const detailOf = (id) => {
      const e = ep(id);
      const a = art(id);
      const inPl = [];
      s.pls.forEach((p, pi) => p.entries.forEach((en, i) => { if (en[0] === id) inPl.push({ name: p.n, where: i === p.cursor ? (pi === s.active ? 'Playing now' : 'Cursor here') : 'Entry ' + (i + 1), pct: en[1] + '%', pos: en[2] || 'Not started' }); }));
      const starred = !!s.stars[id], dl = !!s.dls[id], played = !!s.played[id];
      const act3 = (label, short, icon, run, pressed, color, fill) => ({ label, short, icon, run, pressed: pressed === null ? null : String(pressed), color: color || '#17181C', fill: fill || 'none', colorDark: ({ '#1D6B45': '#5BD69A', '#2B50C8': '#7FC4F5', '#B5791A': '#F2C14E' })[color] || '#FFFFFF', fillDark: fill === '#B5791A' ? '#F2C14E' : 'none' });
      return {
        artBg: a.bg, artKind: a.kind, ini: e.ini, pod: e.pod, t: e.t,
        facts: ['Published ' + e.date, e.len, played ? 'Played' : 'Unplayed', dl ? 'Downloaded on this Mac' : 'Streams'].join(' · '),
        play: playNow(id),
        leftActions: [
          act3(played ? 'Mark unplayed' : 'Mark Played', played ? 'Played' : 'Unplayed', ICON.played, set('played', id, !played), played, played ? '#1D6B45' : null),
          act3(dl ? 'Remove download' : 'Download', dl ? 'Saved' : 'Download', ICON.dl, set('dls', id, !dl), dl, dl ? '#2B50C8' : null),
          act3('Play Next in ' + target.n, 'Next', ICON.next, () => this.place([id], 'next'), null)
        ],
        rightActions: [
          act3('Play Last in ' + target.n, 'Last', ICON.last, () => this.place([id], 'last'), null),
          act3('Add to another Playlist', 'Add to', ICON.addto, () => this.setState({ menu: id, sel: 'view' }), null),
          act3(starred ? 'Unstar' : 'Star', starred ? 'Starred' : 'Star', ICON.star, set('stars', id, !starred), starred, starred ? '#B5791A' : null, starred ? '#B5791A' : 'none')
        ],
        inPlaylists: inPl, notInAny: inPl.length === 0,
        chapters: (CHAPTERS[id] || []).map((c, ci) => ({ at: fmt(c[0]), title: c[1], art: art(id, ci).bg })), hasChapters: !!CHAPTERS[id],
        notes: NOTES[id] || '[Show notes from the feed]'
      };
    };
    const d = s.detail ? detailOf(s.detail) : blankD;
    const stack = s.npStack || [];
    const top = stack.length ? stack[stack.length - 1] : { page: 'main' };
    const push = (frame) => this.setState({ npStack: stack.concat([frame]), npAdd: false });
    const openDrawer = (frames) => { this.setState({ npOpen: true, npEnter: true, npStack: frames, menu: null, npAdd: false }); clearTimeout(this._np); this._np = setTimeout(() => this.setState({ npEnter: false }), 350); };
    const npD = top.page === 'episode' ? detailOf(top.ep) : blankD;
    const pageLabel = (f) => f.page === 'queue' ? act.n : f.page === 'episode' ? 'Episode' : 'Now Playing';
    const remaining = act.entries.length - act.cursor - 1;
    return {
      views: VIEWS.map((v, i) => ({ name: v.n, count: String(v.ids.length), style: navStyle(s.sel === 'view' && i === s.view), pick: () => this.setState({ sel: 'view', view: i, detail: null, menu: null, checked: {} }) })),
      playlists: s.pls.map((p, i) => ({ name: p.n, count: String(p.entries.length), dot: i === s.active ? '#2FA36B' : '#D6D3CC', style: navStyle(s.sel === 'playlist' && i === s.pl), pick: () => this.setState({ sel: 'playlist', pl: i, tab: 0, detail: null, menu: null }) })),
      showView: s.sel === 'view',
      showPlaylist: s.sel === 'playlist',
      showNow: s.sel === 'now',
      showPanel: s.sel === 'view' || !!s.detail,
      showDetail: !!s.detail,
      showTargetPreview: !s.detail,
      closeDetail: () => this.setState({ detail: null }),
      d,
      viewName: view.n,
      rules: view.rules,
      resultCount: view.ids.length + ' Episodes',
      noneChecked: checkedIds.length === 0,
      someChecked: checkedIds.length > 0,
      checkedCount: checkedIds.length + ' selected',
      bulkNext: () => { this.place(checkedIds, 'next'); this.setState({ checked: {} }); },
      bulkLast: () => { this.place(checkedIds, 'last'); this.setState({ checked: {} }); },
      clearChecked: () => this.setState({ checked: {} }),
      pickTarget: (ev) => this.setState({ target: Number(ev.target.value) }),
      targets: s.pls.map((p, i) => ({ name: p.n + (i === s.active ? ' (playing)' : ''), value: String(i), selectedAttr: i === s.target ? 'selected' : null })),
      viewEps: view.ids.map((id) => {
        const e = ep(id);
        const starred = !!s.stars[id], dl = !!s.dls[id], played = !!s.played[id];
        return { ...e, lenText: e.note || e.len,
          rowStyle: 'position: relative; display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 14px; border-bottom: 1px solid #EFEDE8; ' + (s.detail === id ? 'background: #E8EDFB' : (s.checked[id] ? 'background: #F1F4FD' : 'background: transparent')),
          checkedAttr: s.checked[id] ? 'checked' : null, check: () => this.setState({ checked: { ...s.checked, [id]: !s.checked[id] } }),
          open: () => this.setState({ detail: id, menu: null }),
          play: playNow(id), next: () => this.place([id], 'next'), last: () => this.place([id], 'last'),
          menu: () => this.setState({ menu: s.menu === id ? null : id }), menuOpen: s.menu === id,
          menuItems: s.pls.map((p, pi) => ({ name: p.n, note: pi === s.active ? 'playing' : '', next: () => this.place([id], 'next', pi), last: () => this.place([id], 'last', pi) })),
          starLabel: starred ? 'Unstar' : 'Star', starPressed: String(starred), starColor: starred ? '#B5791A' : '#17181C', starFill: starred ? '#B5791A' : 'none', toggleStar: set('stars', id, !starred),
          dlLabel: dl ? 'Remove download' : 'Download', dlPressed: String(dl), dlColor: dl ? '#2B50C8' : '#17181C', toggleDl: set('dls', id, !dl),
          playedLabel: played ? 'Mark unplayed' : 'Mark Played', playedPressed: String(played), playedColor: played ? '#1D6B45' : '#17181C', togglePlayed: set('played', id, !played)
        };
      }),
      targetName: target.n,
      openTarget: () => this.setState({ sel: 'playlist', pl: s.target, tab: 0 }),
      targetEntries: entryRows(target, s.target === s.active, true),
      plName: pl.n,
      plMeta: pl.entries.length + ' Entries · ' + pl.rule + (s.pl === s.active ? '' : ' · paused at Entry ' + (pl.cursor + 1)),
      plIsActive: s.pl === s.active,
      plCanActivate: s.pl !== s.active,
      activate: () => this.setState({ active: s.pl, nowId: s.pls[s.pl].entries[s.pls[s.pl].cursor][0], posSec: 0 }),
      plTabs: ['Entries', 'History', 'Listening Timeline'].map((name, i) => ({ name, selected: String(i === s.tab), pick: () => this.setState({ tab: i }), style: 'height: 38px; padding: 0 12px; border: none; background: transparent; font-size: 14px; ' + (i === s.tab ? 'border-bottom: 2px solid #17181C; font-weight: 600; color: #17181C' : 'color: #5C6070') })),
      showEntries: s.tab === 0,
      showHistory: s.tab === 1,
      showTimeline: s.tab === 2,
      entries: entryRows(pl, s.pl === s.active, false),
      history: pl.hist.map((h) => ({ when: h[0], t: ep(h[1]).t })),
      timeline: pl.tl.map((t) => ({ when: t[0], what: t[1] })),
      upNext: act.entries.slice(act.cursor + 1).map((en) => { const e = ep(en[0]); return { t: e.t, len: e.len, color: e.color, ini: e.ini, open: () => push({ page: 'episode', ep: en[0] }) }; }),
      openActive: () => this.setState({ sel: 'playlist', pl: s.active, tab: 0, detail: null, npOpen: false }),
      openQueue: () => s.npOpen ? push({ page: 'queue' }) : openDrawer([{ page: 'queue' }]),
      openNow: () => openDrawer([]),
      closeNow: () => this.setState({ npOpen: false, npStack: [], npAdd: false }),
      npOpen: !!s.npOpen,
      drawerClass: s.npEnter ? 'np-drawer' : '',
      fadeClass: s.npEnter ? 'np-fade' : '',
      openEpisodeFromNow: () => push({ page: 'episode', ep: s.nowId }),
      npMain: top.page === 'main',
      npSub: top.page !== 'main',
      npQueue: top.page === 'queue',
      npEpisode: top.page === 'episode',
      npBack: () => this.setState({ npStack: stack.slice(0, -1), npAdd: false }),
      npBackLabel: stack.length > 1 ? pageLabel(stack[stack.length - 2]) : 'Now Playing',
      npQueueMeta: act.entries.length + ' Entries · ' + act.rule + ' · ' + remaining + ' up next',
      npEntries: act.entries.map((en, i) => { const e = ep(en[0]); const isCur = i === act.cursor; const done = en[1] === 100; return { t: e.t, pod: e.pod, color: e.color, ini: e.ini, pct: en[1] + '%', posText: isCur ? 'Now playing' : (en[2] || e.len), mark: isCur ? 'NOW' : (done ? '✓' : String(i + 1)), markColor: isCur ? '#9FD3F7' : '#A9B6BE', opacity: done ? '0.55' : '1', open: () => push({ page: 'episode', ep: en[0] }), play: () => this.setState({ nowId: en[0], posSec: 0, playing: true, npStack: [] }), rowStyle: 'display: flex; gap: 10px; align-items: center; padding: 8px 10px 8px 0; border-bottom: 1px solid #2C3D47; border-radius: 10px; ' + (isCur ? 'background: #26404E' : 'background: transparent') }; }),
      npOtherPls: s.pls.map((p, i) => ({ p, i })).filter((x) => x.i !== s.active).map(({ p, i }) => ({ name: p.n, cur: 'Paused on: ' + ep(p.entries[p.cursor][0]).t, play: () => this.setState({ active: i, nowId: p.entries[p.cursor][0], posSec: 0, npStack: [] }) })),
      npD,
      npRight: npD.rightActions.map((a, i) => i === 1 ? { ...a, run: () => this.setState({ npAdd: !s.npAdd }) } : a),
      npAddOpen: !!s.npAdd,
      npAddItems: s.pls.map((p, pi) => ({ name: p.n, note: pi === s.active ? 'playing' : '', next: () => this.place([top.ep], 'next', pi), last: () => this.place([top.ep], 'last', pi) })),
      npPlayEp: () => this.setState({ nowId: top.ep, posSec: 0, playing: true, npStack: [] }),
      hasToast: !!s.toast, toast: s.toast,
      np: {
        artBg: nArt.bg, artKind: nArt.kind, ini: n.ini, t: n.t, pod: n.pod, from: act.n,
        chapter: chIdx >= 0 ? 'Ch ' + (chIdx + 1) + ' · ' + chs[chIdx][1] : n.pod,
        pct: (100 * s.posSec / n.dur).toFixed(1) + '%', pos: fmt(s.posSec), remaining: '−' + fmt(n.dur - s.posSec),
        ticks: chs.slice(1).map((c) => (100 * c[0] / n.dur).toFixed(1) + '%'),
        noChapters: chs.length === 0,
        chapters: chs.map((c, i) => { const end = i + 1 < chs.length ? chs[i + 1][0] : n.dur; return { title: c[1], at: fmt(c[0]), len: short(end - c[0]), art: art(s.nowId, i).bg, now: i === chIdx ? 'NOW' : '', jump: () => seekTo(c[0]), style: 'width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 10px; border: none; border-bottom: 1px solid #2C3D47; border-radius: 10px; color: #FFFFFF; ' + (i === chIdx ? 'background: #26404E' : 'background: transparent') }; })
      },
      queueCount: String(remaining),
      queueLabel: remaining + ' up next in ' + act.n,
      seek: (ev) => { const r = ev.currentTarget.getBoundingClientRect(); seekTo(n.dur * (ev.clientX - r.left) / r.width); },
      back15: () => seekTo(s.posSec - 15),
      fwd30: () => seekTo(s.posSec + 30),
      prevCh: () => { if (chs.length) { const i = s.posSec - chs[Math.max(chIdx, 0)][0] > 3 ? chIdx : chIdx - 1; seekTo(chs[Math.max(i, 0)][0]); } },
      nextCh: () => { if (chs.length && chIdx + 1 < chs.length) seekTo(chs[chIdx + 1][0]); },
      playing: s.playing,
      paused: !s.playing,
      playLabel: s.playing ? 'Pause' : 'Play',
      togglePlay: () => this.setState({ playing: !s.playing })
    };
  }
}

return Component;
})();
SCREENS["B-phone"] = (() => {

class Component extends DCLogic {
  state = { active: 0, seg: 0, find: false, view: 0, playing: true };
  renderVals() {
    const s = this.state;
    const POD = { sn: ['Signal & Noise', '#2F6F6A', 'SN'], lc: ['The Long Commute', '#A64B22', 'LC'], ns: ['Night Shift Histories', '#4B3F8F', 'NS'], ke: ['Kitchen Table Economics', '#76600F', 'KE'], df: ['Deep Field', '#1F5E8A', 'DF'], sh: ['Small Hours', '#7A2E4F', 'SH'] };
    const EP = {
      e1: ['sn', 'Who owns the model weights?', 'Nov 6', '58m'], e2: ['df', 'The quiet sun problem', 'Nov 5', '41m'], e3: ['ke', 'Rent, explained with three bowls of rice', 'Nov 5', '33m'],
      e4: ['ns', 'The night the bridge lights went out', 'Nov 4', '1:12:04'], e5: ['sh', 'A lighthouse keeper on twenty years alone', 'Nov 3', '49m'], e6: ['lc', 'Commuting as a love language', 'Nov 2', '27m'],
      e7: ['sn', 'Small models, big phones', 'Nov 1', '46m'], e8: ['df', 'Counting worms from orbit', 'Oct 28', '37m'], e9: ['df', 'What the tide gauges missed', 'Oct 21', '52m'],
      e10: ['df', 'A brief history of the kilogram', 'Oct 14', '44m'], e11: ['sh', 'A machine-learning researcher on doubt', 'Oct 30', '1h 03m'], e12: ['lc', 'Leaving at 5:40', 'Sep 12', '24m'],
      e13: ['ns', 'The lamplighters’ strike', 'Aug 3', '1:05:00'], e14: ['ke', 'Why coins cost more than they’re worth', 'Oct 31', '19:02'], e15: ['lc', 'The bus driver’s map', 'Oct 27', '22m']
    };
    const VIEWS = [
      { n: 'New this week', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, { n: 'Unplayed science', ids: ['e2', 'e8', 'e9', 'e10'] },
      { n: 'Mentions “AI”', ids: ['e1', 'e7', 'e11'] }, { n: 'Starred', ids: ['e7', 'e12', 'e13'] }, { n: 'Under 30 min', ids: ['e6', 'e14', 'e15'] }
    ];
    const PLS = [
      { n: 'Default', cursor: 0, entries: [['e4', 31, '22:10'], ['e1', 0, ''], ['e3', 0, ''], ['e2', 0, ''], ['e5', 0, '']], ch: ['Cold open', 'The city in 1977', 'Blackout at the switch house', 'Who flipped the breaker', 'Aftermath'], chAt: ['0:00', '6:40', '18:05', '34:50', '55:12'], chCur: 2, tl: [['Tonight 11:42 pm', 'Ch 3 · 22:10'], ['Tonight 11:20 pm', 'Ch 2 · 6:40'], ['Last night 1:15 am', 'Rent, explained… · Played'], ['Last night 12:31 am', 'The quiet sun… · Played']] },
      { n: 'Replay', cursor: 1, entries: [['e12', 100, ''], ['e13', 19, '12:30'], ['e9', 0, '']], ch: ['Gaslight', 'The guild votes', 'Dark streets', 'Settlement'], chAt: ['0:00', '9:15', '28:40', '51:30'], chCur: 1, tl: [['Sun 9:02 pm', 'Ch 2 · 12:30'], ['Sun 8:40 pm', 'Leaving at 5:40 · Finished']] },
      { n: 'Morning', cursor: 0, entries: [['e14', 64, '12:10'], ['e6', 0, ''], ['e2', 0, '']], ch: ['Intro', 'The mint', 'Melt value', 'Pennies and nickels'], chAt: ['0:00', '2:10', '6:45', '11:30'], chCur: 3, tl: [['Today 7:48 am', 'Ch 4 · 12:10'], ['Today 7:36 am', 'Ch 1 · 0:00']] }
    ];
    const ep = (id) => { const e = EP[id]; const p = POD[e[0]]; return { pod: p[0], color: p[1], ini: p[2], t: e[1], date: e[2], len: e[3] }; };
    const act = PLS[s.active];
    const cur = act.entries[act.cursor];
    const n = ep(cur[0]);
    const chip = (on) => 'flex: none; height: 40px; padding: 0 14px; border-radius: 20px; font-size: 14px; font-weight: 500; white-space: nowrap; ' + (on ? 'border: 1px solid #17181C; background: #17181C; color: #FFFFFF' : 'border: 1px solid #D6D3CC; background: #FFFFFF; color: #17181C');
    let panel;
    if (s.seg === 0) {
      panel = act.entries.slice(act.cursor + 1).map((en, i) => { const e = ep(en[0]); return { lead: 'Next ' + (i + 1), leadColor: '#5C6070', title: e.t, sub: e.pod + ' · ' + e.len, hasAction: false, action: '' }; });
      if (!panel.length) panel = [{ lead: '', leadColor: '#5C6070', title: 'Nothing after this Entry', sub: 'Playback stops at the end of ' + act.n, hasAction: false, action: '' }];
    } else if (s.seg === 1) {
      panel = act.ch.map((c, i) => ({ lead: act.chAt[i], leadColor: i === act.chCur ? '#2B50C8' : '#5C6070', title: c, sub: i === act.chCur ? 'Playing' : (i < act.chCur ? 'Heard' : ''), hasAction: i !== act.chCur, action: 'Jump' }));
    } else {
      panel = act.tl.map((t) => ({ lead: '', leadColor: '#5C6070', title: t[0], sub: t[1], hasAction: true, action: 'Rewind here' }));
    }
    return {
      deck: PLS.map((p, i) => { const c = ep(p.entries[p.cursor][0]); return { name: p.n, isActive: i === s.active, cur: c.t, meta: 'Entry ' + (p.cursor + 1) + ' of ' + p.entries.length, pick: () => this.setState({ active: i }), style: 'flex: none; width: 168px; height: 84px; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; text-align: left; color: #17181C; box-sizing: border-box; ' + (i === s.active ? 'background: #FFFFFF; border: 2px solid #17181C' : 'background: #FFFFFF; border: 1px solid #E4E2DC') }; }),
      np: { color: n.color, ini: n.ini, pod: n.pod + ' · ' + act.n, t: n.t, ch: 'Ch ' + (act.chCur + 1) + ' · ' + act.ch[act.chCur], pct: cur[1] + '%', pos: cur[2], len: n.len },
      ticks: ['9%', '25%', '48%', '76%'],
      segs: ['Up next', 'Chapters', 'Timeline'].map((name, i) => ({ name, pick: () => this.setState({ seg: i }), style: 'flex: 1; height: 38px; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; ' + (i === s.seg ? 'background: #FFFFFF; color: #17181C; box-shadow: 0 1px 3px rgba(23,24,28,0.12)' : 'background: transparent; color: #5C6070') })),
      panel,
      playing: s.playing, paused: !s.playing, playLabel: s.playing ? 'Pause' : 'Play',
      togglePlay: () => this.setState({ playing: !s.playing }),
      findOpen: s.find,
      openFind: () => this.setState({ find: true }),
      closeFind: () => this.setState({ find: false }),
      activeName: act.n,
      views: VIEWS.map((v, i) => ({ name: v.n, style: chip(i === s.view), pick: () => this.setState({ view: i }) })),
      viewEps: VIEWS[s.view].ids.map((id) => { const e = ep(id); return { ...e, meta: e.pod + ' · ' + e.date + ' · ' + e.len }; })
    };
  }
}

return Component;
})();
SCREENS["B-desktop"] = (() => {

class Component extends DCLogic {
  state = { active: 0, seg: 0, find: false, view: 0, playing: true };
  renderVals() {
    const s = this.state;
    const POD = { sn: ['Signal & Noise', '#2F6F6A', 'SN'], lc: ['The Long Commute', '#A64B22', 'LC'], ns: ['Night Shift Histories', '#4B3F8F', 'NS'], ke: ['Kitchen Table Economics', '#76600F', 'KE'], df: ['Deep Field', '#1F5E8A', 'DF'], sh: ['Small Hours', '#7A2E4F', 'SH'] };
    const EP = {
      e1: ['sn', 'Who owns the model weights?', 'Nov 6', '58m'], e2: ['df', 'The quiet sun problem', 'Nov 5', '41m'], e3: ['ke', 'Rent, explained with three bowls of rice', 'Nov 5', '33m'],
      e4: ['ns', 'The night the bridge lights went out', 'Nov 4', '1:12:04'], e5: ['sh', 'A lighthouse keeper on twenty years alone', 'Nov 3', '49m'], e6: ['lc', 'Commuting as a love language', 'Nov 2', '27m'],
      e7: ['sn', 'Small models, big phones', 'Nov 1', '46m'], e8: ['df', 'Counting worms from orbit', 'Oct 28', '37m'], e9: ['df', 'What the tide gauges missed', 'Oct 21', '52m'],
      e10: ['df', 'A brief history of the kilogram', 'Oct 14', '44m'], e11: ['sh', 'A machine-learning researcher on doubt', 'Oct 30', '1h 03m'], e12: ['lc', 'Leaving at 5:40', 'Sep 12', '24m'],
      e13: ['ns', 'The lamplighters’ strike', 'Aug 3', '1:05:00'], e14: ['ke', 'Why coins cost more than they’re worth', 'Oct 31', '19:02'], e15: ['lc', 'The bus driver’s map', 'Oct 27', '22m']
    };
    const VIEWS = [
      { n: 'New this week', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] }, { n: 'Unplayed science', ids: ['e2', 'e8', 'e9', 'e10'] },
      { n: 'Mentions “AI”', ids: ['e1', 'e7', 'e11'] }, { n: 'Starred', ids: ['e7', 'e12', 'e13'] }, { n: 'Under 30 min', ids: ['e6', 'e14', 'e15'] }
    ];
    const PLS = [
      { n: 'Default', cursor: 0, entries: [['e4', 31, '22:10'], ['e1', 0, ''], ['e3', 0, ''], ['e2', 0, ''], ['e5', 0, '']], ch: ['Cold open', 'The city in 1977', 'Blackout at the switch house', 'Who flipped the breaker', 'Aftermath'], chAt: ['0:00', '6:40', '18:05', '34:50', '55:12'], chLen: [9, 16, 23, 28, 24], chCur: 2, chFill: 24, tl: [['Tonight 11:42 pm', 'Ch 3 · 22:10'], ['Tonight 11:20 pm', 'Ch 2 · 6:40'], ['Last night 1:15 am', 'Rent, explained… · Played by playback'], ['Last night 12:31 am', 'The quiet sun… · Played by playback']] },
      { n: 'Replay', cursor: 1, entries: [['e12', 100, ''], ['e13', 19, '12:30']], ch: ['Gaslight', 'The guild votes', 'Dark streets', 'Settlement'], chAt: ['0:00', '9:15', '28:40', '51:30'], chLen: [14, 30, 35, 21], chCur: 1, chFill: 11, tl: [['Sun 9:02 pm', 'Ch 2 · 12:30'], ['Sun 8:40 pm', 'Leaving at 5:40 · Finished']] },
      { n: 'Morning', cursor: 0, entries: [['e14', 64, '12:10'], ['e6', 0, ''], ['e2', 0, '']], ch: ['Intro', 'The mint', 'Melt value', 'Pennies and nickels'], chAt: ['0:00', '2:10', '6:45', '11:30'], chLen: [11, 24, 25, 40], chCur: 3, chFill: 9, tl: [['Today 7:48 am', 'Ch 4 · 12:10'], ['Today 7:36 am', 'Ch 1 · 0:00']] }
    ];
    const ep = (id) => { const e = EP[id]; const p = POD[e[0]]; return { pod: p[0], color: p[1], ini: p[2], t: e[1], date: e[2], len: e[3] }; };
    const act = PLS[s.active];
    const cur = act.entries[act.cursor];
    const n = ep(cur[0]);
    let panel;
    if (s.seg === 0) {
      panel = act.entries.slice(act.cursor + 1).map((en, i) => { const e = ep(en[0]); return { lead: 'Next ' + (i + 1), leadColor: '#5C6070', title: e.t, sub: e.pod + ' · ' + e.len, hasAction: false, action: '' }; });
      if (!panel.length) panel = [{ lead: '', leadColor: '#5C6070', title: 'Nothing after this Entry', sub: 'Playback stops at the end of ' + act.n, hasAction: false, action: '' }];
    } else if (s.seg === 1) {
      panel = act.ch.map((c, i) => ({ lead: act.chAt[i], leadColor: i === act.chCur ? '#2B50C8' : '#5C6070', title: c, sub: i === act.chCur ? 'Playing' : (i < act.chCur ? 'Heard' : ''), hasAction: i !== act.chCur, action: 'Jump' }));
    } else {
      panel = act.tl.map((t) => ({ lead: '', leadColor: '#5C6070', title: t[0], sub: t[1], hasAction: true, action: 'Rewind here' }));
    }
    return {
      deck: PLS.map((p, i) => { const c = ep(p.entries[p.cursor][0]); return { name: p.n, dot: i === s.active ? '#2FA36B' : '#D6D3CC', cur: c.t, meta: (p.cursor + 1) + '/' + p.entries.length, pct: p.entries[p.cursor][1] + '%', pick: () => this.setState({ active: i }), style: 'flex: none; width: 220px; height: 72px; border-radius: 12px; padding: 9px 12px; display: flex; flex-direction: column; justify-content: space-between; text-align: left; color: #17181C; box-sizing: border-box; ' + (i === s.active ? 'background: #FFFFFF; border: 2px solid #17181C' : 'background: #FFFFFF; border: 1px solid #E4E2DC') }; }),
      np: { color: n.color, ini: n.ini, pod: n.pod + ' · playing from ' + act.n, t: n.t, ch: 'Ch ' + (act.chCur + 1) + ' · ' + act.ch[act.chCur], pos: cur[2], len: n.len },
      segments: act.ch.map((c, i) => ({ flex: String(act.chLen[i]), fill: i < act.chCur ? '100%' : (i === act.chCur ? act.chFill + '%' : '0%'), label: c, color: i === act.chCur ? '#2B50C8' : '#5C6070' })),
      segs: ['Up next', 'Chapters', 'Listening Timeline'].map((name, i) => ({ name, pick: () => this.setState({ seg: i }), style: 'flex: 1; height: 36px; border: none; border-radius: 9px; font-size: 13px; font-weight: 600; ' + (i === s.seg ? 'background: #FFFFFF; color: #17181C; box-shadow: 0 1px 3px rgba(23,24,28,0.12)' : 'background: transparent; color: #5C6070') })),
      panel,
      playing: s.playing, paused: !s.playing, playLabel: s.playing ? 'Pause' : 'Play',
      togglePlay: () => this.setState({ playing: !s.playing }),
      findOpen: s.find,
      openFind: () => this.setState({ find: true }),
      closeFind: () => this.setState({ find: false }),
      activeName: act.n,
      views: VIEWS.map((v, i) => ({ name: v.n, pick: () => this.setState({ view: i }), style: 'width: 100%; height: 36px; text-align: left; padding: 0 10px; border: none; border-radius: 8px; font-size: 14px; color: #17181C; ' + (i === s.view ? 'background: #E8EDFB; font-weight: 600' : 'background: transparent') })),
      viewEps: VIEWS[s.view].ids.map((id, i) => { const e = ep(id); return { ...e, meta: e.pod + ' · ' + e.date + ' · ' + e.len, rowStyle: 'display: flex; gap: 12px; align-items: center; padding: 9px 16px; ' + (i === 0 ? 'background: #E8EDFB' : 'background: transparent') }; })
    };
  }
}

return Component;
})();
SCREENS["C-phone"] = (() => {

class Component extends DCLogic {
  state = { col: 0, swiped: 'e2', active: 0, toast: '', playing: true };
  renderVals() {
    const s = this.state;
    const POD = { sn: ['Signal & Noise', '#2F6F6A', 'SN'], lc: ['The Long Commute', '#A64B22', 'LC'], ns: ['Night Shift Histories', '#4B3F8F', 'NS'], ke: ['Kitchen Table Economics', '#76600F', 'KE'], df: ['Deep Field', '#1F5E8A', 'DF'], sh: ['Small Hours', '#7A2E4F', 'SH'] };
    const EP = {
      e1: ['sn', 'Who owns the model weights?', 'Nov 6', '58m'], e2: ['df', 'The quiet sun problem', 'Nov 5', '41m'], e3: ['ke', 'Rent, explained with three bowls of rice', 'Nov 5', '33m'],
      e4: ['ns', 'The night the bridge lights went out', 'Nov 4', '1h 12m'], e5: ['sh', 'A lighthouse keeper on twenty years alone', 'Nov 3', '49m'], e6: ['lc', 'Commuting as a love language', 'Nov 2', '27m'],
      e7: ['sn', 'Small models, big phones', 'Nov 1', '46m'], e11: ['sh', 'A machine-learning researcher on doubt', 'Oct 30', '1h 03m'], e12: ['lc', 'Leaving at 5:40', 'Sep 12', '24m'],
      e13: ['ns', 'The lamplighters’ strike', 'Aug 3', '1h 05m'], e9: ['df', 'What the tide gauges missed', 'Oct 21', '52m']
    };
    const PL = {
      Default: { rule: 'Clear on Played', cursor: 0, entries: [['e4', 31, '22:10 / 1:12:04'], ['e1', 0, '58:00'], ['e3', 0, '33:00'], ['e2', 0, '41:00'], ['e5', 0, '49:00']] },
      Replay: { rule: 'Keeps Entries', cursor: 1, entries: [['e12', 100, 'Finished'], ['e13', 19, '12:30 / 1:05:00'], ['e9', 0, '52:00']] }
    };
    const COLS = [
      { type: 'view', n: 'New this week', rule: 'Published in the last 7 days · all podcasts', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] },
      { type: 'view', n: 'Mentions “AI”', rule: 'Text contains “AI” · 2 podcasts', ids: ['e1', 'e7', 'e11'] },
      { type: 'playlist', n: 'Default' },
      { type: 'playlist', n: 'Replay' },
      { type: 'view', n: 'Starred', rule: 'Starred · newest first', ids: ['e7', 'e12', 'e13'] }
    ];
    const plNames = ['Default', 'Replay'];
    const ep = (id) => { const e = EP[id]; const p = POD[e[0]]; return { pod: p[0], color: p[1], ini: p[2], t: e[1], date: e[2], len: e[3] }; };
    const col = COLS[s.col];
    const activeName = plNames[s.active];
    const act = PL[activeName];
    const cur = act.entries[act.cursor];
    const n = ep(cur[0]);
    const say = (msg) => { this.setState({ toast: msg, swiped: null }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: '' }), 2400); };
    let colInfo, rows = [], entries = [];
    if (col.type === 'view') {
      colInfo = { name: col.n, count: col.ids.length + ' Episodes', kind: 'View · ' + col.rule };
      rows = col.ids.map((id) => { const e = ep(id); const open = s.swiped === id; return { ...e, meta: e.pod + ' · ' + e.date + ' · ' + e.len, toggle: () => this.setState({ swiped: open ? null : id }), next: () => say('Play Next → ' + activeName), last: () => say('Play Last → ' + activeName), faceStyle: 'position: absolute; top: 0; bottom: 0; left: 0; width: 100%; display: flex; gap: 12px; align-items: center; padding: 0 16px; border: none; background: #F6F5F2; transition: transform 0.2s; transform: translateX(' + (open ? '110px' : '0') + ')' }; });
    } else {
      const pl = PL[col.n];
      const isActive = col.n === activeName;
      colInfo = { name: col.n, count: pl.entries.length + ' Entries', kind: 'Playlist · ' + pl.rule + (isActive ? ' · Playing' : '') };
      entries = pl.entries.map((en, i) => { const e = ep(en[0]); const isCur = i === pl.cursor; const done = en[1] === 100; return { ...e, pct: en[1] + '%', posText: en[2], mark: isCur ? (isActive ? 'NOW' : 'HERE') : (done ? '✓' : String(i + 1)), markColor: isCur ? '#2B50C8' : '#5C6070', opacity: done ? '0.55' : '1', rowStyle: 'display: flex; gap: 10px; align-items: center; padding: 8px 0; border-radius: 12px; margin-bottom: 2px; ' + (isCur ? 'background: #E8EDFB' : 'background: transparent') }; });
    }
    return {
      cols: COLS.map((c, i) => ({ name: c.n, isView: c.type === 'view', isPlaylist: c.type === 'playlist', pick: () => this.setState({ col: i }), style: 'flex: none; height: 44px; padding: 0 12px; border: none; background: transparent; display: flex; align-items: center; gap: 6px; font-size: 14px; white-space: nowrap; ' + (i === s.col ? 'color: #17181C; font-weight: 600; box-shadow: inset 0 -2px 0 #17181C' : 'color: #5C6070; font-weight: 500') })),
      col: colInfo,
      dots: COLS.map((c, i) => ({ w: i === s.col ? '18px' : '6px', bg: i === s.col ? '#17181C' : '#C9C6BE' })),
      isView: col.type === 'view',
      isPlaylist: col.type === 'playlist',
      rows, entries,
      canActivate: col.type === 'playlist' && col.n !== activeName,
      activate: () => this.setState({ active: plNames.indexOf(col.n) }),
      hasToast: !!s.toast, toast: s.toast,
      np: { color: n.color, ini: n.ini, t: n.t, sub: 'from ' + activeName + ' · ' + cur[2], pct: cur[1] + '%' },
      playing: s.playing, paused: !s.playing, playLabel: s.playing ? 'Pause' : 'Play',
      togglePlay: () => this.setState({ playing: !s.playing })
    };
  }
}

return Component;
})();
SCREENS["C-desktop"] = (() => {

class Component extends DCLogic {
  state = {
    active: 'Default', playing: true,
    pls: {
      Default: { rule: 'Clear on Played', cursor: 0, entries: [['e4', 31, '22:10 / 1:12:04'], ['e1', 0, ''], ['e3', 0, ''], ['e2', 0, ''], ['e5', 0, '']] },
      Replay: { rule: 'Keeps Entries', cursor: 1, entries: [['e12', 100, 'Finished'], ['e13', 19, '12:30 / 1:05:00'], ['e9', 0, '']] }
    }
  };
  place(id, how) {
    const pls = { ...this.state.pls };
    const p = { ...pls[this.state.active], entries: pls[this.state.active].entries.slice() };
    const curId = p.entries[p.cursor][0];
    const ex = p.entries.findIndex((x) => x[0] === id);
    let item = [id, 0, ''];
    if (ex >= 0) { item = p.entries[ex]; p.entries.splice(ex, 1); }
    const c = Math.max(0, p.entries.findIndex((x) => x[0] === curId));
    if (how === 'next') p.entries.splice(c + 1, 0, item); else p.entries.push(item);
    p.cursor = c;
    pls[this.state.active] = p;
    this.setState({ pls });
  }
  renderVals() {
    const s = this.state;
    const POD = { sn: ['Signal & Noise', '#2F6F6A', 'SN'], lc: ['The Long Commute', '#A64B22', 'LC'], ns: ['Night Shift Histories', '#4B3F8F', 'NS'], ke: ['Kitchen Table Economics', '#76600F', 'KE'], df: ['Deep Field', '#1F5E8A', 'DF'], sh: ['Small Hours', '#7A2E4F', 'SH'] };
    const EP = {
      e1: ['sn', 'Who owns the model weights?', 'Nov 6', '58m'], e2: ['df', 'The quiet sun problem', 'Nov 5', '41m'], e3: ['ke', 'Rent, explained with three bowls of rice', 'Nov 5', '33m'],
      e4: ['ns', 'The night the bridge lights went out', 'Nov 4', '1:12:04'], e5: ['sh', 'A lighthouse keeper on twenty years alone', 'Nov 3', '49m'], e6: ['lc', 'Commuting as a love language', 'Nov 2', '27m'],
      e7: ['sn', 'Small models, big phones', 'Nov 1', '46m'], e9: ['df', 'What the tide gauges missed', 'Oct 21', '52m'], e11: ['sh', 'A machine-learning researcher on doubt', 'Oct 30', '1h 03m'],
      e12: ['lc', 'Leaving at 5:40', 'Sep 12', '24m'], e13: ['ns', 'The lamplighters’ strike', 'Aug 3', '1:05:00'], e14: ['ke', 'Why coins cost more than they’re worth', 'Oct 31', '19m'], e15: ['lc', 'The bus driver’s map', 'Oct 27', '22m']
    };
    const ep = (id) => { const e = EP[id]; const p = POD[e[0]]; return { pod: p[0], color: p[1], ini: p[2], t: e[1], date: e[2], len: e[3] }; };
    const LAYOUT = [
      { type: 'view', n: 'New this week', sub: 'Published last 7 days · all podcasts', ids: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] },
      { type: 'playlist', n: 'Default' },
      { type: 'view', n: 'Mentions “AI”', sub: 'Text contains “AI” · 2 podcasts', ids: ['e1', 'e7', 'e11'] },
      { type: 'playlist', n: 'Replay' },
      { type: 'view', n: 'Under 30 min', sub: 'Shorter than 30m · not in any Playlist', ids: ['e6', 'e14', 'e15'] }
    ];
    const base = 'display: flex; gap: 8px; align-items: center; padding: 8px; border-radius: 10px; margin-bottom: 2px; ';
    const columns = LAYOUT.map((c) => {
      const colStyle = 'flex: none; width: 300px; display: flex; flex-direction: column; background: #FFFFFF; border-radius: 14px; overflow: hidden; ';
      if (c.type === 'view') {
        return { name: c.n, sub: 'View · ' + c.sub, isView: true, isPlaylist: false, isActive: false, canActivate: false, activate: null, style: colStyle + 'border: 1px solid #DAD7D0',
          rows: c.ids.map((id) => { const e = ep(id); return { ...e, meta: e.pod + ' · ' + e.date + ' · ' + e.len, hasMark: false, mark: '', markColor: '', opacity: '1', hasBar: false, pct: '0%', hasActions: true, next: () => this.place(id, 'next'), last: () => this.place(id, 'last'), rowStyle: base + 'background: transparent' }; }) };
      }
      const p = s.pls[c.n];
      const isActive = c.n === s.active;
      return { name: c.n, sub: 'Playlist · ' + p.entries.length + ' Entries · ' + p.rule, isView: false, isPlaylist: true, isActive, canActivate: !isActive, activate: () => this.setState({ active: c.n }), style: colStyle + (isActive ? 'border: 2px solid #17181C' : 'border: 1px solid #DAD7D0'),
        rows: p.entries.map((en, i) => { const e = ep(en[0]); const isCur = i === p.cursor; const done = en[1] === 100; return { ...e, meta: en[2] || e.len, hasMark: true, mark: isCur ? (isActive ? 'NOW' : 'HERE') : (done ? '✓' : String(i + 1)), markColor: isCur ? '#2B50C8' : '#5C6070', opacity: done ? '0.55' : '1', hasBar: en[1] > 0, pct: en[1] + '%', hasActions: false, next: null, last: null, rowStyle: base + (isCur ? 'background: #E8EDFB' : 'background: transparent') }; }) };
    });
    const act = s.pls[s.active];
    const cur = act.entries[act.cursor];
    const n = ep(cur[0]);
    return {
      columns,
      np: { color: n.color, ini: n.ini, t: n.t, sub: n.pod + ' · from ' + s.active, pct: cur[1] + '%', pos: (cur[2] || '0:00').split(' / ')[0], len: n.len },
      playing: s.playing, paused: !s.playing, playLabel: s.playing ? 'Pause' : 'Play',
      togglePlay: () => this.setState({ playing: !s.playing })
    };
  }
}

return Component;
})();


const flat=(o)=>o;
let fails=0;
function drive(key, steps){
  const c=new SCREENS[key]();
  c._render=()=>{};
  global.setTimeout=(f)=>0; global.clearTimeout=()=>{};
  let v=c.renderVals();
  for(const [name,fn] of steps){
    try{ fn(v,c); v=c.renderVals(); }
    catch(e){ fails++; console.log(key, name, 'FAILED', e.message); }
  }
  return v;
}
let v=drive('A-phone',[
 ['openNow',(v)=>v.openNow()],
 ['queue',(v)=>{ if(!v.npMain) throw Error('not main'); v.openQueue(); }],
 ['open entry',(v)=>{ if(!v.npQueue) throw Error('not queue'); v.npEntries[1].open(); }],
 ['episode page',(v)=>{ if(!v.npEpisode||!v.npE.t) throw Error('no ep'); if(v.npBackLabel!=='Default') throw Error('back '+v.npBackLabel); v.npBack(); }],
 ['back to queue',(v)=>{ if(!v.npQueue) throw Error('not queue after back'); v.npBack(); }],
 ['chapters',(v)=>{ v.npGoChapters(); }],
 ['jump',(v)=>{ if(!v.npChapters) throw Error('not chapters'); v.npChapterRows[3].jump(); }],
 ['after jump',(v)=>{ if(!v.npMain) throw Error('not main after jump'); if(!v.np.chapter.includes('Who flipped')) throw Error(v.np.chapter); v.openEpisodeFromNow(); }],
 ['ep add',(v)=>{ v.npE.add(); }],
 ['sheet',(v)=>{ if(!v.sheetOpen||!v.nowOpen) throw Error('sheet/drawer'); v.closeSheet(); }],
 ['close',(v)=>{ v.closeNow(); }],
 ['badge',(v)=>{ if(v.nowOpen) throw Error('still open'); v.openQueue(); }],
 ['badge opens queue',(v)=>{ if(!v.nowOpen||!v.npQueue) throw Error('badge'); v.npOtherPls[0].play(); }],
 ['switched',(v)=>{ if(!v.npMain||v.np.from!=='Replay') throw Error('switch '+v.np.from); }],
]);
drive('A-desktop',[
 ['openNow',(v)=>v.openNow()],
 ['upnext open',(v)=>{ v.upNext[0].open(); }],
 ['ep page',(v)=>{ if(!v.npEpisode||!v.npD.t) throw Error('no ep'); v.npRight[1].run(); }],
 ['add open',(v)=>{ if(!v.npAddOpen) throw Error('add'); v.npAddItems[1].last(); }],
 ['back',(v)=>{ v.npBack(); }],
 ['queue',(v)=>{ if(!v.npMain) throw Error('main'); v.openQueue(); }],
 ['queue page',(v)=>{ if(!v.npQueue) throw Error('q'); v.npEntries[2].play(); }],
 ['played',(v)=>{ if(!v.npMain) throw Error('main2'); v.closeNow(); }],
 ['closed',(v)=>{ if(v.npOpen) throw Error('open'); }],
]);
for (const k of ['B-phone','B-desktop','C-phone','C-desktop']) drive(k,[]);
console.log(fails? fails+' failures':'ALL OK');
