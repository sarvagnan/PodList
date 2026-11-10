package app.podlist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.text.TextRange
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
}
