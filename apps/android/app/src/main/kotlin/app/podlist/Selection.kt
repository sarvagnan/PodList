@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*

@Stable internal class EpisodeSelection {
    var order by mutableStateOf(emptyList<String>())
    var ids by mutableStateOf(setOf<String>())
    fun toggle(id: String) { ids = if(id in ids) ids - id else ids + id }
}
internal val LocalEpisodeSelection = staticCompositionLocalOf<EpisodeSelection?> { null }

@Composable
internal fun SelectionProvider(key: String?, data: ScreenData?, session: Session, content: @Composable () -> Unit) {
    val selection = rememberSaveable(key, saver = Saver<EpisodeSelection, ArrayList<String>>(save = { ArrayList(it.ids) }, restore = { EpisodeSelection().apply { ids = it.toSet() } })) { EpisodeSelection() }
    CompositionLocalProvider(LocalEpisodeSelection provides selection) { content() }
    BackHandler(selection.ids.isNotEmpty()) { selection.ids = emptySet() }
}

@Composable
internal fun SelectionToolbar(selection: EpisodeSelection, data: ScreenData, session: Session, route: String?) {
    val model = LocalAppModel.current
    var adding by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    val playlist = data.state.playlists.find { route == "playlist:${it.id}" }
    val ordered = (playlist?.entries?.map { it.episodeId } ?: selection.order).filter { it in selection.ids }
    TopAppBar(title = { Text(pluralStringResource(R.plurals.m4_selected_count, selection.ids.size, selection.ids.size), Modifier.semantics { heading() }) }, navigationIcon = {
        ActionIcon(R.drawable.ic_close, stringResource(R.string.cancel)) { selection.ids = emptySet() }
    }, actions = {
        Box {
            TextButton(onClick = { menu = true }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.selection_actions)) }
            DropdownMenu(menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text(stringResource(R.string.add_to_playlist)) }, onClick = { menu = false; adding = true })
                DropdownMenuItem(text = { Text(stringResource(R.string.mark_played)) }, onClick = {
                    menu = false
                    model.changeWithUndo(ordered.map { Change.MarkPlayed(it, PlayedSource.User) }, R.string.episodes_played) { before -> EpisodeActions.undoPlayed(before, ordered, System.currentTimeMillis() + 1) }
                    selection.ids = emptySet()
                })
                DropdownMenuItem(text = { Text(stringResource(R.string.star)) }, onClick = {
                    menu = false
                    model.changeWithUndo(ordered.map { Change.SetStar(it, true) }, R.string.episodes_starred) { before -> ordered.map { Change.SetStar(it, before.episodeStates[it]?.starred == true) } }
                    selection.ids = emptySet()
                })
                DropdownMenuItem(text = { Text(stringResource(R.string.download)) }, onClick = {
                    menu = false
                    val downloads = model.downloads(session)
                    val fresh = ordered.filter { downloads.status.value[it]?.phase !in listOf(DownloadPhase.Stored, DownloadPhase.Transferring, DownloadPhase.Queued) }
                    fresh.forEach { downloads.download(it) }
                    downloads.offerRequestUndo(fresh, false, R.string.m4_downloads_requested)
                    selection.ids = emptySet()
                })
            }
        }
    })
    if (adding) PlaylistAddSheet(ordered, data.state, model, { adding = false }) { selection.ids = emptySet(); adding = false }
}

@Composable
internal fun SelectSubscriptionsScreen(data: ScreenData, session: Session, addPodcasts: () -> Unit) {
    val selection = LocalEpisodeSelection.current ?: return
    val subscriptions = data.subscriptions.filter { it["unsubscribed_at"] == null }
    SideEffect { selection.order = subscriptions.map { it["id"] as String }; selection.ids = selection.ids.intersect(selection.order.toSet()) }
    if (subscriptions.isEmpty()) {
        Column {
            EmptyMessage(R.string.no_subscriptions)
            Hint(stringResource(R.string.select_subscriptions_empty))
            FilledTonalButton(onClick = addPodcasts, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.add_podcasts)) }
        }
        return
    }
    LazyColumn(state = rememberBrowsingListState()) {
        item { Hint(stringResource(R.string.m4_select_subscriptions_help)) }
        items(subscriptions, key = { it["id"] as String }) { subscription ->
            val id = subscription["id"] as String
            CheckRow(subscription["title"] as String, id in selection.ids, inset = true) { selection.toggle(id) }
        }
    }
}

@Composable
internal fun SubscriptionSelectionToolbar(selection: EpisodeSelection, data: ScreenData, session: Session) {
    val model = LocalAppModel.current
    var choosing by rememberSaveable { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    TopAppBar(title = { Text(pluralStringResource(R.plurals.m4_selected_count, selection.ids.size, selection.ids.size), Modifier.semantics { heading() }) }, navigationIcon = {
        ActionIcon(R.drawable.ic_close, stringResource(R.string.cancel)) { selection.ids = emptySet() }
    }, actions = {
        Box {
            TextButton(onClick = { menu = true }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.selection_actions)) }
            DropdownMenu(menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text(stringResource(R.string.change_download_rule)) }, onClick = { menu = false; choosing = true })
            }
        }
    })
    var chosenMode by rememberSaveable { mutableStateOf<DownloadMode?>(null) }
    if (choosing) EditorSheet(stringResource(R.string.download_rule), { choosing = false }, doneEnabled = chosenMode != null, done = {
        chosenMode?.let { mode ->
            val selected = selection.order.filter { it in selection.ids }
            model.changeWithUndo(selected.map { id -> Change.SetDownloadRule(data.state.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId }?.copy(mode = mode) ?: DownloadRule(id, session.deviceId, mode, null)) }, R.string.download_rule_changed) { before -> selected.map { id -> Change.SetDownloadRule(before.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId } ?: DownloadRule(id, session.deviceId, DownloadMode.Never, null)) } }
            choosing = false
            selection.ids = emptySet()
        }
    }) {
        val explanations = mapOf(DownloadMode.Never to stringResource(R.string.m4_stream_help), DownloadMode.OnEntry to stringResource(R.string.m4_entry_help), DownloadMode.AllNew to stringResource(R.string.m4_published_help))
        ChoiceRows(listOf(DownloadMode.Never to stringResource(R.string.stream), DownloadMode.OnEntry to stringResource(R.string.on_entry), DownloadMode.AllNew to stringResource(R.string.all_new)), chosenMode, supporting = { explanations[it].orEmpty() }) { chosenMode = it }
    }
}
