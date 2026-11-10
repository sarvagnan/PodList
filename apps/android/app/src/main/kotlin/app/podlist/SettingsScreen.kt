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
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*

@Composable
internal fun SettingsScreen(data: ScreenData, session: Session, open: (String) -> Unit, initialAppearance: Boolean = false) {
    val model = LocalAppModel.current
    var showAppearance by rememberSaveable { mutableStateOf(initialAppearance) }
    var retention by rememberSaveable { mutableStateOf(false) }
    val actions = remember(session) { model.opml(session) }
    val opml by actions.state.collectAsState()
    val busy = opml.busy
    val error = opml.error
    val summary = opml.summary
    val bringOver by model.bringOver.collectAsState()
    val appearance by model.appearance.collectAsState()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> if (uri != null) actions.read(uri) }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/x-opml")) { uri -> if (uri != null) actions.export(uri) }
    val listState = rememberBrowsingListState()
    val reveal by model.settingReveal.collectAsState()
    var revealed by rememberSaveable { mutableLongStateOf(0L) }
    val playbackKeys = listOf(SettingKey.Speed, SettingKey.SkipIntro, SettingKey.SkipOutro, SettingKey.VolumeBoost)
    LaunchedEffect(reveal) {
        if (reveal != null && reveal!!.token != revealed && reveal!!.route == "settings") {
            val key = reveal!!.key
            val index = if (key in playbackKeys) playbackKeys.indexOf(key) + 2 else {
                val retentionIndex = 10 + (if (busy) 1 else 0) +
                    (if (!busy && opml.progress?.remaining?.isNotEmpty() == true) 1 else 0) +
                    (if (error) 1 else 0) + (if (summary != null) 1 else 0)
                if (key == SettingKey.TrashRetention) retentionIndex else retentionIndex + 2
            }
            if (index >= 0) listState.animateScrollToItem(index)
            revealed = reveal!!.token
        }
    }
    LazyColumn(state = listState, contentPadding = PaddingValues(bottom = 24.dp)) {
        item { Section(stringResource(R.string.playback_settings)) }
        item { Hint(stringResource(R.string.settings_inheritance)) }
        playbackKeys.forEach { key -> item(key = key) { PlaybackSettingsEditor(data.state.playbackSettings, key) } }
        item { Section(stringResource(R.string.m4_your_listening)); SettingsRow(stringResource(R.string.m4_listening_stats), stringResource(R.string.m4_stats_hint)) { open("listening-stats") } }
        item { Section(stringResource(R.string.m4_your_podcasts)) }
        item { ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { picker.launch(arrayOf("text/*", "application/xml", "application/octet-stream")) }, headlineContent = { Text(stringResource(R.string.m4_import_opml)) }, supportingContent = { Text(stringResource(R.string.m4_import_help)) }); ContentDivider() }
        item { ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { export.launch("podlist-subscriptions.opml") }, headlineContent = { Text(stringResource(R.string.m4_export_opml)) }, supportingContent = { Text(stringResource(R.string.m4_export_help)) }); ContentDivider() }
        if (busy) item {
            Column(Modifier.padding(16.dp)) {
                val progress = opml.progress
                if (progress == null) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(R.string.opml_progress)))
                else {
                    LinearProgressIndicator(progress = { if (progress.total == 0) 1f else progress.processed.toFloat() / progress.total }, modifier = Modifier.fillMaxWidth().then(ProgressModifier(R.string.m4_import_opml)))
                    Text(pluralStringResource(R.plurals.import_progress, progress.total, progress.processed, progress.total))
                    ContentTextButton(onClick = actions::stop, enabled = !opml.stopping) { Text(stringResource(if (opml.stopping) R.string.import_stopping else R.string.import_stop)) }
                }
            }
        }
        if (!busy && opml.progress?.remaining?.isNotEmpty() == true) item {
            Column(Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.import_stopped)); ContentTextButton(onClick = actions::resume) { Text(stringResource(R.string.import_resume)) } }
        }
        if (error) item { Column(Modifier.padding(16.dp)) { InlineError(stringResource(R.string.m4_opml_error), modifier = Modifier); ContentTextButton(onClick = actions::retry, enabled = !busy) { Text(stringResource(R.string.retry_action)) } } }
        summary?.let { result -> item {
            Column(Modifier.padding(16.dp)) {
                Text(stringResource(R.string.m4_import_summary, result.added, result.alreadySubscribed, result.failed.size))
                result.failed.forEach { failure -> InlineError(stringResource(R.string.m4_import_failure, failure.feedUrl, stringResource(lookupErrorResource(failure.error))), Modifier) }
                if (result.failed.isNotEmpty()) ContentTextButton(enabled = !busy, onClick = actions::retryFailed) { Text(stringResource(R.string.m4_retry_failed)) }
            }
        } }
        item(key = SettingKey.TrashRetention) { Section(stringResource(R.string.playlists)); ValueRow(stringResource(R.string.m4_keep_deleted), stringResource(R.string.m4_days, data.state.trashDays ?: 30)) { retention = true } }
        item { Section(stringResource(R.string.this_device)); SettingsRow(stringResource(R.string.server), session.source.server?.origin ?: stringResource(R.string.server_none)) { open("server") } }
        item(key = SettingKey.Appearance) { SettingsRow(stringResource(R.string.appearance), stringResource(appearanceLabel(appearance))) { showAppearance = true } }
        if (bringOver?.origin == session.source.key && bringOver?.job?.complete != true) item {
            SettingsRow(stringResource(R.string.bring_over_title), stringResource(if (bringOver?.job == null) R.string.bring_over_available else R.string.bring_over_in_settings)) { model.showBringOver() }
        }
        item { Section(stringResource(R.string.m4_help)); SettingsRow(stringResource(R.string.m4_getting_started), stringResource(R.string.m4_getting_started_hint)) { open("getting-started") } }
    }
    if (showAppearance) EditorSheet(stringResource(R.string.appearance), { showAppearance = false }) {
        ChoiceRows(app.podlist.data.Appearance.entries.map { it to stringResource(appearanceLabel(it)) }, appearance, choose = model::setAppearance)
    }
    if (retention) EditorSheet(stringResource(R.string.m4_keep_deleted), { retention = false }) {
        ChoiceRows(listOf(7L, 14L, 30L, 60L, 90L).map { it to stringResource(R.string.m4_days, it) }, data.state.trashDays ?: 30) { model.edit(Change.SetTrashDays(it)) }
    }
}

@Composable
private fun SettingsRow(title: String, subtitle: String, onClick: () -> Unit) {
    NameRow(title, subtitle, titleStyle = MaterialTheme.typography.bodyLarge, onClick = onClick)
}

internal fun appearanceLabel(appearance: app.podlist.data.Appearance): Int = when (appearance) {
    app.podlist.data.Appearance.System -> R.string.appearance_system
    app.podlist.data.Appearance.Light -> R.string.appearance_light
    app.podlist.data.Appearance.Dark -> R.string.appearance_dark
}
