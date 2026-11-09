package app.podlist

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.podlist.domain.ListeningStats
import java.time.Instant
import java.time.ZoneId

@Composable internal fun listened(seconds: Double): String {
    val minutes = (seconds / 60).toLong()
    return when {
        minutes >= 60 -> stringResource(R.string.listened_hours_minutes, pluralStringResource(R.plurals.listened_hours, (minutes / 60).toInt(), minutes / 60), pluralStringResource(R.plurals.listened_minutes, (minutes % 60).toInt(), minutes % 60))
        minutes >= 1 -> pluralStringResource(R.plurals.listened_minutes, minutes.toInt(), minutes)
        seconds > 0 -> stringResource(R.string.listened_under_minute)
        else -> pluralStringResource(R.plurals.listened_minutes, 0, 0)
    }
}

private fun chartDate(day: java.time.LocalDate): String = shortDate(day.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())

@Composable private fun PeriodTiles(values: List<String>) {
    val labels = listOf(R.string.m4_this_week, R.string.m4_this_month, R.string.m4_all_time)
    val large = androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f
    @Composable fun Tile(index: Int, value: String, modifier: Modifier) {
        Surface(modifier.semantics(mergeDescendants = true) {}, shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Column(Modifier.padding(12.dp)) {
                Text(stringResource(labels[index]), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.titleLarge)
            }
        }
    }
    if (large) Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        values.forEachIndexed { index, value -> Tile(index, value, Modifier.fillMaxWidth()) }
    } else Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        values.forEachIndexed { index, value -> Tile(index, value, Modifier.weight(1f).fillMaxHeight()) }
    }
}

@Composable
internal fun ListeningStatsScreen(data: ScreenData, session: Session) {
    val stats = remember(data) { ListeningStats.calculate(data.state.listeningLog.orEmpty(), data.state.episodeStates.filterKeys { id -> data.episodes.any { it["id"] == id } }.values.mapNotNull { it.played }, Instant.now(), ZoneId.systemDefault()) }
    val browsing = LocalBrowsingState.current
    var table by rememberSaveable { mutableStateOf(browsing?.context?.statsTable ?: false) }
    LaunchedEffect(table) { if (browsing != null) browsing.context = browsing.context.copy(statsTable = table) }
    var chosen by rememberSaveable { mutableIntStateOf(stats.days.lastIndex) }
    if (stats.totals.all { it.seconds == 0.0 && it.finished == 0 }) { EmptyMessage(R.string.m4_no_listening); return }
    LazyColumn(state = rememberBrowsingListState(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Section(stringResource(R.string.m4_time_listened), inset = 0.dp); PeriodTiles(stats.totals.map { listened(it.seconds) }) }
        item { Section(stringResource(R.string.m4_episodes_finished), inset = 0.dp); PeriodTiles(stats.totals.map { it.finished.toString() }) }
        item { Section(stringResource(R.string.m4_last_30), inset = 0.dp); Text(pluralStringResource(R.plurals.m4_streak, stats.streak, stats.streak)) }
        if (table) {
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(stringResource(R.string.m4_day)); Text(stringResource(R.string.m4_time_listened)) } }
            items(stats.days.asReversed()) { day -> Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text(chartDate(day.day)); Text(listened(day.seconds)) } }
        } else item {
            val max = stats.days.maxOf { it.seconds }.coerceAtLeast(1.0)
            val shown = stats.days[chosen.coerceIn(stats.days.indices)]
            val primary = MaterialTheme.colorScheme.primary
            val outline = MaterialTheme.colorScheme.onSurface
            val chartLabel = stringResource(R.string.listening_chart)
            androidx.compose.foundation.Canvas(Modifier.fillMaxWidth().height(144.dp).pointerInput(stats.days) { detectTapGestures { offset -> chosen = (offset.x / (size.width.toFloat() / stats.days.size)).toInt().coerceIn(stats.days.indices) } }.semantics { contentDescription = chartLabel }) {
                val cell = size.width / stats.days.size
                stats.days.forEachIndexed { index, day ->
                    val left = index * cell + cell * .18f
                    val width = cell * .64f
                    val height = (day.seconds / max * (size.height - 8.dp.toPx())).toFloat().coerceAtLeast(2.dp.toPx())
                    drawRect(if (index == chosen) outline else primary, androidx.compose.ui.geometry.Offset(left, size.height - height), androidx.compose.ui.geometry.Size(width, height))
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(chartDate(stats.days.first().day), style = MaterialTheme.typography.labelSmall)
                Text(chartDate(stats.days.last().day), style = MaterialTheme.typography.labelSmall)
            }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                ActionIcon(R.drawable.ic_previous, stringResource(R.string.previous_day), enabled = chosen > 0) { chosen-- }
                Text(stringResource(R.string.m4_day_listening, chartDate(shown.day), listened(shown.seconds)), Modifier.weight(1f))
                ActionIcon(R.drawable.ic_next, stringResource(R.string.next_day), enabled = chosen < stats.days.lastIndex) { chosen++ }
            }
        }
        item { TextButton(onClick = { table = !table }) { Text(stringResource(if (table) R.string.m4_show_chart else R.string.m4_show_table)) } }
        item { Section(stringResource(R.string.m4_top_podcasts), inset = 0.dp) }
        val most = stats.podcasts.maxOfOrNull { it.second }?.coerceAtLeast(1.0) ?: 1.0
        items(stats.podcasts) { (id, seconds) ->
            val subscription = data.subscriptions.find { it["id"] == id }
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                ArtworkImage(session, subscription?.get("artwork_url") as? String, 48.dp)
                Column(Modifier.weight(1f)) {
                    Text(subscription?.get("title") as? String ?: stringResource(R.string.m4_removed_subscription))
                    Box(Modifier.padding(top = 6.dp).fillMaxWidth((seconds / most).toFloat().coerceIn(.02f, 1f)).height(6.dp).background(MaterialTheme.colorScheme.primary, RoundedCornerShape(3.dp)))
                }
                Text(listened(seconds), style = MaterialTheme.typography.bodySmall)
            }
        }
        item { Section(stringResource(R.string.m4_about_stats), inset = 0.dp); Text(stringResource(R.string.m4_stats_about), style = MaterialTheme.typography.bodySmall) }
    }
}
