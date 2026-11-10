@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package app.podlist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import java.text.NumberFormat

/** The agreed offer, progress, partial and done states, with durable progress owned by :data. */
@Composable
internal fun BringOverScreen(model: AppModel, ui: BringOverUi) {
    BackHandler(onBack = model::dismissBringOver)
    val job = ui.job
    val counts = ui.counts
    val complete = job?.complete == true
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    Scaffold(modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            PodListTopAppBar(scrollBehavior = scrollBehavior, title = { Text(stringResource(R.string.bring_over_title), Modifier.semantics { heading() }) }, navigationIcon = {
                ActionIcon(R.drawable.ic_back, stringResource(R.string.back), action = model::dismissBringOver)
            })
        },
        bottomBar = {
            FlowRow(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp, androidx.compose.ui.Alignment.End)) {
                when {
                    complete -> Button(onClick = model::dismissBringOver, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.m4_step_done)) }
                    job == null -> {
                        OutlinedButton(onClick = model::dismissBringOver, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.bring_over_not_now)) }
                        Button(onClick = model::beginBringOver, enabled = !ui.running, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.bring_over_action)) }
                    }
                    else -> {
                        OutlinedButton(onClick = model::dismissBringOver, modifier = Modifier.heightIn(min = 48.dp)) { Text(stringResource(R.string.bring_over_keep_using)) }
                        if (!ui.running) Button(onClick = model::retryBringOver, modifier = Modifier.heightIn(min = 48.dp)) {
                            val feeds = job.issues.map { it.feedUrl }.distinct().size
                            Text(if (feeds > 0) pluralStringResource(R.plurals.bring_over_retry_feeds, feeds, feeds) else stringResource(R.string.retry))
                        }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(bottom = 16.dp)) {
            item {
                when {
                    complete -> {
                        Text(stringResource(R.string.bring_over_complete), Modifier.padding(16.dp), style = MaterialTheme.typography.headlineSmall)
                        Hint(stringResource(R.string.bring_over_complete_help, ui.origin))
                    }
                    job == null -> Hint(stringResource(R.string.bring_over_offer, ui.origin))
                    else -> {
                        Text(stringResource(if (job.issues.isNotEmpty()) R.string.bring_over_partial else R.string.bring_over_moving), Modifier.padding(16.dp), style = MaterialTheme.typography.headlineSmall)
                        if (ui.running) LinearProgressIndicator(Modifier.fillMaxWidth().padding(horizontal = 16.dp).then(ProgressModifier(R.string.bring_over_moving)))
                        Hint(pluralStringResource(R.plurals.bring_over_subscription_progress, counts.subscriptions, job.subscribed.size, counts.subscriptions))
                        Hint(stringResource(when (job.phase) {
                            "operations" -> R.string.bring_over_replaying
                            "downloads" -> R.string.bring_over_copying_downloads
                            else -> R.string.bring_over_resumable
                        }))
                    }
                }
                if (ui.error) InlineError(stringResource(if (job?.phase == "downloads") R.string.bring_over_download_error else R.string.bring_over_error),
                    Modifier.padding(16.dp))
            }
            item {
                ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(pluralStringResource(R.plurals.bring_over_subscriptions, counts.subscriptions, counts.subscriptions)) },
                    supportingContent = { Text(stringResource(R.string.bring_over_subscription_help)) })
                ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(pluralStringResource(R.plurals.playlist_count, counts.playlists, counts.playlists)) },
                    supportingContent = { Text(stringResource(R.string.bring_over_playlist_help, pluralStringResource(R.plurals.entry_count, counts.entries, counts.entries))) })
                ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(stringResource(R.string.bring_over_marks)) }, supportingContent = {
                    Text(stringResource(R.string.bring_over_mark_counts,
                        pluralStringResource(R.plurals.bring_over_played, counts.played, counts.played),
                        pluralStringResource(R.plurals.bring_over_starred, counts.starred, counts.starred)))
                })
                ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(stringResource(R.string.bring_over_listening_log)) },
                    supportingContent = { Text(stringResource(R.string.bring_over_time, listened(counts.listeningSeconds.toDouble()))) })
            }
            if (job != null && job.issues.isNotEmpty()) {
                item { Section(stringResource(R.string.bring_over_waiting)); Hint(stringResource(R.string.bring_over_waiting_help)) }
                job.issues.forEachIndexed { index, issue -> item(key = "issue:$index") {
                    ListItem(colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent), headlineContent = { Text(issue.title) }, supportingContent = { Column {
                        Text(issue.feedUrl)
                        Text(stringResource(when (issue.kind) {
                            "episode" -> R.string.bring_over_unmatched_episode
                            "subscription" -> R.string.bring_over_removed_subscription
                            else -> R.string.bring_over_failed_feed
                        }))
                    } })
                } }
            }
            item {
                Section(stringResource(R.string.bring_over_what_happens))
                Hint(stringResource(R.string.bring_over_explanation))
                Hint(stringResource(R.string.bring_over_other_edits))
            }
        }
    }
}
