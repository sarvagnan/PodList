package app.podlist.data

import app.podlist.domain.BrowsingContext
import app.podlist.domain.ProtocolJson
import kotlinx.serialization.encodeToString

fun LocalDatabase.loadBrowsingContext(): BrowsingContext = transaction {
    val saved = getMeta("browsingContext")?.let { runCatching { ProtocolJson.decodeFromString<BrowsingContext>(it) }.getOrNull() } ?: BrowsingContext()
    val state = loadState()
    val episodeIds = (saved.stacks.values.flatten().filter { it.startsWith("episode:") }.map { it.substringAfter(':') } +
        saved.selections.filterKeys { !it.endsWith("/select-subscriptions") }.values.flatten()).distinct()
    val episodes = episodeIds.chunked(500).flatMap { ids -> query("SELECT id FROM episode WHERE id IN (${ids.joinToString(",") { "?" }})", ids) }
    saved.validated(
        state.views.map { it.id }.toSet(), state.playlists.map { it.id }.toSet(),
        query("SELECT id FROM subscription").map { it["id"] as String }.toSet(),
        episodes.map { it["id"] as String }.toSet(),
        FormDraftStore(this).load().keys.filter { it.startsWith("view:") }.map { it.substringBefore('/').removePrefix("view:") }.toSet()
    )
}

fun LocalDatabase.saveBrowsingContext(context: BrowsingContext) {
    setMeta("browsingContext", ProtocolJson.encodeToString(context))
}
