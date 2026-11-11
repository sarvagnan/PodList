package app.podlist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.getOrNull
import androidx.test.core.app.ApplicationProvider
import app.podlist.data.*
import app.podlist.domain.State
import app.podlist.domain.Entry
import app.podlist.domain.PlaybackSettingsOverride
import kotlinx.coroutines.runBlocking
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.podlist.data.Appearance
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UiStabilityTest {
    @get:Rule val compose = createComposeRule()

    @Test fun lightLoadingKeepsExistingRowsStill() = loading(Appearance.Light, 1f)
    @Test fun darkLoadingKeepsExistingRowsStill() = loading(Appearance.Dark, 1f)
    @Test fun lightLargeTextLoadingKeepsExistingRowsStill() = loading(Appearance.Light, 2f)
    @Test fun darkLargeTextLoadingKeepsExistingRowsStill() = loading(Appearance.Dark, 2f)

    private fun loading(appearance: Appearance, fontScale: Float) {
        var pending by mutableStateOf(false)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                PodListTheme(appearance) {
                    LazyColumn {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Episodes")
                                LoadingLine(pending, R.string.podcast_loading)
                            }
                        }
                        item { Text("Existing Episode", Modifier.fillMaxWidth()) }
                    }
                }
            }
        }
        val before = compose.onNodeWithText("Existing Episode").fetchSemanticsNode().boundsInWindow
        repeat(2) {
            compose.runOnIdle { pending = true }
            compose.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo)).assertExists()
            assertEquals(before, compose.onNodeWithText("Existing Episode").fetchSemanticsNode().boundsInWindow)
            compose.runOnIdle { pending = false }
            compose.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo)).assertDoesNotExist()
            assertEquals(before, compose.onNodeWithText("Existing Episode").fetchSemanticsNode().boundsInWindow)
        }
    }

    @Test fun restoredTextStartsAtEndAndKeepsDeliberateCursorMoves() {
        var stored by mutableStateOf("Kept query")
        var visible by mutableStateOf(true)
        compose.setContent {
            if (visible) {
                var field by rememberFieldValue(stored)
                OutlinedTextField(field, { field = it; stored = it.text }, label = { Text("Query") })
            }
        }
        val query = compose.onNode(hasSetTextAction())
        query.assert(SemanticsMatcher.expectValue(SemanticsProperties.TextSelectionRange, TextRange(stored.length)))
        query.performClick().performTextInputSelection(TextRange(4))
        query.performTextInput(" new")
        compose.runOnIdle { assertEquals("Kept new query", stored) }
        compose.runOnIdle { visible = false }
        compose.waitForIdle()
        compose.runOnIdle { visible = true }
        query.assert(SemanticsMatcher.expectValue(SemanticsProperties.TextSelectionRange, TextRange(stored.length)))
    }
    @Test fun episodeEntryAndMiniPlayerButtonsStayIndependentInBothTrees() = independentControls(1f)
    @Test fun enlargedEpisodeEntryAndMiniPlayerButtonsStayIndependentInBothTrees() = independentControls(2f)

    private fun independentControls(fontScale: Float) {
        val model = ApplicationProvider.getApplicationContext<PodListApplication>().model
        val session = runBlocking { model.sessionFor(null) }
        val row: Row = mapOf("id" to "accessibility-episode", "title" to "Episode", "podcast" to "Podcast", "published" to 0L, "duration" to 1800.0)
        val playlist = State.initial().playlists.single().copy(entries = listOf(Entry("accessibility-episode", 0.0, 0)))
        val data = ScreenData(State.initial().copy(playlists = listOf(playlist)), emptyList(), listOf(row), true, true)
        val metadata = PlaybackMetadata("accessibility-episode", null, "Episode", "Podcast", null, 1800.0, null, null, emptyList(), PlaybackSettingsOverride(), null)
        val now = PlaybackUi(playlist.id, playlist.name, metadata, 0.0, 1800.0, false, 1f, 0, null)
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale), LocalAppModel provides model, LocalAddEpisode provides {}) {
                PodListTheme(Appearance.Light) {
                    Column {
                        EpisodeRow(row, data, session, showArtwork = false, onClick = {})
                        EpisodeRow(row, data, session, entryPlaylist = playlist.id, onClick = {})
                        MiniPlayer(now, session, model, expand = {}, openPlaylist = {})
                    }
                }
            }
        }
        val resources = ApplicationProvider.getApplicationContext<PodListApplication>().resources
        val labels = listOf(R.string.add_to_playlist, R.string.play_now, R.string.play_from_here, R.string.entry_actions,
            R.string.back_15, R.string.play, R.string.forward_30).map(resources::getString) +
            resources.getQuantityString(R.plurals.active_playlist_next, 0, playlist.name, 0)
        for (unmerged in listOf(false, true)) {
            val ids = labels.map { label ->
                val control = hasContentDescription(label) and hasClickAction()
                compose.onAllNodes(control, useUnmergedTree = unmerged).assertCountEquals(1)
                val node = compose.onNode(control, useUnmergedTree = unmerged)
                    .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
                    .assert(isFocusable()).assertWidthIsAtLeast(48.dp).assertHeightIsAtLeast(48.dp)
                    .fetchSemanticsNode()
                assertEquals(listOf(label), node.config.getOrNull(SemanticsProperties.ContentDescription))
                node.id
            }
            assertEquals("Every command must have its own focus target", labels.size, ids.toSet().size)
        }
    }

    @Test fun discardUndoRestoresRawDraftAndCaretAfterEditorRemoval() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val store = FormDraftStore(db)
            store.put("view:test/name", "  Kept draft  ")
            store.put("view:test/number/Length", "3,")
            val drafts = FormDraftState(store, store.load())
            var visible by mutableStateOf(true)
            var removed = emptyMap<String, String>()
            compose.setContent {
                CompositionLocalProvider(LocalFormDrafts provides drafts) {
                    Column {
                        if (visible) {
                            var text by rememberDraftText("view:test/name")
                            var field by rememberDraftFieldValue("view:test/name", text)
                            OutlinedTextField(field, { field = it; text = it.text }, label = { Text("Draft name") })
                            Button(onClick = {
                                removed = drafts.replaceDraft(listOf("view:test/"), emptyMap(), "test")
                                visible = false
                            }) { Text("Discard draft") }
                        } else Button(onClick = {
                            drafts.replaceDraft(listOf("view:test/"), removed, "test")
                            visible = true
                        }) { Text("Undo") }
                    }
                }
            }
            val field = compose.onNode(hasSetTextAction())
            field.performClick().performTextInputSelection(TextRange(2, 6))
            compose.onNodeWithText("Discard draft").performClick()
            compose.onNode(hasSetTextAction()).assertDoesNotExist()
            compose.runOnIdle {
                assertEquals("  Kept draft  ", store.retainedDraft("test")!!.values["view:test/name"])
                assertEquals("3,", store.retainedDraft("test")!!.values["view:test/number/Length"])
            }
            compose.onNodeWithText("Undo").performClick()
            compose.onNode(hasSetTextAction()).assert(SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString("  Kept draft  ")))
                .assert(SemanticsMatcher.expectValue(SemanticsProperties.TextSelectionRange, TextRange(2, 6)))
            compose.runOnIdle { assertEquals("3,", drafts.get("view:test/number/Length")) }
            compose.runOnIdle { visible = false }
            compose.waitForIdle()
            drafts.close()
        }
    }

}
