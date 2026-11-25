import type * as Ids from "./Ids.ts"
import type * as Library from "./Library.ts"
import * as Operation from "./Operation.ts"
import * as Protocol from "./Protocol.ts"
import type * as State from "./State.ts"
import * as View from "./View.ts"

export interface Catalogue {
  readonly subscriptions: ReadonlyArray<Library.Subscription>
  readonly episodes: ReadonlyArray<Library.Episode>
}

export interface BringOverSource extends Catalogue {
  readonly state: State.State
  readonly operations: ReadonlyArray<Operation.Operation>
  readonly downloads: ReadonlyArray<{ readonly episodeId: Ids.EpisodeId; readonly bytes: number }>
}

export const matchCatalogue = (source: Catalogue, destination: Catalogue) => {
  const destinations = new Map(destination.subscriptions.map((sub) => [sub.feedUrl, sub.id]))
  const subscriptions = new Map<Ids.SubscriptionId, Ids.SubscriptionId>()
  for (const sub of source.subscriptions) {
    const target = destinations.get(sub.feedUrl)
    if (target) subscriptions.set(sub.id, target)
  }

  const identity = (subscriptionId: Ids.SubscriptionId, guid: string) =>
    JSON.stringify([subscriptionId, guid])
  const byIdentity = new Map(
    destination.episodes.map((episode) => [
      identity(episode.subscriptionId, episode.guid),
      episode.id
    ])
  )
  const episodes = new Map<Ids.EpisodeId, Ids.EpisodeId>()
  for (const episode of source.episodes) {
    const sub = subscriptions.get(episode.subscriptionId)
    const target = sub && byIdentity.get(identity(sub, episode.guid))
    if (target) episodes.set(episode.id, target)
  }

  return { subscriptions, episodes }
}

export const previewBringOver = (source: BringOverSource, destination: Catalogue) => {
  const { subscriptions, episodes } = matchCatalogue(source, destination)
  const playlists = [
    ...source.state.playlists,
    ...(source.state.trash ?? []).map(({ playlist }) => playlist)
  ]
  const entries = playlists.flatMap((playlist) => playlist.entries)
  const episodeStates = Object.values(source.state.episodeStates)
  const listeningSeconds = Object.values(source.state.listeningLog ?? {}).reduce(
    (total, day) => total + Object.values(day).reduce((seconds, amount) => seconds + amount, 0),
    0
  )
  return {
    addedSubscriptions: source.subscriptions.length - subscriptions.size,
    mergedSubscriptions: subscriptions.size,
    addedEpisodes: source.episodes.length - episodes.size,
    mergedEpisodes: episodes.size,
    playlists: playlists.filter((playlist) => !playlist.isDefault).length,
    entries: entries.length,
    positions: entries.filter((entry) => entry.position > 0).length,
    played: episodeStates.filter((episode) => episode.played !== null).length,
    starred: episodeStates.filter((episode) => episode.starred).length,
    listeningSeconds,
    views: source.state.views.length,
    downloads: source.downloads.length
  }
}

const requireMatch = <Id extends string>(ids: ReadonlyMap<Id, Id>, id: Id) => {
  const target = ids.get(id)
  if (target === undefined)
    throw new Error(`Unmatched Library reference: ${id}. Retry after Library sync.`)
  return target
}

