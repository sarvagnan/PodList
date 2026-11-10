@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.ui.input.key.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.semantics.*
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*

@Stable internal class EpisodeSelection {
    var order by mutableStateOf(emptyList<String>())
    var ids by mutableStateOf(setOf<String>())
    fun toggleAll() { ids = ListSelection.toggleAll(order, ids) }
    fun toggle(id: String) { ids = if(id in ids) ids - id else ids + id }
}
internal val LocalEpisodeSelection = staticCompositionLocalOf<EpisodeSelection?> { null }

@Composable
internal fun SelectionProvider(key: String?, data: ScreenData?, session: Session, content: @Composable () -> Unit) {
    val browsing = LocalBrowsingState.current
    val route = LocalBrowsingRoute.current
    val selection = rememberSaveable(route, saver = Saver<EpisodeSelection, ArrayList<String>>(save = { ArrayList(it.ids) }, restore = { EpisodeSelection().apply { ids = it.toSet() } })) {
        EpisodeSelection().apply { ids = browsing?.context?.selections?.get(route).orEmpty() }
    }
    LaunchedEffect(selection, route) {
        snapshotFlow { selection.ids }.collect { ids ->
            if (browsing != null) browsing.context = browsing.context.copy(selections =
                if (ids.isEmpty()) browsing.context.selections - route else browsing.context.selections + (route to ids))
        }
    }
    ContextualMode(key == "select-subscriptions" || selection.ids.isNotEmpty() || key?.startsWith("view-edit:") == true || key?.startsWith("new-view:") == true)
    CompositionLocalProvider(LocalEpisodeSelection provides selection) { content() }
    BackHandler(selection.ids.isNotEmpty()) { selection.ids = emptySet() }
}

/** The contextual title stays compact; primary commands live in the bottom action bar. */
@Composable
internal fun SelectionToolbar(selection: EpisodeSelection) {
    PodListTopAppBar(title = { Text(pluralStringResource(R.plurals.m4_selected_count, selection.ids.size, selection.ids.size), Modifier.semantics { heading() }) }, navigationIcon = {
        ActionIcon(R.drawable.ic_close, stringResource(R.string.cancel)) { selection.ids = emptySet() }
    }, actions = { SelectAllAction(selection) })
}

@Composable
internal fun SelectAllAction(selection: EpisodeSelection) {
    TextButton(onClick = selection::toggleAll, enabled = selection.order.isNotEmpty(), modifier = Modifier.heightIn(min = 48.dp)) {
        Text(stringResource(if (ListSelection.allSelected(selection.order, selection.ids)) R.string.select_none else R.string.select_all))
    }
}

/**
 * Bubble from list rows, after native text controls have handled their own Ctrl+A. The list itself must not be
 * focusable: that merges every row into one accessibility node, so TalkBack and long-press lose the rows.
 */
internal fun Modifier.listSelectionKeys(selection: EpisodeSelection?): Modifier = onKeyEvent { event ->
    if (selection != null && selection.order.isNotEmpty() && event.type == KeyEventType.KeyDown && event.isCtrlPressed && event.key == Key.A) {
        selection.ids = selection.order.toSet(); true
    } else false
}

/** Two equal columns at enlarged text sizes give every word room without hiding commands. */
@Composable
internal fun ActionGrid(content: @Composable FlowRowScope.() -> Unit) {
    FlowRow(Modifier.fillMaxWidth().padding(horizontal = 8.dp),
        maxItemsInEachRow = if (androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f) 2 else 4,
        verticalArrangement = Arrangement.spacedBy(4.dp), content = content)
}

@Composable
internal fun RowScope.LabelledAction(icon: Int, label: String, enabled: Boolean = true, accessibilityLabel: String? = null, action: () -> Unit) {
    TextButton(onClick = action, enabled = enabled,
        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp),
        modifier = Modifier.weight(1f).widthIn(min = 48.dp).heightIn(min = 48.dp).then(
            if (accessibilityLabel == null) Modifier else Modifier.semantics { contentDescription = accessibilityLabel })) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(painterResource(icon), contentDescription = null, modifier = Modifier.size(24.dp))
            Text(label, modifier = if (accessibilityLabel == null) Modifier else Modifier.clearAndSetSemantics {}, style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center)
        }
    }
}

