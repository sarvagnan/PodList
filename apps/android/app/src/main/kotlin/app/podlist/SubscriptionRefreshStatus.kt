package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
internal fun EditHistoryMenu() {
    val model = LocalAppModel.current
    val undo by model.latestUndo.collectAsState()
    val redo by model.latestRedo.collectAsState()
    val undoDescription by model.undoDescription.collectAsState()
    val redoDescription by model.redoDescription.collectAsState()
    val snackbarUndo = LocalSheetFeedback.current?.snackbar?.currentSnackbarData?.visuals?.actionLabel == stringResource(R.string.undo)
    if (undo != null && !snackbarUndo) ActionIcon(R.drawable.ic_undo, undoDescription?.let { stringResource(R.string.undo_specific, appMessageText(it)) } ?: stringResource(R.string.undo)) { undo?.invoke() }
    if (redo != null) ActionIcon(R.drawable.ic_redo, redoDescription?.let { stringResource(R.string.redo_specific, appMessageText(it)) } ?: stringResource(R.string.m4_redo)) { redo?.invoke() }
}

@Composable
internal fun appMessageText(message: AppMessage): String = message.quantity?.let {
    androidx.compose.ui.res.pluralStringResource(message.resource, it, *message.formatArgs.toTypedArray())
} ?: stringResource(message.resource, *message.formatArgs.toTypedArray())
