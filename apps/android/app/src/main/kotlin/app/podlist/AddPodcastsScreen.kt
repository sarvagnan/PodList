@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.runtime.saveable.Saver
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.*
import kotlinx.serialization.encodeToString
import app.podlist.domain.ProtocolJson
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.*
import kotlinx.coroutines.*

@Composable
internal fun WelcomeScreen(model: AppModel) {
    var server by rememberSaveable { mutableStateOf(false) }
    BackHandler(server) { server = false }
    if (server) {
        Scaffold(topBar = { TopAppBar(title = { Text(stringResource(R.string.connect_title), Modifier.semantics { heading() }) }, navigationIcon = { ActionIcon(R.drawable.ic_back, stringResource(R.string.back)) { server = false } }) }) { padding ->
            Box(Modifier.padding(padding)) { ServerScreen(model, null) }
        }
    } else Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text(stringResource(R.string.app_name), Modifier.semantics { heading() }, style = MaterialTheme.typography.headlineLarge)
        Text(stringResource(R.string.welcome_phone), style = MaterialTheme.typography.bodyLarge)
        Button(onClick = model::startOnPhone, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.start_phone)) }
        OutlinedButton(onClick = { server = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.connect_to_server)) }
        Text(stringResource(R.string.server_later), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
internal fun AddPodcastsScreen(model: AppModel, session: Session) {
    var input by rememberSaveable { mutableStateOf("") }
    val incomingFeed by model.incomingFeed.collectAsState()
    LaunchedEffect(incomingFeed) { incomingFeed?.let { input = it; model.incomingFeed.compareAndSet(it, null) } }
    var results by rememberSaveable(stateSaver = Saver<List<DirectoryResult>, String>(save = { ProtocolJson.encodeToString(it) }, restore = { ProtocolJson.decodeFromString(it) })) { mutableStateOf(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    val failures = remember { mutableStateMapOf<String, LookupError>() }
    var subscribing by remember { mutableStateOf<Set<String>>(emptySet()) }
    var subscribed by remember { mutableStateOf<Set<String>>(emptySet()) }
    val revision by model.revision.collectAsState()
    val scope = rememberCoroutineScope()
    LaunchedEffect(session, revision) {
        subscribed = withContext(Dispatchers.IO) { session.db.query("SELECT feed_url FROM subscription WHERE unsubscribed_at IS NULL").map { it["feed_url"] as String }.toSet() }
    }
    fun find() {
        if (busy || input.isBlank()) return
        val query = input.trim()
        scope.launch {
            busy = true; error = null; results = emptyList(); failures.clear()
            try {
                results = withContext(Dispatchers.IO) { session.source.search(query).distinctBy { it.feedUrl } }
                if (results.isEmpty()) error = if (isFeedAddress(query)) R.string.bad_feed_address else R.string.no_podcasts_found
            } catch (e: CancellationException) { throw e }
            catch (failure: Exception) { error = lookupErrorResource(classifyLookup(failure)) }
            finally { busy = false }
        }
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        OutlinedTextField(input, onValueChange = { input = it; error = null }, label = { Text(stringResource(R.string.podcast_name_address)) },
            singleLine = true, enabled = !busy, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { find() }), modifier = Modifier.fillMaxWidth().padding(16.dp).then(FocusedInputModifier()))
        Button(onClick = ::find, enabled = input.isNotBlank() && !busy, modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp)) {
            Text(stringResource(R.string.find_podcasts))
        }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth().padding(16.dp).then(ProgressModifier(R.string.find_podcasts)))
        error?.let { Text(stringResource(it), Modifier.padding(16.dp).errorAnnouncement(), color = MaterialTheme.colorScheme.error) }
        LazyColumn(Modifier.weight(1f)) {
            items(results, key = { it.feedUrl }) { result ->
                ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(result.title, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { result.author?.let { Text(it) } },
                    leadingContent = { ArtworkImage(session, result.artworkUrl, direct = true) },
                    trailingContent = {
                        val done = result.feedUrl in subscribed
                        TextButton(onClick = {
                            scope.launch {
                                subscribing = subscribing + result.feedUrl; failures.remove(result.feedUrl)
                                try {
                                    withContext(Dispatchers.IO) { session.source.subscribe(result.feedUrl) }
                                    subscribed = subscribed + result.feedUrl
                                    model.requestSync()
                                    model.offerUnsubscribe(session, result.feedUrl)
                                } catch (e: CancellationException) { throw e }
                                catch (failure: Exception) { failures[result.feedUrl] = classifyLookup(failure) }
                                finally { subscribing = subscribing - result.feedUrl }
                            }
                        }, enabled = !done && result.feedUrl !in subscribing, modifier = Modifier.heightIn(min = 48.dp)) {
                            if (result.feedUrl in subscribing) {
                                CircularProgressIndicator(Modifier.size(20.dp).then(ProgressModifier(R.string.subscribing)), strokeWidth = 2.dp)
                                Spacer(Modifier.width(8.dp))
                            }
                            Text(stringResource(if (done) R.string.subscribed else if (result.feedUrl in subscribing) R.string.subscribing else R.string.subscribe))
                        }
                    })
                failures[result.feedUrl]?.let { failure ->
                    Text(stringResource(R.string.subscribe_failed_named, result.title, stringResource(lookupErrorResource(failure))), Modifier.padding(horizontal = 16.dp, vertical = 8.dp).errorAnnouncement(), color = MaterialTheme.colorScheme.error)
                }
                HorizontalDivider()
            }
        }
    }
}

@Composable
internal fun UnsubscribeButton(session: Session, id: String, title: String, unsubscribed: () -> Unit) {
    val model = LocalAppModel.current
    val scope = rememberCoroutineScope()
    var confirming by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf(false) }
    TextButton(onClick = { confirming = true }, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp).semantics { liveRegion = LiveRegionMode.Polite }) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(20.dp).then(ProgressModifier(R.string.unsubscribing)), strokeWidth = 2.dp)
            Spacer(Modifier.width(8.dp))
        }
        Text(stringResource(if (busy) R.string.unsubscribing else R.string.unsubscribe), color = MaterialTheme.colorScheme.error)
    }
    if (error) Text(stringResource(R.string.unsubscribe_failed), modifier = Modifier.errorAnnouncement(), color = MaterialTheme.colorScheme.error)
    if (confirming) AlertDialog(onDismissRequest = { confirming = false }, title = { Text(stringResource(R.string.m4_unsubscribe_named, title)) },
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
                    unsubscribed()
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) { error = true }
                finally { busy = false }
            }
        }) { Text(stringResource(R.string.unsubscribe)) } })
}

internal fun lookupErrorResource(error: LookupError): Int = when (error) {
    LookupError.Feed -> R.string.bad_feed_address
    LookupError.Offline -> R.string.podcast_offline
    LookupError.Tls -> R.string.podcast_tls
    LookupError.Server -> R.string.podcast_server
    LookupError.Response -> R.string.directory_failed
}
