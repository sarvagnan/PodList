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
import android.graphics.Rect
import android.accessibilityservice.AccessibilityServiceInfo
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.getOrNull
import androidx.test.core.app.ApplicationProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.test.platform.app.InstrumentationRegistry
import app.podlist.data.*
import app.podlist.domain.State
import app.podlist.domain.Entry
import app.podlist.domain.PlaybackSettingsOverride
import app.podlist.domain.BrowsingContext
import app.podlist.domain.SleepTimer
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.Job
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.withTimeout
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.podlist.data.Appearance
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.rules.ExternalResource
import org.junit.rules.RuleChain

@RunWith(AndroidJUnit4::class)
class UiStabilityTest {
    private val compose = createComposeRule()
    private val models = ViewModelStore()
    private val modelJobs = mutableListOf<Job>()
    private val modelLifetime = object : ExternalResource() {
        private var accessibilityFlags = 0
        override fun before() {
            val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
            accessibilityFlags = automation.serviceInfo.flags
            automation.serviceInfo = automation.serviceInfo.apply {
                flags = flags or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            }
        }
        override fun after() {
            try {
                InstrumentationRegistry.getInstrumentation().runOnMainSync { models.clear() }
                runBlocking { withTimeout(30_000) { modelJobs.joinAll() } }
            } finally {
                val automation = InstrumentationRegistry.getInstrumentation().uiAutomation
                automation.serviceInfo = automation.serviceInfo.apply { flags = accessibilityFlags }
            }
        }
    }
    @get:Rule val rules: RuleChain = RuleChain.outerRule(modelLifetime).around(compose)

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

    @Test fun playerIconNamesBelongToClickablePlatformNodes() = platformPlayerControls(1f)
    @Test fun enlargedPlayerIconNamesBelongToClickablePlatformNodes() = platformPlayerControls(2f)

