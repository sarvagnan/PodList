@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi::class)

package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.material3.adaptive.layout.AnimatedPane
import androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole
import androidx.compose.material3.adaptive.navigation.BackNavigationBehavior
import androidx.compose.material3.adaptive.navigation.NavigableListDetailPaneScaffold
import androidx.compose.material3.adaptive.navigation.rememberListDetailPaneScaffoldNavigator
import androidx.compose.material3.adaptive.navigationsuite.NavigationSuiteScaffold
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private enum class Destination(val title: Int, val icon: Int) {
    Views(R.string.views, R.drawable.ic_views),
    Playlists(R.string.playlists, R.drawable.ic_playlists),
    Library(R.string.library, R.drawable.ic_library)
}

@Composable
fun PodListShell(model: AppModel) {
    val starting by model.starting.collectAsState()
    val session by model.session.collectAsState()
    Surface(Modifier.fillMaxSize()) {
        when {
            starting -> Loading()
            session == null -> ServerScreen(model, null)
            else -> key(session!!.address.origin) { ConnectedShell(model, session!!) }
        }
    }
}

@Composable
private fun ConnectedShell(model: AppModel, session: Session) {
    var destination by rememberSaveable { mutableStateOf(Destination.Views) }
    val tabs = rememberSaveableStateHolder()
    NavigationSuiteScaffold(navigationSuiteItems = {
        Destination.entries.forEach { target ->
            item(selected = destination == target, onClick = { destination = target },
                icon = { Icon(painterResource(target.icon), contentDescription = null) },
                label = { Text(stringResource(target.title)) })
        }
    }) {
        tabs.SaveableStateProvider(destination.name) {
            DestinationStack(destination, model, session)
        }
    }
}

@Composable
private fun DestinationStack(destination: Destination, model: AppModel, session: Session) {
    val navigator = rememberListDetailPaneScaffoldNavigator<String>()
    val scope = rememberCoroutineScope()
    val route = navigator.currentDestination?.contentKey
    val revision by model.revision.collectAsState()
    val status by model.status.collectAsState()
    var data by remember(session, route) { mutableStateOf<ScreenData?>(null) }
    LaunchedEffect(session, revision, route) {
        data = withContext(Dispatchers.IO) { readScreen(session.db, route) }
    }
    val pages = rememberSaveableStateHolder()
    val open: (String) -> Unit = { next -> scope.launch { navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, next) } }
    val back: () -> Unit = { scope.launch { navigator.navigateBack(BackNavigationBehavior.PopLatest) } }
    // This wraps ListDetailPaneScaffold and provides gesture-driven predictive back transitions.
    NavigableListDetailPaneScaffold(
        navigator = navigator,
        defaultBackBehavior = BackNavigationBehavior.PopLatest,
        listPane = {
            AnimatedPane {
                ScreenFrame(stringResource(destination.title), status, model::requestSync, settings = { open("settings") }) {
                    val loaded = data
                    if (loaded == null || (status == SyncStatus.Loading && if (destination == Destination.Library) !loaded.hasLibrary else !loaded.hasState)) Loading()
                    else if (if (destination == Destination.Library) !loaded.hasLibrary else !loaded.hasState) EmptyMessage(R.string.no_synced_data)
                    else pages.SaveableStateProvider("root") { Directory(destination, loaded, session, open) }
                }
            }
        },
        detailPane = {
            AnimatedPane {
                val loaded = data
                val title = when {
                    route == "settings" -> stringResource(R.string.settings)
                    route == "server" -> stringResource(R.string.server)
                    route == "trash" -> stringResource(R.string.trash)
                    route?.startsWith("view:") == true -> loaded?.state?.views?.find { it.id == route.substringAfter(':') }?.name.orEmpty()
                    route?.startsWith("playlist:") == true -> loaded?.state?.playlists?.find { it.id == route.substringAfter(':') }?.name.orEmpty()
                    route?.startsWith("subscription:") == true -> loaded?.subscriptions?.find { it["id"] == route.substringAfter(':') }?.get("title") as? String ?: ""
                    else -> stringResource(R.string.episode)
                }
                ScreenFrame(title, status, model::requestSync, back = back) {
                    when {
                        route == "server" -> ServerScreen(model, session.address.origin, back)
                        loaded == null -> Loading()
                        else -> pages.SaveableStateProvider(route ?: "detail") {
                            Detail(route, loaded, session, open)
                        }
                    }
                }
            }
        }
    )
}

