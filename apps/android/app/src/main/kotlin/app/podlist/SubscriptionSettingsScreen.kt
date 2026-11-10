package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row
import app.podlist.domain.*

@Composable
internal fun SubscriptionSettingsScreen(subscription: Row, data: ScreenData, session: Session) {
    val id = subscription["id"] as String
    val model = LocalAppModel.current
    val overrides = ProtocolJson.decodeFromString<PlaybackSettingsOverride>(subscription["playback_settings"] as String)
    val threshold = (subscription["played_threshold"] as? Number)?.toDouble()
    var sheet by rememberSaveable { mutableStateOf<Int?>(null) }
    val global = data.state.playbackSettings
    fun update(next: PlaybackSettingsOverride = overrides, played: Double? = threshold) { model.edit(Change.SetSubscriptionOverrides(id, next, played)) }
    val rule = data.state.downloadRules.find { it.subscriptionId == id && it.deviceId == session.deviceId } ?: DownloadRule(id, session.deviceId, DownloadMode.Never, null)
    val ruleLabels = listOf(R.string.stream, R.string.on_entry, R.string.all_new)
    val ruleHelp = listOf(R.string.m4_stream_help, R.string.m4_entry_help, R.string.m4_published_help)
    val modeIndex = when (rule.mode) { DownloadMode.Never -> 0; DownloadMode.OnEntry -> 1; DownloadMode.AllNew -> 2 }
    val listState = rememberBrowsingListState()
    val reveal by model.settingReveal.collectAsState()
    var revealed by rememberSaveable { mutableLongStateOf(0L) }
    LaunchedEffect(reveal) {
        val target = reveal
        if (target != null && target.token != revealed && target.route == "subscription-settings:$id") {
            val offset = if (rule.mode == DownloadMode.AllNew) 1 else 0
            val index = when (target.key) {
                SettingKey.DownloadRule -> 1
                SettingKey.KeepAtMost -> if (offset == 1) 2 else 1
                SettingKey.PlayedThreshold -> 3 + offset
                SettingKey.Speed -> 5 + offset
                SettingKey.SkipIntro -> 6 + offset
                SettingKey.SkipOutro -> 7 + offset
                SettingKey.VolumeBoost -> 8 + offset
                else -> 0
            }
            listState.animateScrollToItem(index)
            revealed = target.token
        }
    }
    LazyColumn(state = listState, contentPadding = PaddingValues(bottom = 24.dp)) {
        item { Section(stringResource(R.string.m4_downloads_device)) }
        item { ValueRow(stringResource(R.string.m4_download_rule), stringResource(ruleLabels[modeIndex]), rule.mode != DownloadMode.Never, stringResource(ruleHelp[modeIndex])) { sheet = 0 } }
        if (rule.mode == DownloadMode.AllNew) item { ValueRow(stringResource(R.string.m4_keep_at_most), rule.keepAtMost?.let { pluralStringResource(R.plurals.episode_count, it.toInt(), it.toInt()) } ?: stringResource(R.string.m4_unlimited), rule.keepAtMost != null) { sheet = 0 } }
        item { Section(stringResource(R.string.played)) }
        item { ValueRow(stringResource(R.string.m4_played_threshold), threshold?.let { stringResource(R.string.m4_seconds, it.toLong()) } ?: stringResource(R.string.m4_default_value, stringResource(R.string.m4_seconds, 30L)), threshold != null, stringResource(R.string.m4_threshold_help)) { sheet = 1 } }
        item { Section(stringResource(R.string.m4_playback_overrides)); Hint(stringResource(R.string.m4_override_help)) }
        item { val value = speedSetting(overrides.speed ?: global.speed); ValueRow(stringResource(R.string.speed), if (overrides.speed == null) stringResource(R.string.m4_default_value, value) else value, overrides.speed != null) { sheet = 2 } }
        item { val value = secondsSetting(overrides.skipIntro ?: global.skipIntro); ValueRow(stringResource(R.string.m4_skip_intro), if (overrides.skipIntro == null) stringResource(R.string.m4_default_value, value) else value, overrides.skipIntro != null) { sheet = 3 } }
        item { val value = secondsSetting(overrides.skipOutro ?: global.skipOutro); ValueRow(stringResource(R.string.m4_skip_outro), if (overrides.skipOutro == null) stringResource(R.string.m4_default_value, value) else value, overrides.skipOutro != null) { sheet = 4 } }
        item { val value = stringResource(if (overrides.volumeBoost ?: global.volumeBoost) R.string.m4_on else R.string.m4_off); ValueRow(stringResource(R.string.volume_boost), if (overrides.volumeBoost == null) stringResource(R.string.m4_default_value, value) else value, overrides.volumeBoost != null) { sheet = 5 } }
        item { ContentTextButton(onClick = { model.markSubscriptionPlayed(id) }, modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp)) { Text(stringResource(R.string.m4_mark_all_played)) } }
    }
    val drafts = LocalFormDrafts.current
    val close = {
        if (drafts.get("subscription:$id/keep-at-most")?.let { NumberInput.valid(it, 1.0, true) } != false) drafts.clear("subscription:$id/")
        model.finishTyping()
        sheet = null
    }
    sheet?.let { which -> EditorSheet(stringResource(when(which) { 0 -> R.string.m4_download_rule; 1 -> R.string.m4_played_threshold; 2 -> R.string.speed; 3 -> R.string.m4_skip_intro; 4 -> R.string.m4_skip_outro; else -> R.string.volume_boost }), close) {
        when(which) {
            0 -> {
                val modes = listOf(DownloadMode.Never, DownloadMode.OnEntry, DownloadMode.AllNew)
                val explanations = modes.mapIndexed { index, mode -> mode to stringResource(ruleHelp[index]) }.toMap()
                ChoiceRows(modes.mapIndexed { index, mode -> mode to stringResource(ruleLabels[index]) }, rule.mode, supporting = { explanations.getValue(it) }) { model.edit(Change.SetDownloadRule(rule.copy(mode = it))) }
                if (rule.mode == DownloadMode.AllNew) NumberField(stringResource(R.string.m4_keep_at_most), rule.keepAtMost?.toDouble(), true, minimum = 1.0, draftKey = "subscription:$id/keep-at-most") { model.edit(Change.SetDownloadRule(rule.copy(keepAtMost = it?.toLong()))) }
            }
            1 -> ChoiceRows(listOf(null to stringResource(R.string.m4_default_threshold)) + listOf(0.0, 10.0, 30.0, 60.0, 120.0, 300.0).map { it to stringResource(R.string.m4_seconds, it.toLong()) }, threshold) { update(played = it) }
            2 -> ChoiceRows(listOf(null to stringResource(R.string.m4_default_value, speedSetting(global.speed))) + PlaybackSpeeds.map { it to speedSetting(it) }, overrides.speed) { update(overrides.copy(speed = it)) }
            3, 4 -> ChoiceRows(listOf(null to stringResource(R.string.m4_default_value, secondsSetting(if (which == 3) global.skipIntro else global.skipOutro))) + listOf(0.0, 15.0, 30.0, 45.0, 60.0, 90.0, 120.0).map { it to secondsSetting(it) }, if(which == 3) overrides.skipIntro else overrides.skipOutro) { update(if(which == 3) overrides.copy(skipIntro = it) else overrides.copy(skipOutro = it)) }
            5 -> ChoiceRows(listOf(null to stringResource(R.string.m4_default_value, stringResource(if(global.volumeBoost) R.string.m4_on else R.string.m4_off)), false to stringResource(R.string.m4_off), true to stringResource(R.string.m4_on)), overrides.volumeBoost) { update(overrides.copy(volumeBoost = it)) }
        }
    } }
}

@Composable internal fun secondsSetting(value: Double): String = if (value == 0.0) stringResource(R.string.m4_off) else stringResource(R.string.m4_seconds, value.toLong())
