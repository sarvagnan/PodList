# PodList

PodList is a personal podcast client built around one idea: finding episodes and listening to them are two separate jobs, and each deserves its own tool.

- **Views** are for finding. A View is a saved filter over everything you subscribe to, such as "unplayed, under 30 minutes, published this week". It is worked out fresh every time you open it, so it never goes stale.
- **Playlists** are for listening. A Playlist is an ordered list you build by hand, and each one remembers where it is: which episode is current, how far into each episode you are, and what you have finished.

It is a single-user system. You run a small server at home, and the apps on your devices sync through it. The Android and Mac apps also work with no server at all.

> **Status:** early and in active development. It has one user, its author. Nothing is published to an app store, and there are no installers to download yet.

## What makes it different

- **As many Playlists as you like.** Most podcast apps give you one queue. Here you can keep a commute Playlist, a long-walk Playlist and a "listen again" Playlist, and switch between them. Each one picks up where you left it.
- **Position belongs to the Playlist.** The same episode can be finished in one Playlist and start from the beginning in another.
- **Rewind.** Each Playlist keeps a 30 day timeline of what it played and when. If you fall asleep and it plays on for three hours, you can go back to the moment you remember. Episodes that finished while you slept become unplayed again and return to their places. Changes you made on purpose are kept.
- **Offline edits are merged, never overwritten.** Reorder a Playlist on your phone with no signal and add to it on your laptop, and both changes survive when the phone reconnects.
- **Try before you subscribe.** Open any podcast from search, look through its episodes, and play or queue a single one without subscribing.
- **Downloads are decided per podcast and per device.** Stream, download when an episode joins a Playlist, or download as soon as it is published.
- **Listening stats.** Time listened, episodes finished, top podcasts and your current streak, kept permanently.

The full vocabulary (Entry, Cursor, Star, Clear on Played and the rest) is defined in [CONTEXT.md](CONTEXT.md). The code, the docs and the UI all use those words.

## The clients

Each platform gets its own client, built to feel at home on that platform.

| Client | Built with | Works offline | Where it stands |
|---|---|---|---|
| Web | React, talks to the server | No, online only | Working. Any number of tabs. |
| Android | Kotlin, Compose, Media3 | Yes | Phone app is feature complete and being polished. Tablets, foldables and Android Auto come later. |
| Mac | SwiftUI | Yes | Main features are built. Final checks on a real Mac are in progress. |
| Desktop (Electron) | The web UI with a local database | Yes | Runs on the Mac today. Windows and Linux packaging is planned. |
| iPhone and iPad | SwiftUI, shared with the Mac app | Yes | Planned. |

The reasoning behind this split is in [ADR 0011](docs/adr/0011-a-client-per-platform-and-an-online-only-web-client.md), and the order of work is in the [platform plan](docs/plans/platform-clients.md).

## How it fits together

```
packages/
  domain/    The rules: Playlists, Played, Rewind, Views, sync operations. No platform code.
  api/       The HTTP API contract shared by the server and the TypeScript clients.
  server/    Node server: fetches feeds, stores the Library, merges edits from every device.
  web/       React app. Builds as the online web client and as the UI inside Electron.
  desktop/   Electron shell around the web UI.
apps/
  android/   Native Android app (Gradle project).
  apple/     Native Mac app, later iPhone and iPad (Swift package).
deploy/      How the server is deployed, plus its systemd unit.
docs/        Decision records, design notes, the sync protocol, UI grading reports.
```

A few things are worth knowing before you read the code:

- **SQLite everywhere.** The server and every offline-capable client keep the same schema, so a View is the same query on each of them.
- **One set of rules, checked in every language.** The rules live in `packages/domain`. The Kotlin and Swift apps reimplement them, and all three must pass the same JSON test vectors in `packages/domain/protocol`. Those vectors, not any one implementation, define correct behaviour. See the [protocol docs](docs/protocol/README.md).
- **Audio comes straight from the podcast's host.** The server is not in the path for playback, so listening keeps working when the server is unreachable.
- **The server has no login.** It is meant to be reachable only over a private network such as Tailscale. Do not expose it to the internet as it is. See [ADR 0004](docs/adr/0004-tailnet-is-the-auth-boundary.md).

## Running it

You need Node 26 or later and pnpm 12.

```sh
pnpm install
```

### Look around with demo data

```sh
pnpm --filter @podlist/web ui:demo
```

This builds the web app and starts a server with three made-up podcasts, some Playlists and some Views. It prints the address to open. Nothing is saved between runs.

### Run a real server

```sh
pnpm --filter @podlist/web build
cd packages/server
HOST=127.0.0.1 WEB_ROOT=../web/dist node src/main.ts
```

Open http://127.0.0.1:8787, then subscribe to something or import an OPML file. The database is created at `packages/server/data/podlist.db`.

The server is configured through environment variables. All of them are optional.

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `8787` | Port to listen on. |
| `HOST` | every interface | Address to listen on. Use `127.0.0.1` unless something in front of it handles access. |
| `DATABASE_PATH` | `data/podlist.db` | Where the SQLite database lives. |
| `WEB_ROOT` | unset | Folder with the built web app. Without it, only the API is served. |
| `ARTWORK_DIR` | `artwork` beside the database | Cache of resized artwork. |
| `BACKUP_DIR` | unset | Turns on a daily database backup into this folder. |
| `BACKUP_KEEP` | `14` | How many daily backups to keep. |
| `PODCASTINDEX_KEY`, `PODCASTINDEX_SECRET` | unset | Search through Podcast Index. Without them, search uses Apple's public directory. |

For a permanent install, [deploy/README.md](deploy/README.md) describes the setup this project uses: a small Linux container, a systemd service, and Tailscale Serve for HTTPS.

### The apps

- **Android:** open `apps/android` in Android Studio, or run `./gradlew assembleDebug` there. See [apps/android/README.md](apps/android/README.md) for the toolchain.
- **Mac:** run `swift run PodListMac` from `apps/apple`. See [apps/apple/README.md](apps/apple/README.md).
- **Electron:** `pnpm --filter @podlist/desktop build:app` builds `PodList.app` into `packages/desktop/out/`. `pnpm desktop:install` pulls the latest `main`, builds, and copies the app into `/Applications`.

Each app asks for a server address on first launch. On Android and the Mac you can skip that and use the app on its own, then connect to a server later and bring your library across.

## Working on it

```sh
pnpm check                          # lint, typecheck and unit tests
pnpm --filter @podlist/web e2e      # browser tests (Playwright)
pnpm check:android                  # Kotlin rule and data tests
cd apps/apple && swift test         # Swift tests
```

`pnpm format` fixes lint and formatting problems. CI runs `pnpm check`, the web build and the browser tests on every push.

Where to read next:

- [CONTEXT.md](CONTEXT.md): what every term means.
- [docs/adr](docs/adr): why things are the way they are, one short decision at a time.
- [docs/design/product-behaviour.md](docs/design/product-behaviour.md): what the product does, independent of any one client.
- [docs/protocol](docs/protocol/README.md): the sync contract a client has to meet.

Work is tracked with [beads](https://github.com/gastownhall/beads) (`bd ready` lists what is open). Much of the code is written with AI coding agents, and [AGENTS.md](AGENTS.md) holds their instructions.

## Licence

PodList is released under the [MIT License](LICENSE). Copyright (c) 2026 Sarvagnan.