@Composable
internal fun SelectionActionBar(selection: EpisodeSelection, data: ScreenData, session: Session, route: String?) {
    val model = LocalAppModel.current
    var adding by remember { mutableStateOf(false) }
    val playlist = data.state.playlists.find { route == "playlist:${it.id}" }
    val ordered = (playlist?.entries?.map { it.episodeId } ?: selection.order).filter { it in selection.ids }
    val allPlayed = ordered.isNotEmpty() && ordered.all { data.state.episodeStates[it]?.played != null }
    val allStarred = ordered.isNotEmpty() && ordered.all { data.state.episodeStates[it]?.starred == true }
    Surface(color = MaterialTheme.colorScheme.secondaryContainer, tonalElevation = 3.dp) {
        ActionGrid {
            LabelledAction(R.drawable.ic_playlist_add, stringResource(R.string.add), accessibilityLabel = stringResource(R.string.add_to_playlist)) { adding = true }
            LabelledAction(if (allPlayed) R.drawable.ic_unplayed else R.drawable.ic_played, stringResource(if (allPlayed) R.string.mark_unplayed else R.string.mark_played)) {
                model.changeWithUndo(ordered.map { if (allPlayed) Change.MarkUnplayed(it) else Change.MarkPlayed(it, PlayedSource.User) }, if (allPlayed) R.plurals.episodes_unplayed else R.plurals.episodes_played, formatArgs = listOf(ordered.size), quantity = ordered.size) { before -> EpisodeActions.undoPlayed(before, ordered, System.currentTimeMillis() + 1) }
                selection.ids = emptySet()
            }
            LabelledAction(if (allStarred) R.drawable.ic_star else R.drawable.ic_star_outline, stringResource(if (allStarred) R.string.unstar else R.string.star)) {
                model.changeWithUndo(ordered.map { Change.SetStar(it, !allStarred) }, if (allStarred) R.plurals.episodes_unstarred else R.plurals.episodes_starred, formatArgs = listOf(ordered.size), quantity = ordered.size) { before -> ordered.map { Change.SetStar(it, before.episodeStates[it]?.starred == true) } }
                selection.ids = emptySet()
            }
            LabelledAction(R.drawable.ic_download, stringResource(R.string.download)) {
                val downloads = model.downloads(session)
                val fresh = ordered.filter { downloads.status.value[it]?.phase !in listOf(DownloadPhase.Stored, DownloadPhase.Transferring, DownloadPhase.Queued) }
                fresh.forEach { downloads.download(it) }
                downloads.offerRequestUndo(fresh, false, R.string.m4_downloads_requested)
                selection.ids = emptySet()
            }
        }
    }
    if (adding) PlaylistAddSheet(ordered, data.state, model, { adding = false }) { selection.ids = emptySet(); adding = false }
}

@Composable
internal fun SelectSubscriptionsScreen(data: ScreenData, session: Session, addPodcasts: () -> Unit) {
    val selection = LocalEpisodeSelection.current ?: return
    val subscriptions = data.subscriptions.filter { it["unsubscribed_at"] == null }
    SideEffect { selection.order = subscriptions.map { it["id"] as String }; selection.ids = selection.ids.intersect(selection.order.toSet()) }
    if (subscriptions.isEmpty()) {
        EmptyState(R.string.no_subscriptions, R.string.add_podcasts, onAction = addPodcasts)
        return
    }
    LazyColumn(state = rememberBrowsingListState(), modifier = Modifier.listSelectionKeys(selection)) {
        item { Hint(stringResource(R.string.m4_select_subscriptions_help)) }
        items(subscriptions, key = { it["id"] as String }) { subscription ->
            val id = subscription["id"] as String
            CheckRow(subscription["title"] as String, id in selection.ids, inset = true) { selection.toggle(id) }
        }
    }
}

@Composable
internal fun SubscriptionSelectionActionBar(selection: EpisodeSelection, data: ScreenData, session: Session) {
    val model = LocalAppModel.current
    var choosing by rememberSaveable { mutableStateOf(false) }
    Surface(color = MaterialTheme.colorScheme.secondaryContainer, tonalElevation = 3.dp) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
            LabelledAction(R.drawable.ic_download, stringResource(R.string.change_download_rule)) { choosing = true }
        }
    }
    var chosenMode by rememberSaveable { mutableStateOf<DownloadMode?>(null) }
    if (choosing) EditorSheet(stringResource(R.string.download_rule), { choosing = false }, doneEnabled = chosenMode != null, doneLabel = R.string.change_download_rule, done = {
        chosenMode?.let { mode ->
            val selected = selection.order.filter { it in selection.ids }
            model.changeWithUndo(selected.map { id -> Change.SetDownloadRule(data.state.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId }?.copy(mode = mode) ?: DownloadRule(id, session.deviceId, mode, null)) }, R.plurals.download_rules_changed, formatArgs = listOf(selected.size), quantity = selected.size) { before -> selected.map { id -> Change.SetDownloadRule(before.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId } ?: DownloadRule(id, session.deviceId, DownloadMode.Never, null)) } }
            choosing = false
            selection.ids = emptySet()
        }
    }) {
        val explanations = mapOf(DownloadMode.Never to stringResource(R.string.m4_stream_help), DownloadMode.OnEntry to stringResource(R.string.m4_entry_help), DownloadMode.AllNew to stringResource(R.string.m4_published_help))
        ChoiceRows(listOf(DownloadMode.Never to stringResource(R.string.stream), DownloadMode.OnEntry to stringResource(R.string.on_entry), DownloadMode.AllNew to stringResource(R.string.all_new)), chosenMode, supporting = { explanations[it].orEmpty() }) { chosenMode = it }
    }
}
