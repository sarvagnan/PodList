import { Protocol } from "@podlist/domain"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import { PodListApi } from "./index.ts"
import {
  artworkPath,
  audioPath,
  forwardedRequestHeaders,
  forwardedResponseHeaders
} from "./Media.ts"

// The two raw streaming routes use HttpRouter, rather than JSON handlers. Keep their
// contract alongside the typed API; no streaming body is buffered by an API codec.
const text = (status: number) =>
  Schema.String.pipe(HttpApiSchema.asText(), HttpApiSchema.status(status))
const bytes = (status: number, contentType: string) =>
  Schema.Uint8Array.pipe(HttpApiSchema.asUint8Array({ contentType }), HttpApiSchema.status(status))
const media = HttpApiGroup.make("media")
  .add(
    HttpApiEndpoint.get("audio", audioPath, {
      params: { id: Schema.String },
      success: [bytes(200, "*/*"), bytes(206, "*/*"), Schema.Void.pipe(HttpApiSchema.status(304))],
      error: [text(404), text(416), text(502)]
    }).annotate(OpenApi.Transform, (operation) => ({
      ...operation,
      description:
        "Streams only the Episode audio URL in the Library. Follows upstream redirects; upstream status/body pass through, including errors beyond those listed. No transcoding. Range, If-Range, If-None-Match and If-Modified-Since are forwarded. Response Content-Type, Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified and Cache-Control pass through.",
      parameters: [
        ...(operation.parameters ?? []),
        ...forwardedRequestHeaders.map((name) => ({
          name,
          in: "header",
          required: false,
          schema: { type: "string" }
        }))
      ],
      responses: {
        default: {
          description: "Other upstream status; body and Content-Type pass through unchanged.",
          content: { "*/*": { schema: { type: "string", format: "binary" } } }
        },
        ...Object.fromEntries(
          Object.entries(operation.responses as Record<string, object>).map(
            ([status, response]) => [
              status,
              {
                ...response,
                headers: Object.fromEntries(
                  forwardedResponseHeaders
                    .filter((name) => name !== "content-type")
                    .map((name) => [name, { schema: { type: "string" } }])
                )
              }
            ]
          )
        )
      }
    }))
  )
  .add(
    HttpApiEndpoint.get("artwork", artworkPath, {
      query: { url: Schema.String, size: Schema.optionalKey(Schema.String) },
      success: bytes(200, "image/webp"),
      error: [text(400), text(404), text(502)]
    }).annotate(
      OpenApi.Description,
      "HTTP(S) Artwork named in the Library only (or already cached). Size defaults to 512 and rounds up to 64, 128, 256 or 512; values above 512 use 512. Returns square WebP, Cache-Control: public, max-age=604800."
    )
  )

/** Generated from the API definitions plus the raw streaming route contracts. */
export const openApiDocument = () => {
  const spec = OpenApi.fromApi(
    PodListApi.add(media)
      .annotate(OpenApi.Title, "PodList HTTP API")
      .annotate(OpenApi.Version, String(Protocol.version))
  )
  for (const path of Object.values(spec.paths)) {
    for (const method of [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
      "trace"
    ] as const) {
      const operation = path[method]
      if (operation === undefined) continue
      if (operation.tags?.includes("media")) continue
      if (operation.requestBody || operation.parameters?.length) {
        const declared = operation.responses["400"]
        operation.responses["400"] = {
          ...declared,
          description: `${declared ? "Declared error as JSON, or " : ""}Malformed request (HttpApiSchemaError); empty response body.`
        }
      }
    }
  }
  return {
    ...spec,
    info: {
      title: "PodList HTTP API",
      version: String(Protocol.version),
      description:
        "Single-user API. Authentication and authorization are provided by reachability over the user's Tailscale tailnet (ADR 0004). There is no application login, bearer token, API key or cookie requirement. Keep the server private to the tailnet. Protocol version is also returned by GET /api/health. Paths include /api; use the server origin as the base URL. JSON endpoints return an empty 400 response for malformed input (HttpApiSchemaError); infrastructure failures may return 5xx. The two streaming endpoints are implemented with raw HttpRouter handlers."
    },
    security: []
  }
}
