# PROTOTYPE — UI mockups (throwaway)

Not production code. Kept as the primary source behind `docs/design/ui-layout.md`, which records the decision: **variant A (Two halves)**, refined over several rounds (lists not capsules, Add/Play row actions, single action row with Play centred, Now Playing as a dismissable drawer that keeps all navigation inside it, Chapter → Episode → podcast Artwork).

- `index.html` — self-contained page with all variants (A/B/C × phone/desktop). Open it in a browser; switch with the top bar or `#A-phone`, `#A-desktop`, etc. Published at https://generatedpages.burmese-mountain.ts.net/podcast-ui-variants/
- `canvas/` — the source artboards (`.dc.html` Design Component format) from the design canvas; `Main.dc.html` is A-phone. They need the canvas runtime (`support.js`) and do not open standalone.
- `build_pages.py` — bundles `canvas/` into `index.html` with a tiny inline renderer: `python3 build_pages.py canvas index.html`.
- `logic_test.mjs` — node smoke test of the drawer navigation logic, extracted from a build.

All podcasts, episodes and notes are invented sample data.
