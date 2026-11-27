import { Library as LibraryApi } from "@podlist/api"
import { type Library, Mentions, Sql, State } from "@podlist/domain"
import { parseOpml } from "@podlist/feeds/opml"
import { Schema } from "effect"
import type { ImportPodcast } from "../library/OpmlImport.ts"
import { checkOpml, invalidOpml } from "../library/opmlFormat.ts"
import { episodeRow, subscriptionRow } from "../sync/Catalogue.ts"

const StateJson = Schema.fromJsonString(State.State)
const CatalogueJson = Schema.fromJsonString(LibraryApi.CatalogueChanges)

type Tasks = {
  readonly catalogue: { readonly json: string }
  readonly episodeRows: { readonly episodes: ReadonlyArray<Library.Episode> }
  readonly fold: { readonly text: ReadonlyArray<string> }
  readonly encodeState: { readonly state: State.State }
  readonly decodeState: { readonly json: string }
  readonly decodeRows: { readonly rows: Sql.StoredStateRows }
  readonly opml: { readonly xml: string }
}

export type Request = {
  [K in keyof Tasks]: { readonly task: K } & Tasks[K]
}[keyof Tasks]

export const execute = (request: Request) => {
  switch (request.task) {
    case "catalogue": {
      const page = Schema.decodeSync(CatalogueJson)(request.json)
      return {
        cursor: page.cursor,
        more: page.more,
        subscriptions: [...page.subscriptions, ...(page.referencedSubscriptions ?? [])].map(
          subscriptionRow
        ),
        episodes: page.episodes.map(episodeRow)
      }
    }
    case "episodeRows":
      return request.episodes.map(episodeRow)
    case "fold":
      return request.text.map(Mentions.fold)
    case "encodeState":
      // Schema classes across a Worker boundary arrive as plain objects.
      return Schema.encodeSync(StateJson)(Schema.decodeUnknownSync(State.State)(request.state))
    case "decodeState":
      return Schema.decodeSync(StateJson)(request.json)
    case "decodeRows":
      return Sql.rowsToState(request.rows)
    case "opml":
      checkOpml(request.xml)
      try {
        return parseOpml(request.xml).map((podcast) => ({ ...podcast, result: "pending" as const }))
      } catch {
        throw invalidOpml()
      }
  }
}

export type Reply = {
  readonly catalogue: {
    readonly cursor: number
    readonly more: boolean
    readonly subscriptions: ReadonlyArray<ReturnType<typeof subscriptionRow>>
    readonly episodes: ReadonlyArray<ReturnType<typeof episodeRow>>
  }
  readonly episodeRows: ReadonlyArray<ReturnType<typeof episodeRow>>
  readonly fold: ReadonlyArray<string>
  readonly encodeState: string
  readonly decodeState: State.State
  readonly decodeRows: State.State
  readonly opml: ReadonlyArray<ImportPodcast>
}

export type WorkReply =
  | { readonly id: number; readonly result: Reply[keyof Reply] }
  | { readonly id: number; readonly error: string }
