@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import app.podlist.data.*
import app.podlist.domain.ProtocolJson
import kotlinx.coroutines.*
import kotlinx.serialization.encodeToString
import java.net.URLDecoder
import java.net.URLEncoder

internal fun podcastRoute(result: DirectoryResult) = "podcast:" + URLEncoder.encode(ProtocolJson.encodeToString(result), "UTF-8")
internal fun podcastFromRoute(route: String): DirectoryResult = ProtocolJson.decodeFromString(URLDecoder.decode(route.substringAfter(':'), "UTF-8"))

@Composable
internal fun PodcastPageScreen(result: DirectoryResult, data: ScreenData, session: Session, fromSearch: Boolean, open: (String) -> Unit, back: () -> Unit) {
    val model = LocalAppModel.current
    val scope = rememberCoroutineScope()
    val add = LocalAddEpisode.current
    val started = LocalPlaybackStarted.current
    val subscription = data.subscriptions.find { it["feed_url"] == result.feedUrl }
    val subscribed = podcastIsSubscribed(subscription)
    val id = subscription?.get("id") as? String
    val revision by model.revision.collectAsState()
    var localRows by remember { mutableStateOf<List<Row>>(emptyList()) }
    var localLoaded by remember { mutableStateOf(false) }
    var feed by remember { mutableStateOf<ParsedFeed?>(null) }
    var loading by remember { mutableStateOf(false) }
    var failure by remember { mutableStateOf<LookupError?>(null) }
    var actionFailure by remember { mutableStateOf<LookupError?>(null) }
    var busy by remember { mutableStateOf(false) }
    var changingSubscription by remember { mutableStateOf(false) }
    var confirming by remember { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var expanded by rememberSaveable { mutableStateOf(false) }
    var inspectingGuid by rememberSaveable { mutableStateOf<String?>(null) }
    val list = rememberLazyListState()
    LaunchedEffect(id, revision) {
        localRows = withContext(Dispatchers.IO) { id?.let { session.db.podcastEpisodes(it) }.orEmpty() }
        localLoaded = true
    }
    fun load() {
        scope.launch {
            loading = true; failure = null
            try { feed = withContext(Dispatchers.IO) { session.source.readPodcast(result.feedUrl) } }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) { failure = classifyLookup(error) }
            finally { loading = false }
        }
    }
    // Library opens read local data, including retained rows after Unsubscribe. Search may need a feed.
    LaunchedEffect(result.feedUrl) { if (fromSearch && !subscribed) load() }
    LaunchedEffect(localLoaded, subscribed, localRows.isEmpty()) {
        if (localLoaded && !subscribed && localRows.isEmpty() && feed == null && !loading && failure == null) load()
    }
    val rows = feed?.let { remote ->
        val stored = localRows.associateBy { it["guid"] }
        val remoteRows = podcastEpisodeRows(remote)
        remoteRows.map { stored[it["guid"]] ?: it } + localRows.filter { local -> remoteRows.none { it["guid"] == local["guid"] } }
    } ?: localRows
    val filtered = filterPodcastEpisodes(rows, query)
    val count = podcastEpisodeCount(rows, query)
    val title = feed?.title ?: subscription?.get("title") as? String ?: result.title
    val author = feed?.author ?: subscription?.get("author") as? String ?: result.author
    val artwork = feed?.artworkUrl ?: subscription?.get("artwork_url") as? String ?: result.artworkUrl
    val description = feed?.description ?: subscription?.get("description") as? String
    fun resolve(row: Row, action: (String) -> Unit) {
        if (busy) return
        scope.launch {
            busy = true; actionFailure = null
            try {
                val episode = withContext(Dispatchers.IO) {
                    localRows.find { it["guid"] == row["guid"] }?.get("id") as? String
                        ?: session.source.bringEpisode(result.feedUrl, row["guid"] as String)
                }
                model.requestSync()
                action(episode)
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) { actionFailure = classifyLookup(error) }
            finally { busy = false }
        }
    }
    fun changeSubscription(remove: Boolean) {
        if (busy) return
        scope.launch {
            busy = true; changingSubscription = true; actionFailure = null
            try {
                withContext(Dispatchers.IO) {
                    if (remove) session.source.unsubscribe(requireNotNull(id)) else session.source.subscribe(result.feedUrl)
                }
                model.requestSync()
                model.offerSubscriptionHistory(session, listOf(result.feedUrl), subscribe = remove,
                    AppMessage(if (remove) R.string.unsubscribed else R.string.subscribed), reveal = false)
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) { actionFailure = classifyLookup(error) }
            finally { busy = false; changingSubscription = false }
        }
    }
    val inspected = rows.find { it["guid"] == inspectingGuid }
    if (inspected != null) {
        BackHandler { inspectingGuid = null }
        Scaffold(topBar = {
            TopAppBar(title = { Text(stringResource(R.string.episode)) }, navigationIcon = {
                ActionIcon(R.drawable.ic_back, stringResource(R.string.back)) { inspectingGuid = null }
            })
        }) { padding ->
            LazyColumn(Modifier.fillMaxSize().padding(padding)) {
                item { Box(Modifier.padding(16.dp)) { ArtworkImage(session, inspected["artwork_url"] as? String ?: artwork, size = 224.dp, direct = true) } }
                item {
                    EpisodeRow(inspected, data, session, showArtwork = false, showActions = !busy,
                        addAction = { resolve(inspected, add) }, playAction = { resolve(inspected) { model.playNow(it); started() } })
                }
                item { actionFailure?.let { Text(stringResource(podcastErrorResource(it)), Modifier.padding(16.dp).errorAnnouncement(), color = MaterialTheme.colorScheme.error) } }
                item { Text(showNotes((inspected["description"] as? String).orEmpty()), Modifier.padding(16.dp)) }
            }
        }
        return
    }
    val selection = LocalEpisodeSelection.current.takeIf { feed == null }
    SideEffect {
        selection?.order = filtered.map { it["id"] as String }
        if (selection != null) selection.ids = selection.ids.intersect(selection.order.toSet())
    }
    val pullThreshold = with(LocalDensity.current) { 64.dp.toPx() }
    LaunchedEffect(expanded, loading) { if (expanded || loading) list.animateScrollToItem(0) }
    val pull = remember(list, pullThreshold) {
        object : NestedScrollConnection {
            var distance = 0f
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (available.y < 0) { expanded = false; distance = 0f }
                return Offset.Zero
            }
            override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput && !list.canScrollBackward && available.y > 0) {
                    distance += available.y
                    if (distance > pullThreshold) expanded = true
                }
                return Offset.Zero
            }
        }
    }
    val detailsLabel = stringResource(R.string.podcast_show_details)
    Scaffold(topBar = {
        if (selection != null && selection.ids.isNotEmpty()) SelectionToolbar(selection, data.copy(episodes = rows), session, "subscription:$id")
        else TopAppBar(title = { Text(title, Modifier.semantics { heading() }, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, navigationIcon = {
            ActionIcon(R.drawable.ic_back, stringResource(R.string.back), action = back)
        }, actions = {
            if (subscribed) {
                IconButton(onClick = { open("subscription-settings:$id") }, enabled = !busy) {
                    Icon(painterResource(R.drawable.ic_settings), stringResource(R.string.m4_subscription_settings))
                }
                IconButton(onClick = { confirming = true }, enabled = !busy, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
                    if (changingSubscription) CircularProgressIndicator(Modifier.size(24.dp).then(ProgressModifier(R.string.unsubscribing)), strokeWidth = 2.dp)
                    else Icon(painterResource(R.drawable.ic_check), stringResource(R.string.podcast_subscribed_unsubscribe, title), tint = colorResource(R.color.on_subscribed), modifier = Modifier.background(colorResource(R.color.subscribed), CircleShape).padding(4.dp).size(24.dp))
                }
            } else Button(onClick = { changeSubscription(false) }, enabled = !busy, modifier = Modifier.padding(end = 8.dp)) {
                if (changingSubscription) CircularProgressIndicator(Modifier.size(20.dp).then(ProgressModifier(R.string.subscribing)), strokeWidth = 2.dp)
                else Text(stringResource(R.string.subscribe))
            }
        })
    }, contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)) { padding ->
        LazyColumn(state = list, modifier = Modifier.fillMaxSize().padding(padding).nestedScroll(pull).semantics {
            customActions = listOf(CustomAccessibilityAction(detailsLabel) { expanded = !expanded; true })
        }) {
            item(key = "about") {
                if (expanded || loading) Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    ArtworkImage(session, artwork, size = 120.dp, direct = true)
                    if (expanded) description?.let { Text(showNotes(it)) }
                }
            }
            item(key = "header") {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    author?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    if (subscribed && subscription != null) SubscriptionRefreshStatus(subscription, session)
                    OutlinedTextField(query, onValueChange = { query = it }, singleLine = true, label = { Text(stringResource(R.string.podcast_search_episodes)) }, modifier = Modifier.fillMaxWidth())
                    Text(if (count.filtered) pluralStringResource(R.plurals.podcast_filtered_count, count.total, count.shown, count.total)
                        else pluralStringResource(R.plurals.episode_count, count.total, count.total), style = MaterialTheme.typography.titleSmall, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                    if (busy && !changingSubscription) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(R.string.podcast_bringing_episode)))
                    if (loading || !localLoaded) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(R.string.podcast_loading)))
                    failure?.let {
                        Text(stringResource(R.string.podcast_load_failed), Modifier.errorAnnouncement(), color = MaterialTheme.colorScheme.error)
                        Text(stringResource(podcastErrorResource(it)), color = MaterialTheme.colorScheme.error)
                        TextButton(onClick = ::load, enabled = !loading) { Text(stringResource(R.string.podcast_try_again)) }
                    }
                    actionFailure?.let { Text(stringResource(podcastErrorResource(it)), Modifier.errorAnnouncement(), color = MaterialTheme.colorScheme.error) }
                }
            }
            if (filtered.isEmpty() && !loading && localLoaded && failure == null) item { EmptyMessage(if (query.isBlank()) R.string.no_episodes else R.string.no_matches) }
            items(filtered, key = { it["guid"] as String }) { row ->
                CompositionLocalProvider(LocalEpisodeSelection provides selection) {
                    EpisodeRow(row, data, session, showActions = !busy,
                        addAction = { resolve(row, add) },
                        playAction = { resolve(row) { model.playNow(it); started() } }) {
                        val stored = localRows.find { it["guid"] == row["guid"] }
                        if (stored != null) open("episode:${stored["id"]}") else inspectingGuid = row["guid"] as String
                    }
                }
            }
        }
    }
    if (confirming) AlertDialog(onDismissRequest = { confirming = false }, title = { Text(stringResource(R.string.m4_unsubscribe_named, title)) },
        dismissButton = { TextButton(onClick = { confirming = false }) { Text(stringResource(R.string.cancel)) } },
        confirmButton = { TextButton(onClick = { confirming = false; changeSubscription(true) }) { Text(stringResource(R.string.unsubscribe)) } })
}

private fun podcastErrorResource(error: LookupError): Int = when (error) {
    LookupError.Feed -> R.string.podcast_invalid_feed
    LookupError.Response -> R.string.podcast_invalid_response
    else -> lookupErrorResource(error)
}
