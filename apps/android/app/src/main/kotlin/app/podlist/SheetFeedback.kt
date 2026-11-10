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
        Column(Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f, fill = false)) { content() }
            feedback?.let { FeedbackSnackbarHost(it) }
        }
    }
}

@Composable
internal fun FeedbackSnackbarHost(feedback: SheetFeedback, modifier: Modifier = Modifier) {
    SnackbarHost(feedback.snackbar, modifier.padding(horizontal = 16.dp, vertical = 8.dp)) { data ->
        val label = data.visuals.actionLabel
        Snackbar(action = if (label != null) ({
            ContentTextButton(onClick = data::performAction, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.inversePrimary)) { Text(label) }
        }) else null) { Text(data.visuals.message) }
    }
}

internal fun Modifier.errorAnnouncement(): Modifier = semantics { liveRegion = LiveRegionMode.Polite }
