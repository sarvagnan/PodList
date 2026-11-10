package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction

@Composable
internal fun PlaylistSettingsScreen(playlist: Playlist, data: ScreenData, done: () -> Unit) {
    val model = LocalAppModel.current
    val drafts = LocalFormDrafts.current
    val prefix = "playlist:${playlist.id}/"
    LazyColumn(modifier = Modifier.imePadding(), state = rememberBrowsingListState(), contentPadding = PaddingValues(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!playlist.isDefault) item(key = "name") { PlaylistName(playlist, data) }
        item { SwitchRow(stringResource(R.string.clear_on_played), playlist.clearOnPlayed, stringResource(R.string.m4_clear_help)) { checked ->
            model.changeWithUndo(listOf(Change.SetClearOnPlayed(playlist.id, checked)), R.string.clear_on_played_changed) { before -> listOf(Change.SetClearOnPlayed(playlist.id, before.playlists.first { it.id == playlist.id }.clearOnPlayed)) }
        } }
        if (!playlist.isDefault) item {
            // No confirmation: the Playlist goes to Trash and the snackbar offers Undo.
            ContentTextButton(modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp), onClick = {
                drafts.clear(prefix)
                model.changeWithUndo(listOf(Change.DeletePlaylist(playlist.id)), R.string.m4_playlist_deleted, playbackPlaylist = playlist.id, formatArgs = listOf(playlist.name)) { before -> listOfNotNull(Change.RestorePlaylist(playlist.id), Change.SetActivePlaylist(playlist.id).takeIf { before.activePlaylistId == playlist.id }) }
                done()
            }) { Text(stringResource(R.string.m4_delete_playlist), color = MaterialTheme.colorScheme.error) }
            Text(stringResource(R.string.m4_trash_help, data.state.trashDays ?: 30), Modifier.padding(horizontal = 16.dp), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun PlaylistName(playlist: Playlist, data: ScreenData) {
    val model = LocalAppModel.current
    RenameableName(playlist.name, "playlist:${playlist.id}/rename",
        problem = { text -> PlaylistNames.validate(text, data.state.playlists, playlist.id)?.let { playlistProblem(it, text, data.state.playlists.map { it.name }) } },
        save = { name, close ->
            model.changeWithUndo(listOf(Change.RenamePlaylist(playlist.id, name)), R.string.playlist_renamed_to, formatArgs = listOf(name)) { before ->
                listOf(Change.RenamePlaylist(playlist.id, before.playlists.first { it.id == playlist.id }.name))
            }
            close(true)
        })
}

@Composable
internal fun NewPlaylistScreen(model: AppModel, discard: () -> Unit, created: (String) -> Unit) {
    val drafts = LocalFormDrafts.current
    var name by rememberDraftText("new-playlist/name")
    var problem by remember { mutableStateOf<Names.Problem?>(null) }
    var busy by remember { mutableStateOf(false) }
    fun submit() { if (!busy) { busy = true; model.createPlaylist(name) { id, error -> busy = false; problem = error; if (id != null) { drafts.clear("new-playlist/"); created(id) } } } }
    Column(Modifier.fillMaxSize().imePadding()) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(name, { name = it; problem = null }, label = { Text(stringResource(R.string.playlist_name)) }, singleLine = true, isError = problem != null, supportingText = if (problem != null) ({ Text(playlistProblem(problem!!, name), Modifier.errorAnnouncement()) }) else null, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { submit() }), modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()))
        }
        Surface(tonalElevation = 3.dp) {
            CommitActions(Modifier.padding(16.dp)) {
                TextButton(enabled = !busy, onClick = { drafts.clear("new-playlist/"); discard() }) { Text(stringResource(R.string.discard_draft)) }
                CommitButton(enabled = !busy, onClick = ::submit) { Text(stringResource(R.string.m4_create_playlist)) }
            }
        }
    }
}

// A duplicate names the existing Playlist as it is spelled, not as typed.
@Composable internal fun playlistProblem(problem: Names.Problem, name: String, taken: List<String> = emptyList()): String = stringResource(if (problem == Names.Problem.Empty) R.string.m4_playlist_empty else R.string.m4_playlist_duplicate, Names.match(name, taken) ?: name.trim())

@Composable
internal fun TrashScreen(data: ScreenData) {
    val model = LocalAppModel.current
    val trash = PlaylistRules.availableTrash(data.state, System.currentTimeMillis())
    LazyColumn(state = rememberBrowsingListState("trash")) {
        if (trash.isEmpty()) item { EmptyMessage(R.string.no_trash) }
        items(trash, key = { it.playlist.id }) { trash ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(trash.playlist.name, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.deleted, date(trash.deletedAt))) }, trailingContent = {
                ContentTextButton(onClick = { model.changeWithUndo(listOf(Change.RestorePlaylist(trash.playlist.id)), R.string.m4_playlist_restored) { before -> EditUndo.inverse(before, Change.RestorePlaylist(trash.playlist.id), System.currentTimeMillis()) } }) { Text(stringResource(R.string.m4_restore)) }
            })
        }
    }
}
