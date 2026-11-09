@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
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
    val selection = remember(key) { EpisodeSelection() }
    CompositionLocalProvider(LocalEpisodeSelection provides selection) { content() }
    BackHandler(selection.ids.isNotEmpty()) { selection.ids = emptySet() }
}

@Composable
internal fun SelectionToolbar(selection: EpisodeSelection, data: ScreenData, session: Session, route: String?) {
    val model = LocalAppModel.current
    var adding by remember { mutableStateOf(false) }
    val playlist = data.state.playlists.find { route == "playlist:${it.id}" }
    val ordered = (playlist?.entries?.map { it.episodeId } ?: selection.order).filter { it in selection.ids }
    TopAppBar(title = { Text(stringResource(R.string.m4_selected_count, selection.ids.size)) }, navigationIcon = {
        IconButton(onClick = { selection.ids = emptySet() }) { Icon(painterResource(R.drawable.ic_back), stringResource(R.string.cancel)) }
    }, actions = {
        IconButton(onClick = { adding = true }) { Icon(painterResource(R.drawable.ic_add), stringResource(R.string.add_to_playlist)) }
        IconButton(onClick = {
            model.changeWithUndo(ordered.map { Change.MarkPlayed(it, PlayedSource.User) }, R.string.m4_selection_changed) { before -> EpisodeActions.undoPlayed(before, ordered, System.currentTimeMillis() + 1) }
            selection.ids = emptySet()
        }) { Icon(painterResource(R.drawable.ic_check), stringResource(R.string.mark_played)) }
        IconButton(onClick = {
            model.changeWithUndo(ordered.map { Change.SetStar(it, true) }, R.string.m4_selection_changed) { before -> ordered.map { Change.SetStar(it, before.episodeStates[it]?.starred == true) } }
            selection.ids = emptySet()
        }) { Icon(painterResource(R.drawable.ic_star), stringResource(R.string.star)) }
        IconButton(onClick = {
            val downloads = model.downloads(session)
            val fresh = ordered.filter { downloads.status.value[it]?.phase !in listOf(DownloadPhase.Stored, DownloadPhase.Transferring, DownloadPhase.Queued) }
            fresh.forEach { downloads.download(it) }
            model.messages.trySend(AppMessage(R.string.m4_downloads_requested) { fresh.forEach { downloads.remove(it) } })
            selection.ids = emptySet()
        }) { Icon(painterResource(R.drawable.ic_download), stringResource(R.string.download)) }
    })
    if (adding) SeveralAddSheet(ordered, data, model, { adding = false }) { selection.ids = emptySet(); adding = false }
}

@Composable
private fun SeveralAddSheet(ids: List<String>, data: ScreenData, model: AppModel, dismiss: () -> Unit, added: () -> Unit) {
    var target by rememberSaveable { mutableStateOf<String?>(data.state.activePlaylistId) }
    var name by rememberSaveable { mutableStateOf("") }
    var error by rememberSaveable { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    EditorSheet(stringResource(R.string.add_to_playlist), dismiss) {
        LazyColumn(Modifier.heightIn(max = 240.dp)) {
            items(data.state.playlists) { playlist -> ChoiceRows(listOf(playlist.id as String? to if (playlist.id == data.state.activePlaylistId) stringResource(R.string.m4_active_target, playlist.name) else playlist.name), target) { target = it; error = false } }
            item { ChoiceRows(listOf(null to stringResource(R.string.new_playlist)), target) { target = null; error = false } }
        }
        if (target == null) OutlinedTextField(name, { name = it; error = false }, label = { Text(stringResource(R.string.playlist_name)) }, isError = error, supportingText = if(error) ({ Text(stringResource(R.string.playlist_name_error)) }) else null, modifier = Modifier.fillMaxWidth())
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            listOf(Placement.Next to R.string.play_next, Placement.Last to R.string.play_last).forEach { (placement, label) -> Button(enabled = !busy, onClick = { busy = true; model.addSeveral(ids, target, name.takeIf { target == null }, placement) { success -> busy = false; if (success) added() else error = true } }) { Text(stringResource(label)) } }
        }
    }
}

@Composable
internal fun SelectSubscriptionsScreen(data: ScreenData, session: Session) {
    val model = LocalAppModel.current
    var ids by rememberSaveable { mutableStateOf(emptyList<String>()) }
    var choosing by rememberSaveable { mutableStateOf(false) }
    Column {
        Text(stringResource(R.string.m4_selected_count, ids.size), Modifier.padding(16.dp))
        Button(enabled = ids.isNotEmpty(), onClick = { choosing = true }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.download_rule)) }
        LazyColumn {
            items(data.subscriptions.filter { it["unsubscribed_at"] == null }) { subscription ->
                val id = subscription["id"] as String
                ListItem(headlineContent = { Text(subscription["title"] as String) }, leadingContent = { Checkbox(id in ids, { checked -> ids = if (checked) ids + id else ids - id }) })
            }
        }
    }
    if (choosing) EditorSheet(stringResource(R.string.download_rule), { choosing = false }) {
        ChoiceRows(listOf(DownloadMode.Never to stringResource(R.string.stream), DownloadMode.OnEntry to stringResource(R.string.on_entry), DownloadMode.AllNew to stringResource(R.string.all_new)), null as DownloadMode?) { mode ->
            if (mode != null) {
                val selected = ids.toList()
                model.changeWithUndo(selected.map { id -> Change.SetDownloadRule(data.state.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId }?.copy(mode = mode) ?: DownloadRule(id, session.deviceId, mode, null)) }, R.string.m4_selection_changed) { before -> selected.map { id -> Change.SetDownloadRule(before.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId } ?: DownloadRule(id, session.deviceId, DownloadMode.Never, null)) } }
                choosing = false
            }
        }
    }
}
