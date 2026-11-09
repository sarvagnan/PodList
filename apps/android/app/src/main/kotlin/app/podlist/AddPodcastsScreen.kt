package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.*
import kotlinx.coroutines.*

/** First-run proposal: deliberately small until owner review. */
@Composable
internal fun WelcomeScreen(model: AppModel) {
    var server by rememberSaveable { mutableStateOf(false) }
    BackHandler(server) { server = false }
    if (server) {
        Column(Modifier.fillMaxSize().safeDrawingPadding()) {
            TextButton(onClick = { server = false }, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.back)) }
            ServerScreen(model, null)
        }
    } else Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineLarge)
        Text(stringResource(R.string.welcome_phone), style = MaterialTheme.typography.bodyLarge)
        Button(onClick = model::startOnPhone, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.start_phone)) }
        OutlinedButton(onClick = { server = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.connect_to_server)) }
        Text(stringResource(R.string.server_later), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
internal fun AddPodcastsScreen(model: AppModel, session: Session) {
    var input by rememberSaveable { mutableStateOf("") }
    var results by remember { mutableStateOf<List<DirectoryResult>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var subscribing by remember { mutableStateOf<Set<String>>(emptySet()) }
    var subscribed by remember { mutableStateOf<Set<String>>(emptySet()) }
    val revision by model.revision.collectAsState()
    val scope = rememberCoroutineScope()
    LaunchedEffect(session, revision) {
        subscribed = withContext(Dispatchers.IO) { session.db.query("SELECT feed_url FROM subscription WHERE unsubscribed_at IS NULL").map { it["feed_url"] as String }.toSet() }
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        OutlinedTextField(input, onValueChange = { input = it; error = null }, label = { Text(stringResource(R.string.podcast_name_address)) },
            singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth().padding(16.dp))
        Button(onClick = {
            val query = input.trim()
            scope.launch {
                busy = true; error = null; results = emptyList()
                try {
                    results = withContext(Dispatchers.IO) { session.source.search(query).distinctBy { it.feedUrl } }
                    if (results.isEmpty()) error = if (isFeedAddress(query)) R.string.bad_feed_address else R.string.no_podcasts_found
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) { error = if (isFeedAddress(query)) R.string.bad_feed_address else R.string.directory_failed }
                finally { busy = false }
            }
        }, enabled = input.isNotBlank() && !busy, modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp)) {
            Text(stringResource(R.string.find_podcasts))
        }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth().padding(16.dp))
        error?.let { Text(stringResource(it), Modifier.padding(16.dp), color = MaterialTheme.colorScheme.error) }
        LazyColumn(Modifier.weight(1f)) {
            items(results, key = { it.feedUrl }) { result ->
                ListItem(headlineContent = { Text(result.title) }, supportingContent = { result.author?.let { Text(it) } },
                    leadingContent = { ArtworkImage(session, result.artworkUrl, direct = true) },
                    trailingContent = {
                        val done = result.feedUrl in subscribed
                        TextButton(onClick = {
                            scope.launch {
                                subscribing = subscribing + result.feedUrl; error = null
                                try {
                                    withContext(Dispatchers.IO) { session.source.subscribe(result.feedUrl) }
                                    subscribed = subscribed + result.feedUrl
                                    model.requestSync()
                                } catch (e: CancellationException) { throw e }
                                catch (_: Exception) { error = R.string.subscribe_failed }
                                finally { subscribing = subscribing - result.feedUrl }
                            }
                        }, enabled = !done && result.feedUrl !in subscribing, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(stringResource(if (done) R.string.subscribed else R.string.subscribe))
                        }
                    })
                HorizontalDivider()
            }
        }
    }
}

@Composable
internal fun UnsubscribeButton(session: Session, id: String) {
    val model = LocalAppModel.current
    val scope = rememberCoroutineScope()
    var confirming by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf(false) }
    TextButton(onClick = { confirming = true }, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.unsubscribe)) }
    if (error) Text(stringResource(R.string.unsubscribe_failed), color = MaterialTheme.colorScheme.error)
    if (confirming) AlertDialog(onDismissRequest = { confirming = false }, title = { Text(stringResource(R.string.unsubscribe)) },
        text = { Text(stringResource(R.string.unsubscribe_explanation)) },
        dismissButton = { TextButton(onClick = { confirming = false }) { Text(stringResource(R.string.cancel)) } },
        confirmButton = { TextButton(onClick = {
            confirming = false
            scope.launch {
                busy = true; error = false
                try {
                    val feed = withContext(Dispatchers.IO) {
                        val url = session.db.query("SELECT feed_url FROM subscription WHERE id = ?", listOf(id)).single()["feed_url"] as String
                        session.source.unsubscribe(id)
                        url
                    }
                    model.requestSync()
                    model.offerResubscribe(session, feed)
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) { error = true }
                finally { busy = false }
            }
        }) { Text(stringResource(R.string.unsubscribe)) } })
}
