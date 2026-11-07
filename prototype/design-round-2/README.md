# PROTOTYPE — design round 2 (throwaway)

Not production code. UI mock-ups for three undesigned areas from `docs/design/ui-layout.md` › Not yet designed, each in variants A, B and C at phone (390 px) and desktop (1280 px) width, inside the chosen layout (variant A "Two halves").

| Area | Bead |
|---|---|
| View editor & Search results | pod-lby.1 |
| Playlist settings & the Rewind flow (ADR 0006) | pod-1x2.1 |
| Library, Subscription settings, Download Rules, subscribe, OPML, Orphaned, first run | pod-g1v.1 |

Published at https://generatedpages.burmese-mountain.ts.net/podlist-design-round-2/

- `index.html` — the built, self-contained page. Switch area, variant and width with the top bar; deep links look like `#view-editor/A-phone/edit`, `#playlists/B-desktop/picked`, `#library/C-phone/first`. Each variant has a "jump to a state" row, its trade-off caption and the area's open questions under the mock-up.
- `src/` — the source: `head.html` (CSS, app tokens copied from `packages/web/src/index.css`), `core.js` (sample data, icons, phone/desktop chrome, routing, events), one file per area, `tail.html`.
- `build.sh` — concatenates `src/` into `index.html`. Run it after editing `src/`.

State lives in memory only; reloading or switching variant resets it. All podcasts, Episodes and people are invented.
