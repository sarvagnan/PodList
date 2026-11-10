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
import app.podlist.domain.ListeningPresentation
import java.time.Instant
import java.time.ZoneId

@Composable internal fun listened(seconds: Double): String {
    val time = ListeningPresentation.time(seconds)
    return when {
        time.hours > 0 -> stringResource(R.string.listened_hours_minutes, pluralStringResource(R.plurals.listened_hours, time.hours.toInt(), time.hours), pluralStringResource(R.plurals.listened_minutes, time.minutes.toInt(), time.minutes))
        time.minutes > 0 -> pluralStringResource(R.plurals.listened_minutes, time.minutes.toInt(), time.minutes)
        time.underMinute -> stringResource(R.string.listened_under_minute)
        else -> pluralStringResource(R.plurals.listened_minutes, 0, 0)
    }
}

private fun chartDate(day: java.time.LocalDate): String = shortDate(day.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()).replace('\u00a0', ' ')

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
internal fun ListeningStatsScreen(data: ScreenData, session: Session, findEpisodes: () -> Unit) {
    val stats = remember(data) { ListeningStats.calculate(data.state.listeningLog.orEmpty(), data.state.episodeStates.filterKeys { id -> data.episodes.any { it["id"] == id } }.values.mapNotNull { it.played }, Instant.now(), ZoneId.systemDefault()) }
    val browsing = LocalBrowsingState.current
    var table by rememberSaveable { mutableStateOf(browsing?.context?.statsTable ?: false) }
    LaunchedEffect(table) { if (browsing != null) browsing.context = browsing.context.copy(statsTable = table) }
    var chosen by rememberSaveable { mutableIntStateOf(stats.days.lastIndex) }
    if (stats.totals.all { it.seconds == 0.0 && it.finished == 0 }) {
        Column {
            EmptyMessage(R.string.m4_no_listening)
            FilledTonalButton(onClick = findEpisodes, modifier = Modifier.padding(horizontal = 16.dp)) { Text(stringResource(R.string.find_something_to_play)) }
        }
        return
    }
    LazyColumn(state = rememberBrowsingListState(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Section(stringResource(R.string.m4_time_listened), inset = 0.dp); PeriodTiles(stats.totals.map { listened(it.seconds) }) }
        item { Section(stringResource(R.string.m4_episodes_finished), inset = 0.dp); PeriodTiles(stats.totals.map { it.finished.toString() }) }
        item { Section(stringResource(R.string.m4_last_30), inset = 0.dp); Text(pluralStringResource(R.plurals.m4_streak, stats.streak, stats.streak)) }
        if (table) {
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(stringResource(R.string.m4_day)); Text(stringResource(R.string.m4_time_listened)) } }
            items(stats.days.asReversed()) { day ->
                if (androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f) Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) { Text(chartDate(day.day)); Text(listened(day.seconds)) }
                else Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text(chartDate(day.day)); Text(listened(day.seconds)) }
            }
        } else item {
            val max = ListeningPresentation.chartMaximum(stats.days.maxOf { it.seconds })
            val shown = stats.days[chosen.coerceIn(stats.days.indices)]
            val selectedColor = MaterialTheme.colorScheme.primary
            val unselectedColor = MaterialTheme.colorScheme.primary.copy(alpha = ListeningPresentation.unselectedBarAlpha)
            Text(stringResource(R.string.chart_minutes), style = MaterialTheme.typography.labelMedium)
            val chartLabel = stringResource(R.string.listening_chart)
            val baseline = MaterialTheme.colorScheme.outlineVariant
            Row(Modifier.fillMaxWidth()) {
                Column(Modifier.height(144.dp).width(IntrinsicSize.Max).padding(end = 8.dp), verticalArrangement = Arrangement.SpaceBetween) {
                    Text(stringResource(R.string.chart_tick, (max / 60).toLong()), style = MaterialTheme.typography.labelSmall, softWrap = false, maxLines = 1)
                    if (androidx.compose.ui.platform.LocalDensity.current.fontScale < 1.5f) Text(stringResource(R.string.chart_tick, (max / 120).toLong()), style = MaterialTheme.typography.labelSmall, softWrap = false, maxLines = 1)
                    Text(stringResource(R.string.chart_tick, 0L), style = MaterialTheme.typography.labelSmall, softWrap = false, maxLines = 1)
                }
                Column(Modifier.weight(1f)) {
                    androidx.compose.foundation.Canvas(Modifier.fillMaxWidth().height(144.dp).pointerInput(stats.days) { detectTapGestures { offset -> chosen = (offset.x / (size.width.toFloat() / stats.days.size)).toInt().coerceIn(stats.days.indices) } }.semantics { contentDescription = chartLabel }) {
                        drawLine(baseline, androidx.compose.ui.geometry.Offset(0f, size.height),
                            androidx.compose.ui.geometry.Offset(size.width, size.height), strokeWidth = 1.dp.toPx())
                        val cell = size.width / stats.days.size
                        stats.days.forEachIndexed { index, day ->
                            val left = index * cell + cell * .18f
                            val width = cell * .64f
                            val height = ListeningPresentation.barFraction(day.seconds, max) * size.height
                            if (height > 0f) drawRect(if (index == chosen) selectedColor else unselectedColor, androidx.compose.ui.geometry.Offset(left, size.height - height), androidx.compose.ui.geometry.Size(width, height))
                        }
                    }
                    Row(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(chartDate(stats.days.first().day), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall)
                        Text(chartDate(stats.days.last().day), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall,
                            textAlign = androidx.compose.ui.text.style.TextAlign.End)
                    }
                }
            }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                ActionIcon(R.drawable.ic_chevron_left, stringResource(R.string.previous_day), enabled = chosen > 0) { chosen-- }
                Text(stringResource(R.string.m4_day_listening, chartDate(shown.day), listened(shown.seconds)), Modifier.weight(1f))
                ActionIcon(R.drawable.ic_chevron_right, stringResource(R.string.next_day), enabled = chosen < stats.days.lastIndex) { chosen++ }
            }
        }
        item { ContentTextButton(onClick = { table = !table }) { Text(stringResource(if (table) R.string.m4_show_chart else R.string.m4_show_table)) } }
        item { Section(stringResource(R.string.m4_top_podcasts), inset = 0.dp) }
        val most = stats.podcasts.maxOfOrNull { it.second }?.coerceAtLeast(1.0) ?: 1.0
        items(stats.podcasts) { (id, seconds) ->
            val subscription = data.subscriptions.find { it["id"] == id }
            val large = androidx.compose.ui.platform.LocalDensity.current.fontScale >= 1.5f
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                ArtworkImage(session, subscription?.get("artwork_url") as? String, 48.dp)
                Column(Modifier.weight(1f)) {
                    Text(subscription?.get("title") as? String ?: stringResource(R.string.m4_removed_subscription))
                    if (large) Text(listened(seconds), style = MaterialTheme.typography.bodySmall)
                    Box(Modifier.padding(top = 6.dp).fillMaxWidth((seconds / most).toFloat().coerceIn(.02f, 1f)).height(6.dp).background(MaterialTheme.colorScheme.primary, RoundedCornerShape(3.dp)))
                }
                if (!large) Text(listened(seconds), style = MaterialTheme.typography.bodySmall)
            }
        }
        item { Section(stringResource(R.string.m4_about_stats), inset = 0.dp); Text(stringResource(R.string.m4_stats_about), style = MaterialTheme.typography.bodyMedium) }
    }
}
