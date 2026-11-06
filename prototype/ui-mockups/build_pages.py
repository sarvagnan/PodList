"""Bundle the six .dc.html mockups into one self-contained page for generatedpages."""
import re, sys, pathlib

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])

SCREENS = [
    ("A-phone", "A", "phone", "Main.dc.html"),
    ("A-desktop", "A", "desktop", "A-Desktop.dc.html"),
    ("B-phone", "B", "phone", "B-Phone.dc.html"),
    ("B-desktop", "B", "desktop", "B-Desktop.dc.html"),
    ("C-phone", "C", "phone", "C-Phone.dc.html"),
    ("C-desktop", "C", "desktop", "C-Desktop.dc.html"),
]

templates, classes = [], []
for key, _, _, fname in SCREENS:
    text = (src / fname).read_text()
    body = re.search(r"<x-dc>(.*)</x-dc>", text, re.S).group(1)
    body = re.sub(r"<helmet>.*?</helmet>", "", body, flags=re.S).strip()
    logic = re.search(r"<script type=\"text/x-dc\"[^>]*>(.*?)</script>", text, re.S).group(1)
    templates.append(f'<template id="tpl-{key}">\n{body}\n</template>')
    classes.append(f'SCREENS["{key}"] = (() => {{\n{logic}\nreturn Component;\n}})();')

page = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Podcast Client UI Variants</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet">
<style>
:root{--chrome-bg:#FFFFFF;--chrome-ink:#17181C;--chrome-muted:#5C6070;--chrome-line:#E4E2DC;--page-bg:#DCD9D2}
@media (prefers-color-scheme: dark){:root{--chrome-bg:#1C1D22;--chrome-ink:#F2F2F4;--chrome-muted:#A9ACB6;--chrome-line:#33353D;--page-bg:#0F1013}}
body{margin:0;background:var(--page-bg);font-family:Inter,system-ui,sans-serif}
button{font-family:inherit;cursor:pointer}
a{color:#2B50C8}
.bar{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 16px;background:var(--chrome-bg);color:var(--chrome-ink);border-bottom:1px solid var(--chrome-line)}
.bar strong{font-size:14px;margin-right:6px}
.bar .grp{display:flex;gap:4px}
.bar button{height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--chrome-line);background:transparent;color:var(--chrome-ink);font-size:13px}
.bar button[aria-pressed="true"]{background:var(--chrome-ink);color:var(--chrome-bg);border-color:var(--chrome-ink)}
.bar .desc{flex-basis:100%;font-size:12px;color:var(--chrome-muted)}
#stage{display:flex;justify-content:center;padding:20px 0}
#stage.phone > div{box-shadow:0 10px 40px rgba(0,0,0,.25);border-radius:28px;overflow:hidden}
#stage.desktop{padding:0}
#stage.desktop > div{width:100%}
.np-drawer{animation:npup .3s cubic-bezier(.2,.8,.2,1)}
.np-fade{animation:npfade .3s ease-out}
@keyframes npup{from{transform:translateY(100%)}to{transform:none}}
@keyframes npfade{from{background:rgba(23,24,28,0)}}
</style>
</head>
<body>
<div class="bar">
  <strong>Podcast UI</strong>
  <div class="grp" id="variants"></div>
  <div class="grp" id="devices"></div>
  <div class="desc" id="desc"></div>
</div>
<div id="stage"></div>
__TEMPLATES__
<script>
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (this._render) this._render();
  }
  forceUpdate() { if (this._render) this._render(); }
}
const SCREENS = {};
__CLASSES__

const HOLE = /\\{\\{\\s*([^}]+?)\\s*\\}\\}/g;
const WHOLE = /^\\{\\{\\s*([^}]+?)\\s*\\}\\}$/;
function lookup(scope, path) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  if (/^-?\\d+(\\.\\d+)?$/.test(path)) return Number(path);
  let v = scope;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}
