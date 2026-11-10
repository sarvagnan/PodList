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
        assertEquals("Playlist renamed to Commute", message)
        assertEquals("Undo: Playlist renamed to Commute", text("undo_specific").format(message))
        assertEquals("Redo: Playlist renamed to Commute", text("redo_specific").format(message))
        assertEquals("Playlist renamed to 100% listening", text("playlist_renamed_to").format("100% listening"))
        assertEquals("Rename", text("rename"))
        assertEquals("Cancel", text("cancel"))
        assertEquals("Save", text("save"))
    }

    @Test fun `explicit View rename names the saved result in feedback and Undo`() {
        val message = text("view_renamed_to").format("Commute")
        assertEquals("View renamed to Commute", message)
        assertEquals("Undo: View renamed to Commute", text("undo_specific").format(message))
        assertEquals("Redo: View renamed to Commute", text("redo_specific").format(message))
        assertEquals("View renamed to 100% listening", text("view_renamed_to").format("100% listening"))
        assertEquals("A View needs a name.", text("m4_view_name_error"))
    }

    @Test fun `duplicate names identify the taken name and restore feedback names both versions`() {
        assertEquals("There’s already a View called “Commute”.", text("view_name_duplicate").format("Commute"))
        assertEquals("There’s already a Playlist called “Commute”.", text("m4_playlist_duplicate").format("Commute"))
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
        assertEquals("Streamed only", text("library_downloads_stream"))
        assertEquals("Downloaded when added to a Playlist", text("library_downloads_entry"))
        assertEquals("Downloaded as published", text("library_downloads_published"))
    }
}
