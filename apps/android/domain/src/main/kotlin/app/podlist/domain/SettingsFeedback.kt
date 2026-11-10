package app.podlist.domain

enum class SettingKey { Speed, SkipIntro, SkipOutro, VolumeBoost, TrashRetention, Appearance, ClearOnPlayed, DownloadRule, KeepAtMost, PlayedThreshold }

/** Compare effective values: a reversal must explain exactly the settings it restored. */
object SettingsFeedback {
    fun restored(before: State, after: State, changes: List<Change>): List<SettingKey> = buildList {
        if (changes.any { it is Change.SetPlaybackSettings }) {
            val old = before.playbackSettings
            val next = after.playbackSettings
            if (old.speed != next.speed) add(SettingKey.Speed)
            if (old.skipIntro != next.skipIntro) add(SettingKey.SkipIntro)
            if (old.skipOutro != next.skipOutro) add(SettingKey.SkipOutro)
            if (old.volumeBoost != next.volumeBoost) add(SettingKey.VolumeBoost)
        }
        if (changes.any { it is Change.SetTrashDays } && (before.trashDays ?: 30) != (after.trashDays ?: 30)) add(SettingKey.TrashRetention)
    }
    fun overrides(before: Change.SetSubscriptionOverrides, after: Change.SetSubscriptionOverrides): List<SettingKey> = buildList {
        if (before.playbackSettings.speed != after.playbackSettings.speed) add(SettingKey.Speed)
        if (before.playbackSettings.skipIntro != after.playbackSettings.skipIntro) add(SettingKey.SkipIntro)
        if (before.playbackSettings.skipOutro != after.playbackSettings.skipOutro) add(SettingKey.SkipOutro)
        if (before.playbackSettings.volumeBoost != after.playbackSettings.volumeBoost) add(SettingKey.VolumeBoost)
        if (before.playedThreshold != after.playedThreshold) add(SettingKey.PlayedThreshold)
    }
}
