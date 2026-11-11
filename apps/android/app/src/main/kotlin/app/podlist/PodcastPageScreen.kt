@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import android.content.Context
import android.os.SystemClock
import android.view.ViewConfiguration
import android.view.accessibility.AccessibilityManager
import androidx.activity.compose.BackHandler
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.podlist.domain.TwoTapConfirmation
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import app.podlist.domain.PodcastBrowsing
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import app.podlist.data.*
import app.podlist.domain.ProtocolJson
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString
import java.net.URLDecoder
import java.net.URLEncoder

internal fun podcastRoute(result: DirectoryResult) = "podcast:" + URLEncoder.encode(ProtocolJson.encodeToString(result), "UTF-8")
internal fun podcastFromRoute(route: String): DirectoryResult = ProtocolJson.decodeFromString(URLDecoder.decode(route.substringAfter(':'), "UTF-8"))

@Composable
internal fun PodcastPageScreen(result: DirectoryResult, data: ScreenData, session: Session, fromSearch: Boolean, open: (String) -> Unit, back: () -> Unit) {
    val model = LocalAppModel.current
    val context = LocalContext.current
    var shareMenu by remember { mutableStateOf(false) }
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
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
    var retryAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    val episodeFailures = remember(result.feedUrl) { mutableStateMapOf<String, Pair<LookupError, () -> Unit>>() }
    var revealGuid by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val subscriptionFailures by model.subscriptionFailures.collectAsState()
    val subscriptionFailure = subscriptionFailures[result.feedUrl]
    val transitions by model.subscriptionTransitions.collectAsState()
    val transition = transitions[result.feedUrl]
    val changingSubscription = transition?.pending == true
    val shownSubscribed = transition?.target ?: subscribed
    LaunchedEffect(subscribed, transition) {
        if (transition?.pending == false && transition.target == subscribed) model.subscriptionTransitions.value -= result.feedUrl
    }
    var confirmation by remember(result.feedUrl) { mutableStateOf(TwoTapConfirmation()) }
    val armed = confirmation.isArmed
    val accessibility = LocalContext.current.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(confirmation) {
        if (confirmation.isArmed) {
            delay((confirmation.expiresAtMillis - SystemClock.uptimeMillis()).coerceAtLeast(0))
            confirmation = confirmation.disarm()
        }
    }
    LaunchedEffect(subscribed) { if (!subscribed) confirmation = confirmation.disarm() }
    DisposableEffect(lifecycle, result.feedUrl) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) confirmation = confirmation.disarm()
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer); confirmation = confirmation.disarm() }
    }
    var controlBounds by remember { mutableStateOf(Rect.Zero) }
    var backBounds by remember { mutableStateOf(Rect.Zero) }
    var pageOrigin by remember { mutableStateOf(Offset.Zero) }
    // Observe downs before descendants consume them, without consuming or delaying their gestures.
    val disarmOnOtherTap = Modifier.onGloballyPositioned { pageOrigin = it.positionInWindow() }
        .pointerInput(result.feedUrl) {
            awaitPointerEventScope {
                while (true) {
                    val event = awaitPointerEvent(PointerEventPass.Initial)
                    if (confirmation.isArmed && event.changes.any {
                        it.pressed && !it.previousPressed && !controlBounds.contains(it.position + pageOrigin)
                            && !backBounds.contains(it.position + pageOrigin)
                    }) confirmation = confirmation.disarm()
                }
            }
        }
    fun pageBack() { if (confirmation.isArmed) confirmation = confirmation.disarm() else back() }
    fun openPage(route: String) { confirmation = confirmation.disarm(); open(route) }
    val browsing = LocalBrowsingState.current
    val initialBrowsing = remember(result.feedUrl) { browsing?.context?.podcasts?.get(result.feedUrl) ?: PodcastBrowsing() }
    var query by rememberSaveable(result.feedUrl) { mutableStateOf(initialBrowsing.query) }
    var expanded by rememberSaveable(result.feedUrl) { mutableStateOf(initialBrowsing.expanded) }
    LaunchedEffect(query, expanded) {
        confirmation = confirmation.disarm()
        if (browsing != null) browsing.context = browsing.context.copy(podcasts = browsing.context.podcasts + (result.feedUrl to PodcastBrowsing(query, expanded)))
    }
    var inspectingGuid by rememberSaveable { mutableStateOf<String?>(null) }
    var resolvingGuid by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id, revision) {
        localRows = withContext(Dispatchers.IO) { id?.let { session.db.podcastEpisodes(it) }.orEmpty() }
        localLoaded = true
    }
    fun load() {
        confirmation = confirmation.disarm()
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
        val remoteRows = podcastEpisodeRows(remote).map { it + ("feed_url" to result.feedUrl) }
        remoteRows.map { stored[it["guid"]] ?: it } + localRows.filter { local -> remoteRows.none { it["guid"] == local["guid"] } }
    } ?: localRows
    val filtered = filterPodcastEpisodes(rows, query)
    val count = podcastEpisodeCount(rows, query)
    val list = rememberBrowsingListState("podcast:${result.feedUrl}", listOf("header") + filtered.map { it["guid"] as String }, ready = localLoaded && !loading && (subscribed || feed != null || localRows.isNotEmpty()))
    LaunchedEffect(list) {
        snapshotFlow { list.isScrollInProgress }.collect { if (it) confirmation = confirmation.disarm() }
    }
    LaunchedEffect(revealGuid, filtered) {
        val guid = revealGuid ?: return@LaunchedEffect
        val index = filtered.indexOfFirst { it["guid"] == guid }
        if (index >= 0) { list.animateScrollToItem(index + 1); revealGuid = null }
    }
    val title = feed?.title ?: subscription?.get("title") as? String ?: result.title
    val author = feed?.author ?: subscription?.get("author") as? String ?: result.author
    val artwork = feed?.artworkUrl ?: subscription?.get("artwork_url") as? String ?: result.artworkUrl
    val description = feed?.description ?: subscription?.get("description") as? String
    fun resolve(row: Row, action: (String) -> Unit) {
        confirmation = confirmation.disarm()
        if (busy) return
        scope.launch {
            busy = true; resolvingGuid = row["guid"] as String
            try {
                val episode = withContext(Dispatchers.IO) {
                    localRows.find { it["guid"] == row["guid"] }?.get("id") as? String
                        ?: session.source.bringEpisode(result.feedUrl, row["guid"] as String)
                }
                model.requestSync()
                action(episode)
                episodeFailures.remove(row["guid"] as String)
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) {
                val guid = row["guid"] as String
                val retry = { resolve(row, action) }
                episodeFailures[guid] = classifyLookup(error) to retry
                if (inspectingGuid != guid && list.layoutInfo.visibleItemsInfo.none { it.key == guid }) {
                    model.messages.trySend(AppMessage(R.string.podcast_episode_add_failed, R.string.retry_episode_action,
                        formatArgs = listOf(row["title"] as String), undo = {
                            if (filterPodcastEpisodes(listOf(row), query).isEmpty()) query = ""
                            inspectingGuid = null
                            revealGuid = guid
                            scope.launch {
                                snapshotFlow { busy }.first { !it }
                                if (episodeFailures.containsKey(guid)) retry()
                            }
                        }))
                }
            }
            finally { busy = false; resolvingGuid = null }
        }
    }
    fun changeSubscription(remove: Boolean) {
        confirmation = confirmation.disarm()
        if (busy || model.subscriptionTransitions.value[result.feedUrl]?.pending == true) return
        model.subscriptionFailures.value -= result.feedUrl
        model.subscriptionTransitions.value += result.feedUrl to AppModel.SubscriptionTransition(!remove)
        scope.launch {
            busy = true; actionFailure = null
            try {
                withContext(Dispatchers.IO) {
                    if (remove) session.source.unsubscribe(requireNotNull(id)) else session.source.subscribe(result.feedUrl)
                }
                model.subscriptionTransitions.value += result.feedUrl to AppModel.SubscriptionTransition(!remove, pending = false)
                model.requestSync()
                model.offerSubscriptionHistory(session, listOf(result.feedUrl), subscribe = remove,
                    AppMessage(if (remove) R.string.unsubscribed_message else R.string.subscribed_message, formatArgs = listOf(title)), reveal = false)
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) {
                model.subscriptionTransitions.value -= result.feedUrl
                actionFailure = classifyLookup(error)
                retryAction = { changeSubscription(remove) }
            }
            finally {
                busy = false
                if (model.subscriptionTransitions.value[result.feedUrl]?.pending == true) model.subscriptionTransitions.value -= result.feedUrl
            }
        }
    }
    val collapsingTitle = remember(result.feedUrl) { CollapsingTitle() }
    val inspected = rows.find { it["guid"] == inspectingGuid }
    if (inspected != null) {
        BackHandler { inspectingGuid = null }
        val episodeScroll = TopAppBarDefaults.pinnedScrollBehavior()
        val episodeTitle = remember(inspectingGuid) { CollapsingTitle() }
        Scaffold(modifier = Modifier.nestedScroll(episodeScroll.nestedScrollConnection), topBar = {
            PodListTopAppBar(scrollBehavior = episodeScroll, titleVisible = !episodeTitle.headlineVisible, title = { Text(if (episodeTitle.headlineVisible) "" else inspected["title"] as? String ?: "", maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, navigationIcon = {
                ActionIcon(R.drawable.ic_back, stringResource(R.string.back)) { inspectingGuid = null }
            }, actions = { EpisodeOverflow(data.copy(episodes = listOf(inspected)), session) })
        }) { padding ->
            Box(Modifier.fillMaxSize().padding(padding)) {
                CompositionLocalProvider(LocalCollapsingTitle provides episodeTitle) {
                    EpisodeDetail(data.copy(episodes = listOf(inspected)), session, resolve = if (localRows.any { it["id"] == inspected["id"] }) null else ::resolve,
                        actionsEnabled = !busy, actionBusy = resolvingGuid == inspected["guid"], actionError = {
                            episodeFailures[inspected["guid"]]?.let { (error, retry) ->
                                EpisodeActionFailure(inspected["title"] as String, error, !busy, retry)
                            }
                        })
                }
            }
        }
        return
    }
    BackHandler(enabled = armed) { confirmation = confirmation.disarm() }
    val selection = LocalEpisodeSelection.current.takeIf { feed == null }
    LaunchedEffect(selection?.ids) {
        if (selection?.ids?.isNotEmpty() == true) confirmation = confirmation.disarm()
    }
    SideEffect {
        selection?.order = filtered.map { it["id"] as String }
        if (selection != null) selection.ids = selection.ids.intersect(selection.order.toSet())
    }
    val pullThreshold = with(LocalDensity.current) { 64.dp.toPx() }
    val pull = remember(list, pullThreshold) {
        object : NestedScrollConnection {
            var distance = 0f
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source == NestedScrollSource.UserInput && available != Offset.Zero) confirmation = confirmation.disarm()
                if (available.y < 0) distance = 0f
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
    fun toggleDetails() {
        confirmation = confirmation.disarm()
        expanded = !expanded
        if (expanded) scope.launch { list.animateScrollToItem(0) }
    }
    Scaffold(modifier = disarmOnOtherTap.nestedScroll(scrollBehavior.nestedScrollConnection), topBar = {
        Column {
            if (selection != null && selection.ids.isNotEmpty()) SelectionToolbar(selection)
            else PodListTopAppBar(scrollBehavior = scrollBehavior, titleVisible = !collapsingTitle.headlineVisible, title = { Text(if (collapsingTitle.headlineVisible) "" else title, Modifier.semantics { heading() }, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, navigationIcon = {
                ActionIcon(R.drawable.ic_back, stringResource(R.string.back), modifier = Modifier.onGloballyPositioned { backBounds = it.boundsInWindow() }, action = ::pageBack)
            }, actions = {
                if (!armed) UndoAction()
                if (shownSubscribed) {
                    if (!armed) ActionIcon(R.drawable.ic_settings, stringResource(R.string.m4_subscription_settings), enabled = !busy && !changingSubscription && id != null) { openPage("subscription-settings:$id") }
                    val label = if (changingSubscription) stringResource(R.string.subscribing) else if (armed) stringResource(R.string.unsubscribe) else stringResource(R.string.podcast_subscribed_unsubscribe, title)
                    val armedAnnouncement = stringResource(R.string.podcast_unsubscribe_armed, title)
                    // The check and pending spinner share a 48 dp slot. Only the deliberate armed action expands.
                    ActionTooltip(label) {
                        TextButton(onClick = {
                            val now = SystemClock.uptimeMillis()
                            if (confirmation.canConfirm(now, ViewConfiguration.getDoubleTapTimeout().toLong())) {
                                confirmation = confirmation.disarm()
                                changeSubscription(true)
                            } else if (!confirmation.isArmedAt(now)) {
                                val timeout = accessibility.getRecommendedTimeoutMillis(5_000,
                                    AccessibilityManager.FLAG_CONTENT_CONTROLS or AccessibilityManager.FLAG_CONTENT_TEXT)
                                confirmation = confirmation.arm(now, timeout.toLong())
                            }
                        }, enabled = !busy && !changingSubscription, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                            contentPadding = PaddingValues(horizontal = if (armed) 12.dp else 0.dp),
                            modifier = Modifier.widthIn(min = if (armed) 96.dp else 48.dp).then(if (armed) Modifier else Modifier.width(48.dp))
                                .heightIn(min = 48.dp).onGloballyPositioned { controlBounds = it.boundsInWindow() }.then(flowSlot("podcast-subscription"))
                                .semantics {
                                    contentDescription = label
                                    if (armed) stateDescription = armedAnnouncement
                                    liveRegion = LiveRegionMode.Polite
                                }) {
                            Box(contentAlignment = Alignment.Center) {
                                // The right edge stays anchored beside overflow; the armed label grows left over the hidden gear.
                                if (armed && !changingSubscription) Text(stringResource(R.string.unsubscribe), Modifier.clearAndSetSemantics {})
                                if (changingSubscription) CircularProgressIndicator(Modifier.size(24.dp).then(ProgressModifier(R.string.subscribing)), strokeWidth = 2.dp)
                                else if (!armed) Box(Modifier.clearAndSetSemantics {}) { SubscribedIndicator() }
                            }
                        }
                    }
                } else Button(onClick = { changeSubscription(false) }, enabled = !busy && !changingSubscription, modifier = Modifier.padding(end = 12.dp).heightIn(min = 48.dp).then(flowSlot("podcast-subscription"))) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(stringResource(R.string.subscribe), if (changingSubscription) Modifier.graphicsLayer { alpha = 0f }.clearAndSetSemantics {} else Modifier)
                        if (changingSubscription) CircularProgressIndicator(Modifier.size(24.dp).then(ProgressModifier(R.string.unsubscribing)), strokeWidth = 2.dp)
                    }
                }
                Box {
                    ActionIcon(R.drawable.ic_entry_actions, stringResource(R.string.more_actions), enabled = !armed) { confirmation = confirmation.disarm(); shareMenu = true }
                    DropdownMenu(shareMenu, onDismissRequest = { shareMenu = false }) {
                        DropdownMenuItem(text = { Text(stringResource(R.string.share_podcast)) }, onClick = {
                            shareMenu = false
                            shareText(context, title, app.podlist.domain.ShareLinks.podcast(feed?.link ?: subscription?.get("website_url") as? String, result.feedUrl))
                        })
                        DropdownMenuItem(text = { Text(stringResource(R.string.copy_feed_address)) }, onClick = {
                            shareMenu = false
                            (context.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager)
                                .setPrimaryClip(android.content.ClipData.newPlainText(title, result.feedUrl))
                            model.messages.trySend(AppMessage(R.string.feed_address_copied, formatArgs = listOf(title)))
                        })
                    }
                }
            })
            // A fixed 4 dp slot: the bar appears and goes without moving the page under the person's typing
            // (FLOW-01). The status is announced from the same slot instead of a line of text that comes and goes.
            val status = if (!busy && !changingSubscription) null else stringResource(if (changingSubscription) { if (shownSubscribed) R.string.subscribing else R.string.unsubscribing } else R.string.podcast_bringing_episode)
            Box(Modifier.fillMaxWidth().height(4.dp).semantics { if (status != null) { liveRegion = LiveRegionMode.Polite; contentDescription = status } }) {
                if (busy || changingSubscription) LinearProgressIndicator(Modifier.fillMaxWidth().then(ProgressModifier(if (changingSubscription) { if (shownSubscribed) R.string.subscribing else R.string.unsubscribing } else R.string.podcast_bringing_episode)))
            }
            subscriptionFailure?.let { error ->
                Column(Modifier.padding(horizontal = 16.dp)) {
                    InlineError(appMessageText(error))
                    ContentTextButton(onClick = { error.undo?.invoke() }, enabled = !changingSubscription) { Text(stringResource(R.string.retry_action)) }
                }
            }
            actionFailure?.let {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    InlineError(stringResource(podcastErrorResource(it)))
                    ContentTextButton(onClick = { retryAction?.invoke() }, enabled = !busy) { Text(stringResource(R.string.podcast_try_again)) }
                }
            }
        }
    }, bottomBar = {
        if (selection != null && selection.ids.isNotEmpty()) SelectionActionBar(selection, data.copy(episodes = rows), session, "subscription:$id")
    }, contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)) { padding ->
        LazyColumn(state = list, modifier = Modifier.fillMaxSize().padding(padding).then(collapsingTitle.viewport()).imePadding().listSelectionKeys(selection).nestedScroll(pull).semantics {
            customActions = listOf(CustomAccessibilityAction(detailsLabel) { toggleDetails(); true })
        }) {
            item(key = "header") {
                Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(title, headlineVisibility(collapsingTitle).semantics { heading() }, style = MaterialTheme.typography.titleLarge)
                    author?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    if (expanded) Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        ArtworkImage(session, artwork, size = 120.dp, direct = true, placeholderTitle = title)
                        description?.let { SelectionContainer { Text(showNotes(it)) } }
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                        ContentTextButton(onClick = ::toggleDetails) { Text(stringResource(if (expanded) R.string.hide_podcast_details else R.string.show_podcast_details)) }
                        if (subscribed && subscription != null) SubscriptionRefreshStatus(subscription, session, onRefresh = { confirmation = confirmation.disarm() })
                        var fieldValue by rememberFieldValue(query)
                        OutlinedTextField(fieldValue, onValueChange = { confirmation = confirmation.disarm(); fieldValue = it; query = it.text }, singleLine = true, label = { Text(stringResource(R.string.podcast_search_episodes)) }, trailingIcon = { SearchClearButton(query) { query = "" } }, modifier = Modifier.fillMaxWidth().onFocusChanged { if (it.isFocused) confirmation = confirmation.disarm() })
                        Spacer(Modifier.height(16.dp))
                        Text(if (count.filtered) pluralStringResource(R.plurals.podcast_filtered_count, count.total, count.shown, count.total)
                        else pluralStringResource(R.plurals.episode_count, count.total, count.total), style = MaterialTheme.typography.titleSmall, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                        Box(Modifier.fillMaxWidth().height(ListHeaderGap), contentAlignment = Alignment.Center) {
                            LoadingLine(loading || !localLoaded, R.string.podcast_loading)
                        }
                    }
                    failure?.let {
                        InlineError(stringResource(R.string.podcast_load_failed), Modifier)
                        InlineError(stringResource(podcastErrorResource(it)))
                        ContentTextButton(onClick = ::load, enabled = !loading) { Text(stringResource(R.string.podcast_try_again)) }
                    }
                }
            }
            if (filtered.isEmpty() && !loading && localLoaded && failure == null) item {
                EmptyState(if (query.isBlank()) R.string.no_episodes else R.string.no_search_matches,
                    if (query.isBlank()) R.string.refresh_podcast else R.string.clear_search,
                    onAction = if (query.isBlank()) ::load else ({ query = "" }))
            }
            items(filtered, key = { it["guid"] as String }) { row ->
                CompositionLocalProvider(LocalEpisodeSelection provides selection) {
                    EpisodeRow(row, data, session, showArtwork = false, showPodcast = false, actionsEnabled = !busy, actionBusy = resolvingGuid == row["guid"], reserveBusySlot = true,
                        addAction = { resolve(row, add) },
                        playAction = { resolve(row) { model.playNow(it); started() } },
                        actionError = {
                            episodeFailures[row["guid"]]?.let { (error, retry) ->
                                EpisodeActionFailure(row["title"] as String, error, !busy, retry)
                            }
                        }) {
                        val stored = localRows.find { it["guid"] == row["guid"] }
                        confirmation = confirmation.disarm()
                        if (stored != null) openPage("episode:${stored["id"]}") else inspectingGuid = row["guid"] as String
                    }
                }
            }
        }
    }
}

private fun podcastErrorResource(error: LookupError): Int = when (error) {
    LookupError.Feed -> R.string.podcast_invalid_feed
    LookupError.Response -> R.string.podcast_invalid_response
    else -> lookupErrorResource(error)
}

@Composable
private fun EpisodeActionFailure(title: String, error: LookupError, enabled: Boolean, retry: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        InlineError(stringResource(R.string.podcast_episode_add_error, title, stringResource(podcastErrorResource(error))))
        ContentTextButton(onClick = retry, enabled = enabled) { Text(stringResource(R.string.retry_episode_named, title)) }
    }
}
