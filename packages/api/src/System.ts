import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

export class Health extends Schema.Class<Health>("@podlist/api/Health")({
  status: Schema.Literal("ok"),
  /** The sync protocol this server speaks (ADR 0007). */
  protocolVersion: Schema.Int,
  /** The deployed release (its git commit), when the deploy set one. */
  release: Schema.optionalKey(Schema.String)
}) {}

export class SystemApi extends HttpApiGroup.make("system").add(
  HttpApiEndpoint.get("health", "/health", { success: Health })
) {}
