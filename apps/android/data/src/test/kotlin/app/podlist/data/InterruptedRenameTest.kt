package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.*

class InterruptedRenameTest {
    @TempDir lateinit var directory: Path
    private val view = View("v", "Old View", ViewFilter(), ViewSort.PublishedDesc, null)

    @Test fun `killed process with rename queued behind an edit keeps both exact drafts`() {
        val file = directory.resolve("queued.sqlite").toString()
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("p", "Old Playlist", false), 1)
            db.record(Change.SaveView(view), 2)
            val drafts = FormDraftStore(db)
            drafts.put("playlist:p/rename", "  New Playlist  ")
            drafts.put("playlist:p/rename/submitted", "  New Playlist  ")
            drafts.put("view-rename:v/name", "  New View  ")
            drafts.put("view-rename:v/name/submitted", "  New View  ")
            val executor = Executors.newSingleThreadExecutor()
            val entered = CountDownLatch(1)
            val hold = CountDownLatch(1)
            executor.submit { entered.countDown(); hold.await() }
            assertTrue(entered.await(5, TimeUnit.SECONDS))
            val playlist = executor.submit { db.reversibleNamedPlaylist("p", "New Playlist", 3) }
            val renamedView = executor.submit { db.reversibleNamedView(view.copy(name = "New View"), 4) }
            assertFalse(playlist.isDone)
            assertFalse(renamedView.isDone)
            // Process death discards queued work; neither callback nor transaction has run.
            playlist.cancel(false); renamedView.cancel(false)
            executor.shutdownNow()
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS))
        }
        LocalDatabase(file).use { db ->
            val drafts = FormDraftStore(db)
            assertEquals("Old Playlist", db.loadState().playlists.single { it.id == "p" }.name)
            assertEquals("Old View", db.loadState().views.single().name)
            assertEquals("  New Playlist  ", drafts.load()["playlist:p/rename"])
            assertEquals("  New View  ", drafts.load()["view-rename:v/name"])
            assertNull(db.reversibleNamedPlaylist("p", "New Playlist", 3).problem)
            assertNull(db.reversibleNamedView(view.copy(name = "New View"), 4).problem)
        }
        LocalDatabase(file).use { db ->
            assertTrue(FormDraftStore(db).load().isEmpty())
            assertEquals("New Playlist", db.loadState().playlists.single { it.id == "p" }.name)
            assertEquals("New View", db.loadState().views.single().name)
        }
    }

    @Test fun `interrupted commit rolls back rename and draft release together`() {
        LocalDatabase(directory.resolve("interrupted.sqlite").toString()).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("p", "Old Playlist", false), 1)
            val drafts = FormDraftStore(db)
            drafts.put("playlist:p/rename", " New ")
            drafts.put("playlist:p/rename/submitted", " New ")
            assertFailsWith<IllegalStateException> {
                db.transaction { reversibleNamedPlaylist("p", "New", 2); error("Process stopped before commit") }
            }
            assertEquals("Old Playlist", db.loadState().playlists.single { it.id == "p" }.name)
            assertEquals(" New ", drafts.load()["playlist:p/rename"])
        }
    }

    @Test fun `committed name cleans up matching submitted leftovers but keeps unopened and newer drafts`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("p", "New", false), 1)
            db.record(Change.SaveView(view.copy(name = "New View")), 2)
            val drafts = FormDraftStore(db)
            for ((key, name) in mapOf("playlist:p/rename" to "New", "view-rename:v/name" to "New View")) {
                drafts.put(key, " $name ")
                assertEquals(" $name ", drafts.load()[key]) // Opening Rename alone must stay open.
                drafts.put("$key/submitted", " $name ")
                assertNull(drafts.load()[key])
                assertNull(drafts.load()["$key/submitted"])
                drafts.put(key, "Newer typing")
                drafts.put("$key/submitted", name)
                assertEquals("Newer typing", drafts.load()[key])
            }
        }
    }

    @Test fun `late duplicate check retains submitted draft without recording a rename`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("p", "Old", false), 1)
            val drafts = FormDraftStore(db)
            drafts.put("playlist:p/rename", " New ")
            drafts.put("playlist:p/rename/submitted", " New ")
            db.record(Change.CreatePlaylist("other", "NEW", false), 2)
            val before = db.outbox()
            assertEquals(Names.Problem.Duplicate, db.reversibleNamedPlaylist("p", "New", 3).problem)
            assertEquals(before, db.outbox())
            assertEquals(" New ", drafts.load()["playlist:p/rename"])
        }
    }
}
