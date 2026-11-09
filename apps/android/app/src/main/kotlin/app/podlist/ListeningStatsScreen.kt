package app.podlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.podlist.domain.ListeningStats
import java.time.Instant
import java.time.ZoneId

@Composable
internal fun ListeningStatsScreen(data: ScreenData) {
    val stats = remember(data) { ListeningStats.calculate(data.state.listeningLog.orEmpty(), data.state.episodeStates.filterKeys { id -> data.episodes.any { it["id"] == id } }.values.mapNotNull { it.played }, Instant.now(), ZoneId.systemDefault()) }
    var table by rememberSaveable { mutableStateOf(false) }
    var selected by rememberSaveable { mutableIntStateOf(29) }
    if (stats.totals.all { it.seconds == 0.0 && it.finished == 0 }) { EmptyMessage(R.string.m4_no_listening); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(stringResource(R.string.m4_time_and_finished), style = MaterialTheme.typography.titleLarge) }
        items(stats.totals.withIndex().toList()) { (index, total) ->
            ElevatedCard(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) {
                Text(stringResource(listOf(R.string.m4_this_week, R.string.m4_this_month, R.string.m4_all_time)[index]), style = MaterialTheme.typography.titleMedium)
                Text(stringResource(R.string.m4_time_listened_value, duration(total.seconds)), style = MaterialTheme.typography.bodyLarge)
                Text(stringResource(R.string.m4_finished_count, total.finished))
            } }
        }
        item { Section(stringResource(R.string.m4_last_30)); Text(stringResource(R.string.m4_streak, stats.streak)); TextButton(onClick = { table = !table }) { Text(stringResource(if (table) R.string.m4_show_chart else R.string.m4_show_table)) } }
        if (table) {
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(stringResource(R.string.m4_day)); Text(stringResource(R.string.m4_time_listened)) } }
            items(stats.days) { day -> Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text(day.day.toString()); Text(duration(day.seconds)) } }
        } else item {
            val max = stats.days.maxOf { it.seconds }.coerceAtLeast(1.0)
            // Horizontal scroll keeps every day's touch target 48dp, even on a compact phone.
            val scroll = rememberScrollState()
            LaunchedEffect(Unit) { scroll.scrollTo(scroll.maxValue) }
            Row(Modifier.fillMaxWidth().horizontalScroll(scroll), verticalAlignment = Alignment.Bottom) {
                stats.days.forEachIndexed { index, day ->
                    val label = stringResource(R.string.m4_day_listening, day.day.toString(), duration(day.seconds))
                    Column(Modifier.width(48.dp).height(164.dp).clickable { selected = index }.semantics { contentDescription = label }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                        Box(Modifier.width(24.dp).height((day.seconds / max * 120).coerceAtLeast(2.0).dp).background(if (selected == index) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondaryContainer))
                        Text(day.day.dayOfMonth.toString(), Modifier.padding(top = 8.dp), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Text(stringResource(R.string.m4_day_listening, stats.days[selected].day.toString(), duration(stats.days[selected].seconds)), Modifier.padding(vertical = 12.dp))
        }
        item { Section(stringResource(R.string.m4_top_podcasts)) }
        items(stats.podcasts) { (id, seconds) -> ListItem(headlineContent = { Text(data.subscriptions.find { it["id"] == id }?.get("title") as? String ?: stringResource(R.string.m4_removed_subscription)) }, trailingContent = { Text(duration(seconds)) }) }
        item { Section(stringResource(R.string.m4_about_stats)); Text(stringResource(R.string.m4_stats_about), style = MaterialTheme.typography.bodySmall) }
    }
}
