# UI flow runs

Flow runs for grading PodList against `~/Documents/UI_Guidelines` (`CRITIQUE.md` § Flow run). Target: web app (Android-first PWA; the Mac app wraps the same build).

- `pnpm --filter @podlist/web ui:flows [outDir]` builds the app, starts a seeded demo server, runs every flow at phone (412×915), zoomed-desktop (720×450) and desktop (1440×900) widths, and writes `measurements.json`, `summary.md`, screenshot strips and a contact sheet per flow (default `/tmp/podlist-ui/<timestamp>`).
- `pnpm --filter @podlist/web ui:demo` runs the demo server alone, for looking around.

Demo data (`demo.mjs`) is fixed and local: three made-up podcasts served from a fixture host, silent audio as long as each Episode claims, and a seeded set of Playlists, Views and Positions. Late arrivals (the catalogue on a fresh Device) are held 2 s so they show as their own step. Selectors use roles and names only.

The grading log is `UI-GRADE.md` at the repo root.
