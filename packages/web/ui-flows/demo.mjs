// Fixed demo data for UI flow runs: a local fixture host serves three made-up podcasts
// (feeds, artwork and a short silent audio file), and a PodList server with a fresh
// database subscribes to them and receives a fixed set of Playlists, Views and
// Positions. Nothing here reaches the internet.

import { spawn } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const repo = fileURLToPath(new URL("../../..", import.meta.url))

const podcasts = [
  {
    slug: "deep-field",
    title: "Deep Field",
    author: "Ines Okafor",
    color: "#2b50c8",
    chapters: ["Cold open", "The question", "Field notes", "What we still don't know"],
    episodes: [
      ["The quiet edge of the solar system", 2712],
      ["Counting galaxies by hand", 3125],
      ["What the Voyager records were for", 2240],
      ["A telescope made of ice", 2954],
      ["Why the night sky is dark", 1860]
    ]
  },
  {
    slug: "slow-build",
    title: "Slow Build",
    author: "Marta Lindqvist",
    color: "#1d6b45",
    episodes: [
      ["Joinery without screws", 1985],
      ["The workshop as a notebook", 2410],
      ["Repairing a chair, twice", 1702],
      ["Tools that outlive us", 2633]
    ]
  },
  {
    slug: "market-hours",
    title: "Market Hours",
    author: "Dev Raman",
    color: "#8a5a10",
    episodes: [
      ["Who sets the price of rice?", 1534],
      ["The long life of a shipping container", 1748],
      ["Inflation, explained with sandwiches", 1322],
      ["When a currency disappears", 1911],
      ["The economics of queues", 1455],
      ["Lighthouses and public goods", 1609]
    ]
  }
]

const largePodcast = {
  slug: "long-list",
  title: "Long listening",
  author: "Fixture",
  color: "#2b50c8",
  episodes: Array.from({ length: 500 }, (_, i) => [
    `Long Episode ${String(i + 1).padStart(3, "0")}`,
    120
  ])
}

const artwork = (title, color) => {
  const initials = title
    .split(" ")
    .map((w) => w[0])
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="${color}"/><text x="300" y="340" font-family="Helvetica, Arial, sans-serif" font-size="200" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`
}

/**
 * Silent MP3 as long as the Episode claims to be: MPEG-2 Layer III frames at 8 kbps,
 * 16 kHz mono, each 36 bytes for 36 ms, with zeroed side info (silence). Positions and
 * seeking then behave as they would with the real audio.
 */
const silentMp3 = (seconds) => {
  const frame = Buffer.alloc(36)
  frame.set([0xff, 0xf3, 0x18, 0xc0])
  const count = Math.ceil(seconds / 0.036)
  const buffer = Buffer.alloc(count * 36)
  for (let i = 0; i < count; i++) frame.copy(buffer, i * 36)
  return buffer
}
const audioCache = new Map()
const audioFor = (seconds) => {
  if (!audioCache.has(seconds)) audioCache.set(seconds, silentMp3(seconds))
  return audioCache.get(seconds)
}

const day = 86_400_000
/** Episodes are published every few days before this fixed date, newest first. */
export const demoNow = Date.UTC(2026, 10, 6, 9, 0)

const feed = (origin, podcast) => {
  const items = podcast.episodes
    .map(([title, duration], i) => {
      const published = new Date(demoNow - (i * 3 + (podcast.slug.length % 3)) * day).toUTCString()
      return `<item><title>${title}</title><guid>${podcast.slug}-${i}</guid><pubDate>${published}</pubDate><description>${title}. An episode of ${podcast.title}.</description><enclosure url="${origin}/audio/${podcast.slug}/${i}.mp3" type="audio/mpeg" length="${audioFor(duration).length}"/><itunes:duration>${duration}</itunes:duration>${podcast.chapters ? `<podcast:chapters url="${origin}/chapters/${podcast.slug}/${i}.json" type="application/json+chapters"/>` : ""}</item>`
    })
    .join("")
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0"><channel><title>${podcast.title}</title><itunes:author>${podcast.author}</itunes:author><description>${podcast.title} by ${podcast.author}.</description><itunes:image href="${origin}/art/${podcast.slug}.svg"/>${items}</channel></rss>`
}

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)))

