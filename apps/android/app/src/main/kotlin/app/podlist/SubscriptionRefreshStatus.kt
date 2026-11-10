package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row

@Composable
internal fun SubscriptionRefreshStatus(subscription: Row, session: Session, onRefresh: () -> Unit = {}) {
    if (session.source.server != null || (subscription["refresh_failures"] as? Number)?.toInt()?.let { it > 0 } != true) return
    val model = LocalAppModel.current
    val refreshing by model.refreshing.collectAsState()
    val id = subscription["id"] as String
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        InlineError(stringResource(R.string.refresh_failed), modifier = Modifier)
        (subscription["refreshed_at"] as? Number)?.toLong()?.let { Text(stringResource(R.string.refreshed_at, dateTime(it)), style = MaterialTheme.typography.bodySmall) }
        ContentTextButton(enabled = id !in refreshing, onClick = { onRefresh(); model.refreshSubscription(id) }) {
            Text(stringResource(if (id in refreshing) R.string.refreshing_podcast else R.string.retry_refresh))
        }
    }
}

@Composable
internal fun UndoAction() {
    val model = LocalAppModel.current
    val undo by model.latestUndo.collectAsState()
    val description by model.undoDescription.collectAsState()
    val snackbarUndo = LocalSheetFeedback.current?.snackbar?.currentSnackbarData?.visuals?.actionLabel == stringResource(R.string.undo)
    // Reserve the slot even before the first edit and while snackbar Undo owns the command.
    // No invisible clickable/focusable node is left in the accessibility tree.
    if (undo != null && !snackbarUndo) ActionIcon(R.drawable.ic_undo, description?.let { stringResource(R.string.undo_specific, appMessageText(it)) } ?: stringResource(R.string.undo)) { undo?.invoke() }
    else Spacer(Modifier.size(48.dp).clearAndSetSemantics {})
}

@Composable
internal fun RedoMenuItem(close: () -> Unit) {
    val model = LocalAppModel.current
    val redo by model.latestRedo.collectAsState()
    val description by model.redoDescription.collectAsState()
    DropdownMenuItem(text = { Text(description?.let { stringResource(R.string.redo_specific, appMessageText(it)) } ?: stringResource(R.string.m4_redo)) }, enabled = redo != null,
        leadingIcon = { Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_redo), null) },
        onClick = { close(); redo?.invoke() })
}

@Composable
internal fun HistoryOverflow() {
    val redo by LocalAppModel.current.latestRedo.collectAsState()
    if (redo == null) return
    var expanded by remember { mutableStateOf(false) }
    Box {
        ActionIcon(R.drawable.ic_entry_actions, stringResource(R.string.more_actions)) { expanded = true }
        DropdownMenu(expanded, onDismissRequest = { expanded = false }) { RedoMenuItem { expanded = false } }
    }
}

@Composable
internal fun appMessageText(message: AppMessage): String = message.quantity?.let {
    androidx.compose.ui.res.pluralStringResource(message.resource, it, *message.formatArgs.toTypedArray())
} ?: stringResource(message.resource, *message.formatArgs.toTypedArray())
