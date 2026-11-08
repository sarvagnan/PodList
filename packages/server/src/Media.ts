import { Media as MediaContract } from "@podlist/api"
import { Context, Effect } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { SqlClient } from "effect/sql"

// Streams an Episode's audio through the server so the browser can store it for
// offline listening: same-origin, so no CORS. Only audio URLs from the catalogue are
// fetched, so this is not an open proxy. Range requests pass through for seeking.

/** How the server reaches podcast hosts; replaced in tests. */
export const Upstream = Context.Reference<(request: Request) => Promise<Response>>(
  "@podlist/server/Media/Upstream",
  { defaultValue: () => (request) => fetch(request) }
)

export const AudioRoute = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const upstream = yield* Upstream
    yield* router.add("GET", MediaContract.audioPath, serveAudio(sql, upstream))
  })
)

const serveAudio = (sql: SqlClient.SqlClient, upstream: (request: Request) => Promise<Response>) =>
  Effect.gen(function* () {
    const { id } = yield* HttpRouter.params
    const request = yield* HttpServerRequest.HttpServerRequest
    const [episode] = yield* sql<{ audio_url: string }>`
      SELECT audio_url FROM episode WHERE id = ${id ?? ""}`.pipe(Effect.orDie)
    if (episode === undefined) return HttpServerResponse.text("No such Episode", { status: 404 })

    const headers = new Headers()
    for (const name of MediaContract.forwardedRequestHeaders) {
      const value = request.headers[name]
      if (value !== undefined) headers.set(name, value)
    }
    const response = yield* Effect.tryPromise(() =>
      upstream(new Request(episode.audio_url, { headers, redirect: "follow" }))
    ).pipe(Effect.orElseSucceed(() => new Response("Upstream unreachable", { status: 502 })))

    const outHeaders = new Headers()
    for (const name of MediaContract.forwardedResponseHeaders) {
      const value = response.headers.get(name)
      if (value !== null) outHeaders.set(name, value)
    }
    return HttpServerResponse.fromWeb(
      new Response(response.body, { status: response.status, headers: outHeaders })
    )
  })
