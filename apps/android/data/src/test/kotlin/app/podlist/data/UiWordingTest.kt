package app.podlist.data

import org.junit.jupiter.api.Test
import org.w3c.dom.Element
import java.nio.file.Path
import javax.xml.parsers.DocumentBuilderFactory
import kotlin.test.*

class UiWordingTest {
    private val resources = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(
        Path.of(System.getProperty("podlist.repo"), "apps/android/app/src/main/res/values/strings.xml").toFile()
    )

    private fun text(name: String): String {
        val strings = resources.getElementsByTagName("string")
        return (0 until strings.length).map { strings.item(it) as Element }.single { it.getAttribute("name") == name }.textContent
    }

    @Test fun `Playlist deletion names the saved Playlist in feedback and Undo`() {
        val message = text("m4_playlist_deleted").format("Commute")
        assertEquals("Playlist Commute moved to Trash", message)
        assertEquals("Undo: Playlist Commute moved to Trash", text("undo_specific").format(message))
        assertEquals("Redo: Playlist Commute moved to Trash", text("redo_specific").format(message))
        assertEquals("Playlist 100% listening moved to Trash", text("m4_playlist_deleted").format("100% listening"))
    }

    @Test fun `explicit Playlist rename names the saved result in feedback and Undo`() {
        val message = text("playlist_renamed_to").format("Commute")
        assertEquals("Playlist Commute renamed", message)
        assertEquals("Undo: Playlist Commute renamed", text("undo_specific").format(message))
        assertEquals("Redo: Playlist Commute renamed", text("redo_specific").format(message))
        assertEquals("Playlist 100% listening renamed", text("playlist_renamed_to").format("100% listening"))
        assertEquals("Rename", text("rename"))
        assertEquals("Cancel", text("cancel"))
        assertEquals("Save", text("save"))
    }

    @Test fun `explicit View rename names the saved result in feedback and Undo`() {
        val message = text("view_renamed_to").format("Commute")
        assertEquals("View Commute renamed", message)
        assertEquals("Undo: View Commute renamed", text("undo_specific").format(message))
        assertEquals("Redo: View Commute renamed", text("redo_specific").format(message))
        assertEquals("View 100% listening renamed", text("view_renamed_to").format("100% listening"))
        assertEquals("A View needs a name.", text("m4_view_name_error"))
    }

    @Test fun `duplicate names identify the taken name and restore feedback names both versions`() {
        assertEquals("There’s already a View called Commute.", text("view_name_duplicate").format("Commute"))
        assertEquals("There’s already a Playlist called Commute.", text("m4_playlist_duplicate").format("Commute"))
        val message = text("playlist_restored_as").format("Commute", "Commute 2")
        assertEquals("Playlist Commute restored as Commute 2", message)
        assertEquals("Undo: Playlist Commute restored as Commute 2", text("undo_specific").format(message))
        assertEquals("Playlist 100% listening restored as 100% listening 2", text("playlist_restored_as").format("100% listening", "100% listening 2"))
    }

    @Test fun `recovery commands use the same verb across screens`() {
        listOf("retry", "retry_playback", "retry_download", "m4_retry_failed", "retry_action", "retry_refresh", "podcast_try_again").forEach {
            assertEquals("Try again", text(it), it)
        }
    }

    @Test fun `failure helpers use a curly apostrophe and a plain recovery sentence`() {
        listOf("offline_error", "tls_error", "server_error", "response_error", "playback_error", "download_failed", "directory_failed", "bring_over_error", "podcast_load_failed", "podcast_invalid_response").forEach {
            assertTrue(text(it).startsWith("Couldn’t"), it)
        }
        assertEquals("Allow notifications to see download progress and stop a download.", text("download_notification_reason"))
    }
    @Test fun `creation connection and Playback Settings use consistent domain wording`() {
        assertEquals("Create View", text("create_view"))
        assertEquals("Create Playlist", text("m4_create_playlist"))
        assertEquals(text("connect_to_server"), text("connect_title"))
        assertEquals("Playback Settings", text("playback_settings"))
        assertEquals("Playback Settings", text("m4_playback_overrides"))
        assertEquals("Settings for Commute", text("playlist_settings_for").format("Commute"))
        assertEquals("Discard draft", text("discard_draft"))
        assertEquals("Cancel", text("cancel"))
        assertFalse(text("connect_help").contains("tailnet"))
        assertFalse(text("offline_error").contains("tailnet"))
    }

    @Test fun `download failure gives practical recovery and distinguishes known storage exhaustion`() {
        assertEquals("Couldn’t download this Episode. Check your connection, then try again.", text("download_failed"))
        assertEquals("Couldn’t download this Episode because this Device is out of storage. Free some space, then try again.", text("download_storage_full"))
        assertEquals("Try again", text("retry_download"))
    }

