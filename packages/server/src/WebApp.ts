import { readFile } from "node:fs/promises"
import { extname, join, normalize, sep } from "node:path"
import { Effect } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"

// Serves the built web app from the same origin as the API, so the PWA, its service
// worker, the API and the audio proxy share one address on the tailnet (no CORS).

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2"
}

/** Hashed build assets never change; the shell and service worker must always be fresh. */
const cacheControl = (path: string) =>
  path.startsWith(`assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache"

export const route = (root: string) =>
  HttpRouter.add(
    "GET",
    "/*",
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname)
      const relative = normalize(pathname).replace(/^([/\\])+/, "")
      if (relative.startsWith("..") || relative.startsWith("api")) {
        return HttpServerResponse.text("Not found", { status: 404 })
      }
      const serve = (path: string) =>
        Effect.tryPromise(() => readFile(join(root, path))).pipe(
          Effect.map((bytes) =>
            HttpServerResponse.uint8Array(new Uint8Array(bytes), {
              contentType: types[extname(path)] ?? "application/octet-stream",
              headers: { "cache-control": cacheControl(path) }
            })
          )
        )
      // Unknown paths are client-side routes: answer with the app shell.
      return yield* serve(relative === "" ? "index.html" : relative).pipe(
        Effect.catch(() => serve("index.html")),
        Effect.orElseSucceed(() => HttpServerResponse.text("Web app not built", { status: 404 }))
      )
    })
  )
