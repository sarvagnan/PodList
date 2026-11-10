package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
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
    val listState = rememberBrowsingListState()
    val reveal by model.settingReveal.collectAsState()
    var revealed by rememberSaveable { mutableLongStateOf(0L) }
    LaunchedEffect(reveal) {
        val target = reveal
        if (target != null && target.token != revealed && target.route == "playlist-settings:${playlist.id}") {
            listState.animateScrollToItem(1)
            revealed = target.token
        }
    }
    LazyColumn(modifier = Modifier.imePadding(), state = listState, contentPadding = PaddingValues(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!playlist.isDefault) item(key = "name") { PlaylistName(playlist, data) }
        else item { Hint(stringResource(R.string.default_playlist_limits)) }
        item { SwitchRow(stringResource(R.string.clear_on_played), playlist.clearOnPlayed, stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played_on_help else R.string.clear_on_played_off_help)) { checked ->
            model.changeWithUndo(listOf(Change.SetClearOnPlayed(playlist.id, checked)), R.string.clear_on_played_changed, notify = false) { before -> listOf(Change.SetClearOnPlayed(playlist.id, before.playlists.first { it.id == playlist.id }.clearOnPlayed)) }
        } }
        if (!playlist.isDefault) item {
            // No confirmation: the Playlist goes to Trash and the snackbar offers Undo.
            ContentActionButton(destructive = true, modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp), onClick = {
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
    var rejected by remember { mutableStateOf<Pair<String, Names.Problem>?>(null) }
    RenameableName(playlist.name, "playlist:${playlist.id}/rename",
        problem = { text -> (PlaylistNames.validate(text, data.state.playlists, playlist.id) ?: rejected?.takeIf { it.first == text.trim() }?.second)?.let { playlistProblem(it, text, data.state.playlists.map { it.name }) } },
        save = { name, close ->
            model.renamePlaylist(playlist.id, name) { error, accepted -> rejected = error?.let { name to it }; close(accepted) }
        })
}

@Composable
internal fun NewPlaylistScreen(model: AppModel, data: ScreenData, discard: () -> Unit, created: (String) -> Unit) {
    val drafts = LocalFormDrafts.current
    var name by rememberDraftText("new-playlist/name")
    var rejected by remember { mutableStateOf<Names.Problem?>(null) }
    var interacted by rememberDraftText("new-playlist/interacted", if (name.isNotEmpty()) "true" else "false")
    val problem = PlaylistNames.validate(name, data.state.playlists) ?: rejected
    val shownProblem = problem.takeIf { interacted == "true" || rejected != null }
    var busy by remember { mutableStateOf(false) }
    fun submit() {
        interacted = "true"
        if (busy || problem != null) return
        drafts.flush()
        val submitted = drafts.snapshot("new-playlist/")
        busy = true
        model.createPlaylist(name) { id, error ->
            busy = false; rejected = error
            if (id != null) { drafts.clearIfUnchanged("new-playlist/", submitted); created(id) }
        }
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(name, { if (!busy) { name = it; interacted = "true"; rejected = null } }, label = { Text(stringResource(R.string.m4_name)) }, singleLine = true, readOnly = busy, isError = shownProblem != null, supportingText = shownProblem?.let { error -> ({ InlineError(playlistProblem(error, name, data.state.playlists.map { it.name })) }) }, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { submit() }), modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()))
            CommitActions {
                if (name.isNotEmpty()) TextButton(modifier = Modifier.heightIn(min = 48.dp), enabled = !busy, onClick = { drafts.clear("new-playlist/"); discard() }) { Text(stringResource(R.string.discard_draft)) }
                CommitButton(enabled = !busy && problem == null, onClick = ::submit) { Text(stringResource(R.string.m4_create_playlist)) }
            }
        }
    }
}

// A duplicate names the existing Playlist as it is spelled, not as typed.
@Composable internal fun playlistProblem(problem: Names.Problem, name: String, taken: List<String> = emptyList()): String = stringResource(if (problem == Names.Problem.Empty) R.string.m4_playlist_empty else R.string.m4_playlist_duplicate, Names.match(name, taken) ?: name.trim())

@Composable
internal fun TrashScreen(data: ScreenData, openPlaylists: () -> Unit) {
    val model = LocalAppModel.current
    val trash = PlaylistRules.availableTrash(data.state, System.currentTimeMillis())
    LazyColumn(state = rememberBrowsingListState("trash")) {
        if (trash.isEmpty()) item {
            EmptyMessage(R.string.no_trash)
            Hint(stringResource(R.string.empty_trash_help, data.state.trashDays ?: 30))
            FilledTonalButton(onClick = openPlaylists, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.back_to_playlists)) }
        }
        items(trash, key = { it.playlist.id }) { trash ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(trash.playlist.name, style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(stringResource(R.string.deleted, date(trash.deletedAt))) }, trailingContent = {
                ContentTextButton(onClick = { model.changeWithUndo(listOf(Change.RestorePlaylist(trash.playlist.id)), R.string.m4_playlist_restored, formatArgs = listOf(trash.playlist.name)) { before -> EditUndo.inverse(before, Change.RestorePlaylist(trash.playlist.id), System.currentTimeMillis()) } }) { Text(stringResource(R.string.m4_restore)) }
            })
        }
    }
}