    private fun platformPlayerControls(fontScale: Float) {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        lateinit var model: AppModel
        compose.runOnUiThread {
            model = ViewModelProvider(models, ViewModelProvider.AndroidViewModelFactory.getInstance(
                ApplicationProvider.getApplicationContext()))[AppModel::class.java]
            modelJobs += checkNotNull(model.viewModelScope.coroutineContext[Job])
        }
        val session = runBlocking { model.sessionFor(null) }
        val playlist = State.initial().playlists.single()
        val metadata = PlaybackMetadata("accessibility-episode", null, "Episode", "Podcast", null,
            1800.0, null, null, emptyList(), PlaybackSettingsOverride(), null)
        val now = PlaybackUi(playlist.id, playlist.name, metadata, 60.0, 1800.0, false, 1f, 0, null)
        // Use the real shell and sheet, but never initialise the process-wide Application model
        // or start Media3/network playback. FlowRun can still run later in this instrumentation.
        model.playbackHost = object : PlaybackHost {
            override fun restore() {}
            override fun flush() {}
            override fun close() {}
            override fun playNow(episode: String) = error("Unexpected playback")
            override fun playEntry(playlist: String, episode: String) = error("Unexpected playback")
            override fun switchPlaylist(playlist: String) = error("Unexpected playback")
            override fun toggle() = error("Unexpected playback")
            override fun seek(seconds: Double) = error("Unexpected playback")
            override fun speed(value: Float) = error("Unexpected playback")
            override fun sleep(timer: SleepTimer?) = error("Unexpected playback")
            override fun playlistAction(affected: String?, action: suspend () -> Unit) = error("Unexpected playback")
        }
        val previousState = session.db.loadState()
        val previousHidden = session.db.getMeta("gettingStartedHidden")
        val previousBrowsing = session.db.loadBrowsingContext()
        // An empty Views root keeps this regression independent of previously created content.
        session.db.saveState(previousState.copy(views = emptyList()))
        session.db.setMeta("gettingStartedHidden", "true")
        session.db.saveBrowsingContext(BrowsingContext())
        var visible by mutableStateOf(true)
        try {
            compose.runOnIdle { model.playback.value = now; model.status.value = SyncStatus.Ready }
            compose.setContent {
                if (visible) {
                    val density = LocalDensity.current
                    CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                        PodListTheme(Appearance.Light) { ConnectedShell(model, session) }
                    }
                }
            }
            val resources = instrumentation.targetContext.resources
            val artwork = resources.getString(R.string.open_now_playing, "Podcast", "Episode")
            val transport = listOf(R.string.back_15, R.string.play, R.string.forward_30).map(resources::getString)
            compose.waitUntil(10_000) {
                compose.onAllNodes(hasContentDescription(artwork) and hasClickAction()).fetchSemanticsNodes().size == 1
            }
            val mainActions = listOf(R.string.m4_search_library, R.string.m4_new_view, R.string.settings).map(resources::getString) +
                resources.getQuantityString(R.plurals.active_playlist_next, 0, now.activePlaylistName, 0)
            assertPlatformControls("mini-player", transport + artwork + mainActions)
            compose.runOnIdle { model.playback.value = now.copy(playing = true) }
            assertPlatformControls("mini-player-pause", transport - resources.getString(R.string.play) + resources.getString(R.string.pause) + artwork)
            compose.runOnIdle { model.playback.value = now.copy(buffering = true) }
            assertPlatformControls("mini-player-buffering", transport - resources.getString(R.string.play) + resources.getString(R.string.buffering) + artwork)
            compose.runOnIdle { model.playback.value = now.copy(error = true) }
            assertPlatformControls("mini-player-retry", transport - resources.getString(R.string.play) + resources.getString(R.string.retry_playback) + artwork)
            compose.runOnIdle { model.playback.value = now }

            // A real long press must still show the Material tooltip on the labelled control.
            compose.onNode(hasContentDescription(transport.first()) and hasClickAction())
                .performTouchInput { longClick() }
            compose.onNodeWithText(transport.first()).assertIsDisplayed()
            compose.waitUntil(5_000) {
                compose.onAllNodesWithText(transport.first()).fetchSemanticsNodes().isEmpty()
            }

            val miniNodes = assertPlatformControls("mini-player-after-tooltip", transport + artwork)
            assertTrue(miniNodes.getValue(artwork).performAction(AccessibilityNodeInfo.ACTION_CLICK))
            val collapse = resources.getString(R.string.collapse_player)
            compose.onNode(hasContentDescription(collapse) and hasClickAction()).assertIsDisplayed()
            assertPlatformControls("now-playing", transport + collapse)
            compose.runOnIdle { model.playback.value = now.copy(playing = true) }
            assertPlatformControls("now-playing-pause", transport - resources.getString(R.string.play) + resources.getString(R.string.pause) + collapse)
        } finally {
            compose.runOnIdle { visible = false }
            compose.waitForIdle()
            model.playbackHost = null
            session.db.saveState(previousState)
            session.db.setMeta("gettingStartedHidden", previousHidden ?: "false")
            session.db.saveBrowsingContext(previousBrowsing)
        }
    }

    private fun assertPlatformControls(stage: String, iconLabels: List<String>): Map<String, AccessibilityNodeInfo> {
        compose.waitForIdle()
        compose.onRoot(useUnmergedTree = true).printToLog("PodListAX-$stage")
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.waitForIdleSync()
        val automation = instrumentation.uiAutomation
        var activeRoot: AccessibilityNodeInfo? = null
        compose.waitUntil(10_000) {
            automation.clearCache()
            activeRoot = automation.rootInActiveWindow?.takeIf {
                it.packageName == instrumentation.targetContext.packageName
            }
            activeRoot != null
        }
        val root = checkNotNull(activeRoot)
        val nodes = mutableListOf<AccessibilityNodeInfo>()
        fun walk(node: AccessibilityNodeInfo, depth: Int) {
            nodes += node
            val bounds = Rect().also(node::getBoundsInScreen)
            Log.i("PodListAX", "${"  ".repeat(depth)}$stage className=${node.className} clickable=${node.isClickable} " +
                "focusable=${node.isFocusable} importantForAccessibility=${node.isImportantForAccessibility} " +
                "longClickable=${node.isLongClickable} text=${node.text} contentDescription=${node.contentDescription} " +
                "boundsInScreen=$bounds childCount=${node.childCount}")
            repeat(node.childCount) { index -> node.getChild(index)?.let { walk(it, depth + 1) } }
        }
        fun speakableDescendants(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> = buildList {
            // TalkBack can collect a row/tile's label from its passive children, but a
            // separately focusable or actionable subtree has its own announcement.
            repeat(node.childCount) { index ->
                val child = node.getChild(index) ?: return@repeat
                if (!child.isVisibleToUser || child.isFocusable || child.isClickable || child.isLongClickable) return@repeat
                if (!child.text.isNullOrBlank() || !child.contentDescription.isNullOrBlank()) add(child)
                // A contentDescription replaces the spoken contents of this subtree.
                if (child.contentDescription.isNullOrBlank()) addAll(speakableDescendants(child))
            }
        }
        walk(root, 0)
        val appNodes = nodes.filter { it.packageName == instrumentation.targetContext.packageName && it.isVisibleToUser }
        val descendantLabels = appNodes.filter { it.isClickable }.associateWith(::speakableDescendants)
        val unnamed = appNodes.filter { it.isClickable && it.text.isNullOrBlank() &&
            it.contentDescription.isNullOrBlank() && descendantLabels.getValue(it).isEmpty() }
        assertTrue("$stage has unnamed clickable platform nodes: $unnamed (see PodListAX log)", unnamed.isEmpty())
        // Described images alone must not bless round 19's unnamed icon-button parent.
        // Text containers may inherit labels; icon-only controls need their own name/role.
        val iconOnly = appNodes.filter { it.isClickable && it.text.isNullOrBlank() &&
            descendantLabels.getValue(it).none { child -> !child.text.isNullOrBlank() } }
        for (node in iconOnly) {
            assertTrue("$stage: icon control must carry its own contentDescription: $node", !node.contentDescription.isNullOrBlank())
            assertEquals("$stage: icon control must retain its own button role: $node", "android.widget.Button", node.className?.toString())
        }
        for (label in iconLabels) {
            val labelled = appNodes.filter { it.contentDescription?.toString() == label }
            assertEquals("$stage: one announcement for $label", 1, labelled.size)
            assertTrue("$stage: $label must label its own clickable node", labelled.single().isClickable)
            assertEquals("$stage: $label must retain its button role", "android.widget.Button", labelled.single().className?.toString())
            assertTrue("$stage: $label must be independently focusable", labelled.single().isFocusable)
            assertTrue("$stage: $label must remain accessible", labelled.single().isImportantForAccessibility)
            assertEquals("$stage: icon controls must be semantic leaves", 0, labelled.single().childCount)
            if (label != InstrumentationRegistry.getInstrumentation().targetContext.getString(
                    R.string.open_now_playing, "Podcast", "Episode")) {
                assertTrue("$stage: tooltip action belongs to $label", labelled.single().isLongClickable)
            }
        }
        return iconLabels.associateWith { label -> appNodes.single { it.contentDescription?.toString() == label } }
    }

    private fun independentControls(fontScale: Float) {
        // Never initialise the process-wide owner in a component test: FlowRun must still
        // start before its first session. Dispose this model after Compose has torn down.
        lateinit var model: AppModel
        compose.runOnUiThread {
            model = ViewModelProvider(models, ViewModelProvider.AndroidViewModelFactory.getInstance(
                ApplicationProvider.getApplicationContext()))[AppModel::class.java]
            modelJobs += checkNotNull(model.viewModelScope.coroutineContext[Job])
        }
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
        assertPlatformControls("episode-entry-mini-player-$fontScale", labels)
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