const startFixtures = async () => {
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname
    const podcast = [...podcasts, largePodcast].find((p) => path === `/feeds/${p.slug}.xml`)
    if (podcast) {
      res.writeHead(200, { "content-type": "application/rss+xml" })
      return res.end(feed(origin, podcast))
    }
    // Search stands in for the iTunes Search API, so Add podcasts finds the fixture feeds.
    if (path === "/search") {
      const term = (new URL(req.url, "http://x").searchParams.get("term") ?? "").toLowerCase()
      const results = podcasts
        .filter((p) => `${p.title} ${p.author}`.toLowerCase().includes(term))
        .map((p) => ({
          collectionName: p.title,
          artistName: p.author,
          feedUrl: `${origin}/feeds/${p.slug}.xml`,
          artworkUrl600: `${origin}/art/${p.slug}.svg`
        }))
      res.writeHead(200, { "content-type": "application/json" })
      return res.end(JSON.stringify({ resultCount: results.length, results }))
    }
    const art = [...podcasts, largePodcast].find((p) => path === `/art/${p.slug}.svg`)
    if (art) {
      res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "max-age=3600" })
      return res.end(artwork(art.title, art.color))
    }
    const chapterFile = path.match(/^\/chapters\/([a-z-]+)\/(\d+)\.json$/)
    const chaptered =
      chapterFile && [...podcasts, largePodcast].find((p) => p.slug === chapterFile[1])
    const chapteredEpisode = chaptered?.episodes[Number(chapterFile?.[2])]
    if (chaptered?.chapters && chapteredEpisode) {
      // Chapters spread evenly over the Episode (Podcasting 2.0 JSON chapters).
      const step = chapteredEpisode[1] / chaptered.chapters.length
      res.writeHead(200, { "content-type": "application/json+chapters" })
      return res.end(
        JSON.stringify({
          version: "1.2.0",
          chapters: chaptered.chapters.map((title, i) => ({
            startTime: Math.round(i * step),
            title
          }))
        })
      )
    }
    const audio = path.match(/^\/audio\/([a-z-]+)\/(\d+)\.mp3$/)
    const episode =
      audio &&
      [...podcasts, largePodcast].find((p) => p.slug === audio[1])?.episodes[Number(audio[2])]
    if (episode) {
      const bytes = audioFor(episode[1])
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
      const start = range ? Number(range[1]) : 0
      const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
      res.writeHead(range ? 206 : 200, {
        "content-type": "audio/mpeg",
        "content-length": end - start + 1,
        "accept-ranges": "bytes",
        ...(range ? { "content-range": `bytes ${start}-${end}/${bytes.length}` } : {})
      })
      return res.end(bytes.subarray(start, end + 1))
    }
    res.writeHead(404).end()
  })
  const port = await listen(server)
  const origin = `http://127.0.0.1:${port}`
  return { origin, close: () => server.close() }
}

const freePort = async () => {
  const probe = createServer()
  const port = await listen(probe)
  await new Promise((resolve) => probe.close(resolve))
  return port
}

const waitFor = async (url) => {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`Server did not start at ${url}`)
}

/** Starts the fixture host and a seeded PodList server; returns its URL and a stop function. */
/** A demo server; `{ empty: true }` skips the seed, for first-run tests. */
export const startDemo = async ({ empty = false, large = false } = {}) => {
  const fixtures = await startFixtures()
  const dir = mkdtempSync(join(tmpdir(), "podlist-demo-"))
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  const server = spawn(process.execPath, [join(repo, "packages/server/src/main.ts")], {
    env: {
      // No Podcast Index keys: search goes to the fixture host below.
      ...Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !name.startsWith("PODCASTINDEX_"))
      ),
      PORT: String(port),
      DATABASE_PATH: join(dir, "podlist.db"),
      BACKUP_DIR: join(dir, "backups"),
      WEB_ROOT: process.env.PODLIST_TEST_WEB_ROOT ?? join(repo, "packages/web/dist"),
      // Search finds the fixture feeds, never the real directories.
      ITUNES_SEARCH_URL: `${fixtures.origin}/search`
    },
    stdio: ["ignore", "ignore", "inherit"]
  })
  const stop = () => {
    server.kill()
    fixtures.close()
    rmSync(dir, { recursive: true, force: true })
  }
  try {
    await waitFor(`${base}/api/health`)
    if (!empty) await seed(base, fixtures.origin, large)
  } catch (error) {
    stop()
    throw error
  }
  return { base, stop, fixtures: fixtures.origin }
}

