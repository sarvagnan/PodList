package app.podlist

import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import app.podlist.domain.BrowsingContext
import app.podlist.domain.ScrollAnchor
import app.podlist.domain.restoredScrollIndex
import kotlinx.coroutines.flow.filter

@Stable
internal class BrowsingState(initial: BrowsingContext) {
    var context by mutableStateOf(initial)
}

internal val LocalBrowsingState = staticCompositionLocalOf<BrowsingState?> { null }
internal val LocalBrowsingRoute = staticCompositionLocalOf { "" }

@Composable
internal fun rememberBrowsingListState(name: String = "list", keys: List<String>? = null): LazyListState {
    val browsing = LocalBrowsingState.current
    val route = LocalBrowsingRoute.current
    val key = "$route/$name"
    val anchor = remember(key) { browsing?.context?.scrolls?.get(key) ?: ScrollAnchor() }
    val index = if (keys == null) anchor.index else restoredScrollIndex(anchor, keys)
    val list = rememberLazyListState(index, anchor.offset)
    LaunchedEffect(list, key) {
        snapshotFlow { Triple(list.isScrollInProgress, list.firstVisibleItemIndex, list.firstVisibleItemScrollOffset) }
            .filter { !it.first }.collect { (_, first, offset) ->
                if (list.layoutInfo.totalItemsCount > 0 && browsing != null) {
                    val itemKey = list.layoutInfo.visibleItemsInfo.firstOrNull { it.index == first }?.key as? String
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
