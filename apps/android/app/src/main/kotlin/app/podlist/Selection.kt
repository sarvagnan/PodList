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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import app.podlist.domain.State
import kotlinx.coroutines.launch

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
    val playlist = data.state.playlists.find { route == "playlist:${it.id}" }
    val ordered = (playlist?.entries?.map { it.episodeId } ?: selection.order).filter { it in selection.ids }
    TopAppBar(title = { Text(pluralStringResource(R.plurals.m4_selected_count, selection.ids.size, selection.ids.size), Modifier.semantics { heading() }) }, navigationIcon = {
        ActionIcon(R.drawable.ic_back, stringResource(R.string.cancel)) { selection.ids = emptySet() }
    }, actions = {
        ActionIcon(R.drawable.ic_add, stringResource(R.string.add_to_playlist)) { adding = true }
        ActionIcon(R.drawable.ic_check, stringResource(R.string.mark_played)) {
            model.changeWithUndo(ordered.map { Change.MarkPlayed(it, PlayedSource.User) }, R.string.episodes_played) { before -> EpisodeActions.undoPlayed(before, ordered, System.currentTimeMillis() + 1) }
            selection.ids = emptySet()
        }
        ActionIcon(R.drawable.ic_star, stringResource(R.string.star)) {
            model.changeWithUndo(ordered.map { Change.SetStar(it, true) }, R.string.episodes_starred) { before -> ordered.map { Change.SetStar(it, before.episodeStates[it]?.starred == true) } }
            selection.ids = emptySet()
        }
        ActionIcon(R.drawable.ic_download, stringResource(R.string.download)) {
            val downloads = model.downloads(session)
            val fresh = ordered.filter { downloads.status.value[it]?.phase !in listOf(DownloadPhase.Stored, DownloadPhase.Transferring, DownloadPhase.Queued) }
            fresh.forEach { downloads.download(it) }
            downloads.offerRequestUndo(fresh, false, R.string.m4_downloads_requested)
            selection.ids = emptySet()
        }
    })
    if (adding) PlaylistAddSheet(ordered, data.state, model, { adding = false }) { selection.ids = emptySet(); adding = false }
}

@Composable
internal fun SelectSubscriptionsScreen(data: ScreenData, session: Session) {
    val model = LocalAppModel.current
    var ids by rememberSaveable { mutableStateOf(emptyList<String>()) }
    var choosing by rememberSaveable { mutableStateOf(false) }
    Column {
        Text(pluralStringResource(R.plurals.m4_selected_count, ids.size, ids.size), Modifier.padding(16.dp))
        Button(enabled = ids.isNotEmpty(), onClick = { choosing = true }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.change_download_rule)) }
        LazyColumn(state = rememberBrowsingListState()) {
            items(data.subscriptions.filter { it["unsubscribed_at"] == null }) { subscription ->
                val id = subscription["id"] as String
                CheckRow(subscription["title"] as String, id in ids, inset = true) { checked -> ids = if (checked) ids + id else ids - id }
            }
        }
    }
    if (choosing) EditorSheet(stringResource(R.string.download_rule), { choosing = false }) {
        ChoiceRows(listOf(DownloadMode.Never to stringResource(R.string.stream), DownloadMode.OnEntry to stringResource(R.string.on_entry), DownloadMode.AllNew to stringResource(R.string.all_new)), null as DownloadMode?) { mode ->
            if (mode != null) {
                val selected = ids.toList()
                model.changeWithUndo(selected.map { id -> Change.SetDownloadRule(data.state.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId }?.copy(mode = mode) ?: DownloadRule(id, session.deviceId, mode, null)) }, R.string.download_rule_changed) { before -> selected.map { id -> Change.SetDownloadRule(before.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId } ?: DownloadRule(id, session.deviceId, DownloadMode.Never, null)) } }
                choosing = false
            }
        }
    }
}
