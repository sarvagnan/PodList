package app.podlist

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
    ElevatedCard(Modifier.fillMaxWidth().padding(16.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.m4_welcome), style = MaterialTheme.typography.titleLarge)
            listOf(R.string.m4_step_podcasts to R.string.m4_step_podcasts_help, R.string.m4_step_views to R.string.m4_step_views_help, R.string.m4_step_playlists to R.string.m4_step_playlists_help).forEachIndexed { index, (title, help) ->
                Row { Checkbox(checked = steps and (1 shl index) != 0, onCheckedChange = null); Column(Modifier.padding(start = 12.dp)) { Text(stringResource(title), style = MaterialTheme.typography.titleSmall); Text(stringResource(help), style = MaterialTheme.typography.bodySmall) } }
            }
            Row {
                Button(onClick = { open("add-podcasts") }) { Text(stringResource(R.string.add_podcasts)) }
                TextButton(onClick = { visible = false; scope.launch { withContext(Dispatchers.IO) { session.db.setMeta("gettingStartedHidden", "true") } } }) { Text(stringResource(R.string.m4_hide)) }
            }
        }
    }
}
