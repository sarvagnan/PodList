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
import app.podlist.domain.*

@Composable
internal fun TimelineScreen(playlist: Playlist, data: ScreenData, session: Session, open: (String) -> Unit, rewound: () -> Unit) {
    val model = LocalAppModel.current
    val events = remember(playlist) { TimelinePresentation.events(playlist) }
    var target by remember { mutableStateOf<Long?>(null) }
    val byId = data.episodes.associateBy { it["id"] }
    LazyColumn(Modifier.fillMaxSize(), state = rememberBrowsingListState()) {
        if (events.isEmpty()) item { EmptyMessage(R.string.no_timeline); FilledTonalButton(onClick = rewound, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.show_entries)) } }
        if (events.any { TimelineRules.pointAt(playlist, it.moment) != null }) item {
            Hint(stringResource(R.string.timeline_rewind_hint))
        }
        items(events) { event ->
            ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), modifier = Modifier.clickable(onClickLabel = stringResource(if (TimelineRules.pointAt(playlist, event.moment) != null) R.string.m4_rewind_here else R.string.episode)) { if (TimelineRules.pointAt(playlist, event.moment) != null) target = event.moment else open("episode:${event.episodeId}") }, headlineContent = { Text(byId[event.episodeId]?.get("title") as? String ?: stringResource(R.string.metadata_pending), style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = {
                Column { Text(dateTime(event.at), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(when(event.kind) {
                    "listened" -> stringResource(R.string.m4_listened_stretch, TimelinePresentation.positionLabel(duration(event.from), duration(event.to)), dateTime(event.end))
                    "finished" -> stringResource(R.string.m4_finished)
                    "added" -> stringResource(R.string.m4_entry_added)
                    "moved" -> stringResource(R.string.m4_entry_moved)
                    "removed" -> stringResource(R.string.m4_entry_removed)
                    else -> stringResource(R.string.m4_marked_played)
                }) }
            }, trailingContent = { if (TimelineRules.pointAt(playlist, event.moment) != null) Icon(androidx.compose.ui.res.painterResource(R.drawable.ic_rewind), null) })
            ContentDivider()
        }
    }
    target?.let { to ->
        val preview = TimelinePresentation.preview(data.state, playlist.id, to, System.currentTimeMillis())
        // Fully open from the start: Rewind and Cancel sit below the summary.
        if (preview != null) FeedbackSheet(modifier = historyShortcuts(model), onDismissRequest = { target = null }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            LazyColumn(Modifier.weight(1f, fill = false), contentPadding = PaddingValues(bottom = 16.dp)) {
                item { Text(stringResource(R.string.m4_rewind_title, playlist.name, dateTime(to)), Modifier.padding(16.dp).semantics { heading() }, style = MaterialTheme.typography.titleLarge) }
                item { Section(stringResource(R.string.m4_goes_back)) }
                preview.cursor?.let { id -> item { RewindEpisode(id, data, session, stringResource(R.string.m4_position, duration(preview.position))) } }
                item { Section(stringResource(R.string.m4_unplayed_again)) }
                if (preview.unplayed.isEmpty()) item { Hint(stringResource(R.string.m4_none)) }
                items(preview.unplayed) { RewindEpisode(it, data, session) }
                item { Section(stringResource(R.string.m4_back_in_playlist)) }
                if (preview.restored.isEmpty()) item { Hint(stringResource(R.string.m4_none)) }
                items(preview.restored) { RewindEpisode(it, data, session) }
                item { Section(stringResource(R.string.m4_kept)); Hint(stringResource(R.string.m4_rewind_kept)) }
            }
            CommitActions(Modifier.padding(16.dp)) {
                TextButton(onClick = { target = null }) { Text(stringResource(R.string.cancel)) }
                CommitButton(onClick = { model.rewind(playlist.id, to); target = null; rewound() }) { Text(stringResource(R.string.m4_rewind)) }
            }
        }
    }
}

@Composable private fun RewindEpisode(id: String, data: ScreenData, session: Session, detail: String? = null) {
    val row = data.episodes.find { it["id"] == id }
    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(row?.get("title") as? String ?: stringResource(R.string.metadata_pending), style = MaterialTheme.typography.titleMedium, maxLines = 3, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis) }, supportingContent = { Text(detail ?: row?.get("podcast") as? String ?: stringResource(R.string.metadata_pending)) }, leadingContent = { ArtworkImage(session, row?.get("artwork_url") as? String ?: row?.get("podcast_artwork_url") as? String, placeholderTitle = row?.get("podcast") as? String) })
}