@Composable
private fun ScreenFrame(title: String, status: SyncStatus, retry: () -> Unit, back: (() -> Unit)? = null, settings: (() -> Unit)? = null, content: @Composable () -> Unit) {
    Scaffold(topBar = {
        TopAppBar(title = { Text(title) }, navigationIcon = {
            if (back != null) IconButton(onClick = back) { Icon(painterResource(R.drawable.ic_back), stringResource(R.string.back)) }
        }, actions = {
            if (settings != null) IconButton(onClick = settings) { Icon(painterResource(R.drawable.ic_settings), stringResource(R.string.settings)) }
        })
    }, contentWindowInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (status != SyncStatus.Ready) {
                Surface(color = if (status == SyncStatus.Error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceContainer) {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(when (status) {
                            SyncStatus.Loading -> R.string.syncing
                            SyncStatus.Offline -> R.string.offline
                            else -> R.string.sync_error
                        }), Modifier.weight(1f).padding(vertical = 12.dp), style = MaterialTheme.typography.bodySmall)
                        if (status != SyncStatus.Loading) TextButton(onClick = retry) { Text(stringResource(R.string.retry)) }
                    }
                }
            }
            Box(Modifier.weight(1f)) { content() }
        }
    }
}

@Composable
private fun Directory(destination: Destination, data: ScreenData, session: Session, open: (String) -> Unit) {
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        item { Hint(stringResource(when (destination) { Destination.Views -> R.string.views_hint; Destination.Playlists -> R.string.playlists_hint; Destination.Library -> R.string.library_hint })) }
        when (destination) {
            Destination.Views -> {
                if (data.state.views.isEmpty()) item { EmptyMessage(R.string.no_views) }
                items(data.state.views, key = { "view:${it.id}" }) { view -> NameRow(view.name, sortLabel(view.sort)) { open("view:${view.id}") } }
            }
            Destination.Playlists -> {
                if (data.state.playlists.isEmpty()) item { EmptyMessage(R.string.no_playlists) }
                items(data.state.playlists, key = { "playlist:${it.id}" }) { playlist ->
                    val details = listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
                        stringResource(R.string.entry_count, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries))
                    NameRow(playlist.name, details.joinToString(" · ")) { open("playlist:${playlist.id}") }
                }
                item { NameRow(stringResource(R.string.trash), stringResource(R.string.playlist_count, data.state.trash.orEmpty().size)) { open("trash") } }
            }
            Destination.Library -> {
                val subscriptions = data.subscriptions.filter { it["unsubscribed_at"] == null }
                if (subscriptions.isEmpty()) item { EmptyMessage(R.string.no_subscriptions) }
                val device = session.deviceId
                for ((mode, title) in listOf(DownloadMode.OnEntry to R.string.on_entry, DownloadMode.Never to R.string.stream, DownloadMode.AllNew to R.string.all_new)) {
                    item { Section(stringResource(title)) }
                    val group = subscriptions.filter { subscription ->
                        (data.state.downloadRules.find { it.deviceId == device && it.subscriptionId == subscription["id"] }?.mode ?: DownloadMode.Never) == mode
                    }
                    if (group.isEmpty()) item { Hint(stringResource(R.string.empty_rule)) }
                    items(group, key = { "subscription:${it["id"]}" }) { subscription ->
                        NameRow(subscription["title"] as String, stringResource(R.string.episode_count, (subscription["episode_count"] as Number).toInt()),
                            artwork = subscription["artwork_url"] as? String, session = session) { open("subscription:${subscription["id"]}") }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun Detail(route: String?, data: ScreenData, session: Session, open: (String) -> Unit) {
    val id = route?.substringAfter(':')
    when {
        route == "settings" -> LazyColumn {
            item { Section(stringResource(R.string.this_device)) }
            item { NameRow(stringResource(R.string.server), session.address.origin) { open("server") } }
        }
        route == "trash" -> LazyColumn(state = rememberLazyListState()) {
            if (data.state.trash.isNullOrEmpty()) item { EmptyMessage(R.string.no_trash) }
            items(data.state.trash.orEmpty(), key = { it.playlist.id }) {
                ListItem(headlineContent = { Text(it.playlist.name) }, supportingContent = { Text(stringResource(R.string.deleted, date(it.deletedAt))) })
            }
        }
        route?.startsWith("view:") == true -> {
            val view = data.state.views.find { it.id == id }
            if (view == null) EmptyMessage(R.string.missing_view)
            else EpisodeList(data.episodes, data, session, open, empty = R.string.no_matches, summary = {
                Text(stringResource(R.string.episode_count, data.episodes.size), style = MaterialTheme.typography.titleSmall)
                Text(viewDescription(view, data), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            })
        }
        route?.startsWith("subscription:") == true -> {
            if (data.subscriptions.none { it["id"] == id }) EmptyMessage(R.string.missing_subscription)
            else EpisodeList(data.episodes, data, session, open, empty = R.string.no_episodes)
        }
        route?.startsWith("playlist:") == true -> {
            val playlist = data.state.playlists.find { it.id == id }
            if (playlist == null) EmptyMessage(R.string.missing_playlist)
            else LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
                item {
                    Hint(listOfNotNull(if (playlist.id == data.state.activePlaylistId) stringResource(R.string.active) else null,
                        stringResource(R.string.entry_count, playlist.entries.size), stringResource(if (playlist.clearOnPlayed) R.string.clear_on_played else R.string.keeps_entries)).joinToString(" · "))
                    Section(stringResource(R.string.entries))
                    if (playlist.cursor == null) Hint(stringResource(R.string.no_cursor))
                }
                if (playlist.entries.isEmpty()) item { EmptyMessage(R.string.no_entries) }
                val byId = data.episodes.associateBy { it["id"] }
                items(playlist.entries, key = { it.episodeId }) { entry ->
                    val row = byId[entry.episodeId]
                    val cursor = playlist.cursor == entry.episodeId
                    Column(Modifier.fillMaxWidth().background(if (cursor) MaterialTheme.colorScheme.surfaceContainer else MaterialTheme.colorScheme.surface)) {
                        if (cursor) Text(stringResource(if (playlist.id == data.state.activePlaylistId) R.string.cursor_now else R.string.cursor),
                            Modifier.padding(start = 68.dp, top = 12.dp), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
                        if (row == null) Hint(stringResource(R.string.metadata_pending))
                        else EpisodeRow(row, data, session, entry.position, true) { open("episode:${entry.episodeId}") }
                    }
                }
            }
        }
        route?.startsWith("episode:") == true -> EpisodeDetail(data, session)
    }
}

@Composable
private fun EpisodeList(rows: List<Row>, data: ScreenData, session: Session, open: (String) -> Unit, empty: Int, summary: (@Composable () -> Unit)? = null) {
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        if (summary != null) item { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { summary() } }
        if (rows.isEmpty()) item { EmptyMessage(empty) }
        items(rows, key = { it["id"] as String }) { row -> EpisodeRow(row, data, session) { open("episode:${row["id"]}") } }
    }
}

@Composable
private fun EpisodeRow(row: Row, data: ScreenData, session: Session, position: Double? = null, entry: Boolean = false, onClick: (() -> Unit)? = null) {
    val progress = position ?: data.state.playlists.flatMap { it.entries }.filter { it.episodeId == row["id"] }.maxOfOrNull { it.position } ?: 0.0
    val duration = (row["duration"] as? Number)?.toDouble()
    Column {
        Row(Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ArtworkImage(session, row["artwork_url"] as? String ?: row["podcast_artwork_url"] as? String)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(row["title"] as String, style = MaterialTheme.typography.titleMedium)
                Text(row["podcast"] as String, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(stringResource(R.string.published, date((row["published"] as Number).toLong())), style = MaterialTheme.typography.bodySmall)
                Text(duration?.let { stringResource(R.string.duration, duration(it)) } ?: stringResource(R.string.duration_unknown), style = MaterialTheme.typography.bodySmall)
                Text(when {
                    row["played_at"] != null -> stringResource(R.string.played)
                    progress > 0 -> stringResource(R.string.in_progress, duration(progress))
                    else -> stringResource(R.string.unplayed)
                }, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                if (entry) Text(stringResource(R.string.entry_position, duration(progress)), style = MaterialTheme.typography.bodySmall)
                if ((row["starred"] as? Number)?.toInt() == 1) Text(stringResource(R.string.starred), style = MaterialTheme.typography.labelSmall)
                if (progress > 0 && duration != null && duration > 0) LinearProgressIndicator(progress = { (progress / duration).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
            }
        }
        HorizontalDivider()
    }
}

@Composable
private fun EpisodeDetail(data: ScreenData, session: Session) {
    val row = data.episodes.firstOrNull()
    if (row == null) { EmptyMessage(R.string.metadata_pending); return }
    LazyColumn(state = rememberLazyListState(), modifier = Modifier.fillMaxSize()) {
        item { EpisodeRow(row, data, session) }
        val entries = data.state.playlists.mapNotNull { playlist -> playlist.entries.find { it.episodeId == row["id"] }?.let { playlist.name to it.position } }
        if (entries.isNotEmpty()) item { Section(stringResource(R.string.in_playlists)) }
        items(entries) { (name, position) -> Hint(stringResource(R.string.playlist_position, name, duration(position))) }
        item { Section(stringResource(R.string.show_notes)) }
        item { Text(android.text.Html.fromHtml(row["description"] as? String ?: "", android.text.Html.FROM_HTML_MODE_COMPACT).toString(), Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium) }
    }
}

@Composable
private fun NameRow(title: String, subtitle: String, artwork: String? = null, session: Session? = null, onClick: () -> Unit) {
    ListItem(modifier = Modifier.clickable(onClick = onClick), headlineContent = { Text(title) }, supportingContent = { Text(subtitle) },
        leadingContent = if (session != null) { { ArtworkImage(session, artwork) } } else null)
    HorizontalDivider()
}

@Composable private fun Hint(text: String) { Text(text, Modifier.padding(horizontal = 16.dp, vertical = 12.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
@Composable private fun Section(text: String) { Text(text, Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleSmall) }
@Composable private fun EmptyMessage(resource: Int) { Text(stringResource(resource), Modifier.padding(24.dp), style = MaterialTheme.typography.bodyLarge) }
@Composable private fun Loading() { Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) { CircularProgressIndicator(); Text(stringResource(R.string.loading)) } }

private fun date(millis: Long): String = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withZone(ZoneId.systemDefault()).format(Instant.ofEpochMilli(millis))
private fun duration(seconds: Double): String { val s = seconds.toLong(); return if (s >= 3600) "%d:%02d:%02d".format(s / 3600, s / 60 % 60, s % 60) else "%d:%02d".format(s / 60, s % 60) }

@Composable private fun sortLabel(sort: ViewSort): String = stringResource(when (sort) {
    ViewSort.PublishedDesc -> R.string.newest_first; ViewSort.PublishedAsc -> R.string.oldest_first
    ViewSort.DurationAsc -> R.string.shortest_first; ViewSort.DurationDesc -> R.string.longest_first
})

@Composable
private fun viewDescription(view: View, data: ScreenData): String {
    val conditions = mutableListOf<String>()
    when (val published = view.filter.published) {
        is PublishedFilter.LastDays -> conditions += stringResource(R.string.published_days, published.days)
        is PublishedFilter.Between -> conditions += stringResource(R.string.published_between, published.from?.let(::date) ?: stringResource(R.string.any), published.to?.let(::date) ?: stringResource(R.string.any))
        null -> Unit
    }
    view.filter.podcasts?.let { filter ->
        val names = filter.subscriptionIds.map { id -> data.subscriptions.find { it["id"] == id }?.get("title") as? String ?: stringResource(R.string.unavailable) }
        conditions += stringResource(if (filter.mode == PodcastMode.Include) R.string.podcasts_include else R.string.podcasts_exclude, names.joinToString(", "))
    }
    view.filter.text?.let { conditions += stringResource(R.string.mentions, it) }
    view.filter.played?.let { conditions += stringResource(R.string.played_condition, stringResource(when (it) { PlayedFilter.Unplayed -> R.string.unplayed; PlayedFilter.Played -> R.string.played; PlayedFilter.InProgress -> R.string.in_progress_condition })) }
    view.filter.starred?.let { conditions += stringResource(R.string.starred_condition, stringResource(if (it) R.string.yes else R.string.no)) }
    if (view.filter.notInAnyPlaylist == true) conditions += stringResource(R.string.not_in_playlist)
    view.filter.minDuration?.let { conditions += stringResource(R.string.min_duration, duration(it)) }
    view.filter.maxDuration?.let { conditions += stringResource(R.string.max_duration, duration(it)) }
    if (conditions.isEmpty()) conditions += stringResource(R.string.any)
    conditions += sortLabel(view.sort)
    view.limit?.let { conditions += stringResource(R.string.show_limit, it) }
    return conditions.joinToString(" · ")
}
