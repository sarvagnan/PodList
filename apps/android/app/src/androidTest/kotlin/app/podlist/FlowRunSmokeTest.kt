package app.podlist

import android.content.res.Configuration
import android.os.SystemClock
import android.util.Log
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource
import org.junit.rules.RuleChain
import org.junit.runner.RunWith

/** Real UI only: no model/database calls for completing tasks or preparing server data. */
@RunWith(AndroidJUnit4::class)
class FlowRunSmokeTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val compose = createAndroidComposeRule<MainActivity>()
    // Runs BEFORE ActivityScenario launches and before PodListApplication's lazy model is created.
    // Equivalent to the relevant part of clear-data, without pm clear killing instrumentation.
    private val freshInstall = object : ExternalResource() {
        override fun before() {
            val context = instrumentation.targetContext
            check(context.getSharedPreferences("connection", 0).edit().clear().commit())
            context.databaseList().filter { it.startsWith("library-") && it.endsWith(".sqlite") }.forEach { check(context.deleteDatabase(it)) }
            context.filesDir.listFiles()?.filter { it.name.endsWith(".properties") }?.forEach { check(it.delete()) }
            DebugNetworkDelay.millis = 0
            DebugNetworkDelay.holdSubscriptionCompletion = false
        }
    }
    @get:Rule val rules: RuleChain = RuleChain.outerRule(freshInstall).around(compose)
    private lateinit var report: FlowRunReport
    private var appearance = "Light"
    private var pass = 0
    private var flow = "setup"
    private var actionStep = ""
    private var inputAt = Long.MIN_VALUE
    private fun dispatched(field: String? = null) {
        inputAt = SystemClock.uptimeMillis()
        report.dispatched(field)
    }
    private val device by lazy { UiDevice.getInstance(instrumentation) }
    private fun nodes() = compose.onAllNodes(isRoot(), useUnmergedTree = true)
        .fetchSemanticsNodes().flatMap { root -> root.flatten() }
    private fun present(matcher: SemanticsMatcher) = compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty()
    private fun label(text: String, substring: Boolean = false) = hasText(text, substring = substring) or hasContentDescription(text, substring = substring)
    private fun control(text: String, substring: Boolean = false) = label(text, substring) and hasClickAction() and isEnabled()
    private fun field(text: String) = hasSetTextAction() and hasText(text)
    private fun nav(text: String) = label(text) and hasClickAction() and SemanticsMatcher("navigation item") {
        it.config.getOrNull(SemanticsProperties.Selected) != null && it.config.getOrNull(SemanticsProperties.Role) == Role.Tab
    }
    private fun selectedTab(tab: String) = present(nav(tab) and isSelected())
    private fun waitFor(why: String, condition: () -> Boolean) {
        try { compose.waitUntil(90_000, condition) }
        catch (error: Throwable) { throw AssertionError("$flow/$why ($appearance pass $pass); inspect ${report.directory}", error) }
    }
    private fun click(matcher: SemanticsMatcher, index: Int? = null) {
        waitFor("click target $matcher") { present(matcher) }
        // Single controls must be unique in the merged tree. Repeated row actions opt in to an index.
        val target = if (index == null) compose.onNode(matcher) else compose.onAllNodes(matcher)[index]
        // Focus/scroll are deliberate preparation inputs, separately recorded when necessary.
        if (!runCatching { target.assertIsDisplayed() }.isSuccess) {
            report.beginAction("reveal-target")
            dispatched()
            target.performScrollTo()
            capture("reveal-${report.nextSequence()}")
            report.beginAction(actionStep)
        }
        target.performSemanticsAction(SemanticsActions.OnClick) { click ->
            dispatched()
            click()
        }
    }
    private fun type(label: String, value: String) {
        val target = compose.onNode(field(label))
        target.performSemanticsAction(SemanticsActions.OnClick) { click -> dispatched(); click() }
        target.performSemanticsAction(SemanticsActions.SetText) { setText ->
            dispatched(label)
            setText(AnnotatedString(value))
        }
    }
    private fun value(label: String) = compose.onAllNodes(field(label)).fetchSemanticsNodes().firstOrNull()
        ?.config?.getOrNull(SemanticsProperties.EditableText)?.text
    private fun busy() = nodes().any { it.config.getOrNull(SemanticsProperties.ProgressBarRangeInfo) == androidx.compose.ui.semantics.ProgressBarRangeInfo.Indeterminate && it.boundsInWindow.width > 0 }
    private fun capture(step: String) {
        if (FlowRunClassification.phase(step) != FlowRunClassification.Phase.INPUT) compose.waitForIdle()
        report.capture(flow, step, appearance, pass, inputAt, nodes(), compose.activity.window, DebugNetworkDelay.pending.get() > 0 || busy())
    }

    /** Input, pending UI and async completion are distinct captures, including fast local edits. */
    private fun act(step: String, done: () -> Boolean = { true }, action: () -> Unit) {
        actionStep = step
        report.beginAction(step)
        val clock = if (pass > 0) report.startTiming(flow, step, appearance, pass, compose.activity.window) else null
        try {
            action()
            clock?.inputReturned(busy())
            capture("$step-input")
            if (busy() || DebugNetworkDelay.pending.get() > 0) capture("$step-working")
            waitFor(step) {
                clock?.inputReturned(busy())
                done()
            }
            compose.waitForIdle()
            clock?.settled()
            capture("$step-done")
        } finally { clock?.close() }
    }
    private fun tap(step: String, text: String, done: () -> Boolean = { true }, substring: Boolean = false) =
        act(step, done) { click(control(text, substring)) }
    private fun enter(step: String, label: String, text: String) = act(step, { value(label) == text }) { type(label, text) }
    private fun root(tab: String) {
        dismissKeyboard()
        val marker = control(when (tab) { "Views" -> "New View"; "Playlists" -> "New Playlist"; else -> "Add podcasts" })
        // Switching tabs restores that tab's stack; only tapping the selected tab resets it.
        // Add/Undo can leave another tab selected (A returns from Default in Playlists).
        if (!selectedTab(tab)) act("select-$tab", { selectedTab(tab) }) { click(nav(tab)) }
        if (present(marker)) { capture("start-$tab"); return }
        act("start-$tab", { selectedTab(tab) && present(marker) }) { click(nav(tab) and isSelected()) }
    }
    private fun keyboardVisible(): Boolean {
        var visible = false
        val window = compose.activity.window
        instrumentation.runOnMainSync { visible = window.decorView.rootWindowInsets?.isVisible(android.view.WindowInsets.Type.ime()) == true }
        return visible
    }
    private fun dismissKeyboard() {
        if (!keyboardVisible()) return
        capture("keyboard-before-dismiss-${report.nextSequence()}")
        act("dismiss-keyboard", { !keyboardVisible() }) {
            dispatched()
            device.pressBack()
        }
    }
    private fun undo(step: String, done: () -> Boolean) {
        dismissKeyboard()

        // Only the snackbar's text button; the toolbar's icon Undo must not stand in for it.
        val snackbarUndo = control("Undo") and hasText("Undo")
        act(step, { done() && present(control("Redo") and hasText("Redo")) }) { click(snackbarUndo) }
    }

    @Test fun mainTasksProduceFlowEvidence() {
        val args = InstrumentationRegistry.getArguments()
        val server = requireNotNull(args.getString("server")) { "Pass instrumentation argument server=http://10.0.2.2:PORT" }
        val feed = requireNotNull(args.getString("feed")) { "Pass feed=http://10.0.2.2:FPORT/feeds/long-list.xml (500 Episodes)" }
        report = FlowRunReport(instrumentation, device)
        var success = false
        try {
            compose.mainClock.autoAdvance = true
            appearance = if (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES) "Dark" else "Light"
            waitFor("fresh Welcome") { present(control("Connect to a server")) }
            capture("welcome")
            tap("connect", "Connect to a server", { present(field("Server address")) })
            enter("server-address", "Server address", server)
            tap("check-connect", "Check and connect", { present(nav("Views")) })
            waitFor("initial sync") { present(control("New this week")) }
            for (mode in listOf("Light", "Dark")) {
                setAppearance(mode)
                for (iteration in 0..5) {
                    pass = iteration
                    DebugNetworkDelay.millis = if (iteration == 0) 2_000 else 0
                    if (iteration > 0) waitFor("previous delayed requests drained") { DebugNetworkDelay.pending.get() == 0 }
                    flowA()
                    flowB()
                    flowC(serverVisibleFeed(server, feed))
                    flowD()
                    flowE()
                }
            }
            success = true
        } catch (error: Throwable) {
            report.failure(error)
            runCatching {
                java.io.File(report.directory, "failure-semantics.txt").writeText(
                    compose.onAllNodes(isRoot(), useUnmergedTree = true).printToString()
                )
            }
            runCatching { capture("FAILED-${report.nextSequence()}") }
            throw error
        } finally {
            DebugNetworkDelay.millis = 0
            DebugNetworkDelay.holdSubscriptionCompletion = false
            report.finish(success)
            Log.i("FlowRun", "Output: ${report.directory.absolutePath}")
        }
    }

    private fun setAppearance(mode: String) {
        flow = "appearance"
        pass = 0
        DebugNetworkDelay.millis = 0
        root("Views")
        tap("settings", "Settings", { present(control("Appearance")) || present(hasText("Playback Settings")) })
        // Settings is a LazyColumn; offscreen labels do not exist in semantics until scrolled to.
        dispatched()
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Appearance"))
        tap("appearance", "Appearance", { present(control(mode)) })
        fun settingsScroll() = compose.onNode(hasScrollToIndexAction()).fetchSemanticsNode()
            .config[SemanticsProperties.VerticalScrollAxisRange].value()
        val before = settingsScroll()
        tap("choose-$mode", mode)
        waitFor("appearance applied") {
            val dark = compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
            dark == (mode == "Dark")
        }
        compose.waitForIdle()
        check(kotlin.math.abs(settingsScroll() - before) <= 1f) { "Appearance changed the Settings scroll position" }
        device.pressBack() // dismiss Appearance sheet
        appearance = mode
        root("Views")
        report.note("$mode selected through Settings → Appearance; resource night qualifier verified.")
    }

    private fun serverVisibleFeed(server: String, feed: String): String {
        val parsed = java.net.URI(feed)
        // Demo publishes on the host. The server, rather than Android, performs the lookup.
        if (java.net.URI(server).host != "10.0.2.2" || parsed.host != "10.0.2.2") return feed
        val hostFeed = java.net.URI(parsed.scheme, parsed.userInfo, "127.0.0.1", parsed.port, parsed.path, parsed.query, parsed.fragment).toString()
        report.note("Feed arg $feed typed as $hostFeed: demo HTTP lookup runs on the emulator host, where 10.0.2.2 is not a host address.")
        return hostFeed
    }

    private fun flowA() {
        flow = "A"
        root("Views")
        tap("open-view", "New this week", { present(control("Add to a Playlist")) })
        // Episode title is discovered from the real row's semantics, not a date-sensitive fixture title.
        val title = rowTitle(compose.onAllNodes(control("Add to a Playlist")).fetchSemanticsNodes().first())
        tap("open-episode", title, { present(hasText("Show notes")) && present(control("Add to a Playlist")) })
        tap("add", "Add to a Playlist", { present(control("Play Last")) })
        // The mini-player's Active Playlist button also starts with "Default" behind this sheet.
        val defaultTarget = control("Default", true) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton)
        act("target-default", { selectedTab("Views") && present(defaultTarget and isSelected()) }) { click(defaultTarget) }
        tap("submit-add", "Play Last", { present(hasText("Undo") and hasClickAction()) })
        capture("follow-up")
        undo("undo-add") { selectedTab("Views") && !present(control("Play Last")) && !present(hasText("Default")) }
        root("Views")
        capture("next-item")
    }

    private fun flowB() {
        flow = "B"
        root("Playlists")
        tap("default", "Default", { present(control("Play from here")) })
        act("play-entry", { present(control("Now Playing:", true)) && present(control("Pause")) }) { click(control("Play from here"), index = 0) }
        tap("open-now-playing", "Now Playing:", { present(control("Collapse Now Playing")) }, substring = true)
        tap("collapse", "Collapse Now Playing", { !present(control("Collapse Now Playing")) && present(control("Entry actions")) })
        // Pause stops the live progress clock from contaminating later pixel-response observations.
        val pause = control("Pause")
        if (present(pause)) act("pause", { !present(pause) && present(control("Play")) }) { click(pause) }
        // A reveal can retain the old scroll anchor. Compare the same rows before/after a move.
        act("reveal-entries") { dispatched(); compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0) }
        val before = entryOrder()
        check(before.size >= 2 && before.distinct().size == before.size) { "Expected distinct accessible Entry rows: $before" }
        act("entry-menu", { present(control("Move down")) }) { click(control("Entry actions"), index = 0) }
        tap("move-down", "Move down", { present(hasText("Undo") and hasClickAction()) && entryOrder() != before })
        // Move's reveal may scroll the row. Verify order at the same anchor, not just changed visibility.
        act("verify-reorder", { entryOrder().take(2) == before.take(2).reversed() }) {
            dispatched()
            compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
        }
        capture("follow-up")
        undo("undo-reorder") { entryOrder() == before }
        capture("next-item")
    }
    private fun rowTitle(node: androidx.compose.ui.semantics.SemanticsNode): String =
        generateSequence(node.parent) { it.parent }.mapNotNull { ancestor ->
            ancestor.flatten().mapNotNull { it.config.getOrNull(SemanticsProperties.Text)?.firstOrNull()?.text }
                .firstOrNull { it.isNotBlank() && it !in setOf("Add to a Playlist", "Play from here", "Play Now", "Entry actions") }
        }.firstOrNull() ?: error("Episode row has no accessible title")

    private fun entryOrder(): List<String> = compose.onAllNodes(control("Entry actions")).fetchSemanticsNodes()
        .sortedBy { it.boundsInRoot.top }.map(::rowTitle)

    private fun flowC(feed: String) {
        flow = "C"
        root("Library")
        tap("add-podcasts", "Add podcasts", { present(field("Podcast name or feed address")) })
        if (!value("Podcast name or feed address").isNullOrEmpty()) enter("clear-feed", "Podcast name or feed address", "")
        enter("type-feed", "Podcast name or feed address", feed)
        tap("find", "Find podcasts", { present(control("Long listening")) })
        tap("open-podcast", "Long listening", { present(control("Subscribe")) && present(hasScrollToIndexAction()) })
        // The eight flings persist the scroll anchor. Lazy headers may not exist until revealed.
        act("reveal-podcast-header", { present(field("Search Episodes")) && !busy() }) {
            dispatched()
            compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
        }
        // Re-opened Podcast pages retain the previous query/scroll through ordinary browsing state.
        enter("clear-query", "Search Episodes", "")
        if (!present(control("Subscribe"))) error("Feed must start unsubscribed; use the default demo seed, without large:true")
        if (pass == 0) {
            DebugNetworkDelay.holdSubscriptionCompletion = true
            val probe = report.startPendingProbe()
            act("subscribe-submit") { click(control("Subscribe")) }
            waitFor("pending Subscribe") { busy() }
            capture("subscribe-working")
            enter("type-while-pending", "Search Episodes", "Long E")
            probe.typed(value("Search Episodes"), SystemClock.uptimeMillis(), DebugNetworkDelay.pending.get())
            capture("typing-pending")
            DebugNetworkDelay.holdSubscriptionCompletion = false
            waitFor("Subscribe completion") { present(hasText("Undo") and hasClickAction()) && !busy() }
            compose.waitForIdle()
            capture("subscribe-completion")
            probe.completed(value("Search Episodes"), SystemClock.uptimeMillis())
        } else tap("subscribe", "Subscribe", { present(hasText("Undo") and hasClickAction()) && !busy() })
        capture("follow-up")
        undo("undo-subscribe") { present(control("Subscribe")) && !busy() }
        enter("next-item", "Search Episodes", "")
        waitFor("500 Episode feed") { present(hasText("500 Episodes")) }
        dismissKeyboard()
        if (pass == 0) {
            val list = compose.onNode(hasScrollToIndexAction())
            report.beginAction("long-list-fling")
            report.scrollFrames(flow, appearance, compose.activity.window) {
                repeat(8) { dispatched(); list.performTouchInput { swipeUp(durationMillis = 180) } }
            }
            compose.waitForIdle()
            capture("long-list-fling")
            // Leave a loaded header anchor for the next visit, before async feed reload/restoration.
            act("return-podcast-header", { present(field("Search Episodes")) }) {
                dispatched()
                list.performScrollToIndex(0)
            }
        }
        root("Library")
    }

    private fun flowD() {
        flow = "D"
        val name = "Flow ${report.runId.takeLast(8)} $appearance $pass"
        root("Playlists")
        tap("new-playlist", "New Playlist", { present(field("Name")) })
        enter("type-name", "Name", name)
        tap("create", "Create Playlist", { present(control("Playlist settings")) })
        tap("settings", "Playlist settings", { present(control("Rename")) })
        tap("rename", "Rename", { present(field("Name")) })
        enter("type-rename", "Name", "$name renamed")
        tap("save", "Save", { present(hasText("Undo") and hasClickAction()) && !present(field("Name")) && present(hasText("$name renamed")) })
        capture("follow-up")
        undo("undo-rename") { present(hasText(name, substring = true)) && !present(hasText("$name renamed", substring = true)) }
        root("Playlists")
        capture("next-item")
    }

    private fun flowE() {
        flow = "E"
        root("Library")
        tap("search", "Search the Library", { present(field("Search the Library")) })
        if (!value("Search the Library").isNullOrEmpty()) enter("clear-search", "Search the Library", "")
        enter("type-rice", "Search the Library", "rice")
        // The unfiltered list also contains this Episode; await the fixture's filtered count too.
        waitFor("search results") { present(hasText("1 Episode")) && present(hasText("Who sets the price of rice?")) }
        compose.waitForIdle()
        capture("results-completion")
        tap("save-as-view", "Save as a View", { present(field("Name")) })
        enter("type-view-name", "Name", "Rice ${report.runId.takeLast(8)} $appearance $pass")
        tap("create-view", "Create View", { !present(field("Name")) && present(control("Edit View")) })
        capture("next-item")
        root("Library")
    }
}

internal fun androidx.compose.ui.semantics.SemanticsNode.flatten(): List<androidx.compose.ui.semantics.SemanticsNode> =
    listOf(this) + children.flatMap { it.flatten() }
