import { Schema } from "effect"

// Identifiers are opaque strings minted by whoever creates the thing (server for
// Subscriptions/Episodes, any Device for Playlists/Views/Operations). Branding keeps
// them from being mixed up.

export const SubscriptionId = Schema.NonEmptyString.pipe(Schema.brand("SubscriptionId"))
export type SubscriptionId = typeof SubscriptionId.Type

export const EpisodeId = Schema.NonEmptyString.pipe(Schema.brand("EpisodeId"))
export type EpisodeId = typeof EpisodeId.Type

export const PlaylistId = Schema.NonEmptyString.pipe(Schema.brand("PlaylistId"))
export type PlaylistId = typeof PlaylistId.Type

export const ViewId = Schema.NonEmptyString.pipe(Schema.brand("ViewId"))
export type ViewId = typeof ViewId.Type

export const DeviceId = Schema.NonEmptyString.pipe(Schema.brand("DeviceId"))
export type DeviceId = typeof DeviceId.Type

/** Unique per recorded change, so replaying an operation twice is harmless. */
export const OperationId = Schema.NonEmptyString.pipe(Schema.brand("OperationId"))
export type OperationId = typeof OperationId.Type
