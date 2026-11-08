package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

typealias Row = Map<String, Any?>
typealias StateRows = Map<String, List<Row>>

/** Shared State-to-rows mapping from Sql.ts. Trash never contributes to entry_index. */
object StateIndex {
    private inline fun <reified T> json(value: T) = ProtocolJson.encodeToString(value)
    private inline fun <reified T> decode(value: Any?): T = ProtocolJson.decodeFromString(value as String)

    fun stateToRows(state: State): StateRows = linkedMapOf(
        "playlist" to state.playlists.mapIndexed { ordinal, p -> mapOf("id" to p.id, "ordinal" to ordinal, "doc" to json(p)) },
        "view" to state.views.mapIndexed { ordinal, v -> mapOf("id" to v.id, "ordinal" to ordinal, "doc" to json(v)) },
        "episode_state" to state.episodeStates.values.map { fact -> mapOf(
            "episode_id" to fact.episodeId, "played_at" to fact.played?.at,
            "played_source" to fact.played?.let { json(it) }, "starred" to if (fact.starred) 1 else 0
        ) },
        "entry_index" to state.playlists.flatMap { p -> p.entries.mapIndexed { ordinal, e -> mapOf(
            "playlist_id" to p.id, "episode_id" to e.episodeId, "ordinal" to ordinal, "position" to e.position
        ) } },
        "download_rule" to state.downloadRules.map { r -> mapOf(
            "subscription_id" to r.subscriptionId, "device_id" to r.deviceId,
            "mode" to json(r.mode).removeSurrounding("\""), "keep_at_most" to r.keepAtMost
        ) },
        "setting" to buildList {
            state.listeningLog?.let { add(mapOf("key" to "listeningLog", "value" to json(it))) }
            add(mapOf("key" to "activePlaylistId", "value" to json(state.activePlaylistId)))
            add(mapOf("key" to "playbackSettings", "value" to json(state.playbackSettings)))
            state.trash?.let { add(mapOf("key" to "trash", "value" to json(it))) }
            state.trashDays?.let { add(mapOf("key" to "trashDays", "value" to json(it))) }
        }
    )

    fun rowsToState(rows: StateRows): State {
        val settings = rows.getValue("setting").associate { it.getValue("key") as String to it.getValue("value") }
        return State(
            playlists = rows.getValue("playlist").sortedBy { (it.getValue("ordinal") as Number).toLong() }.map { decode(it["doc"]) },
            activePlaylistId = decode(settings.getValue("activePlaylistId")),
            episodeStates = rows.getValue("episode_state").associate { row ->
                val id = row.getValue("episode_id") as String
                id to EpisodeState(id, row["played_source"]?.let { decode<Played>(it) }, (row["starred"] as Number).toInt() == 1)
            },
            views = rows.getValue("view").sortedBy { (it.getValue("ordinal") as Number).toLong() }.map { decode(it["doc"]) },
            downloadRules = rows.getValue("download_rule").map { row -> DownloadRule(
                row.getValue("subscription_id") as String, row.getValue("device_id") as String,
                decode(json(row.getValue("mode") as String)), (row["keep_at_most"] as? Number)?.toLong()
            ) },
            playbackSettings = decode(settings.getValue("playbackSettings")),
            trash = settings["trash"]?.let { decode(it) },
            trashDays = settings["trashDays"]?.let { decode(it) },
            listeningLog = settings["listeningLog"]?.let { decode(it) }
        )
    }
}
