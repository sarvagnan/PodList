@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.data.Row
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private data class TimelineRow(val key: String, val event: TimelineEvent, val canRewind: Boolean)

@Composable
internal fun TimelineScreen(playlist: Playlist, data: ScreenData, session: Session, open: (String) -> Unit, rewound: () -> Unit) {
    val model = LocalAppModel.current
    val rows by produceState<List<TimelineRow>?>(null, playlist) {
        value = withContext(Dispatchers.Default) {
            val earliest = playlist.timeline.minOfOrNull { it.at }
            val occurrences = mutableMapOf<TimelineEvent, Int>()
            TimelinePresentation.events(playlist).map { event ->
                val count = occurrences.getOrDefault(event, 0)
                occurrences[event] = count + 1
                TimelineRow("${event.kind}:${event.at}:${event.end}:${event.from}:${event.to}:$count:${event.episodeId}",
                    event, earliest != null && earliest <= event.moment)
            }
        }
    }
    var target by remember { mutableStateOf<Long?>(null) }
    val byId = remember(data.episodes) { data.episodes.associateBy { it["id"] } }
    val events = rows
    if (events == null) {
        Loading()
        return
    }
    val canRewind = remember(events) { events.any { it.canRewind } }
    LazyColumn(Modifier.fillMaxSize(), state = rememberBrowsingListState()) {
        if (events.isEmpty()) item { EmptyState(R.string.no_timeline, R.string.show_entries, onAction = rewound) }
        if (canRewind) item {
            Hint(stringResource(R.string.timeline_rewind_hint))
        }
        items(events, key = { it.key }) { row ->
            val event = row.event
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable(onClickLabel = stringResource(if (row.canRewind) R.string.m4_rewind_here else R.string.episode)) { if (row.canRewind) target = event.moment else open("episode:${event.episodeId}") }, headlineContent = { Text(byId[event.episodeId]?.get("title") as? String ?: stringResource(R.string.metadata_pending), style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = {
                Column { Text(dateTime(event.at), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(when(event.kind) {
                    "listened" -> stringResource(R.string.m4_listened_stretch, TimelinePresentation.positionLabel(duration(event.from), duration(event.to)), dateTime(event.end))
                    "finished" -> stringResource(R.string.m4_finished)
                    "added" -> stringResource(R.string.m4_entry_added)
                    "moved" -> stringResource(R.string.m4_entry_moved)
                    "removed" -> stringResource(R.string.m4_entry_removed)
                    else -> stringResource(R.string.m4_marked_played)
                }) }
            }, trailingContent = { if (row.canRewind) Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_rewind), null) })
            ContentDivider()
        }
    }
    target?.let { to ->
        val preview by key(to) {
            produceState<RewindPreview?>(null, data.state, playlist.id, to) {
                value = withContext(Dispatchers.Default) {
                    TimelinePresentation.preview(data.state, playlist.id, to, System.currentTimeMillis())
                }
            }
        }
        // Fully open from the start: Rewind and Cancel sit below the summary.
        preview?.let { preview ->
            FeedbackSheet(modifier = historyShortcuts(model), onDismissRequest = { target = null }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
                LazyColumn(Modifier.weight(1f, fill = false), contentPadding = PaddingValues(bottom = 16.dp)) {
                    item { Text(stringResource(R.string.m4_rewind_title, playlist.name, dateTime(to)), Modifier.padding(16.dp).semantics { heading() }, style = MaterialTheme.typography.titleLarge) }
                    item { Section(stringResource(R.string.m4_goes_back)) }
                    preview.cursor?.let { id -> item { RewindEpisode(byId[id], session, stringResource(R.string.m4_position, duration(preview.position))) } }
                    item { Section(stringResource(R.string.m4_unplayed_again)) }
                    if (preview.unplayed.isEmpty()) item { Hint(stringResource(R.string.m4_none)) }
                    items(preview.unplayed, key = { "unplayed:$it" }) { RewindEpisode(byId[it], session) }
                    item { Section(stringResource(R.string.m4_back_in_playlist)) }
                    if (preview.restored.isEmpty()) item { Hint(stringResource(R.string.m4_none)) }
                    items(preview.restored, key = { "restored:$it" }) { RewindEpisode(byId[it], session) }
                    item { Section(stringResource(R.string.m4_kept)); Hint(stringResource(R.string.m4_rewind_kept)) }
                }
                CommitActions(Modifier.padding(16.dp)) {
                    TextButton(onClick = { target = null }) { Text(stringResource(R.string.cancel)) }
                    CommitButton(onClick = { model.rewind(playlist.id, to); target = null; rewound() }) { Text(stringResource(R.string.m4_rewind)) }
                }
            }
        }
    }
}

@Composable private fun RewindEpisode(row: Row?, session: Session, detail: String? = null) {
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(row?.get("title") as? String ?: stringResource(R.string.metadata_pending), style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(detail ?: row?.get("podcast") as? String ?: stringResource(R.string.metadata_pending)) }, leadingContent = { ArtworkImage(session, row?.get("artwork_url") as? String ?: row?.get("podcast_artwork_url") as? String, placeholderTitle = row?.get("podcast") as? String) })
}
