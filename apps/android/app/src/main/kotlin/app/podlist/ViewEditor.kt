@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.ZoneId

@Composable
internal fun ViewEditor(view: View, data: ScreenData, session: Session, done: () -> Unit, deleted: () -> Unit) {
    val model = LocalAppModel.current
    var draft by remember(view.id) { mutableStateOf(view) }
    var saved by remember(view.id) { mutableStateOf(view) }
    var podcastMode by rememberSaveable(view.id) { mutableStateOf(view.filter.podcasts?.mode) }
    var previous by remember(view.id) { mutableStateOf(emptyList<View>()) }
    var sheet by rememberSaveable { mutableStateOf<Int?>(null) }
    var name by rememberSaveable(view.id) { mutableStateOf(view.name) }
    var count by remember { mutableIntStateOf(0) }
    val revision by model.revision.collectAsState()
    LaunchedEffect(draft, revision) { count = withContext(Dispatchers.IO) { session.db.evaluate(saved, System.currentTimeMillis()).size } }
    fun update(next: View) {
        draft = next
        if (ViewEdits.problem(next.filter) == null && next != saved) {
            previous = previous + saved; saved = next; model.edit(Change.SaveView(next))
        }
    }
    val problem = ViewEdits.problem(draft.filter)
    val any = stringResource(R.string.any)
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 16.dp)) {
            item { OutlinedTextField(name, { name = it; if (it.isNotBlank()) update(draft.copy(name = it.trim())) }, label = { Text(stringResource(R.string.m4_name)) }, isError = name.isBlank(), supportingText = if (name.isBlank()) ({ Text(stringResource(R.string.m4_view_name_error)) }) else null, modifier = Modifier.fillMaxWidth().padding(16.dp), singleLine = true) }
            item { Section(stringResource(R.string.m4_conditions)) }
            item { ValueRow(stringResource(R.string.m4_published), when(val p = draft.filter.published) { is PublishedFilter.LastDays -> stringResource(R.string.published_days, p.days); is PublishedFilter.Between -> stringResource(R.string.published_between, p.from?.let(::date) ?: any, p.to?.let(::date) ?: any); null -> any }, draft.filter.published != null) { sheet = 0 } }
            item { ValueRow(stringResource(R.string.m4_podcasts), draft.filter.podcasts?.let { f -> stringResource(if (f.mode == PodcastMode.Include) R.string.podcasts_include else R.string.podcasts_exclude, f.subscriptionIds.joinToString(", ") { id -> data.subscriptions.find { it["id"] == id }?.get("title") as? String ?: id }) } ?: any, draft.filter.podcasts != null) { sheet = 1 } }
            item { ValueRow(stringResource(R.string.m4_mentions), draft.filter.text ?: any, draft.filter.text != null) { sheet = 2 } }
            item { ValueRow(stringResource(R.string.played), stringResource(when(draft.filter.played) { PlayedFilter.Played -> R.string.played; PlayedFilter.Unplayed -> R.string.unplayed; PlayedFilter.InProgress -> R.string.in_progress_condition; null -> R.string.any }), draft.filter.played != null) { sheet = 3 } }
            item { ValueRow(stringResource(R.string.starred), stringResource(when(draft.filter.starred) { true -> R.string.starred; false -> R.string.m4_not_starred; null -> R.string.any }), draft.filter.starred != null) { sheet = 4 } }
            item { ValueRow(stringResource(R.string.m4_in_playlist), if (draft.filter.notInAnyPlaylist == true) stringResource(R.string.not_in_playlist) else any, draft.filter.notInAnyPlaylist == true) { sheet = 5 } }
            item { ValueRow(stringResource(R.string.m4_length), listOfNotNull(draft.filter.minDuration?.let { stringResource(R.string.min_duration, duration(it)) }, draft.filter.maxDuration?.let { stringResource(R.string.max_duration, duration(it)) }).joinToString(" · ").ifEmpty { any }, draft.filter.minDuration != null || draft.filter.maxDuration != null) { sheet = 6 } }
            if (problem != null) item { Text(stringResource(if (problem == ViewEdits.Problem.LengthRange) R.string.m4_length_range_error else R.string.m4_date_range_error), Modifier.padding(16.dp), color = MaterialTheme.colorScheme.error) }
            item { Section(stringResource(R.string.m4_then)) }
            item { ValueRow(stringResource(R.string.m4_sort), sortLabel(draft.sort)) { sheet = 7 } }
            item { ValueRow(stringResource(R.string.m4_show), draft.limit?.let { stringResource(R.string.show_limit, it) } ?: stringResource(R.string.m4_all_matches)) { sheet = 8 } }
            item { TextButton(onClick = { model.changeWithUndo(listOf(Change.DeleteView(draft.id)), R.string.m4_view_deleted) { listOf(Change.SaveView(saved)) }; deleted() }, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.m4_delete_view), color = MaterialTheme.colorScheme.error) } }
        }
        Surface(tonalElevation = 3.dp) { Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(stringResource(R.string.m4_matching, count), Modifier.weight(1f).padding(vertical = 16.dp))
            TextButton(enabled = previous.isNotEmpty(), onClick = { val last = previous.last(); previous = previous.dropLast(1); draft = last; saved = last; name = last.name; podcastMode = last.filter.podcasts?.mode; model.edit(Change.SaveView(last)) }) { Text(stringResource(R.string.undo)) }
            TextButton(enabled = problem == null && name.isNotBlank(), onClick = done) { Text(stringResource(R.string.m4_done)) }
        } }
    }
    val f = draft.filter
    val close = { sheet = null }
    val titles = listOf(R.string.m4_published, R.string.m4_podcasts, R.string.m4_mentions, R.string.played, R.string.starred, R.string.m4_in_playlist, R.string.m4_length, R.string.m4_sort, R.string.m4_show)
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
                    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Checkbox(id in selectedIds, { checked -> update(draft.copy(filter = f.copy(podcasts = ViewEdits.podcasts(podcastMode, if (checked) selectedIds + id else selectedIds - id)))) }); Text(sub["title"] as String)
                    }
                } }
            }
            2 -> OutlinedTextField(f.text.orEmpty(), { update(draft.copy(filter = f.copy(text = it.takeUnless(String::isBlank)))) }, label = { Text(stringResource(R.string.m4_mentions)) }, modifier = Modifier.fillMaxWidth())
            3 -> ChoiceRows(listOf(null to any, PlayedFilter.Unplayed to stringResource(R.string.unplayed), PlayedFilter.InProgress to stringResource(R.string.in_progress_condition), PlayedFilter.Played to stringResource(R.string.played)), f.played) { update(draft.copy(filter = f.copy(played = it))); close() }
            4 -> ChoiceRows(listOf(null to any, true to stringResource(R.string.starred), false to stringResource(R.string.m4_not_starred)), f.starred) { update(draft.copy(filter = f.copy(starred = it))); close() }
            5 -> ChoiceRows(listOf(null to any, true to stringResource(R.string.not_in_playlist)), f.notInAnyPlaylist?.takeIf { it }) { update(draft.copy(filter = f.copy(notInAnyPlaylist = it))); close() }
            6 -> {
                NumberField(stringResource(R.string.m4_at_least_minutes), f.minDuration?.div(60)) { update(draft.copy(filter = draft.filter.copy(minDuration = it?.times(60)))) }
                NumberField(stringResource(R.string.m4_at_most_minutes), f.maxDuration?.div(60)) { update(draft.copy(filter = draft.filter.copy(maxDuration = it?.times(60)))) }
            }
            7 -> ChoiceRows(ViewSort.entries.map { it to sortLabel(it) }, draft.sort) { update(draft.copy(sort = it)); close() }
            8 -> { ChoiceRows(listOf(null to stringResource(R.string.m4_all_matches), 10L to "10", 20L to "20", 50L to "50", 100L to "100"), draft.limit) { update(draft.copy(limit = it)); close() } }
        }
        if (problem != null) Text(stringResource(if (problem == ViewEdits.Problem.LengthRange) R.string.m4_length_range_error else R.string.m4_date_range_error), color = MaterialTheme.colorScheme.error)
    } }
}

@Composable private fun DateBoundary(label: Int, value: Long?, end: Boolean, changed: (Long?) -> Unit) {
    var picking by rememberSaveable(label) { mutableStateOf(false) }
    ValueRow(stringResource(label), value?.let(::date) ?: stringResource(R.string.any)) { picking = true }
    if (value != null) TextButton(onClick = { changed(null) }) { Text(stringResource(R.string.any)) }
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
