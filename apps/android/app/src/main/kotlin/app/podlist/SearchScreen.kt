package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.platform.LocalSoftwareKeyboardController

@Composable
internal fun SearchScreen(data: ScreenData, session: Session, open: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val keyboard = LocalSoftwareKeyboardController.current
    val model = LocalAppModel.current
    val selection = LocalEpisodeSelection.current
    var text by rememberSaveable { mutableStateOf("") }
    var rows by remember { mutableStateOf<List<Row>?>(null) }
    var naming by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var invalid by rememberSaveable { mutableStateOf(false) }
    var submitted by remember { mutableIntStateOf(0) }
    val search = View("search", "", ViewFilter(text = text.takeUnless { it.isBlank() }), ViewSort.PublishedDesc, null)
    val revision by model.revision.collectAsState()
    LaunchedEffect(text, revision, submitted) { rows = withContext(Dispatchers.IO) { session.db.evaluate(search, System.currentTimeMillis()) } }
    fun saveView() {
        if (name.isBlank()) invalid = true else scope.launch {
            val id = UUID.randomUUID().toString()
            withContext(Dispatchers.IO) { session.db.record(Change.SaveView(search.copy(id = id, name = name.trim())), System.currentTimeMillis()) }
            model.offerUndo(AppMessage(R.string.view_created) { model.restoreChanges(session, listOf(Change.DeleteView(id))) })
            naming = false; open("view:$id")
        }
    }
    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(text, { text = it; selection?.ids = emptySet() }, label = { Text(stringResource(R.string.m4_search_library)) }, singleLine = true, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { submitted++; keyboard?.hide() }), modifier = Modifier.fillMaxWidth().padding(16.dp).then(FocusedInputModifier()))
        TextButton(enabled = rows != null, onClick = { naming = true; if (name.isEmpty()) name = text }) { Text(stringResource(R.string.m4_save_as_view)) }
        if (rows == null) Loading()
        else if (data.subscriptions.none { it["unsubscribed_at"] == null } && rows!!.isEmpty()) Column { EmptyMessage(R.string.no_subscriptions); TextButton(onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) } }
        else if (rows!!.isEmpty()) Column { EmptyMessage(R.string.no_matches); TextButton(onClick = { text = "" }) { Text(stringResource(R.string.clear_search)) } }
        else EpisodeList(rows!!, data, session, open, R.string.no_matches)
    }
    if (naming) AlertDialog(onDismissRequest = { naming = false }, title = { Text(stringResource(R.string.m4_save_as_view), Modifier.semantics { heading() }) }, text = { OutlinedTextField(name, { name = it; invalid = false }, label = { Text(stringResource(R.string.m4_name)) }, singleLine = true, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { saveView() }), modifier = Modifier.then(FocusedInputModifier()), isError = invalid, supportingText = if (invalid) ({ Text(stringResource(R.string.m4_view_name_error)) }) else null) }, dismissButton = { TextButton(onClick = { naming = false }) { Text(stringResource(R.string.cancel)) } }, confirmButton = { TextButton(onClick = {
        saveView()
    }) { Text(stringResource(R.string.m4_save_as_view)) } })
}
