package app.podlist

import android.view.WindowInsets
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.io.File
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.ExternalResource
import org.junit.rules.RuleChain
import org.junit.runner.RunWith

/** Drives the same MainActivity and app data through separately launched phases. */
@RunWith(AndroidJUnit4::class)
class CrossClientSyncTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val args = InstrumentationRegistry.getArguments()
    private val compose = createAndroidComposeRule<MainActivity>()
    private val device by lazy { UiDevice.getInstance(instrumentation) }
    private val phase by lazy { requireNotNull(args.getString("phase")) }
    private val phaseOnly = object : ExternalResource() {
        override fun before() {
            assumeTrue("Select a cross-client phase explicitly", args.containsKey("phase"))
            check(instrumentation !is PodListTestRunner) { "Use the persistent instrumentation runner" }
            require(phase.matches(Regex("[a-z-]+"))) { "Invalid phase: $phase" }
        }
    }
    @get:Rule val rules: RuleChain = RuleChain.outerRule(phaseOnly).around(compose)

    @Test fun runPhase() {
        val server = requireNotNull(args.getString("server"))
        require(server.matches(Regex("http://10\\.0\\.2\\.2:[1-9][0-9]{3,4}"))) { "Use the demo emulator relay" }
        try {
            when (phase) {
                "connect" -> connect(server)
                "web-check" -> {
                    root("Playlists")
                    shown(flowControl("Commute Web"))
                    starVisible(RICE)
                    openEpisode(CURRENCY)
                    shown(flowControl("Mark Unplayed"))
                    workshop("Workshop", listOf(NOTEBOOK, CHAIR, JOINERY))
                }
                "mac-check" -> {
                    root("Playlists")
                    shown(flowControl("Workshop Mac"))
                    starVisible(JOINERY)
                }
                "android-edit" -> {
                    rename("Commute Web", "Commute Android")
                    openEpisode(LIGHTHOUSE)
                    click("Star")
                    shown(flowControl("Unstar"))
                    delivered()
                }
                "download" -> {
                    openEpisode(NOTEBOOK)
                    click("Download")
                    shown(hasText("Stored on this Device"))
                }
                "offline-edit" -> {
                    root("Playlists")
                    // The app only notices it's offline when it next syncs; the rename triggers that.
                    rename("Workshop Mac", "Workshop Offline Android")
                    shown(hasText(OFFLINE))
                    playAndSkip("Workshop Offline Android", skips = 3, minimum = 90)
                    openEpisode(NOTEBOOK)
                    click("Add to a Playlist")
                    val target = flowControl("Workshop Offline Android", substring = true) and
                        SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton)
                    click(target)
                    shown(target and isSelected())
                    click("Play Last")
                    hidden(flowControl("Play Last"))
                    workshop("Workshop Offline Android", listOf(CHAIR, JOINERY, NOTEBOOK))
                }
                "offline-flush" -> {
                    root("Playlists")
                    shown(flowControl("Workshop Offline Android"))
                    hidden(hasText(OFFLINE))
                    delivered()
                }
                "offline-check" -> {
                    workshop("Workshop Offline Mac", listOf(JOINERY, NOTEBOOK, CHAIR))
                    val clock = duration(requireNotNull(args.getString("position")).toDouble())
                    await("Notebook shows the winning position $clock") {
                        entryActions().fetchSemanticsNodes().any { action ->
                            entryRows(action).any { (row, title) ->
                                title == NOTEBOOK && row.flatten().any {
                                    it.config.getOrNull(SemanticsProperties.ContentDescription)?.contains("Playback Position") == true &&
                                        it.config.getOrNull(SemanticsProperties.StateDescription) == clock
                                }
                            }
                        }
                    }
                }
                "handoff-edit" -> {
                    playAndSkip("Workshop Offline Mac", skips = 2, minimum = 150)
                    delivered()
                }
                "trash-check" -> {
                    root("Playlists")
                    hidden(flowControl("Commute Android"))
                    click("Trash")
                    shown(hasText("Commute Android"))
                    shown(flowControl("Restore"))
                }
                "restore-check" -> {
                    root("Playlists")
                    shown(flowControl("Commute Android"))
                    click("Trash")
                    shown(hasText("No deleted Playlists"))
                }
                "subscription-check" -> {
                    root("Library")
                    shown(flowControl("Long listening"))
                    search("Long Episode 001")
                    search("Long Episode 500")
                }
                "unsubscribe-check" -> {
                    root("Library")
                    shown(flowControl("Market Hours"))
                    hidden(flowControl("Long listening"))
                }
                "version-check" -> {
                    root("Playlists")
                    shown(flowControl("Commute Protocol"))
                    shown(flowControl("Workshop Offline Mac"))
                }
                else -> error("Unknown Android cross-client phase: $phase")
            }
        } catch (error: Throwable) {
            runCatching {
                val file = File(requireNotNull(instrumentation.targetContext.getExternalFilesDir(null)), "cross-sync-$phase.png")
                check(device.takeScreenshot(file))
            }.exceptionOrNull()?.let(error::addSuppressed)
            runCatching { compose.onRoot(useUnmergedTree = true).printToLog("CrossClientSync") }
                .exceptionOrNull()?.let(error::addSuppressed)
            throw error
        }
    }

    private fun connect(server: String) {
        click("Connect to a server")
        enter("Server address", server)
        click("Check and connect")
        shown(flowNavigation("Views"))
        root("Library")
        for (name in listOf("Deep Field", "Market Hours", "Slow Build")) shown(flowControl(name))
        root("Playlists")
        for (name in listOf("Default", "Commute", "Workshop")) shown(flowControl(name))
    }

    private fun present(matcher: SemanticsMatcher) =
        compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty()

    // Instrumentation ends by killing the app process; wait until queued edits reach the
    // server so they aren't left in the outbox until the next launch.
    private fun delivered() {
        val app = instrumentation.targetContext.applicationContext as PodListApplication
        await("Android edits delivered to the server") { app.model.session.value?.db?.outbox()?.isEmpty() == true }
    }

    private fun await(label: String, predicate: () -> Boolean) {
        try {
            compose.waitUntil(90_000, predicate)
        } catch (error: AssertionError) {
            throw AssertionError("$phase: $label", error)
        }
    }

    private fun shown(matcher: SemanticsMatcher) = await("show $matcher") { present(matcher) }
    private fun hidden(matcher: SemanticsMatcher) = await("hide $matcher") { !present(matcher) }

    private fun click(matcher: SemanticsMatcher) {
        shown(matcher)
        compose.onNode(matcher).performClick()
    }

    private fun click(name: String) = click(flowControl(name))

    private fun fieldValue(label: String) =
        compose.onAllNodes(flowField(label)).fetchSemanticsNodes().firstOrNull()?.config
            ?.getOrNull(SemanticsProperties.EditableText)?.text

    private fun enter(label: String, text: String) {
        val field = flowField(label)
        shown(field)
        compose.onNode(field).performTextReplacement(text)
        await("enter $text") { fieldValue(label) == text }
    }

    private fun dismissKeyboard() {
        fun keyboardVisible(): Boolean {
            var visible = false
            instrumentation.runOnMainSync {
                visible = compose.activity.window.decorView.rootWindowInsets
                    ?.isVisible(WindowInsets.Type.ime()) == true
            }
            return visible
        }
        if (keyboardVisible()) {
            device.pressBack()
            await("dismiss the keyboard") { !keyboardVisible() }
        }
    }

    private fun root(tab: String) {
        dismissKeyboard()
        val nav = flowNavigation(tab)
        val selected = nav and isSelected()
        val marker = when (tab) {
            "Library" -> "Add podcasts"
            "Playlists" -> "New Playlist"
            else -> "New View"
        }
        if (!present(selected)) click(nav)
        shown(selected)
        if (!present(flowControl(marker))) click(selected)
        shown(flowControl(marker))
    }

    // The Search field holds the same text as the result row; match only the row.
    private fun searchResult(title: String) = flowControl(title) and !hasSetTextAction()

    private fun search(title: String) {
        root("Library")
        click("Search the Library")
        enter("Search the Library", title)
        dismissKeyboard()
        await("exact Search result $title") { present(searchResult(title)) && present(hasText("1 Episode")) }
    }

    private fun openEpisode(title: String) {
        search(title)
        click(searchResult(title))
        shown(hasText("Show notes"))
        shown(flowControl("Add to a Playlist"))
    }

    private fun starVisible(title: String) {
        root("Views")
        click("Starred")
        shown(flowControl(title))
    }

    private fun rename(old: String, new: String) {
        root("Playlists")
        click(old)
        click("Playlist settings")
        click("Rename")
        enter("Name", new)
        click("Save")
        root("Playlists")
        shown(flowControl(new))
        hidden(flowControl(old))
    }

    private fun entryRows(action: SemanticsNode): Sequence<Pair<SemanticsNode, String>> =
        generateSequence(action.parent) { it.parent }.mapNotNull { row ->
            val titles = row.flatten().flatMap { it.config.getOrNull(SemanticsProperties.Text).orEmpty() }
                .map { it.text }.filter { it in WORKSHOP_TITLES }.distinct()
            titles.singleOrNull()?.let { row to it }
        }

    private fun entryTitle(action: SemanticsNode): String? = entryRows(action).firstOrNull()?.second

    private fun entryActions() = compose.onAllNodes(flowControl("Play from here"))

    private fun workshop(name: String, expected: List<String>) {
        root("Playlists")
        click(name)
        await("exact Workshop order $expected") {
            entryActions().fetchSemanticsNodes().sortedBy { it.boundsInRoot.top }.map(::entryTitle) == expected
        }
    }

    private fun playAndSkip(list: String, skips: Int, minimum: Int) {
        root("Playlists")
        click(list)
        val entries = entryActions()
        await("playable Notebook Entry") { entries.fetchSemanticsNodes().any { entryTitle(it) == NOTEBOOK } }
        val index = entries.fetchSemanticsNodes().indexOfFirst { entryTitle(it) == NOTEBOOK }
        entries[index].performClick()
        click(flowControl("Now Playing: $NOTEBOOK", substring = true))
        shown(flowControl("Pause"))

        fun seconds() = compose.onAllNodes(hasContentDescription("Position")).fetchSemanticsNodes()
            .firstOrNull()?.config?.getOrNull(SemanticsProperties.ProgressBarRangeInfo)?.current ?: 0f
        val start = seconds()
        await("fixture audio advances") { seconds() > start + 0.5f }
        repeat(skips) {
            val prior = seconds()
            click("Forward 30 seconds")
            await("seek ahead 30 seconds") { seconds() >= prior + 29f }
        }
        await("position reaches $minimum seconds") { seconds() >= minimum }
        click("Pause")
        shown(flowControl("Play"))
        click("Collapse Now Playing")
    }

    private companion object {
        const val NOTEBOOK = "The workshop as a notebook"
        const val CHAIR = "Repairing a chair, twice"
        const val JOINERY = "Joinery without screws"
        const val RICE = "Who sets the price of rice?"
        const val CURRENCY = "When a currency disappears"
        const val LIGHTHOUSE = "Lighthouses and public goods"
        const val OFFLINE = "Server unreachable. Showing local data."
        val WORKSHOP_TITLES = setOf(NOTEBOOK, CHAIR, JOINERY)
    }
}
