import { Device, Operation, Protocol, State } from "@podlist/domain"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

/** A Device's queued operations, in order. Inspect tags before closed-union validation. */
export class PushRequest extends Schema.Class<PushRequest>("@podlist/api/PushRequest")({
  operations: Schema.Array(Schema.Union([Operation.Operation, Schema.Unknown]))
}) {}

export class PushResponse extends Schema.Class<PushResponse>("@podlist/api/PushResponse")({
  /** The server log position after this push. */
  cursor: Schema.Int,
  /** How many operations were new; repeats of already-applied ids are skipped. */
  accepted: Schema.Int,
  /** All submitted ids are committed, including previously committed retries. Absent on older servers. */
  acknowledged: Schema.optionalKey(Schema.Array(Schema.String))
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

export class UpdateRequired extends Schema.TaggedError<UpdateRequired>()(
  "UpdateRequired",
  { minimumProtocolVersion: Schema.Int, unsupportedOperations: Schema.Array(Schema.String) },
  { httpApiStatus: 426 }
) {}
export class UnsupportedOperation extends Schema.TaggedError<UnsupportedOperation>()(
  "UnsupportedOperation",
  { serverProtocolVersion: Schema.Int, unsupportedOperations: Schema.Array(Schema.String) },
  { httpApiStatus: 422 }
) {}
export class InvalidOperation extends Schema.TaggedError<InvalidOperation>()(
  "InvalidOperation",
  {},
  { httpApiStatus: 400 }
) {}
export const versionHeaders = { [Protocol.versionHeader]: Schema.optionalKey(Schema.String) }

export class SyncApi extends HttpApiGroup.make("sync")
  .add(
    HttpApiEndpoint.post("registerDevice", "/devices", {
      payload: Device.Device,
      success: Device.Device
    })
  )
  .add(
    HttpApiEndpoint.post("push", "/sync/push", {
      payload: PushRequest,
      headers: versionHeaders,
      success: PushResponse,
      error: [UnsupportedOperation, InvalidOperation]
    })
  )
  .add(
    HttpApiEndpoint.get("pull", "/sync/pull", {
      query: { since: Schema.NumberFromString.pipe(Schema.check(Schema.isInt())) },
      headers: versionHeaders,
      success: PullResponse,
      error: UpdateRequired
    })
  ) {}
