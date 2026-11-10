package app.podlist

import android.app.Application
import app.podlist.domain.*

internal data class SettingReveal(val key: SettingKey, val route: String = "settings", val token: Long = System.nanoTime())

internal fun AppModel.restoredSettingsMessage(before: State, after: State, changes: List<Change>, inverse: List<Change>, scopeNames: Map<String, String>): AppMessage? {
    val context = getApplication<Application>()
    val messages = mutableListOf<String>()
    fun onOff(value: Boolean) = context.getString(if (value) R.string.m4_on else R.string.m4_off)
    fun seconds(value: Double) = if (value == 0.0) context.getString(R.string.m4_off) else context.getString(R.string.m4_seconds, value.toLong())
    fun speed(value: Double) = context.getString(R.string.speed_value, java.text.NumberFormat.getNumberInstance().apply {
        minimumFractionDigits = 1; maximumFractionDigits = 2; isGroupingUsed = false
    }.format(value))
    fun label(key: SettingKey): String = context.getString(when (key) {
        SettingKey.Speed -> R.string.speed
        SettingKey.SkipIntro -> R.string.m4_skip_intro
        SettingKey.SkipOutro -> R.string.m4_skip_outro
        SettingKey.VolumeBoost -> R.string.volume_boost
        SettingKey.TrashRetention -> R.string.m4_keep_deleted
        SettingKey.Appearance -> R.string.appearance
        SettingKey.ClearOnPlayed -> R.string.clear_on_played
        SettingKey.DownloadRule -> R.string.m4_download_rule
        SettingKey.KeepAtMost -> R.string.download_limit
        SettingKey.PlayedThreshold -> R.string.m4_played_threshold
    })
    var firstReveal: SettingReveal? = null
    fun restored(key: SettingKey, value: String, route: String = "settings", scope: String? = null) {
        if (firstReveal == null) firstReveal = SettingReveal(key, route)
        val name = scope?.let { context.getString(R.string.setting_for, label(key), it) } ?: label(key)
        messages += context.getString(R.string.setting_back_to, name, value)
    }
    SettingsFeedback.restored(before, after, changes).forEach { key ->
        restored(key, when (key) {
            SettingKey.Speed -> speed(after.playbackSettings.speed)
            SettingKey.SkipIntro -> seconds(after.playbackSettings.skipIntro)
            SettingKey.SkipOutro -> seconds(after.playbackSettings.skipOutro)
            SettingKey.VolumeBoost -> onOff(after.playbackSettings.volumeBoost)
            SettingKey.TrashRetention -> context.getString(R.string.m4_days, after.trashDays ?: 30)
            else -> error("Not a global State setting")
        })
    }
    changes.forEach { change -> when (change) {
        is Change.SetClearOnPlayed -> after.playlists.find { it.id == change.playlistId }?.let { playlist ->
            restored(SettingKey.ClearOnPlayed, onOff(playlist.clearOnPlayed), "playlist-settings:${playlist.id}", playlist.name)
        }
        is Change.SetDownloadRule -> {
            val rule = change.rule
            val old = before.downloadRules.find { it.subscriptionId == rule.subscriptionId && it.deviceId == rule.deviceId }
            val route = "subscription-settings:${rule.subscriptionId}"
            val name = scopeNames[rule.subscriptionId] ?: context.getString(R.string.subscription)
            if ((old?.mode ?: DownloadMode.Never) != rule.mode) restored(SettingKey.DownloadRule, context.getString(when (rule.mode) {
                DownloadMode.Never -> R.string.stream; DownloadMode.OnEntry -> R.string.on_entry; DownloadMode.AllNew -> R.string.all_new
            }), route, name)
            if (old?.keepAtMost != rule.keepAtMost) restored(SettingKey.KeepAtMost, rule.keepAtMost?.let {
                context.resources.getQuantityString(R.plurals.episode_count, it.toInt(), it)
            } ?: context.getString(R.string.m4_unlimited), route, name)
        }
        is Change.SetSubscriptionOverrides -> {
            val old = inverse.filterIsInstance<Change.SetSubscriptionOverrides>().firstOrNull { it.subscriptionId == change.subscriptionId } ?: return@forEach
            val overrides = change.playbackSettings
            val global = after.playbackSettings
            val route = "subscription-settings:${change.subscriptionId}"
            val name = scopeNames[change.subscriptionId] ?: context.getString(R.string.subscription)
            fun inherited(raw: Any?, value: String) = if (raw == null) context.getString(R.string.m4_default_value, value) else value
            SettingsFeedback.overrides(old, change).forEach { key -> restored(key, when (key) {
                SettingKey.Speed -> inherited(overrides.speed, speed(overrides.speed ?: global.speed))
                SettingKey.SkipIntro -> inherited(overrides.skipIntro, seconds(overrides.skipIntro ?: global.skipIntro))
                SettingKey.SkipOutro -> inherited(overrides.skipOutro, seconds(overrides.skipOutro ?: global.skipOutro))
                SettingKey.VolumeBoost -> inherited(overrides.volumeBoost, onOff(overrides.volumeBoost ?: global.volumeBoost))
                SettingKey.PlayedThreshold -> inherited(change.playedThreshold, context.getString(R.string.m4_seconds, (change.playedThreshold ?: 30.0).toLong()))
                else -> error("Not a Subscription override")
            }, route, name) }
        }
        else -> Unit
    } }
    if (messages.isEmpty()) return null
    settingReveal.value = firstReveal
    return AppMessage(R.string.settings_restored, formatArgs = listOf(messages.joinToString(" · ")))
}
