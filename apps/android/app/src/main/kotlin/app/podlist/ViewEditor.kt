@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.ui.Alignment
import kotlinx.serialization.encodeToString
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.ZoneId
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue

@Composable
internal fun ViewEditor(view: View, data: ScreenData, session: Session, done: () -> Unit, deleted: () -> Unit) {
    val model = LocalAppModel.current
    val drafts = LocalFormDrafts.current
    val draftPrefix = "view:${view.id}/"
    // Condition drafts are reconciled on SaveView/Undo; an explicit rename stays open independently.
    val renamePrefix = "view-rename:${view.id}/"
    val restored = remember(view.id) { drafts.get(draftPrefix + "view")?.let { runCatching { ProtocolJson.decodeFromString<View>(it) }.getOrNull() } ?: view }
    val creating = remember(view.id) { data.state.views.none { it.id == view.id } }
    var recorded by rememberSaveable(view.id) { mutableStateOf(!creating) }
    val initial = remember(view.id) { view }
    var draft by rememberSaveable(view.id, stateSaver = Saver<View, String>(save = { ProtocolJson.encodeToString(it) }, restore = { ProtocolJson.decodeFromString(it) })) { mutableStateOf(restored) }
    var saved by rememberSaveable(view.id, stateSaver = Saver<View, String>(save = { ProtocolJson.encodeToString(it) }, restore = { ProtocolJson.decodeFromString(it) })) { mutableStateOf(view) }
    var podcastMode by rememberSaveable(view.id) { mutableStateOf(restored.filter.podcasts?.mode) }
    val hasInvalidNumber = drafts.hasInvalid(draftPrefix)
    var sheet by rememberSaveable { mutableStateOf<Int?>(null) }
    val creationName = if (creating) rememberDraftText(draftPrefix + "name", restored.name) else null
    var rejectedName by remember { mutableStateOf<Pair<String, Names.Problem>?>(null) }
    val nameProblem = if (creating) ViewNames.validate(creationName!!.value, data.state.views, view.id)
        ?: rejectedName?.takeIf { it.first == creationName.value.trim() }?.second else null
    val hasInvalidName = nameProblem != null
    LaunchedEffect(data.state.views) { rejectedName = null }
    var mentions by rememberDraftText(draftPrefix + "mentions", restored.filter.text.orEmpty())
    val undoRevision by model.undoRevision.collectAsState()
    val initialUndo = remember { undoRevision }
    LaunchedEffect(undoRevision) {
        if (undoRevision != initialUndo) {
            val stored = withContext(Dispatchers.IO) { session.db.loadState().views.find { it.id == view.id } }
            if (stored == saved || stored == null && !recorded) return@LaunchedEffect
            recorded = stored != null
            val restored = stored ?: initial.takeIf { creating }
            restored?.let { drafts.clear(draftPrefix); saved = it; draft = it; creationName?.value = it.name; mentions = it.filter.text.orEmpty(); podcastMode = it.filter.podcasts?.mode }
        }
    }
    var count by remember { mutableStateOf<Int?>(null) }
    var completing by remember { mutableStateOf(false) }
    val revision by model.revision.collectAsState()
    LaunchedEffect(draft, revision) { count = withContext(Dispatchers.IO) { session.db.evaluate(draft, System.currentTimeMillis()).size } }
    fun update(next: View, typingGroup: String? = null) {
        drafts.put(draftPrefix + "view", ProtocolJson.encodeToString(next))
        draft = next
        if (!creating && ViewEdits.problem(next.filter) == null && next != saved) {
            saved = next; recorded = true; model.edit(Change.SaveView(next), typingGroup)
        }
    }
    fun rename(name: String, complete: (Boolean) -> Unit) {
        // Rename accepted conditions while keeping any invalid condition draft intact.
        model.saveNamedView(saved.copy(name = name), message = R.string.view_renamed_to, formatArgs = listOf(name)) { error ->
            rejectedName = error?.let { name to it }
            if (error == null) {
                draft = draft.copy(name = name)
                drafts.put(draftPrefix + "view", ProtocolJson.encodeToString(draft))
                saved = saved.copy(name = name)
            }
            complete(error == null)
        }
    }
    fun finish() {
        if (completing || hasInvalidNumber || ViewEdits.problem(draft.filter) != null || hasInvalidName) return
        model.finishTyping()
        val accepted = ViewEdits.accepted(draft, saved, recorded)
        val completed = { if (creating) drafts.finishNewView(view.id) else drafts.clear(draftPrefix); done() }
        if (accepted == null) completed() else {
            completing = true
            model.saveNamedView(accepted.view, message = if (creating) R.string.view_created else R.string.view_changed) { error ->
                completing = false
                rejectedName = error?.let { draft.name to it }
                if (error == null) completed()
            }
        }
    }
    DisposableEffect(view.id) { onDispose { model.finishTyping() } }
    val problem = ViewEdits.problem(draft.filter)
    val any = stringResource(R.string.any)
    Column(Modifier.fillMaxSize().imePadding()) {
        LazyColumn(Modifier.weight(1f), state = rememberBrowsingListState(), contentPadding = PaddingValues(bottom = 16.dp)) {
            if (creating) item {
                var name by creationName!!
                var input by remember(view.id) { mutableStateOf(TextFieldValue(name, TextRange(0, name.length))) }
                LaunchedEffect(name) { if (input.text != name) input = TextFieldValue(name, TextRange(0, name.length)) }
                OutlinedTextField(input, { input = it; name = it.text; rejectedName = null; update(draft.copy(name = it.text.trim())) }, label = { Text(stringResource(R.string.m4_name)) }, isError = nameProblem != null, supportingText = nameProblem?.let { error -> ({ InlineError(viewNameProblem(error, name, data.state.views.map { it.name }), Modifier) }) }, modifier = Modifier.fillMaxWidth().padding(16.dp).onFocusChanged { if (!it.isFocused) model.finishTyping() }.then(FocusedInputModifier()), singleLine = true, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { if (problem == null && !hasInvalidNumber && !hasInvalidName) finish() }))
            } else item {
                RenameableName(saved.name, renamePrefix + "name",
                    problem = { text -> (ViewNames.validate(text, data.state.views, view.id) ?: rejectedName?.takeIf { it.first == text.trim() }?.second)?.let { viewNameProblem(it, text, data.state.views.map { it.name }) } },
                    save = ::rename)
            }
            item { Section(stringResource(R.string.m4_conditions)) }
            item { ValueRow(stringResource(R.string.m4_published), when(val p = draft.filter.published) { is PublishedFilter.LastDays -> stringResource(R.string.published_days, p.days); is PublishedFilter.Between -> stringResource(R.string.published_between, p.from?.let(::date) ?: any, p.to?.let(::date) ?: any); null -> any }, draft.filter.published != initial.filter.published) { sheet = 0 } }
            item { ValueRow(stringResource(R.string.m4_podcasts), draft.filter.podcasts?.let { f -> stringResource(if (f.mode == PodcastMode.Include) R.string.podcasts_include else R.string.podcasts_exclude, f.subscriptionIds.joinToString(", ") { id -> data.subscriptions.find { it["id"] == id }?.get("title") as? String ?: id }) } ?: any, draft.filter.podcasts != initial.filter.podcasts) { sheet = 1 } }
            item { ValueRow(stringResource(R.string.m4_mentions), draft.filter.text ?: any, draft.filter.text != initial.filter.text) { sheet = 2 } }
            item { ValueRow(stringResource(R.string.played), stringResource(when(draft.filter.played) { PlayedFilter.Played -> R.string.played; PlayedFilter.Unplayed -> R.string.unplayed; PlayedFilter.InProgress -> R.string.in_progress_condition; null -> R.string.any }), draft.filter.played != initial.filter.played) { sheet = 3 } }
            item { ValueRow(stringResource(R.string.starred), stringResource(when(draft.filter.starred) { true -> R.string.starred; false -> R.string.m4_not_starred; null -> R.string.any }), draft.filter.starred != initial.filter.starred) { sheet = 4 } }
            item { ValueRow(stringResource(R.string.m4_in_playlist), if (draft.filter.notInAnyPlaylist == true) stringResource(R.string.not_in_playlist) else any, draft.filter.notInAnyPlaylist != initial.filter.notInAnyPlaylist) { sheet = 5 } }
            item { ValueRow(stringResource(R.string.m4_length), listOfNotNull(draft.filter.minDuration?.let { stringResource(R.string.min_duration, lengthLabel(it)) }, draft.filter.maxDuration?.let { stringResource(R.string.max_duration, lengthLabel(it)) }).joinToString(" · ").ifEmpty { any }, draft.filter.minDuration != initial.filter.minDuration || draft.filter.maxDuration != initial.filter.maxDuration) { sheet = 6 } }
            if (problem != null) item { InlineError(stringResource(if (problem == ViewEdits.Problem.LengthRange) R.string.m4_length_range_error else R.string.m4_date_range_error), Modifier.padding(16.dp)) }
            item { Section(stringResource(R.string.m4_then)) }
            item { ValueRow(stringResource(R.string.m4_sort), sortLabel(draft.sort)) { sheet = 7 } }
            item { ValueRow(stringResource(R.string.m4_show), draft.limit?.let { stringResource(R.string.show_limit, it) } ?: stringResource(R.string.m4_all_matches)) { sheet = 8 } }
            // A permanent note at the end of the form never inserts space above the conditions.
            item { Hint(stringResource(if (creating) R.string.new_view_draft_kept else R.string.draft_kept)) }
            if ((creating && (draft != initial || creationName!!.value != initial.name)) || problem != null || hasInvalidNumber) item { ContentTextButton(onClick = { if (creating) drafts.finishNewView(view.id) else drafts.clear(draftPrefix); done() }, modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp)) { Text(stringResource(R.string.discard_draft)) } }
            if (creating) item {
                CommitActions(Modifier.padding(horizontal = 16.dp)) {
                    CommitButton(enabled = !completing && problem == null && !hasInvalidNumber && !hasInvalidName, onClick = ::finish) { Text(stringResource(R.string.create_view)) }
                }
            }
            if (!creating) item { ContentTextButton(onClick = { if (recorded) model.changeWithUndo(listOf(Change.DeleteView(draft.id)), R.string.m4_view_deleted, formatArgs = listOf(saved.name)) { before -> before.views.find { it.id == draft.id }?.let { listOf(Change.SaveView(it)) }.orEmpty() }; drafts.clear(draftPrefix); drafts.clear(renamePrefix); deleted() }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.m4_delete_view), color = MaterialTheme.colorScheme.error) } }
        }
        Surface(tonalElevation = 3.dp) {
            val fullCount = count?.let { pluralStringResource(R.plurals.m4_matching, it, it) } ?: stringResource(R.string.counting)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(fullCount, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                if (!creating) CommitActions(Modifier.weight(1f)) {
                    CommitButton(enabled = drafts.get(renamePrefix + "name") == null && !completing && problem == null && !hasInvalidNumber && !hasInvalidName, onClick = ::finish) { Text(stringResource(if (creating) R.string.create_view else R.string.m4_done)) }
                }
            }
        }
    }
    val f = draft.filter
    val close = { model.finishTyping(); sheet = null }
    val titles = listOf(R.string.m4_published, R.string.m4_podcasts, R.string.m4_mentions, R.string.played, R.string.starred, R.string.m4_in_playlist, R.string.m4_length, R.string.m4_sort, R.string.m4_show)
    CompositionLocalProvider(LocalViewDraftPrefix provides "view:${view.id}") {
        sheet?.let { which -> EditorSheet(stringResource(titles[which]), close) {
            when (which) {
                0 -> {
                    val choices = listOf<PublishedFilter?>(null, PublishedFilter.LastDays(7), PublishedFilter.LastDays(14), PublishedFilter.LastDays(30), PublishedFilter.Between(null, null))
                    ChoiceRows(choices.map { it to when(it) { is PublishedFilter.LastDays -> stringResource(R.string.published_days, it.days); is PublishedFilter.Between -> stringResource(R.string.m4_between_dates); null -> any } }, if (f.published is PublishedFilter.Between) PublishedFilter.Between(null, null) else f.published) { update(draft.copy(filter = f.copy(published = it))) }
                    (f.published as? PublishedFilter.Between)?.let { between ->
                        DateBoundary(R.string.m4_from, between.from, false) { update(draft.copy(filter = draft.filter.copy(published = between.copy(from = it)))) }
                        DateBoundary(R.string.m4_to, between.to, true) { update(draft.copy(filter = draft.filter.copy(published = between.copy(to = it)))) }
                    }
                }
                1 -> {
                    ChoiceRows(listOf(null to any, PodcastMode.Include to stringResource(R.string.m4_only_these), PodcastMode.Exclude to stringResource(R.string.m4_except_these)), podcastMode) { mode -> podcastMode = mode; update(draft.copy(filter = f.copy(podcasts = ViewEdits.podcasts(mode, f.podcasts?.subscriptionIds.orEmpty())))) }
                    val podcasts = f.podcasts
                    val selectedIds = podcasts?.subscriptionIds.orEmpty()
                    if (podcastMode != null) LazyColumn(Modifier.heightIn(max = 280.dp)) { items(data.subscriptions) { sub ->
                        val id = sub["id"] as String
                        CheckRow(sub["title"] as String, id in selectedIds) { checked -> update(draft.copy(filter = f.copy(podcasts = ViewEdits.podcasts(podcastMode, if (checked) selectedIds + id else selectedIds - id)))) }
                    } }
                }
                2 -> OutlinedTextField(mentions, { mentions = it; update(draft.copy(filter = f.copy(text = it.takeUnless(String::isBlank))), "view-mentions:${view.id}") }, label = { Text(stringResource(R.string.m4_mentions)) }, modifier = Modifier.fillMaxWidth().then(FocusedInputModifier()).onFocusChanged { if (!it.isFocused) model.finishTyping() })
                3 -> ChoiceRows(listOf(null to any, PlayedFilter.Unplayed to stringResource(R.string.unplayed), PlayedFilter.InProgress to stringResource(R.string.in_progress_condition), PlayedFilter.Played to stringResource(R.string.played)), f.played) { update(draft.copy(filter = f.copy(played = it))) }
                4 -> ChoiceRows(listOf(null to any, true to stringResource(R.string.starred), false to stringResource(R.string.m4_not_starred)), f.starred) { update(draft.copy(filter = f.copy(starred = it))) }
                5 -> ChoiceRows(listOf(null to any, true to stringResource(R.string.not_in_playlist)), f.notInAnyPlaylist?.takeIf { it }) { update(draft.copy(filter = f.copy(notInAnyPlaylist = it))) }
                6 -> {
                    NumberField(stringResource(R.string.m4_at_least_minutes), f.minDuration?.div(60), autofocus = true) { update(draft.copy(filter = draft.filter.copy(minDuration = it?.times(60)))) }
                    NumberField(stringResource(R.string.m4_at_most_minutes), f.maxDuration?.div(60)) { update(draft.copy(filter = draft.filter.copy(maxDuration = it?.times(60)))) }
                }
                7 -> ChoiceRows(ViewSort.entries.map { it to sortLabel(it) }, draft.sort) { update(draft.copy(sort = it)) }
                8 -> { ChoiceRows(listOf(null to stringResource(R.string.m4_all_matches), 10L to "10", 20L to "20", 50L to "50", 100L to "100"), draft.limit) { update(draft.copy(limit = it)) } }
            }
            if (problem != null) InlineError(stringResource(if (problem == ViewEdits.Problem.LengthRange) R.string.m4_length_range_error else R.string.m4_date_range_error), modifier = Modifier)
        } }
    }
}