const post = async (base, path, body) => {
  const response = await fetch(`${base}/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

const seed = async (base, origin, large) => {
  const subscriptions = []
  for (const podcast of large ? [...podcasts, largePodcast] : podcasts) {
    subscriptions.push(
      await post(base, "/subscriptions", { feedUrl: `${origin}/feeds/${podcast.slug}.xml` })
    )
  }
  const page = await (await fetch(`${base}/api/library/changes?since=0&limit=1000`)).json()
  const episodesOf = (podcastIndex) =>
    page.episodes
      .filter((e) => e.subscriptionId === subscriptions[podcastIndex].id)
      .sort((a, b) => b.published - a.published)
      .map((e) => e.id)
  const [field, build, market] = [episodesOf(0), episodesOf(1), episodesOf(2)]

  const device = { id: "demo-seed", name: "Demo seed", kind: "pwa", registeredAt: demoNow }
  await post(base, "/devices", device)
  const changes = [
    ...(large
      ? [
          {
            _tag: "CreatePlaylist",
            playlistId: "large",
            name: "Long listening",
            clearOnPlayed: false
          },
          ...episodesOf(3).map((episodeId) => ({
            _tag: "AddEntry",
            playlistId: "large",
            episodeId,
            placement: "last"
          }))
        ]
      : []),
    ...[field[0], market[1], build[0], field[2]].map((episodeId) => ({
      _tag: "AddEntry",
      playlistId: "default",
      episodeId,
      placement: "last"
    })),
    { _tag: "SetCursor", playlistId: "default", episodeId: market[1] },
    {
      _tag: "ReportPosition",
      playlistId: "default",
      episodeId: market[1],
      position: 754,
      listenedAt: demoNow
    },
    { _tag: "CreatePlaylist", playlistId: "commute", name: "Commute", clearOnPlayed: true },
    ...[market[0], market[2], market[3]].map((episodeId) => ({
      _tag: "AddEntry",
      playlistId: "commute",
      episodeId,
      placement: "last"
    })),
    { _tag: "SetCursor", playlistId: "commute", episodeId: market[0] },
    {
      _tag: "ReportPosition",
      playlistId: "commute",
      episodeId: market[0],
      position: 1320,
      listenedAt: demoNow
    },
    { _tag: "CreatePlaylist", playlistId: "workshop", name: "Workshop", clearOnPlayed: false },
    ...[build[1], build[2]].map((episodeId) => ({
      _tag: "AddEntry",
      playlistId: "workshop",
      episodeId,
      placement: "last"
    })),
    { _tag: "MarkPlayed", episodeId: field[1], source: { _tag: "User" } },
    { _tag: "SetStar", episodeId: field[3], starred: true },
    {
      _tag: "SaveView",
      view: {
        id: "new-this-week",
        name: "New this week",
        filter: { published: { _tag: "LastDays", days: 7 }, played: "unplayed" },
        sort: "publishedDesc",
        limit: null
      }
    },
    {
      _tag: "SaveView",
      view: {
        id: "short",
        name: "Under 30 minutes",
        filter: { maxDuration: 1800 },
        sort: "durationAsc",
        limit: null
      }
    },
    {
      _tag: "SaveView",
      view: {
        id: "starred",
        name: "Starred",
        filter: { starred: true },
        sort: "publishedDesc",
        limit: null
      }
    }
  ]
  await post(base, "/sync/push", {
    operations: changes.map((change, sequence) => ({
      id: `demo-${sequence}`,
      deviceId: device.id,
      sequence,
      recordedAt: demoNow,
      change
    }))
  })
}

// `node ui-flows/demo.mjs` runs the demo server until interrupted, for manual looks.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const demo = await startDemo()
  console.log(`PodList demo at ${demo.base}`)
  process.on("SIGINT", () => {
    demo.stop()
    process.exit(0)
  })
}
