package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction

@Composable
internal fun PlaylistSettingsScreen(playlist: Playlist, data: ScreenData, done: () -> Unit) {
    val model = LocalAppModel.current
    var name by rememberSaveable(playlist.id) { mutableStateOf(playlist.name) }
    val undoRevision by model.undoRevision.collectAsState()
    val initialUndo = remember { undoRevision }
    val session = model.session.value
    LaunchedEffect(undoRevision) { if (undoRevision != initialUndo && session != null) {
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { session.db.loadState().playlists.find { it.id == playlist.id }?.name }?.let { name = it }
    } }
    var confirm by rememberSaveable { mutableStateOf(false) }
    val problem = PlaylistNames.validate(name, data.state.playlists, playlist.id)
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!playlist.isDefault) item {
            OutlinedTextField(name, { input -> name = input; if (PlaylistNames.validate(input, data.state.playlists, playlist.id) == null) model.edit(Change.RenamePlaylist(playlist.id, input.trim())) }, label = { Text(stringResource(R.string.m4_name)) }, singleLine = true, isError = problem != null,
                supportingText = if (problem != null) ({ Text(playlistProblem(problem, name)) }) else null, modifier = Modifier.fillMaxWidth())
        }
        item { SwitchRow(stringResource(R.string.clear_on_played), playlist.clearOnPlayed, stringResource(R.string.m4_clear_help)) { checked ->
            model.changeWithUndo(listOf(Change.SetClearOnPlayed(playlist.id, checked)), R.string.m4_setting_changed) { before -> listOf(Change.SetClearOnPlayed(playlist.id, before.playlists.first { it.id == playlist.id }.clearOnPlayed)) }
        } }
        if (!playlist.isDefault) item {
            TextButton(onClick = { confirm = true }) { Text(stringResource(R.string.m4_delete_playlist), color = MaterialTheme.colorScheme.error) }
            Text(stringResource(R.string.m4_trash_help, data.state.trashDays ?: 30), style = MaterialTheme.typography.bodySmall)
        }
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text(stringResource(R.string.m4_delete_named, playlist.name)) }, text = { Text(stringResource(R.string.m4_trash_help, data.state.trashDays ?: 30)) }, dismissButton = { TextButton(onClick = { confirm = false }) { Text(stringResource(R.string.cancel)) } }, confirmButton = { TextButton(onClick = {
        confirm = false
        model.changeWithUndo(listOf(Change.DeletePlaylist(playlist.id)), R.string.m4_playlist_deleted, playbackPlaylist = playlist.id) { before -> listOfNotNull(Change.RestorePlaylist(playlist.id), Change.SetActivePlaylist(playlist.id).takeIf { before.activePlaylistId == playlist.id }) }
        done()
    }) { Text(stringResource(R.string.m4_delete_playlist)) } })
}

@Composable
internal fun NewPlaylistScreen(model: AppModel, created: (String) -> Unit) {
    var name by rememberSaveable { mutableStateOf("") }
    var problem by remember { mutableStateOf<PlaylistNames.Problem?>(null) }
    var busy by remember { mutableStateOf(false) }
    fun submit() { if (!busy) { busy = true; model.createPlaylist(name) { id, error -> busy = false; problem = error; if (id != null) created(id) } } }
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(name, { name = it; problem = null }, label = { Text(stringResource(R.string.playlist_name)) }, singleLine = true, isError = problem != null, supportingText = if (problem != null) ({ Text(playlistProblem(problem!!, name)) }) else null, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { submit() }), modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()))
        Button(enabled = !busy, onClick = ::submit) { Text(stringResource(R.string.m4_create_playlist)) }
    }
}

@Composable internal fun playlistProblem(problem: PlaylistNames.Problem, name: String): String = stringResource(if (problem == PlaylistNames.Problem.Empty) R.string.m4_playlist_empty else R.string.m4_playlist_duplicate, name.trim())

@Composable
internal fun TrashScreen(data: ScreenData) {
    val model = LocalAppModel.current
    val trash = PlaylistRules.availableTrash(data.state, System.currentTimeMillis())
    LazyColumn {
        if (trash.isEmpty()) item { EmptyMessage(R.string.no_trash) }
        items(trash, key = { it.playlist.id }) { trash ->
            ListItem(headlineContent = { Text(trash.playlist.name, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.deleted, date(trash.deletedAt))) }, trailingContent = {
                TextButton(onClick = { model.changeWithUndo(listOf(Change.RestorePlaylist(trash.playlist.id)), R.string.m4_playlist_restored) { listOf(Change.DeletePlaylist(trash.playlist.id)) } }) { Text(stringResource(R.string.m4_restore)) }
            })
        }
    }
}
