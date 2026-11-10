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
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.stateDescription
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
                Text(stringResource(labels[index]), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
    val days = stats.days.map { it.day }
    var chosenDay by rememberSaveable { mutableStateOf(browsing?.context?.statsDay) }
    val chosen = ListeningPresentation.selectedDayIndex(chosenDay, days)
    fun choose(index: Int) { chosenDay = days[index].toString() }
    LaunchedEffect(chosenDay, days) {
        if (browsing != null && chosen >= 0) browsing.context = browsing.context.copy(statsDay = days[chosen].toString())
    }
    if (stats.totals.all { it.seconds == 0.0 && it.finished == 0 }) {
        EmptyState(R.string.m4_no_listening, R.string.find_something_to_play, onAction = findEpisodes)
        return
    }
    LazyColumn(state = rememberBrowsingListState(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { StatHeading(R.string.m4_time_listened, R.string.stats_time_help); PeriodTiles(stats.totals.map { listened(it.seconds) }) }
        item { StatHeading(R.string.m4_episodes_finished, R.string.stats_finished_help, R.string.stats_finished_changes); PeriodTiles(stats.totals.map { it.finished.toString() }) }
        item { StatHeading(R.string.listening_streak, R.string.stats_streak_help); Text(pluralStringResource(R.plurals.m4_streak, stats.streak, stats.streak)) }
        item { StatHeading(R.string.m4_last_30, R.string.stats_daily_help) }
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
            Text(stringResource(R.string.chart_minutes), Modifier.padding(bottom = 8.dp), style = MaterialTheme.typography.bodyMedium)
            val chartLabel = stringResource(R.string.listening_chart)
            val baseline = MaterialTheme.colorScheme.outlineVariant
            Row(Modifier.fillMaxWidth()) {
                Column(Modifier.height(144.dp).width(IntrinsicSize.Max).padding(end = 8.dp), verticalArrangement = Arrangement.SpaceBetween) {
                    Text(stringResource(R.string.chart_tick, (max / 60).toLong()), style = MaterialTheme.typography.bodyMedium, softWrap = false, maxLines = 1)
                    if (androidx.compose.ui.platform.LocalDensity.current.fontScale < 1.5f) Text(stringResource(R.string.chart_tick, (max / 120).toLong()), style = MaterialTheme.typography.bodyMedium, softWrap = false, maxLines = 1)
                    Text(stringResource(R.string.chart_tick, 0L), style = MaterialTheme.typography.bodyMedium, softWrap = false, maxLines = 1)
                }
                Column(Modifier.weight(1f)) {
                    androidx.compose.foundation.Canvas(Modifier.fillMaxWidth().height(144.dp).pointerInput(stats.days) { detectTapGestures { offset -> choose((offset.x / (size.width.toFloat() / stats.days.size)).toInt().coerceIn(stats.days.indices)) } }.semantics { contentDescription = chartLabel }) {
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
                        Text(chartDate(stats.days.first().day), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                        Text(chartDate(stats.days.last().day), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium,
                            textAlign = androidx.compose.ui.text.style.TextAlign.End)
                    }
                }
            }
            ContentDivider()
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                ActionIcon(R.drawable.ic_chevron_left, stringResource(R.string.previous_day), enabled = chosen > 0) { choose(chosen - 1) }
                Text(stringResource(R.string.m4_day_listening, chartDate(shown.day), listened(shown.seconds)), Modifier.weight(1f))
                ActionIcon(R.drawable.ic_chevron_right, stringResource(R.string.next_day), enabled = chosen < stats.days.lastIndex) { choose(chosen + 1) }
            }
        }
        item { ContentActionButton(onClick = { table = !table }) { Text(stringResource(if (table) R.string.m4_show_chart else R.string.m4_show_table)) } }
        item { StatHeading(R.string.m4_top_podcasts, R.string.stats_podcasts_help) }
        val most = stats.podcasts.maxOfOrNull { it.second }?.coerceAtLeast(1.0) ?: 1.0
        items(stats.podcasts) { (id, seconds) ->
            val subscription = data.subscriptions.find { it["id"] == id }
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                ArtworkImage(session, subscription?.get("artwork_url") as? String, 48.dp, placeholderTitle = subscription?.get("title") as? String)
                Column(Modifier.weight(1f)) {
                    Text(subscription?.get("title") as? String ?: stringResource(R.string.m4_removed_subscription))
                    Text(listened(seconds), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Box(Modifier.padding(top = 6.dp).fillMaxWidth((seconds / most).toFloat().coerceIn(.02f, 1f)).height(6.dp).background(MaterialTheme.colorScheme.primary, RoundedCornerShape(3.dp)))
                }
            }
        }
    }
}

/** Keep definitions beside the count they explain, available without a long About section. */
@Composable private fun StatHeading(label: Int, definition: Int, detail: Int? = null) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val expandedLabel = stringResource(R.string.definition_shown)
    val collapsedLabel = stringResource(R.string.definition_hidden)
    Column(Modifier.fillMaxWidth().padding(top = 12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(label), Modifier.weight(1f).semantics { heading() },
                style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            ActionIcon(R.drawable.ic_info, stringResource(R.string.stats_definition, stringResource(label)),
                modifier = Modifier.semantics { stateDescription = if (expanded) expandedLabel else collapsedLabel }) { expanded = !expanded }
        }
        if (expanded) {
            Text(stringResource(definition), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            detail?.let { Text(stringResource(it), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
}
