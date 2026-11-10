package app.podlist

import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import app.podlist.domain.BrowsingContext
import app.podlist.domain.ScrollAnchor
import app.podlist.domain.restoredScrollIndex
import kotlinx.coroutines.flow.filterNotNull

@Stable
internal class BrowsingState(initial: BrowsingContext) {
    var context by mutableStateOf(initial)
    val focusedRoutes = initial.stacks.flatMap { (destination, stack) -> stack.map { "$destination/$it" } }.toMutableSet()
}

internal val LocalBrowsingState = staticCompositionLocalOf<BrowsingState?> { null }
internal val LocalBrowsingRoute = staticCompositionLocalOf { "" }

@Composable
internal fun rememberBrowsingListState(name: String = "list", keys: List<String>? = null, ready: Boolean = true): LazyListState {
    val browsing = LocalBrowsingState.current
    val route = LocalBrowsingRoute.current
    val key = "$route/$name"
    val anchor = remember(key) { browsing?.context?.scrolls?.get(key) ?: ScrollAnchor() }
    val list = rememberLazyListState(anchor.index, anchor.offset)
    // LazyListState already saves the live anchor across Activity recreation (including night mode).
    // Do not replay the older database anchor over that saved position.
    var restored by rememberSaveable(key) { mutableStateOf(false) }
    LaunchedEffect(list, key, ready) {
        if (!ready || restored) return@LaunchedEffect
        val index = if (keys == null) anchor.index else restoredScrollIndex(anchor, keys)
        list.scrollToItem(index, anchor.offset)
        restored = true
    }
    LaunchedEffect(list, key, restored) {
        if (!restored) return@LaunchedEffect
        snapshotFlow {
            val first = list.firstVisibleItemIndex
            val itemKey = list.layoutInfo.visibleItemsInfo.firstOrNull { it.index == first }?.key as? String
            if (list.isScrollInProgress) null else Triple(first, list.firstVisibleItemScrollOffset, itemKey)
        }.filterNotNull().collect { (first, offset, itemKey) ->
            if (list.layoutInfo.totalItemsCount > 0 && browsing != null) {
                browsing.context = browsing.context.copy(scrolls = browsing.context.scrolls + (key to ScrollAnchor(itemKey, first, offset)))
            }
        }
    }
    return list
}

@Composable
internal fun rememberPlaylistTab(playlist: String): MutableIntState {
    val browsing = LocalBrowsingState.current
    val tab = rememberSaveable(playlist) { mutableIntStateOf(browsing?.context?.playlistTabs?.get(playlist) ?: 0) }
    LaunchedEffect(tab.intValue) {
        if (browsing != null) browsing.context = browsing.context.copy(playlistTabs = browsing.context.playlistTabs + (playlist to tab.intValue))
    }
    return tab
}
