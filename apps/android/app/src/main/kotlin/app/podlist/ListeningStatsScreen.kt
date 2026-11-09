package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable private fun listened(seconds: Double): String {
    val minutes = (seconds / 60).toLong()
    return when {
        minutes >= 60 -> stringResource(R.string.m4_hours_minutes, minutes / 60, minutes % 60)
        minutes >= 1 -> stringResource(R.string.m4_minutes_short, minutes)
        seconds > 0 -> stringResource(R.string.m4_under_minute)
        else -> stringResource(R.string.m4_minutes_short, 0)
    }
}

private val dayFormat: DateTimeFormatter get() = DateTimeFormatter.ofPattern("d MMM", Locale.getDefault())

@Composable private fun PeriodTiles(values: List<String>) {
    val labels = listOf(R.string.m4_this_week, R.string.m4_this_month, R.string.m4_all_time)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        values.forEachIndexed { index, value ->
            Surface(Modifier.weight(1f), shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerLow) {
                Column(Modifier.padding(12.dp)) {
                    Text(stringResource(labels[index]), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(value, style = MaterialTheme.typography.titleLarge)
                }
            }
        }
    }
}

@Composable
internal fun ListeningStatsScreen(data: ScreenData, session: Session) {
    val stats = remember(data) { ListeningStats.calculate(data.state.listeningLog.orEmpty(), data.state.episodeStates.filterKeys { id -> data.episodes.any { it["id"] == id } }.values.mapNotNull { it.played }, Instant.now(), ZoneId.systemDefault()) }
    var table by rememberSaveable { mutableStateOf(false) }
    var chosen by rememberSaveable { mutableIntStateOf(-1) }
    if (stats.totals.all { it.seconds == 0.0 && it.finished == 0 }) { EmptyMessage(R.string.m4_no_listening); return }
    LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Section(stringResource(R.string.m4_time_listened), inset = 0.dp); PeriodTiles(stats.totals.map { listened(it.seconds) }) }
        item { Section(stringResource(R.string.m4_episodes_finished), inset = 0.dp); PeriodTiles(stats.totals.map { it.finished.toString() }) }
        item { Section(stringResource(R.string.m4_last_30), inset = 0.dp); Text(pluralStringResource(R.plurals.m4_streak, stats.streak, stats.streak)) }
        if (table) {
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(stringResource(R.string.m4_day)); Text(stringResource(R.string.m4_time_listened)) } }
            items(stats.days.asReversed()) { day -> Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text(day.day.format(dayFormat)); Text(listened(day.seconds)) } }
        } else item {
            val max = stats.days.maxOf { it.seconds }.coerceAtLeast(1.0)
            val shown = stats.days[if (chosen < 0) stats.days.lastIndex else chosen]
            val primary = MaterialTheme.colorScheme.primary
            // All 30 days stay in view. The table below gives each day a full-size row.
            Row(Modifier.fillMaxWidth().height(132.dp), horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.Bottom) {
                stats.days.forEachIndexed { index, day ->
                    val label = stringResource(R.string.m4_day_listening, day.day.format(dayFormat), listened(day.seconds))
                    Box(Modifier.weight(1f).fillMaxHeight().clickable { chosen = index }.semantics { contentDescription = label }, contentAlignment = Alignment.BottomCenter) {
                        if (day.seconds > 0) Box(Modifier.fillMaxWidth().height((day.seconds / max * 132).dp).background(if (chosen < 0 || chosen == index) primary else primary.copy(alpha = .34f), RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp)))
                    }
                }
            }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stats.days.first().day.format(dayFormat), style = MaterialTheme.typography.labelSmall)
                Text(stats.days.last().day.format(dayFormat), style = MaterialTheme.typography.labelSmall)
            }
            Text(stringResource(R.string.m4_day_listening, shown.day.format(dayFormat), listened(shown.seconds)), Modifier.padding(top = 8.dp))
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
