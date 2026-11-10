@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import kotlinx.coroutines.flow.first
import java.util.UUID

@Stable
internal class SheetFeedback(val snackbar: SnackbarHostState, private val sheetChanged: (String?) -> Unit = {}) {
    val sheets = mutableStateListOf<SheetSnackbar>()
    val openSheets get() = sheets.size
    val visibleSnackbar get() = sheets.lastOrNull()?.snackbar ?: snackbar

    fun open(sheet: SheetSnackbar) {
        // An earlier screen's Undo must never migrate into a newly opened modal.
        visibleSnackbar.currentSnackbarData?.dismiss()
        sheets += sheet
        sheetChanged(sheet.id)
    }

    fun close(sheet: SheetSnackbar) {
        sheet.snackbar.currentSnackbarData?.dismiss()
        sheets -= sheet
        sheetChanged(sheets.lastOrNull()?.id)
    }

    suspend fun show(message: AppMessage, text: String, actionLabel: String?): SnackbarResult {
        val local = sheets.lastOrNull { it.id == message.feedbackSheet }
        // Global/background results, including results from an already closed sheet, wait for
        // the modal stack to close. New sheet actions have their own host and cannot be blocked
        // by an earlier global result (the caller collects latest messages).
        if (local == null) snapshotFlow { openSheets }.first { it == 0 }
        return (local?.snackbar ?: snackbar).showSnackbar(text, actionLabel = actionLabel, duration = SnackbarDuration.Long)
    }
}

internal class SheetSnackbar(val id: String = UUID.randomUUID().toString(), val snackbar: SnackbarHostState = SnackbarHostState())
internal val LocalSheetSnackbar = staticCompositionLocalOf<SheetSnackbar?> { null }

internal val LocalSheetFeedback = staticCompositionLocalOf<SheetFeedback?> { null }

@Composable
internal fun FeedbackSheet(
    modifier: Modifier = Modifier,
    onDismissRequest: () -> Unit,
    sheetState: SheetState,
    dragHandle: @Composable (() -> Unit)? = { BottomSheetDefaults.DragHandle() },
    content: @Composable ColumnScope.() -> Unit
) {
    val feedback = LocalSheetFeedback.current
    val local = remember { SheetSnackbar() }
    DisposableEffect(feedback, local) {
        feedback?.open(local)
        onDispose { feedback?.close(local) }
    }
    ModalBottomSheet(modifier = modifier, onDismissRequest = onDismissRequest, sheetState = sheetState, dragHandle = dragHandle) {
        CompositionLocalProvider(LocalSheetSnackbar provides local) {
            content()
        }
    }
}

@Composable
internal fun FeedbackSnackbarHost(snackbar: SnackbarHostState, modifier: Modifier = Modifier) {
    SnackbarHost(snackbar, modifier.padding(horizontal = 16.dp, vertical = 8.dp)) { data ->
        val label = data.visuals.actionLabel
        Snackbar(modifier = Modifier.testTag("feedback-snackbar"), action = if (label != null) ({
            ContentTextButton(onClick = data::performAction, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.inversePrimary)) { Text(label) }
        }) else null) { Text(data.visuals.message) }
    }
}

internal fun Modifier.errorAnnouncement(): Modifier = semantics { liveRegion = LiveRegionMode.Polite }
