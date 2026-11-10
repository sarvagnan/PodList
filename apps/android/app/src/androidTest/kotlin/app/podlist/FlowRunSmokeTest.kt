package app.podlist

import android.content.res.Configuration
import android.os.SystemClock
import android.util.Log
import androidx.compose.ui.semantics.Role
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
        }
    }
    @get:Rule val rules: RuleChain = RuleChain.outerRule(freshInstall).around(compose)
    private lateinit var report: FlowRunReport
    private var appearance = "Light"
    private var pass = 0
    private var flow = "setup"
    private var inputAt = Long.MIN_VALUE
    private val device by lazy { UiDevice.getInstance(instrumentation) }
    private fun nodes() = compose.onAllNodes(isRoot(), useUnmergedTree = true)
        .fetchSemanticsNodes().flatMap { root -> root.flatten() }
    private fun present(matcher: SemanticsMatcher) = compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty()
    private fun label(text: String, substring: Boolean = false) = hasText(text, substring = substring) or hasContentDescription(text, substring = substring)
    private fun control(text: String, substring: Boolean = false) = label(text, substring) and hasClickAction()
    private fun field(text: String) = hasSetTextAction() and hasText(text)
    private fun nav(text: String) = label(text) and hasClickAction() and SemanticsMatcher("navigation item") {
        it.config.getOrNull(SemanticsProperties.Selected) != null && it.config.getOrNull(SemanticsProperties.Role) != Role.RadioButton
    }
    private fun waitFor(why: String, condition: () -> Boolean) {
        try { compose.waitUntil(90_000, condition) }
        catch (error: Throwable) { throw AssertionError("$flow/$why ($appearance pass $pass); inspect ${report.directory}", error) }
    }
    private fun click(matcher: SemanticsMatcher, index: Int = 0) {
        waitFor("click target $matcher") { present(matcher) }
        val target = compose.onAllNodes(matcher)[index]
        // Focus/scroll are deliberate preparation inputs, separately recorded when necessary.
        if (!runCatching { target.assertIsDisplayed() }.isSuccess) {
            inputAt = SystemClock.uptimeMillis()
            target.performScrollTo()
            capture("reveal-${report.nextSequence()}")
        }
        inputAt = SystemClock.uptimeMillis()
        target.performClick()
    }
    private fun type(label: String, value: String) {
        val target = compose.onNode(field(label))
        inputAt = SystemClock.uptimeMillis()
        target.performClick()
        target.performTextReplacement(value)
    }
    private fun value(label: String) = compose.onAllNodes(field(label)).fetchSemanticsNodes().firstOrNull()
        ?.config?.getOrNull(SemanticsProperties.EditableText)?.text
    private fun busy() = nodes().any { it.config.getOrNull(SemanticsProperties.ProgressBarRangeInfo) == androidx.compose.ui.semantics.ProgressBarRangeInfo.Indeterminate && it.boundsInWindow.width > 0 }
    private fun capture(step: String) = report.capture(flow, step, appearance, pass, inputAt, nodes(), compose.activity.window)

    /** Input, pending UI and async completion are distinct captures, including fast local edits. */
    private fun act(step: String, done: () -> Boolean = { true }, action: () -> Unit) {
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
        val selected = compose.onAllNodes(nav(tab)).fetchSemanticsNodes().any { it.config.getOrNull(SemanticsProperties.Selected) == true }
        if (selected && present(marker)) { capture("start-$tab"); return }
        act("start-$tab", { present(marker) }) { click(nav(tab)) }
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
            inputAt = SystemClock.uptimeMillis()
            device.pressBack()
        }
    }
    private fun undo(step: String, done: () -> Boolean) {
        dismissKeyboard()

        // Only the snackbar's text button; the toolbar's icon Undo must not stand in for it.
        val snackbarUndo = hasText("Undo") and hasClickAction()
        act(step, { done() && present(hasText("Redo") and hasClickAction()) }) { click(snackbarUndo) }
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
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Appearance"))
        tap("appearance", "Appearance", { present(control(mode)) })
        tap("choose-$mode", mode)
        device.pressBack() // dismiss Appearance sheet
        waitFor("appearance applied") {
            val dark = compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
            dark == (mode == "Dark")
        }
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
        tap("open-episode", title, { present(hasText("Add to a Playlist") and hasClickAction()) })
        tap("add", "Add to a Playlist", { present(control("Play Last")) })
        tap("target-default", "Default", substring = true)
        tap("submit-add", "Play Last", { present(hasText("Undo") and hasClickAction()) })
        capture("follow-up")
        undo("undo-add") { !present(control("Play Last")) }
        root("Views")
        capture("next-item")
    }

    private fun flowB() {
        flow = "B"
        root("Playlists")
        tap("default", "Default", { present(control("Play from here")) })
        act("play-entry", { present(control("Now Playing:", true)) && present(control("Pause")) }) { click(control("Play from here")) }
        tap("open-now-playing", "Now Playing:", { present(control("Collapse Now Playing")) }, substring = true)
        tap("collapse", "Collapse Now Playing", { present(control("Entry actions")) })
        // Pause stops the live progress clock from contaminating later pixel-response observations.
        val pause = control("Pause", true)
        if (present(pause)) act("pause") { click(pause) }
        val before = entryOrder()
        act("entry-menu", { present(control("Move down")) }) { click(control("Entry actions")) }
        tap("move-down", "Move down", { present(hasText("Undo") and hasClickAction()) && entryOrder() != before })
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
        tap("open-podcast", "Long listening", { present(field("Search Episodes")) && !busy() })
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
        if (pass == 0) {
            val list = compose.onNode(hasScrollToIndexAction())
            report.scrollFrames(flow, appearance, compose.activity.window) {
                repeat(8) { list.performTouchInput { swipeUp(durationMillis = 180) } }
            }
            inputAt = SystemClock.uptimeMillis()
            capture("long-list-fling")
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
        waitFor("search results") { present(hasText("Who sets the price of rice?")) }
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
