package app.podlist

import android.Manifest
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.material3.*
import androidx.compose.ui.res.stringResource

internal sealed interface IncomingContent {
    data class Feed(val address: String) : IncomingContent
    data class Opml(val uri: Uri) : IncomingContent
}

internal fun incomingContent(intent: Intent): IncomingContent? {
    if (intent.action !in listOf(Intent.ACTION_SEND, Intent.ACTION_VIEW)) return null
    val stream = if (intent.action == Intent.ACTION_SEND) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java) else intent.data
    if (stream?.scheme in listOf("content", "file")) return IncomingContent.Opml(stream!!)
    val address = (if (intent.action == Intent.ACTION_SEND) intent.getStringExtra(Intent.EXTRA_TEXT) else intent.dataString)?.trim() ?: return null
    val uri = Uri.parse(address)
    return if (uri.scheme in listOf("http", "https") && !uri.host.isNullOrBlank()) IncomingContent.Feed(address) else null
}

@Composable
internal fun DownloadNotificationPermission(model: AppModel) {
    val request by model.downloadNotificationRequest.collectAsState()
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    var explaining by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(request) {
        if (request?.take() != null) {
            model.downloadNotificationRequest.compareAndSet(request, null)
            explaining = true
        }
    }
    if (explaining) AlertDialog(
        onDismissRequest = { explaining = false },
        text = { Text(stringResource(R.string.download_notification_reason)) },
        confirmButton = { TextButton(contentPadding = PaddingValues.Zero, onClick = { explaining = false; launcher.launch(Manifest.permission.POST_NOTIFICATIONS) }) { Text(stringResource(R.string.continue_action)) } },
        dismissButton = { TextButton(contentPadding = PaddingValues.Zero, onClick = { explaining = false }) { Text(stringResource(R.string.bring_over_not_now)) } }
    )
}
