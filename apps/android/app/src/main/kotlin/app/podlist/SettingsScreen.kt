package app.podlist

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
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
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) actions.read(uri) }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/x-opml")) { uri -> if (uri != null) actions.export(uri) }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
        item { Section(stringResource(R.string.playback_settings)); PlaybackSettingsEditor(data.state.playbackSettings) }
        item { Section(stringResource(R.string.m4_your_listening)); NameRow(stringResource(R.string.m4_listening_stats), stringResource(R.string.m4_stats_hint)) { open("listening-stats") } }
        item { Section(stringResource(R.string.m4_your_podcasts)) }
        item { ListItem(modifier = Modifier.fillMaxWidth(), leadingContent = { Icon(painterResource(R.drawable.ic_import_opml), null) }, headlineContent = { TextButton(enabled = !busy, onClick = { picker.launch(arrayOf("text/*", "application/xml", "application/octet-stream")) }) { Text(stringResource(R.string.m4_import_opml)) } }, supportingContent = { Text(stringResource(R.string.m4_import_help)) }) }
        item { ListItem(leadingContent = { Icon(painterResource(R.drawable.ic_export_opml), null) }, headlineContent = { TextButton(enabled = !busy, onClick = { export.launch("podlist-subscriptions.opml") }) { Text(stringResource(R.string.m4_export_opml)) } }, supportingContent = { Text(stringResource(R.string.m4_export_help)) }) }
        if (busy) item { LinearProgressIndicator(Modifier.fillMaxWidth().padding(16.dp)) }
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
        item { Section(stringResource(R.string.m4_help)); NameRow(stringResource(R.string.m4_getting_started), stringResource(R.string.m4_getting_started_hint)) { open("getting-started") } }
    }
    if (retention) EditorSheet(stringResource(R.string.m4_keep_deleted), { retention = false }) {
        ChoiceRows(listOf(7L, 14L, 30L, 60L, 90L).map { it to stringResource(R.string.m4_days, it) }, data.state.trashDays ?: 30) { model.edit(Change.SetTrashDays(it)); retention = false }
    }
}