    @Test fun `Library Download Rule groups read as content headings`() {
        assertEquals("Play without downloading", text("stream"))
        assertEquals("Download when added to a Playlist", text("on_entry"))
        assertEquals("Download when published", text("all_new"))
    }
    @Test fun `restored settings feedback names the setting and restored value`() {
        assertEquals("Speed back to 1.0×", text("setting_back_to").format(text("speed"), text("speed_value").format("1.0")))
        assertEquals("Appearance back to System default", text("setting_back_to").format(text("appearance"), text("appearance_system")))
        assertEquals("Keep deleted Playlists back to 30 days", text("setting_back_to").format(text("m4_keep_deleted"), text("m4_days").format(30)))
        assertEquals("Clear on Played for Commute back to On", text("setting_back_to").format(text("setting_for").format(text("clear_on_played"), "Commute"), text("m4_on")))
        assertEquals("Download Rule for A podcast back to Play without downloading", text("setting_back_to").format(text("setting_for").format(text("m4_download_rule"), "A podcast"), text("stream")))
        assertEquals("Skip intro back to Off", text("setting_back_to").format(text("m4_skip_intro"), text("m4_off")))
        assertEquals("Volume boost back to On", text("setting_back_to").format(text("volume_boost"), text("m4_on")))
    }

    @Test fun `Play commands use glossary capitalisation in controls and help`() {
        assertEquals("Play Now", text("play_now"))
        assertEquals("Play Next", text("play_next"))
        assertEquals("Play Last", text("play_last"))
        assertTrue(text("m4_step_playlists_help").contains("“Play Next” or “Play Last”"))
        assertEquals("Playlist settings", text("playlist_settings"))
        assertEquals("The Default Playlist can’t be renamed or deleted.", text("default_playlist_limits"))
    }

    @Test fun `empty Trash explains its contents retention setting and next step`() {
        assertEquals("Trash holds deleted Playlists, together with their History and Listening Timeline, for 30 days, changeable in Settings.", text("empty_trash_help").format(30))
        assertTrue(text("empty_trash_help").format(7).contains("7 days"))
        assertEquals("Back to Playlists", text("back_to_playlists"))
        assertEquals("Find something to play", text("find_something_to_play"))
        assertEquals("A Playlist needs a name.", text("m4_playlist_empty"))
    }

    @Test fun `integer limit errors explain whole numbers bounds and unlimited`() {
        listOf("number_integer_error", "number_whole_error", "number_minimum_error", "number_maximum_error").forEach { key ->
            val message = text(key).format(1, Int.MAX_VALUE)
            assertTrue(message.contains("whole number"), key)
            assertTrue(message.contains("1"), key)
            assertTrue(message.contains(Int.MAX_VALUE.toString()), key)
            assertTrue(message.endsWith("or leave blank for unlimited."), key)
        }
        assertEquals("Show download progress?", text("download_notification_title"))
        assertEquals("12 MB of 24 MB", text("download_bytes").format("12 MB", "24 MB"))
    }

    @Test fun `confirmations name objects and use glossary capitalisation`() {
        assertEquals("Playlist Commute restored", text("m4_playlist_restored").format("Commute"))
        assertEquals("Deep Field subscribed", text("subscribed_message").format("Deep Field"))
        assertEquals("View Night skies created", text("view_created").format("Night skies"))
        assertEquals("Episode Galaxies marked Starred", text("episode_starred").format("Galaxies"))
        assertEquals("Episode Galaxies marked Not Starred", text("episode_unstarred").format("Galaxies"))
        assertEquals("Select all", text("select_all"))
        assertEquals("Select none", text("select_none"))
        assertTrue(text("clear_on_played_on_help").contains("already Played"))
        assertFalse(text("draft_kept").contains("Valid condition"))
    }

    @Test fun `messages use bare object names consistently`() {
        listOf("view_name_duplicate", "m4_playlist_duplicate", "m4_playlist_deleted", "playlist_restored_as",
            "playlist_renamed_to", "view_renamed_to", "subscribe_failed_named", "setting_for").forEach { key ->
            assertFalse(text(key).contains("“"), key)
            assertFalse(text(key).contains("”"), key)
        }
        assertEquals("Name", text("m4_name"))
        assertTrue(text("m4_stats_about").startsWith("Time listened includes partial listening"))
        assertFalse(text("timeline_rewind_hint").contains("symbol"))
        assertFalse(text("m4_listened_stretch").contains("until"))
    }

}
