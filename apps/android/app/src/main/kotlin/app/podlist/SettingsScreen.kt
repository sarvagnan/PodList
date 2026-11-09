package app.podlist

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*

@Composable
internal fun SettingsScreen(data: ScreenData, session: Session, open: (String) -> Unit) {
    val model = LocalAppModel.current
    var retention by rememberSaveable { mutableStateOf(false) }
    val actions = remember(session) { model.opml(session) }
    val opml by actions.state.collectAsState()
    val busy = opml.busy
    val error = opml.error
    val summary = opml.summary
    val bringOver by model.bringOver.collectAsState()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) actions.read(uri) }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/x-opml")) { uri -> if (uri != null) actions.export(uri) }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
        item { Section(stringResource(R.string.playback_settings)); PlaybackSettingsEditor(data.state.playbackSettings) }
        item { Section(stringResource(R.string.m4_your_listening)); NameRow(stringResource(R.string.m4_listening_stats), stringResource(R.string.m4_stats_hint)) { open("listening-stats") } }
        item { Section(stringResource(R.string.m4_your_podcasts)) }
        item { ListItem(modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { picker.launch(arrayOf("text/*", "application/xml", "application/octet-stream")) }, leadingContent = { Icon(painterResource(R.drawable.ic_import_opml), null) }, headlineContent = { Text(stringResource(R.string.m4_import_opml)) }, supportingContent = { Text(stringResource(R.string.m4_import_help)) }) }
        item { ListItem(modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { export.launch("podlist-subscriptions.opml") }, leadingContent = { Icon(painterResource(R.drawable.ic_export_opml), null) }, headlineContent = { Text(stringResource(R.string.m4_export_opml)) }, supportingContent = { Text(stringResource(R.string.m4_export_help)) }) }
        if (busy) item {
            Column(Modifier.padding(16.dp)) {
                val progress = opml.progress
                if (progress == null) LinearProgressIndicator(Modifier.fillMaxWidth())
                else {
                    LinearProgressIndicator(progress = { if (progress.total == 0) 1f else progress.processed.toFloat() / progress.total }, modifier = Modifier.fillMaxWidth())
                    Text(pluralStringResource(R.plurals.import_progress, progress.total, progress.processed, progress.total))
                    TextButton(onClick = actions::stop, enabled = !opml.stopping) { Text(stringResource(if (opml.stopping) R.string.import_stopping else R.string.import_stop)) }
                }
            }
        }
        if (!busy && opml.progress?.remaining?.isNotEmpty() == true) item {
            Column(Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.import_stopped)); TextButton(onClick = actions::resume) { Text(stringResource(R.string.import_resume)) } }
        }
        if (error) item { Column(Modifier.padding(16.dp)) { Text(stringResource(R.string.m4_opml_error), color = MaterialTheme.colorScheme.error); TextButton(onClick = actions::retry, enabled = !busy) { Text(stringResource(R.string.retry)) } } }
        summary?.let { result -> item {
            Column(Modifier.padding(16.dp)) {
                Text(stringResource(R.string.m4_import_summary, result.added, result.alreadySubscribed, result.failed.size))
                result.failed.forEach { failure -> Text(stringResource(R.string.m4_import_failure, failure.feedUrl, failure.message), style = MaterialTheme.typography.bodySmall) }
                if (result.failed.isNotEmpty()) TextButton(enabled = !busy, onClick = actions::retryFailed) { Text(stringResource(R.string.m4_retry_failed)) }
            }
        } }
        item { Section(stringResource(R.string.playlists)); ValueRow(stringResource(R.string.m4_keep_deleted), stringResource(R.string.m4_days, data.state.trashDays ?: 30)) { retention = true } }
        item { Section(stringResource(R.string.this_device)); NameRow(stringResource(R.string.server), session.source.server?.origin ?: stringResource(R.string.server_none)) { open("server") } }
        if (bringOver?.origin == session.source.key && bringOver?.job?.complete != true) item {
            NameRow(stringResource(R.string.bring_over_title), stringResource(if (bringOver?.job == null) R.string.bring_over_available else R.string.bring_over_in_settings)) { model.showBringOver() }
        }
        item { Section(stringResource(R.string.m4_help)); NameRow(stringResource(R.string.m4_getting_started), stringResource(R.string.m4_getting_started_hint)) { open("getting-started") } }
    }
    if (retention) EditorSheet(stringResource(R.string.m4_keep_deleted), { retention = false }) {
        ChoiceRows(listOf(7L, 14L, 30L, 60L, 90L).map { it to stringResource(R.string.m4_days, it) }, data.state.trashDays ?: 30) { model.edit(Change.SetTrashDays(it)); retention = false }
    }
}