@Composable private fun DateBoundary(label: Int, value: Long?, end: Boolean, changed: (Long?) -> Unit) {
    var picking by rememberSaveable(label) { mutableStateOf(false) }
    ValueRow(stringResource(label), value?.let(::date) ?: stringResource(R.string.any)) { picking = true }
    if (value != null) ContentTextButton(onClick = { changed(null) }) { Text(stringResource(R.string.any)) }
    if (picking) {
        // Material's picker uses UTC date labels; convert the chosen date to this Device's boundaries.
        val initial = value?.let { java.time.Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli() }
        val picker = rememberDatePickerState(initialSelectedDateMillis = initial, selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long) = utcTimeMillis >= 0
            override fun isSelectableYear(year: Int) = year >= 1970
        })
        DatePickerDialog(onDismissRequest = { picking = false }, dismissButton = { TextButton(onClick = { picking = false }) { Text(stringResource(R.string.cancel)) } }, confirmButton = {
            TextButton(enabled = picker.selectedDateMillis != null, onClick = {
                picker.selectedDateMillis?.let { millis ->
                    val day = java.time.Instant.ofEpochMilli(millis).atZone(java.time.ZoneOffset.UTC).toLocalDate()
                    changed((if (end) day.plusDays(1) else day).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() - if (end) 1 else 0)
                }
                picking = false
            }) { Text(stringResource(R.string.m4_done)) }
        }) { DatePicker(picker) }
    }
}

@Composable
internal fun viewNameProblem(problem: Names.Problem, name: String, taken: List<String> = emptyList()): String =
    stringResource(if (problem == Names.Problem.Empty) R.string.m4_view_name_error else R.string.view_name_duplicate, Names.match(name, taken) ?: name.trim())
