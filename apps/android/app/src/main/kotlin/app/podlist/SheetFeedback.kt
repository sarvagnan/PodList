@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics

@Stable
internal class SheetFeedback(val snackbar: SnackbarHostState) {
    var editorUndo by mutableStateOf(false)
    var openSheets by mutableIntStateOf(0)
}

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
    DisposableEffect(feedback) {
        feedback?.let { it.openSheets++ }
        onDispose { feedback?.let { it.openSheets-- } }
    }
    ModalBottomSheet(modifier = modifier, onDismissRequest = onDismissRequest, sheetState = sheetState, dragHandle = dragHandle) {
        val scale = androidx.compose.ui.platform.LocalDensity.current.fontScale.coerceAtLeast(1f)
        Box(Modifier.fillMaxWidth()) {
            Column(Modifier.fillMaxWidth().padding(bottom = if (feedback == null) 0.dp else 80.dp * scale)) { content() }
            feedback?.let { FeedbackSnackbarHost(it, Modifier.align(androidx.compose.ui.Alignment.BottomCenter)) }
        }
    }
}

@Composable
internal fun FeedbackSnackbarHost(feedback: SheetFeedback, modifier: Modifier = Modifier) {
    val undoLabel = androidx.compose.ui.res.stringResource(R.string.undo)
    SnackbarHost(feedback.snackbar, modifier) { data ->
        val label = data.visuals.actionLabel
        Snackbar(action = if (label != null && !(feedback.editorUndo && label == undoLabel)) ({
            TextButton(onClick = data::performAction, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.inversePrimary)) { Text(label) }
        }) else null) { Text(data.visuals.message) }
    }
}

internal fun Modifier.errorAnnouncement(): Modifier = semantics { liveRegion = LiveRegionMode.Polite }
