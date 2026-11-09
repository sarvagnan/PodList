package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row

@Composable
internal fun SubscriptionRefreshStatus(subscription: Row, session: Session) {
    if (session.source.server != null || (subscription["refresh_failures"] as? Number)?.toInt()?.let { it > 0 } != true) return
    val model = LocalAppModel.current
    val refreshing by model.refreshing.collectAsState()
    val id = subscription["id"] as String
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text(stringResource(R.string.refresh_failed), modifier = Modifier.errorAnnouncement(), color = MaterialTheme.colorScheme.error)
        (subscription["refreshed_at"] as? Number)?.toLong()?.let { Text(stringResource(R.string.refreshed_at, dateTime(it)), style = MaterialTheme.typography.bodySmall) }
        TextButton(enabled = id !in refreshing, onClick = { model.refreshSubscription(id) }) {
            Text(stringResource(if (id in refreshing) R.string.refreshing_podcast else R.string.retry_refresh))
        }
    }
}

@Composable
internal fun EditHistoryMenu() {
    val model = LocalAppModel.current
    val undo by model.latestUndo.collectAsState()
    val redo by model.latestRedo.collectAsState()
    if (undo != null) ActionIcon(R.drawable.ic_undo, stringResource(R.string.undo)) { undo?.invoke() }
    if (redo != null) ActionIcon(R.drawable.ic_redo, stringResource(R.string.m4_redo)) { redo?.invoke() }
}
