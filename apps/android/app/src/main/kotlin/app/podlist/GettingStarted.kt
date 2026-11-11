package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.hideGettingStarted
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
internal fun GettingStarted(data: ScreenData, session: Session, open: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var hidden by remember(data.gettingStarted) { mutableStateOf(false) }
    val visible = data.gettingStarted && !hidden
    if (!visible) return
    val hide = { hidden = true; scope.launch { withContext(Dispatchers.IO) { session.db.hideGettingStarted(); session.db.notifyChanged() } }; Unit }
    Surface(Modifier.fillMaxWidth().padding(16.dp), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.m4_getting_started), Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleMedium)
                ContentTextButton(onClick = hide) { Text(stringResource(R.string.m4_hide)) }
            }
            listOf(R.string.m4_step_podcasts to R.string.m4_step_podcasts_help, R.string.m4_step_views to R.string.m4_step_views_help, R.string.m4_step_playlists to R.string.m4_step_playlists_help).forEachIndexed { index, (title, help) ->
                Row {
                    // These numbered points explain the app; they have no completion state.
                    Box(Modifier.size(24.dp).background(MaterialTheme.colorScheme.surfaceContainerHighest, CircleShape), contentAlignment = Alignment.Center) {
                        Text((index + 1).toString(), style = MaterialTheme.typography.labelMedium)
                    }
                    Column(Modifier.padding(start = 12.dp)) { Text(stringResource(title), style = MaterialTheme.typography.titleSmall); Text(stringResource(help), style = MaterialTheme.typography.bodyMedium) }
                }
            }
            FilledTonalButton(onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) }
        }
    }
}
