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
    val browsing = LocalBrowsingState.current
    var text by rememberSaveable { mutableStateOf(browsing?.context?.searchText.orEmpty()) }
    LaunchedEffect(text) { if (browsing != null) browsing.context = browsing.context.copy(searchText = text) }
    var rows by remember { mutableStateOf<List<Row>?>(null) }
    val drafts = LocalFormDrafts.current
    var naming by rememberSaveable { mutableStateOf(drafts.get("search-view/open") == "true") }
    var name by rememberDraftText("search-view/name")
    var invalid by rememberSaveable { mutableStateOf(false) }
    var submitted by remember { mutableIntStateOf(0) }
    val search = View("search", "", ViewFilter(text = text.takeUnless { it.isBlank() }), ViewSort.PublishedDesc, null)
    val revision by model.revision.collectAsState()
    LaunchedEffect(text, revision, submitted) { rows = withContext(Dispatchers.IO) { session.db.evaluate(search, System.currentTimeMillis()) } }
    fun saveView() {
        if (name.isBlank()) invalid = true else {
            val id = UUID.randomUUID().toString()
            model.edit(Change.SaveView(search.copy(id = id, name = name.trim())), finished = { drafts.clear("search-view/"); naming = false; open("view:$id") })
        }
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        OutlinedTextField(text, { text = it; selection?.ids = emptySet() }, label = { Text(stringResource(R.string.m4_search_library)) }, singleLine = true, trailingIcon = { if (text.isNotEmpty()) ActionIcon(R.drawable.ic_close, stringResource(R.string.clear_search)) { text = ""; selection?.ids = emptySet() } }, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { submitted++; keyboard?.hide() }), modifier = Modifier.fillMaxWidth().padding(16.dp).then(FocusedInputModifier(once = true)))
        ContentTextButton(modifier = Modifier.padding(horizontal = 16.dp), enabled = rows != null, onClick = { drafts.put("search-view/open", "true"); naming = true; if (name.isEmpty()) name = text }) { Text(stringResource(R.string.m4_save_as_view)) }
        if (rows == null) Loading()
        else if (data.subscriptions.none { it["unsubscribed_at"] == null } && rows!!.isEmpty()) Column { EmptyMessage(R.string.no_subscriptions); FilledTonalButton(modifier = Modifier.padding(horizontal = 16.dp), onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) } }
        else if (rows!!.isEmpty()) Column { EmptyMessage(R.string.no_search_matches); FilledTonalButton(modifier = Modifier.padding(horizontal = 16.dp), onClick = { text = "" }) { Text(stringResource(R.string.clear_search)) } }
        else EpisodeList(rows!!, data, session, open, R.string.no_search_matches)
    }
    if (naming) AlertDialog(onDismissRequest = { drafts.clear("search-view/"); naming = false }, title = { Text(stringResource(R.string.m4_save_as_view), Modifier.semantics { heading() }) }, text = { OutlinedTextField(name, { name = it; invalid = false }, label = { Text(stringResource(R.string.m4_name)) }, singleLine = true, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { saveView() }), modifier = Modifier.then(FocusedInputModifier()), isError = invalid, supportingText = if (invalid) ({ Text(stringResource(R.string.m4_view_name_error), Modifier.errorAnnouncement()) }) else null) }, dismissButton = { TextButton(onClick = { drafts.clear("search-view/"); naming = false }) { Text(stringResource(R.string.cancel)) } }, confirmButton = { TextButton(onClick = {
        saveView()
    }) { Text(stringResource(R.string.m4_save_as_view)) } })
}
