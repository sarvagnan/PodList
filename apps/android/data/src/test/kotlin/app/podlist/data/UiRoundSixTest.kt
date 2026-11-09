package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.math.pow
import kotlin.test.*

class UiRoundSixTest {
    @TempDir lateinit var directory: Path

    @Test fun `unfinished names and numbers survive cold reopen without changing accepted values`() {
        val file = directory.resolve("drafts.sqlite").toString()
        val raw = mapOf(
            "playlist:walk/name" to "  ",
            "playlist:other/name" to " Walk ",
            "subscription:podcast/keep-at-most" to "1x",
            "sleep/minutes" to "1,",
            "view:one/number/Length" to "-"
        )
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("walk", "Walk", false), 100)
            db.record(Change.CreatePlaylist("other", "Other", false), 101)
            raw.forEach { (key, text) -> FormDraftStore(db).put(key, text) }
        }
        LocalDatabase(file).use { db ->
            assertEquals(raw, FormDraftStore(db).load())
            assertEquals("Walk", db.loadState().playlists.single { it.id == "walk" }.name)
            assertEquals(PlaylistNames.Problem.Empty, PlaylistNames.validate(raw.getValue("playlist:walk/name"), db.loadState().playlists, "walk"))
            assertEquals(PlaylistNames.Problem.Duplicate, PlaylistNames.validate(raw.getValue("playlist:other/name"), db.loadState().playlists, "other"))
            assertFalse(NumberInput.valid(raw.getValue("subscription:podcast/keep-at-most"), 1.0, true))
        }
    }

    @Test fun `late database echoes do not replace newer raw digits or an invalid intermediate value`() {
        val file = directory.resolve("echo.sqlite").toString()
        val key = "subscription:podcast/keep-at-most"
        LocalDatabase(file).use { db ->
            db.ensureState()
            val drafts = FormDraftStore(db)
            drafts.put(key, "123")
            // The first queued edit arrives after the person has typed the remaining digits.
            db.record(Change.SetDownloadRule(DownloadRule("podcast", "device", DownloadMode.AllNew, 1)), 100)
            assertEquals("123", drafts.load()[key])
            drafts.put(key, "123x")
            db.record(Change.SetDownloadRule(DownloadRule("podcast", "device", DownloadMode.AllNew, 123)), 101)
            assertEquals("123x", drafts.load()[key])
        }
        LocalDatabase(file).use { db -> assertEquals("123x", FormDraftStore(db).load()[key]) }
    }

    @Test fun `Undo reconciles only affected forms and cannot resurrect a stale draft after reopen`() {
        val file = directory.resolve("undo.sqlite").toString()
        LocalDatabase(file).use { db ->
            db.ensureState()
            val drafts = FormDraftStore(db)
            db.record(Change.CreatePlaylist("walk", "Walk", false), 100)
            val inverse = db.reversibleEdit(listOf(Change.RenamePlaylist("walk", "Morning")), 101)
            drafts.put("playlist:walk/name", "  ")
            drafts.put("playlist:keep/name", "Keep typing")
            drafts.put("subscription:podcast/keep-at-most", "0x")
            drafts.put("sleep/minutes", "-")
            db.transaction {
                reversibleEdit(inverse, 102)
                drafts.reconcile(inverse)
            }
            assertEquals("Walk", db.loadState().playlists.single { it.id == "walk" }.name)
            drafts.reconcile(listOf(Change.SetDownloadRule(DownloadRule("podcast", "device", DownloadMode.AllNew, 10))))
        }
        LocalDatabase(file).use { db ->
            assertEquals(mapOf("playlist:keep/name" to "Keep typing", "sleep/minutes" to "-"), FormDraftStore(db).load())
        }
    }

    @Test fun `unselected chart bars meet three to one in both installed themes and increased contrast`() {
        val source = Path.of(System.getProperty("podlist.repo"), "apps/android/app/src/main/kotlin/app/podlist/MainActivity.kt").toFile().readText()
        val themes = listOf(
            source.substringAfter("private val LightColors =").substringBefore("private val DarkColors =") to 0x002781,
            source.substringAfter("private val DarkColors =").substringBefore("private val PodListTypography =") to 0xe0e5ff
        )
        for ((theme, highContrast) in themes) {
            fun role(name: String) = Regex("\\b$name = Color\\(0xff([0-9a-f]{6})\\)").find(theme)!!.groupValues[1].toInt(16)
            val primary = role("primary")
            for (amount in listOf(0.0, .5, 1.0)) {
                val adjusted = (listOf(16, 8, 0).sumOf { shift ->
                    val start = primary ushr shift and 255
                    val end = highContrast ushr shift and 255
                    ((start + (end - start) * amount).toInt() shl shift)
                })
                for (background in listOf(role("background"), role("surface"))) {
                    val ratio = contrast(adjusted, background, ListeningPresentation.unselectedBarAlpha.toDouble())
                    assertTrue(ratio >= 3.0, "Chart contrast $ratio at system contrast $amount")
                }
            }
        }
    }

    private fun contrast(foreground: Int, background: Int, alpha: Double): Double {
        fun channel(color: Int, shift: Int) = (color ushr shift and 255) / 255.0
        fun luminance(blend: Boolean): Double = listOf(16, 8, 0).zip(listOf(.2126, .7152, .0722)).sumOf { (shift, weight) ->
            val back = channel(background, shift)
            val value = if (blend) channel(foreground, shift) * alpha + back * (1 - alpha) else back
            weight * if (value <= .04045) value / 12.92 else ((value + .055) / 1.055).pow(2.4)
        }
        val front = luminance(true)
        val back = luminance(false)
        return (maxOf(front, back) + .05) / (minOf(front, back) + .05)
    }
}
