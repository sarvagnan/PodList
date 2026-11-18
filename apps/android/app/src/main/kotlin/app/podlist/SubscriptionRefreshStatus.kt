package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.PublisherRefreshFailed
import app.podlist.data.Row
import app.podlist.data.SubscriptionNotFound
import app.podlist.data.SyncCompatibilityFailure

@Composable
internal fun SubscriptionRefreshStatus(subscription: Row, session: Session, onRefresh: () -> Unit = {}) {
    val recordedFailure = session.source.server == null && ((subscription["refresh_failures"] as? Number)?.toInt() ?: 0) > 0
    val state by session.feedRefresh.state.collectAsState()
    val target = FeedRefreshTarget.Podcast(subscription["id"] as String)
    val result = (state as? FeedRefreshState.Finished)?.takeIf { it.target == target }
    val failure = result?.takeUnless { it.succeeded }
    if (failure == null && (!recordedFailure || result?.succeeded == true)) return
    val model = LocalAppModel.current
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        if (failure != null) FeedRefreshErrors(failure)
        else InlineError(stringResource(R.string.refresh_failed))
        (subscription["refreshed_at"] as? Number)?.toLong()?.let { Text(stringResource(R.string.refreshed_at, dateTime(it)), style = MaterialTheme.typography.bodySmall) }
        ContentTextButton(enabled = state !is FeedRefreshState.Refreshing && failure?.refreshError !is SubscriptionNotFound,
            onClick = { onRefresh(); model.refreshFeeds(session, target) }) {
            Text(stringResource(if ((state as? FeedRefreshState.Refreshing)?.target == target) R.string.refreshing_podcast else R.string.retry_refresh))
        }
    }
}

@Composable
internal fun FeedRefreshErrors(result: FeedRefreshState.Finished) {
    val summary = result.summary
    if (summary != null && summary.failed > 0) {
        InlineError(pluralStringResource(R.plurals.refresh_feeds_partial, summary.checked, summary.failed, summary.checked))
    }
    result.refreshError?.let { error ->
        val resource = when {
            error is SubscriptionNotFound -> R.string.refresh_subscription_missing
            error is PublisherRefreshFailed -> R.string.refresh_publisher_failed
            result.target == FeedRefreshTarget.All -> R.string.refresh_feeds_failed
            else -> R.string.refresh_failed
        }
        InlineError(stringResource(resource))
    }
    result.syncError?.let { error ->
        val resource = when (error) {
            is SyncCompatibilityFailure -> if (error._tag == "UpdateRequired") R.string.sync_update_required else R.string.sync_server_update_required
            else -> R.string.refresh_feeds_sync_failed
        }
        InlineError(stringResource(resource))
    }
}

@Composable
internal fun UndoAction() {
    val model = LocalAppModel.current
    val undo by model.latestUndo.collectAsState()
    val description by model.undoDescription.collectAsState()
    val snackbarUndo = LocalSheetFeedback.current?.visibleSnackbar?.currentSnackbarData?.visuals?.actionLabel == stringResource(R.string.undo)
    // Reserve the slot even before the first edit and while snackbar Undo owns the command.
    // No invisible clickable/focusable node is left in the accessibility tree.
    if (undo != null && !snackbarUndo) ActionIcon(R.drawable.ic_undo, description?.let { stringResource(R.string.undo_specific, appMessageText(it)) } ?: stringResource(R.string.undo)) { undo?.invoke() }
    else Spacer(Modifier.size(48.dp).clearAndSetSemantics {})
}

@Composable
internal fun appMessageText(message: AppMessage): String = message.quantity?.let {
    androidx.compose.ui.res.pluralStringResource(message.resource, it, *message.formatArgs.toTypedArray())
} ?: stringResource(message.resource, *message.formatArgs.toTypedArray())
