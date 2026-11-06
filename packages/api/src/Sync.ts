import { Device, Operation, State } from "@podlist/domain"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

/** A Device's queued operations, in the order it recorded them. */
export class PushRequest extends Schema.Class<PushRequest>("@podlist/api/PushRequest")({
  operations: Schema.Array(Operation.Operation)
}) {}

export class PushResponse extends Schema.Class<PushResponse>("@podlist/api/PushResponse")({
  /** The server log position after this push. */
  cursor: Schema.Int,
  /** How many operations were new; repeats of already-applied ids are skipped. */
  accepted: Schema.Int
}) {}

/**
 * What a Device needs to catch up from `since`. A Device that has synced before gets
 * the operations it has not seen, in server order, and replays them with the domain
 * reducer. A first sync (`since` 0) gets the whole State instead.
 */
export class PullResponse extends Schema.Class<PullResponse>("@podlist/api/PullResponse")({
  cursor: Schema.Int,
  snapshot: Schema.NullOr(State.State),
  operations: Schema.Array(Operation.Operation)
}) {}

export class SyncApi extends HttpApiGroup.make("sync")
  .add(
    HttpApiEndpoint.post("registerDevice", "/devices", {
      payload: Device.Device,
      success: Device.Device
    })
  )
  .add(HttpApiEndpoint.post("push", "/sync/push", { payload: PushRequest, success: PushResponse }))
  .add(
    HttpApiEndpoint.get("pull", "/sync/pull", {
      query: { since: Schema.NumberFromString.pipe(Schema.check(Schema.isInt())) },
      success: PullResponse
    })
  ) {}
