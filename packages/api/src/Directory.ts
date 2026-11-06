import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

export class DirectoryResult extends Schema.Class<DirectoryResult>("@podlist/api/DirectoryResult")({
  title: Schema.String,
  author: Schema.NullOr(Schema.String),
  feedUrl: Schema.String,
  artworkUrl: Schema.NullOr(Schema.String),
  source: Schema.Literals(["podcastindex", "itunes"])
}) {}

export class DirectoryApi extends HttpApiGroup.make("directory").add(
  HttpApiEndpoint.get("search", "/directory/search", {
    query: { q: Schema.NonEmptyString },
    success: Schema.Array(DirectoryResult)
  })
) {}