/** Call after the server has imported the metadata. Keep Operation ids stable across retries. */
export function mapBringOver(
  source: BringOverSource,
  destination: Catalogue,
  options: {
    readonly sourceDevice: Ids.DeviceId
    readonly destinationDevice: Ids.DeviceId
    readonly serverVersion: number
    readonly playlists: ReadonlyMap<Ids.PlaylistId, Ids.PlaylistId>
    readonly views: ReadonlyMap<Ids.ViewId, Ids.ViewId>
  }
) {
  const ids = matchCatalogue(source, destination)
  const s = (id: Ids.SubscriptionId) => requireMatch(ids.subscriptions, id)
  const e = (id: Ids.EpisodeId) => requireMatch(ids.episodes, id)
  const p = (id: Ids.PlaylistId) => options.playlists.get(id) ?? id
  const v = (id: Ids.ViewId) => options.views.get(id) ?? id

  for (const subscription of source.subscriptions) s(subscription.id)
  for (const episode of source.episodes) e(episode.id)
  const amounts = <A extends { readonly subscriptionId: Ids.SubscriptionId }>(
    entries: ReadonlyArray<A>
  ) => entries.map((amount) => ({ ...amount, subscriptionId: s(amount.subscriptionId) }))

  const rewrite = (change: Operation.Change): Operation.Change => {
    switch (change._tag) {
      case "AddEntry":
      case "RemoveEntry":
        return { ...change, playlistId: p(change.playlistId), episodeId: e(change.episodeId) }
      case "MoveEntry":
        return {
          ...change,
          playlistId: p(change.playlistId),
          episodeId: e(change.episodeId),
          after: change.after === null ? null : e(change.after)
        }
      case "SetCursor":
        return {
          ...change,
          playlistId: p(change.playlistId),
          episodeId: change.episodeId === null ? null : e(change.episodeId)
        }
      case "ReportPosition":
        return {
          ...change,
          playlistId: p(change.playlistId),
          episodeId: e(change.episodeId),
          ...(change.listening === undefined ? {} : { listening: amounts(change.listening) })
        }
      case "RecordListening":
        return { ...change, amounts: amounts(change.amounts) }
      case "MarkPlayed":
        return {
          ...change,
          episodeId: e(change.episodeId),
          source:
            change.source._tag === "User"
              ? change.source
              : { ...change.source, playlistId: p(change.source.playlistId) }
        }
      case "MarkUnplayed":
      case "SetStar":
        return { ...change, episodeId: e(change.episodeId) }
      case "MarkSubscriptionPlayed":
        throw new Error("Standalone Played changes must be expanded before Bring Over.")
      case "SetSubscriptionOverrides":
        return { ...change, subscriptionId: s(change.subscriptionId) }
      case "CreatePlaylist":
      case "RenamePlaylist":
      case "SetClearOnPlayed":
      case "DeletePlaylist":
      case "RestorePlaylist":
      case "PurgePlaylist":
      case "SetActivePlaylist":
      case "Rewind":
        return { ...change, playlistId: p(change.playlistId) }
      case "SaveView": {
        const filter = change.view.filter
        return {
          ...change,
          view: new View.View({
            ...change.view,
            id: v(change.view.id),
            filter: {
              ...filter,
              ...(filter.podcasts === undefined
                ? {}
                : {
                    podcasts: {
                      ...filter.podcasts,
                      subscriptionIds: [
                        s(filter.podcasts.subscriptionIds[0]),
                        ...filter.podcasts.subscriptionIds.slice(1).map(s)
                      ]
                    }
                  })
            }
          })
        }
      }
      case "DeleteView":
        return { ...change, viewId: v(change.viewId) }
      case "SetDownloadRule":
        return {
          ...change,
          rule: {
            ...change.rule,
            deviceId:
              change.rule.deviceId === options.sourceDevice
                ? options.destinationDevice
                : change.rule.deviceId,
            subscriptionId: s(change.rule.subscriptionId)
          }
        }
      case "SetTrashDays":
      case "SetPlaybackSettings":
        return change
    }
  }

  if (
    Protocol.requiredVersion(source.operations.map(({ change }) => change._tag)) >
    options.serverVersion
  )
    throw new Error("Update the PodList server to bring over this Library.")

  return {
    operations: source.operations.map(
      (operation) => new Operation.Operation({ ...operation, change: rewrite(operation.change) })
    ),
    downloads: source.downloads.map((download) => ({
      ...download,
      episodeId: e(download.episodeId)
    }))
  }
}
