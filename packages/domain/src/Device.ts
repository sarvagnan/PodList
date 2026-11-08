import { Schema } from "effect"
import { DeviceId, SubscriptionId } from "./Ids.ts"
import { EpochMillis, PositiveInt } from "./Units.ts"

/** One installation of the client. Download decisions are made per Device. */
export class Device extends Schema.Class<Device>("@podlist/domain/Device")({
  id: DeviceId,
  name: Schema.NonEmptyString,
  kind: Schema.Literals(["pwa", "desktop"]),
  registeredAt: EpochMillis
}) {}

/**
 * When a Subscription's Episodes are stored offline on one Device. The cap only
 * counts "allNew" downloads; Entry and Manual Downloads never count toward it (Q21).
 */
export class DownloadRule extends Schema.Class<DownloadRule>("@podlist/domain/DownloadRule")({
  subscriptionId: SubscriptionId,
  deviceId: DeviceId,
  mode: Schema.Literals(["never", "onEntry", "allNew"]),
  keepAtMost: Schema.NullOr(PositiveInt),
  /** Activation time for All New; absent only in legacy rules or other modes. */
  since: Schema.optional(EpochMillis)
}) {}