const interp = (str, scope) => str.replace(HOLE, (_, p) => { const v = lookup(scope, p); return v == null ? '' : String(v); });
function renderChildren(nodes, scope, parent) { for (const n of nodes) renderNode(n, scope, parent); }
function renderNode(node, scope, parent) {
  if (node.nodeType === 3) { parent.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
  if (node.nodeType !== 1) return;
  const tag = node.localName;
  if (tag === 'sc-if') {
    const m = WHOLE.exec(node.getAttribute('value') || '');
    if (m && lookup(scope, m[1])) renderChildren(node.childNodes, scope, parent);
    return;
  }
  if (tag === 'sc-for') {
    const m = WHOLE.exec(node.getAttribute('list') || '');
    const list = (m && lookup(scope, m[1])) || [];
    const as = node.getAttribute('as') || 'item';
    list.forEach((item, i) => { const s = Object.create(scope); s[as] = item; s.$index = i; renderChildren(node.childNodes, s, parent); });
    return;
  }
  const el = node.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS(node.namespaceURI, node.localName) : document.createElement(tag);
  for (const a of node.attributes) {
    if (a.name.startsWith('hint-')) continue;
    const whole = WHOLE.exec(a.value);
    if (a.name.startsWith('on') && whole) {
      const fn = lookup(scope, whole[1]);
      if (typeof fn === 'function') el.addEventListener(a.name.slice(2), fn);
      continue;
    }
    if (whole) {
      const val = lookup(scope, whole[1]);
      if (val == null || val === false) continue;
      el.setAttribute(a.name, val === true ? '' : String(val));
      continue;
    }
    el.setAttribute(a.name, interp(a.value, scope));
  }
  renderChildren(node.childNodes, scope, el);
  parent.appendChild(el);
}

const INFO = {
  A: 'A — Two halves: Views and Playlists as equal tabs (phone) or panes (desktop).',
  B: 'B — Player first: Playlists as a deck of cards, Views summoned via Find / ⌘K.',
  C: 'C — Columns: every View and Playlist is a column; swipe or Next/Last to add.'
};
const stage = document.getElementById('stage');
const instances = {};
function show() {
  const m = /^#([ABC])-(phone|desktop)$/.exec(location.hash) || [null, 'A', 'phone'];
  const v = m[1], d = m[2], key = v + '-' + d;
  for (const [id, cur] of [['variants', v], ['devices', d]]) {
    for (const b of document.getElementById(id).children) b.setAttribute('aria-pressed', String(b.dataset.val === cur));
  }
  document.getElementById('desc').textContent = INFO[v] + (d === 'phone' ? ' Phone frame is 390×844.' : '');
  stage.className = d;
  let inst = instances[key];
  if (!inst) {
    inst = instances[key] = new SCREENS[key]();
    const tpl = document.getElementById('tpl-' + key);
    inst._render = () => {
      const frag = document.createDocumentFragment();
      renderChildren(tpl.content.childNodes, inst.renderVals(), frag);
      stage.replaceChildren(frag);
    };
  }
  inst._render();
}
function mkButtons(id, vals, labels, other) {
  const g = document.getElementById(id);
  vals.forEach((val, i) => {
    const b = document.createElement('button');
    b.textContent = labels[i]; b.dataset.val = val;
    b.addEventListener('click', () => {
      const m = /^#([ABC])-(phone|desktop)$/.exec(location.hash) || [null, 'A', 'phone'];
      location.hash = id === 'variants' ? val + '-' + m[2] : m[1] + '-' + val;
    });
    g.appendChild(b);
  });
}
mkButtons('variants', ['A', 'B', 'C'], ['A · Two halves', 'B · Player first', 'C · Columns']);
mkButtons('devices', ['phone', 'desktop'], ['Phone', 'Desktop']);
if (!location.hash && window.innerWidth >= 1000) location.hash = '#A-desktop';
window.addEventListener('hashchange', show);
show();
</script>
</body>
</html>
"""
page = page.replace("__TEMPLATES__", "\n".join(templates)).replace("__CLASSES__", "\n".join(classes))
out.write_text(page)
print(f"wrote {out} ({len(page)} bytes)")
