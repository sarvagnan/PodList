# Deploying PodList

PodList runs in its own Incus container, `podlist`, on the IncusOS box, the same way as
`generatedpages` (`~/Documents/incus_setup/generatedpages.md`). Node serves the API and
the built web app on `127.0.0.1:8787`; Tailscale Serve publishes it over HTTPS at
`https://podlist.burmese-mountain.ts.net`, reachable only on the tailnet (ADR 0004). The
phone needs that HTTPS origin for the service worker and browser storage.

| Where | What |
|---|---|
| `/srv/podlist` | The `podlist-data` volume: `podlist.db`, daily `backups/` (newest 14 kept), `artwork/` cache |
| `/opt/podlist/releases/<commit>` | Releases, each a commit with its own `node_modules`; `current` points at the running one |
| `/opt/node` | Node, pinned (26.13.0), with pnpm 12.18.0 |
| `/etc/podlist/env` | Optional settings (`env.example`), readable only by root |
| `podlist.service` | systemd unit, from `deploy/podlist.service`; runs as `podlist` and writes only to `/srv/podlist` |

## Deploy from the Mac

```fish
deploy/deploy
```

It refuses to run with uncommitted changes, so every release is a commit. It then:

1. Runs `pnpm check` and builds the web app.
2. Copies the server's packages and the web build to
   `sarvagnan@podlist:/opt/podlist/releases/<commit>/` with rsync. Unchanged files are
   hard-linked to the running release.
3. Installs the server's production dependencies there with pnpm. `node:sqlite` needs
   no native build, and sharp brings its own Linux binary.
4. Points `current` at the new release and restarts `podlist`. It waits up to
   30 s for `/api/health` to report the new commit. If it doesn't, it prints the last log
   lines, points `current` back at the previous release and restarts that.
5. Keeps the five newest releases.

The data volume isn't touched by a deploy. To roll back by hand, point `current` at an
older folder under `releases/` and `sudo systemctl restart podlist`.

Deploys log in over Tailscale SSH as `sarvagnan`. Through
`/etc/sudoers.d/podlist-deploy`, that user may run exactly two commands as root:
restart the service, and read its last 20 log lines.

## How the container was set up

Done on 2026-11-07, from the Mac:

```fish
incus storage volume create incusos:local podlist-data
incus launch images:debian/13 incusos:podlist -c boot.autostart=true -c limits.memory=1GiB
incus storage volume attach incusos:local podlist-data podlist podlist-data /srv/podlist
```

Inside the container:

- Debian packages `curl ca-certificates rsync sudo unattended-upgrades xz-utils`;
  Tailscale from its install script; timezone Asia/Kolkata.
- Node 26.13.0 from nodejs.org, checked against `SHASUMS256.txt`, unpacked in
  `/opt/node-v26.13.0-linux-x64` with `/opt/node` pointing at it. pnpm was installed with
  `npm install -g pnpm@12.18.0`.
- The users `podlist` (system, runs the service) and `sarvagnan` (UID 1000, the deploy
  login, owns `/opt/podlist`). There's also the sudo rule above.
- `deploy/podlist.service` pushed to `/etc/systemd/system/` and enabled.

Join Tailscale and publish with Serve:

```fish
incus exec incusos:podlist -- tailscale up --hostname=podlist --ssh
incus exec incusos:podlist -- tailscale serve --bg http://127.0.0.1:8787
ssh -o StrictHostKeyChecking=accept-new sarvagnan@podlist true
```

Open the link `tailscale up` prints and approve the machine, then in the admin console
choose **Disable key expiry** for `podlist`. The first SSH login prints a link for
Tailscale's SSH check; open it once.

Snapshots and nightly updates, like the other containers:

```fish
incus storage volume set incusos:local podlist-data snapshots.schedule=@daily snapshots.expiry=14d
cd ~/Documents/incus_setup/container-updates
incus exec incusos:podlist -- mkdir -p /etc/systemd/system/apt-daily-upgrade.timer.d
incus file push --mode 0644 apt-daily-upgrade-night.conf incusos:podlist/etc/systemd/system/apt-daily-upgrade.timer.d/night.conf
incus file push --mode 0644 52unattended-upgrades-tailscale incusos:podlist/etc/apt/apt.conf.d/
incus exec incusos:podlist -- systemctl daemon-reload
```

Node is pinned and updated by hand: unpack the new version beside the old one, point
`/opt/node` at it, reinstall pnpm, and deploy. Debian and Tailscale update nightly at about
04:00 IST.

## Restoring the database

Stop the service, copy a backup over the database, and start it again:

```fish
incus exec incusos:podlist -- sh -c 'systemctl stop podlist && cp /srv/podlist/backups/<file> /srv/podlist/podlist.db && chown podlist:podlist /srv/podlist/podlist.db && systemctl start podlist'
```

The volume's daily snapshots are the second line of defence:
`incus storage volume snapshot list incusos:local podlist-data`.

## Mac app

`pnpm desktop:install` (from the repo root, on the Mac) pulls `main` and installs
dependencies. It builds the web app and `PodList.app` (unsigned, for this Mac) with its
own copy of the web app inside, and copies it into `/Applications`. Quit PodList first if
it's open. Run it again after pulling UI changes: the Mac app doesn't load the UI from
the server.

On first launch it asks for the server address
(`podlist.burmese-mountain.ts.net`) and checks that it answers. PodList › Change Server…
switches later, and each server keeps its own Library on the Mac.
`pnpm --filter @podlist/desktop build:app` builds into `packages/desktop/out/` without
installing.
