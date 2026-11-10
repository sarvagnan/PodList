package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class SettingsFeedbackTest {
    private val initial = State.initial()

    @Test fun `Undo and Redo identify only the restored Playback Settings`() {
        val next = initial.copy(playbackSettings = initial.playbackSettings.copy(speed = 1.5))
        val undo = listOf(Change.SetPlaybackSettings(initial.playbackSettings))
        val redo = listOf(Change.SetPlaybackSettings(next.playbackSettings))
        assertEquals(listOf(SettingKey.Speed), SettingsFeedback.restored(next, initial, undo))
        assertEquals(listOf(SettingKey.Speed), SettingsFeedback.restored(initial, next, redo))
        assertEquals(emptyList(), SettingsFeedback.restored(initial, initial, undo))
        assertEquals(emptyList(), SettingsFeedback.restored(initial, next, listOf(Change.SetStar("episode", true))))
    }

    @Test fun `multiple restored values and effective default Trash retention are distinguished`() {
        val next = initial.copy(playbackSettings = initial.playbackSettings.copy(skipIntro = 15.0, skipOutro = 30.0, volumeBoost = true), trashDays = 7)
        assertEquals(listOf(SettingKey.SkipIntro, SettingKey.SkipOutro, SettingKey.VolumeBoost, SettingKey.TrashRetention),
            SettingsFeedback.restored(next, initial, listOf(Change.SetPlaybackSettings(initial.playbackSettings), Change.SetTrashDays(30))))
        assertEquals(emptyList(), SettingsFeedback.restored(initial, initial.copy(trashDays = 30), listOf(Change.SetTrashDays(30))))
    }
    @Test fun `Subscription reversal distinguishes an inherited value from the same explicit value`() {
        val inherited = Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(), null)
        val explicit = inherited.copy(playbackSettings = PlaybackSettingsOverride(speed = 1.0), playedThreshold = 30.0)
        assertEquals(listOf(SettingKey.Speed, SettingKey.PlayedThreshold), SettingsFeedback.overrides(explicit, inherited))
        assertEquals(listOf(SettingKey.Speed, SettingKey.PlayedThreshold), SettingsFeedback.overrides(inherited, explicit))
        assertTrue(SettingsFeedback.overrides(inherited, inherited).isEmpty())
    }

}
