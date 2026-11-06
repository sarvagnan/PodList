# Deploying PodList on a tailnet

PodList runs as one container (API + web app) behind a Tailscale sidecar, so it is
reachable only on your tailnet, at `https://podlist.<tailnet>.ts.net` (ADR 0004).

1. Create a Tailscale auth key (Admin console → Settings → Keys; reusable off, tagged if you use tags).
2. On the host, create `deploy/.env`:

   ```
   TS_AUTHKEY=tskey-auth-...
   # Optional, for directory search through Podcast Index (iTunes is used otherwise):
   PODCASTINDEX_KEY=...
   PODCASTINDEX_SECRET=...
   ```

3. `docker compose -f deploy/compose.yaml up -d --build`
4. Open `https://podlist.<tailnet>.ts.net` on the phone and install it from Chrome's menu.

Data lives in the `podlist-data` volume: the database at `/data/podlist.db` and daily
backups in `/data/backups` (newest 14 kept; set `BACKUP_KEEP` to change). Restore by
stopping the stack and copying a backup over `/data/podlist.db`.

## Mac app

`pnpm desktop:install` (from the repo root, on the Mac) pulls `main`, installs dependencies, builds `PodList.app` unsigned for this Mac and copies it into `/Applications`. Quit PodList first if it's open. On first launch it asks for the server address (the Tailscale Serve URL above) and checks that it answers; PodList › Change Server… switches later. `pnpm --filter @podlist/desktop build:app` builds into `packages/desktop/out/` without installing.
