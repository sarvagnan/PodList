package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.updateGettingStartedProgress
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
internal fun GettingStarted(data: ScreenData, session: Session, open: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val model = LocalAppModel.current
    val revision by model.revision.collectAsState()
    var visible by remember(session) { mutableStateOf(false) }
    var steps by remember { mutableIntStateOf(0) }
    LaunchedEffect(revision, data.hasLibrary, data.hasState) {
        if (!data.hasLibrary || !data.hasState) return@LaunchedEffect
        val result = withContext(Dispatchers.IO) { session.db.transaction {
            updateGettingStartedProgress()
            (getMeta("gettingStartedBegun") == "true" && getMeta("gettingStartedHidden") != "true") to (getMeta("gettingStartedSteps")?.toIntOrNull() ?: 0)
        } }
        visible = result.first; steps = result.second
    }
    if (!visible) return
    val hide = { visible = false; scope.launch { withContext(Dispatchers.IO) { session.db.setMeta("gettingStartedHidden", "true") } }; Unit }
    Surface(Modifier.fillMaxWidth().padding(16.dp), shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.m4_getting_started), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                TextButton(onClick = hide) { Text(stringResource(R.string.m4_hide)) }
            }
            listOf(R.string.m4_step_podcasts to R.string.m4_step_podcasts_help, R.string.m4_step_views to R.string.m4_step_views_help, R.string.m4_step_playlists to R.string.m4_step_playlists_help).forEachIndexed { index, (title, help) ->
                val done = steps and (1 shl index) != 0
                Row {
                    // A number, not an empty box: these steps tick themselves and can't be tapped.
                    Box(Modifier.size(24.dp).background(if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHighest, CircleShape), contentAlignment = Alignment.Center) {
                        if (done) Icon(painterResource(R.drawable.ic_check), stringResource(R.string.m4_step_done), Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onPrimary)
                        else Text((index + 1).toString(), style = MaterialTheme.typography.labelMedium)
                    }
                    Column(Modifier.padding(start = 12.dp)) { Text(stringResource(title), style = MaterialTheme.typography.titleSmall); Text(stringResource(help), style = MaterialTheme.typography.bodySmall) }
                }
            }
            if (steps and 1 == 0) Button(onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) }
        }
    }
}
