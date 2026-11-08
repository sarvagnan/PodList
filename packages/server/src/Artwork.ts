import { createHash } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Media as MediaContract } from "@podlist/api"
import { Effect } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { SqlClient } from "effect/sql"
import sharp from "sharp"
import { Upstream } from "./Media.ts"

// Podcast, Episode and Chapter images, resized and served from the app's own origin.
// Feed artwork is often 3000 px and sometimes plain http (blocked on an https page);
// the app asks for the size it draws at and gets a small WebP it can cache offline.
// Only images named in the catalogue are fetched, so this is not an open proxy.

/** The sizes served; a request is rounded up to the next one. */
export const sizes = [64, 128, 256, 512] as const
const largestDownload = 25 * 1024 * 1024
const userAgent = "PodList/0.1 (self-hosted podcast client)"

const sizeFor = (requested: number) => sizes.find((s) => s >= requested) ?? 512

const webp = (bytes: Uint8Array) =>
  HttpServerResponse.uint8Array(bytes, {
    contentType: "image/webp",
    // A feed can change an image in place, so cache for a week rather than forever.
    headers: { "cache-control": "public, max-age=604800" }
  })

export const ArtworkRoute = (cacheDir: string) =>
  HttpRouter.use((router) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const upstream = yield* Upstream
      yield* Effect.promise(() => mkdir(cacheDir, { recursive: true }))

      const inCatalogue = (url: string) =>
        sql<{ found: number }>`
          SELECT 1 AS found FROM subscription WHERE artwork_url = ${url}
          UNION ALL SELECT 1 FROM episode WHERE artwork_url = ${url}
          UNION ALL SELECT 1 FROM episode WHERE instr(chapters, ${JSON.stringify(url)}) > 0
          LIMIT 1`.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.orDie
        )

      const resize = (url: string, size: number) =>
        Effect.tryPromise(async () => {
          const response = await upstream(
            new Request(url, { headers: { "user-agent": userAgent }, redirect: "follow" })
          )
          if (!response.ok) throw new Error(`upstream ${response.status}`)
          if (Number(response.headers.get("content-length") ?? 0) > largestDownload) {
            throw new Error("image too large")
          }
          const original = Buffer.from(await response.arrayBuffer())
          return sharp(original)
            .resize(size, size, { fit: "cover" })
            .webp({ quality: 80 })
            .toBuffer()
        })

      yield* router.add(
        "GET",
        MediaContract.artworkPath,
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const query = new URL(request.url, "http://local").searchParams
          const url = query.get("url")
          if (url === null || !/^https?:\/\//.test(url)) {
            return HttpServerResponse.text("Missing image url", { status: 400 })
          }
          const size = sizeFor(Number(query.get("size") ?? 512))
          const file = join(
            cacheDir,
            `${createHash("sha256").update(url).digest("hex").slice(0, 32)}-${size}.webp`
          )
          const cached = yield* Effect.tryPromise(() => readFile(file)).pipe(Effect.option)
          if (cached._tag === "Some") return webp(cached.value)

          if (!(yield* inCatalogue(url))) {
            return HttpServerResponse.text("Not a catalogue image", { status: 404 })
          }
          return yield* resize(url, size).pipe(
            Effect.tap((bytes) =>
              Effect.tryPromise(async () => {
                // Write then rename, so a concurrent reader never sees half a file.
                const partial = `${file}.${process.pid}.part`
                await writeFile(partial, bytes)
                await rename(partial, file)
              }).pipe(Effect.ignore)
            ),
            Effect.map(webp),
            Effect.catch(() =>
              Effect.succeed(HttpServerResponse.text("Image unavailable", { status: 502 }))
            )
          )
        })
      )
    })
  )
