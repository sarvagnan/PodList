import { Schema } from "effect"

export const EpisodeId = Schema.String.pipe(Schema.brand("EpisodeId"))
export type EpisodeId = typeof EpisodeId.Type

export const PlaylistId = Schema.String.pipe(Schema.brand("PlaylistId"))
export type PlaylistId = typeof PlaylistId.Type
