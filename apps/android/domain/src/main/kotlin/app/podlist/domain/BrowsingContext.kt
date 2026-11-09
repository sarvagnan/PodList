package app.podlist.domain

import kotlinx.serialization.Serializable

@Serializable
data class ScrollAnchor(val key: String? = null, val index: Int = 0, val offset: Int = 0)

@Serializable
data class BrowsingContext(
    val destination: String = "Views",
    val stacks: Map<String, List<String>> = emptyMap(),
    val scrolls: Map<String, ScrollAnchor> = emptyMap(),
    val playlistTabs: Map<String, Int> = emptyMap(),
    val searchText: String = "",
    val statsTable: Boolean = false
) {
    fun validated(views: Set<String>, playlists: Set<String>, subscriptions: Set<String>, episodes: Set<String>): BrowsingContext {
        fun exists(route: String): Boolean {
            val id = route.substringAfter(':')
            return when (route.substringBefore(':')) {
                "view", "view-edit" -> id in views
                "playlist", "playlist-settings" -> id in playlists
                "subscription", "subscription-settings" -> id in subscriptions
                "episode" -> id in episodes
                "podcast" -> id.isNotBlank()
                "settings", "search", "listening-stats", "select-subscriptions", "server", "add-podcasts", "trash", "new-playlist" -> true
                else -> false
            }
        }
        return copy(
            destination = destination.takeIf { it in setOf("Views", "Playlists", "Library") } ?: "Views",
            stacks = stacks.filterKeys { it in setOf("Views", "Playlists", "Library") }.mapValues { (_, stack) -> stack.takeWhile(::exists) },
            scrolls = scrolls.mapValues { (_, anchor) -> anchor.copy(index = anchor.index.coerceAtLeast(0), offset = anchor.offset.coerceAtLeast(0)) },
            playlistTabs = playlistTabs.filterKeys { it in playlists }.mapValues { (_, tab) -> tab.coerceIn(0, 2) }
        )
    }

    fun visiting(destination: String, route: String?): BrowsingContext {
        val stack = stacks[destination].orEmpty()
        val index = stack.indexOf(route)
        val next = when { route == null -> emptyList(); index >= 0 -> stack.take(index + 1); else -> stack + route }
        return copy(stacks = stacks + (destination to next))
    }
}

fun restoredScrollIndex(anchor: ScrollAnchor, keys: List<String>): Int =
    keys.indexOf(anchor.key).takeIf { it >= 0 } ?: anchor.index.coerceIn(0, (keys.size - 1).coerceAtLeast(0))
