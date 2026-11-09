@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package app.podlist

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.podlist.domain.*

@Composable
internal fun TimelineScreen(playlist: Playlist, data: ScreenData, session: Session, open: (String) -> Unit, rewound: () -> Unit) {
    val model = LocalAppModel.current
    val events = remember(playlist) { TimelinePresentation.events(playlist) }
    var target by remember { mutableStateOf<Long?>(null) }
    val byId = data.episodes.associateBy { it["id"] }
    LazyColumn(Modifier.fillMaxSize()) {
        if (events.isEmpty()) item { EmptyMessage(R.string.no_timeline) }
        items(events) { event ->
            ListItem(modifier = Modifier.clickable { open("episode:${event.episodeId}") }, headlineContent = { Text(byId[event.episodeId]?.get("title") as? String ?: stringResource(R.string.metadata_pending)) }, supportingContent = {
                Column { Text(dateTime(event.at)); Text(when(event.kind) {
                    "listened" -> stringResource(R.string.m4_listened_stretch, duration(event.from), duration(event.to), dateTime(event.end))
                    "finished" -> stringResource(R.string.m4_finished)
                    "added" -> stringResource(R.string.m4_entry_added)
                    "moved" -> stringResource(R.string.m4_entry_moved)
                    "removed" -> stringResource(R.string.m4_entry_removed)
                    else -> stringResource(R.string.m4_marked_played)
                }) }
            }, trailingContent = { if (TimelineRules.pointAt(playlist, event.moment) != null) TextButton(onClick = { target = event.moment }) { Text(stringResource(R.string.m4_rewind_here)) } })
            HorizontalDivider()
        }
    }
    target?.let { to ->
        val preview = TimelinePresentation.preview(data.state, playlist.id, to, System.currentTimeMillis())
        if (preview != null) ModalBottomSheet(onDismissRequest = { target = null }) {
            LazyColumn(Modifier.weight(1f, fill = false), contentPadding = PaddingValues(bottom = 16.dp)) {
                item { Text(stringResource(R.string.m4_rewind_title, playlist.name, dateTime(to)), Modifier.padding(16.dp), style = MaterialTheme.typography.titleLarge) }
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
            Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { target = null }) { Text(stringResource(R.string.cancel)) }
                Button(onClick = { model.rewind(playlist.id, to); target = null; rewound() }) { Text(stringResource(R.string.m4_rewind)) }
            }
        }
    }
}

@Composable private fun RewindEpisode(id: String, data: ScreenData, session: Session, detail: String? = null) {
    val row = data.episodes.find { it["id"] == id }
    ListItem(headlineContent = { Text(row?.get("title") as? String ?: stringResource(R.string.metadata_pending)) }, supportingContent = { Text(detail ?: row?.get("podcast") as? String ?: stringResource(R.string.metadata_pending)) }, leadingContent = { ArtworkImage(session, row?.get("artwork_url") as? String ?: row?.get("podcast_artwork_url") as? String) })
}
