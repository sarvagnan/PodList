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
        assertEquals("Renamed Playlist to “Commute”", message)
        assertEquals("Undo: Renamed Playlist to “Commute”", text("undo_specific").format(message))
        assertEquals("Redo: Renamed Playlist to “Commute”", text("redo_specific").format(message))
        assertEquals("Renamed Playlist to “100% listening”", text("playlist_renamed_to").format("100% listening"))
        assertEquals("Rename", text("rename"))
        assertEquals("Cancel", text("cancel"))
        assertEquals("Save", text("save"))
    }

    @Test fun `explicit View rename names the saved result in feedback and Undo`() {
        val message = text("view_renamed_to").format("Commute")
        assertEquals("Renamed View to “Commute”", message)
        assertEquals("Undo: Renamed View to “Commute”", text("undo_specific").format(message))
        assertEquals("Redo: Renamed View to “Commute”", text("redo_specific").format(message))
        assertEquals("Renamed View to “100% listening”", text("view_renamed_to").format("100% listening"))
        assertEquals("A View needs a name.", text("m4_view_name_error"))
    }

    @Test fun `duplicate names identify the taken name and restore feedback names both versions`() {
        assertEquals("There’s already a View called Commute.", text("view_name_duplicate").format("Commute"))
        assertEquals("There’s already a Playlist called Commute.", text("m4_playlist_duplicate").format("Commute"))
        val message = text("playlist_restored_as").format("Commute", "Commute 2")
        assertEquals("Restored Playlist “Commute” as “Commute 2”", message)
        assertEquals("Undo: Restored Playlist “Commute” as “Commute 2”", text("undo_specific").format(message))
        assertEquals("Restored Playlist “100% listening” as “100% listening 2”", text("playlist_restored_as").format("100% listening", "100% listening 2"))
    }

    @Test fun `recovery commands use the same verb across screens`() {
        listOf("retry", "retry_playback", "retry_download", "m4_retry_failed", "retry_action", "retry_refresh", "podcast_try_again").forEach {
            assertEquals("Try again", text(it), it)
        }
    }

    @Test fun `subscribe is a lowercase verb in failure messages`() {
        assertEquals("Couldn’t subscribe to this feed on the server. Check the feed and try again.", text("bring_over_failed_feed"))
        assertEquals("Couldn’t subscribe to Deep Field. Check your connection.", text("subscribe_failed_named").format("Deep Field", "Check your connection."))
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

    @Test fun `Download Rule names match the domain vocabulary`() {
        assertEquals("Stream", text("stream"))
        assertEquals("When Episodes become an Entry", text("on_entry"))
        assertEquals("As Episodes are published", text("all_new"))
        assertEquals("Download Rule", text("m4_download_rule"))
        assertEquals("Episodes play without automatic downloads.", text("library_stream_help"))
        assertEquals("Episodes are stored when added to a Playlist.", text("library_on_entry_help"))
        assertEquals("Newly published Episodes are stored on this Device.", text("library_all_new_help"))
    }
    @Test fun `restored settings feedback names the setting and restored value`() {
        assertEquals("Restored Speed to 1.0×", text("setting_back_to").format(text("speed"), text("speed_value").format("1.0")))
        assertEquals("Restored Appearance to System default", text("setting_back_to").format(text("appearance"), text("appearance_system")))
        assertEquals("Restored Keep deleted Playlists to 30 days", text("setting_back_to").format(text("m4_keep_deleted"), text("m4_days").format(30)))
        assertEquals("Restored Clear on Played for Commute to On", text("setting_back_to").format(text("setting_for").format(text("clear_on_played"), "Commute"), text("m4_on")))
        assertEquals("Restored Download Rule for A podcast to Stream", text("setting_back_to").format(text("setting_for").format(text("m4_download_rule"), "A podcast"), text("stream")))
        assertEquals("Restored Skip intro to Off", text("setting_back_to").format(text("m4_skip_intro"), text("m4_off")))
        assertEquals("Restored Volume boost to On", text("setting_back_to").format(text("volume_boost"), text("m4_on")))
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
        assertEquals("Delete a Playlist in its settings to move it here with its History and Listening Timeline. Restore it within 30 days.", text("empty_trash_help").format(30))
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
        assertEquals("Restored Playlist “Commute”", text("m4_playlist_restored").format("Commute"))
        assertEquals("Subscribed to Deep Field", text("subscribed_message").format("Deep Field"))
        assertEquals("Created View “Night skies”", text("view_created").format("Night skies"))
        assertEquals("Marked “Galaxies” Starred", text("episode_starred").format("Galaxies"))
        assertEquals("Marked “Galaxies” Not Starred", text("episode_unstarred").format("Galaxies"))
        assertEquals("Unsubscribed from Deep Field", text("unsubscribed_message").format("Deep Field"))
        assertEquals("Moved “Galaxies” in Commute", text("entry_moved").format("Galaxies", "Commute"))
        assertEquals("Select all", text("select_all"))
        assertEquals("Select none", text("select_none"))
        assertTrue(text("clear_on_played_on_help").contains("already Played"))
        assertFalse(text("draft_kept").contains("Valid condition"))
    }

    @Test fun `diagnostics and the owner fixed Trash message keep bare names`() {
        listOf("view_name_duplicate", "m4_playlist_duplicate", "m4_playlist_deleted", "subscribe_failed_named", "setting_for").forEach { key ->
            assertFalse(text(key).contains("“"), key)
            assertFalse(text(key).contains("”"), key)
        }
        assertEquals("Name", text("m4_name"))
        assertTrue(text("m4_stats_about").startsWith("Time listened includes partial listening"))
        assertFalse(text("timeline_rewind_hint").contains("symbol"))
        assertFalse(text("m4_listened_stretch").contains("until"))
    }

    @Test fun `remote Episode recovery names the affected Episode without treating its title as a format string`() {
        val title = "100% listening"
        assertEquals("Couldn’t add 100% listening.", text("podcast_episode_add_failed").format(title))
        assertEquals("Try again: 100% listening", text("retry_episode_named").format(title))
        assertEquals("Try again", text("retry_episode_action"))
        assertEquals("Couldn’t add 100% listening. Check your connection.",
            text("podcast_episode_add_error").format(title, "Check your connection."))
    }

    @Test fun `help labels describe the content revealed and threshold help avoids repeating the inherited value`() {
        assertEquals("Show help for completed steps", text("show_completed_steps"))
        assertEquals("Hide help for completed steps", text("hide_completed_steps"))
        assertEquals("Current Entry", text("cursor_here"))
        assertEquals("Time before the end that counts as Played.", text("m4_threshold_help"))
        assertFalse(text("m4_threshold_help").contains("30 seconds"))
        assertEquals("Default follows your global Playback Settings.", text("m4_override_help"))
    }

    @Test fun `add confirmations lead with the action and retain the affected Entries`() {
        val plurals = resources.getElementsByTagName("plurals")
        val entries = (0 until plurals.length).map { plurals.item(it) as Element }
            .single { it.getAttribute("name") == "entries_added_to_playlist" }.getElementsByTagName("item")
        assertEquals("Added 1 Entry to Commute", entries.item(0).textContent.format(1, "Commute"))
        assertEquals("Added 3 Entries to Commute", entries.item(1).textContent.format(3, "Commute"))
    }

    @Test fun `history feedback always carries the original named action`() {
        assertEquals("Undid: Marked “100% listening” Starred", text("edit_undone_specific").format(text("episode_starred").format("100% listening")))
        assertEquals("Redid: Created View “Walk”", text("edit_redone_specific").format(text("view_created").format("Walk")))
        assertEquals("Speed 1.0×", text("speed_accessibility").format("1.0×"))
    }

    @Test fun `OPML failures distinguish access size format connection and destination`() {
        assertTrue(text("opml_read_error").contains("accessible OPML file"))
        assertTrue(text("opml_size_error").contains("8 MiB"))
        assertTrue(text("opml_invalid_error").contains("isn’t valid OPML"))
        assertTrue(text("opml_export_error").contains("connection"))
        assertTrue(text("opml_write_error").contains("another location"))
    }

    @Test fun `bulk and import messages name counts objects and scope`() {
        fun plural(name: String, vararg args: Any): String {
            val plurals = resources.getElementsByTagName("plurals")
            val items = (0 until plurals.length).map { plurals.item(it) as Element }
                .single { it.getAttribute("name") == name }.getElementsByTagName("item")
            return items.item(if (args[0] == 1) 0 else 1).textContent.format(*args)
        }
        assertEquals("Marked 3 Episodes Played", plural("episodes_played", 3))
        assertEquals("Marked 1 Episode Unplayed", plural("episodes_unplayed", 1))
        assertEquals("Marked 3 Episodes Not Starred", plural("episodes_unstarred", 3))
        assertEquals("Updated Download Rule for 3 Subscriptions", plural("download_rules_changed", 3))
        assertEquals("Marked 3 Episodes Played in Deep Field", plural("subscription_episodes_played", 3, "Deep Field"))
        assertEquals("Imported 12 podcasts", plural("import_added", 12))
        assertEquals("Exported 12 podcasts", plural("podcasts_exported", 12))
        assertEquals("Imported 12 podcasts · 2 podcasts already subscribed · 1 podcast failed",
            text("m4_import_summary").format(plural("import_added", 12), plural("import_existing", 2), plural("import_failed", 1)))
    }

}
