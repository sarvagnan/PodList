@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.ComposeContentTestRule
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.podlist.data.Appearance
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Also recognises Material's live-region snackbar, so the pre-fix overlay fails this check. */
internal fun assertNoSnackbarOverlapsSheetOptions(compose: ComposeContentTestRule) {
    val nodes = compose.onAllNodes(isRoot(), useUnmergedTree = true).fetchSemanticsNodes().flatMap { it.flatten() }
    val snackbars = nodes.filter {
        it.config.getOrNull(SemanticsProperties.TestTag) == "feedback-snackbar" ||
            it.config.getOrNull(SemanticsProperties.LiveRegion) == LiveRegionMode.Polite
    }
    val options = nodes.filter { it.config.getOrNull(SemanticsProperties.Role) == Role.RadioButton }
    check(options.isNotEmpty()) { "Expected sheet option rows for the snackbar overlap assertion" }
    for (snackbar in snackbars) for (option in options) {
        check(!snackbar.boundsInWindow.overlaps(option.boundsInWindow)) {
            "Snackbar ${snackbar.boundsInWindow} covers a sheet option ${option.boundsInWindow}"
        }
    }
}

@RunWith(AndroidJUnit4::class)
class SheetFeedbackTest {
    @get:Rule val compose = createComposeRule()

    @Test fun lightSheetKeepsOptionsAndUndoReachable() = exercise(Appearance.Light, 1f)
    @Test fun darkSheetKeepsOptionsAndUndoReachable() = exercise(Appearance.Dark, 1f)
    @Test fun lightLargeTextKeepsOptionsAndUndoReachable() = exercise(Appearance.Light, 2f)
    @Test fun darkLargeTextKeepsOptionsAndUndoReachable() = exercise(Appearance.Dark, 2f)

    private fun exercise(appearance: Appearance, fontScale: Float) {
        lateinit var scope: CoroutineScope
        lateinit var feedback: SheetFeedback
        var activeSheet: String? = null
        var actionPerformed = false
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                PodListTheme(appearance) {
                    scope = rememberCoroutineScope()
                    feedback = remember { SheetFeedback(SnackbarHostState()) { activeSheet = it } }
                    var open by remember { mutableStateOf(false) }
                    CompositionLocalProvider(LocalSheetFeedback provides feedback) {
                        Column {
                            Button(onClick = { open = true }) { Text("Open Appearance") }
                            if (feedback.openSheets == 0) FeedbackSnackbarHost(feedback.snackbar)
                        }
                        if (open) FeedbackSheet(onDismissRequest = { open = false }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
                            Column(Modifier.fillMaxWidth().imePadding()) {
                                Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(16.dp)) {
                                    Text("Appearance", style = MaterialTheme.typography.titleLarge)
                                    ChoiceRows(listOf("System default", "Light", "Dark").map { it to it }, "Light") {
                                        val owner = activeSheet
                                        scope.launch {
                                            val result = feedback.show(AppMessage(R.string.appearance_changed, feedbackSheet = owner), "Updated Appearance", "Undo")
                                            actionPerformed = result == SnackbarResult.ActionPerformed
                                        }
                                    }
                                }
                                CommitActions(Modifier.padding(16.dp)) {
                                    CommitButton(onClick = { open = false }) { Text("Done") }
                                }
                            }
                        }
                    }
                }
            }
        }
        compose.runOnIdle { scope.launch { feedback.show(AppMessage(R.string.view_created), "Created View earlier", "Undo") } }
        compose.onNodeWithText("Created View earlier").assertIsDisplayed()
        compose.onNodeWithText("Open Appearance").performClick()
        compose.onNodeWithText("Created View earlier").assertDoesNotExist()
        assertNoSnackbarOverlapsSheetOptions(compose)

        // A delayed background result is held, rather than adopting the current sheet's scope.
        lateinit var pending: Job
        compose.runOnIdle { pending = scope.launch { feedback.show(AppMessage(R.string.playback_error), "Background result", null) } }
        compose.waitForIdle()
        compose.onNodeWithText("Background result").assertDoesNotExist()
        compose.runOnIdle { assertTrue(pending.isActive); assertNull(feedback.snackbar.currentSnackbarData) }

        compose.onNodeWithText("Dark").performClick()
        compose.onNodeWithText("Updated Appearance").assertIsDisplayed()
        for (label in listOf("System default", "Light", "Dark", "Done", "Undo")) compose.onNodeWithText(label).assertIsDisplayed()
        assertNoSnackbarOverlapsSheetOptions(compose)
        val banner = compose.onNodeWithTag("feedback-snackbar").fetchSemanticsNode().boundsInWindow
        val done = compose.onNodeWithText("Done").fetchSemanticsNode().boundsInWindow
        assertTrue("Feedback must stay above Done", banner.bottom <= done.top)
        compose.onNodeWithText("Undo").performClick()
        compose.runOnIdle { assertTrue(actionPerformed) }
        compose.onNodeWithText("Done").performClick()
        compose.onNodeWithText("Background result").assertIsDisplayed()
    }
}
