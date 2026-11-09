package app.podlist.data

import app.podlist.domain.*

/** A successful State AND Library read is required before deciding whether a Library is fresh. */
fun LocalDatabase.initializeGettingStarted() = transaction {
    val ready = getMeta("starterViewsMade") != null || (getMeta("userCursor") != null && getMeta("catalogueCursor") != null)
    if (!ready || getMeta("gettingStartedChecked") != null) return@transaction
    val fresh = query("SELECT id FROM subscription WHERE unsubscribed_at IS NULL LIMIT 1").isEmpty()
    if (fresh && getMeta("gettingStartedHidden") != "true") {
        if (getMeta("starterViewsMade") == null) {
            if (loadState().views.isEmpty()) recordAll(listOf(
                View("starter-new-this-week", "New this week", ViewFilter(published = PublishedFilter.LastDays(7), played = PlayedFilter.Unplayed), ViewSort.PublishedDesc, null),
                View("starter-under-30", "Under 30 minutes", ViewFilter(played = PlayedFilter.Unplayed, maxDuration = 1800.0), ViewSort.DurationAsc, null),
                View("starter-starred", "Starred", ViewFilter(starred = true), ViewSort.PublishedDesc, null)
            ).map { Change.SaveView(it) }, System.currentTimeMillis())
            setMeta("starterViewsMade", "true")
        }
        setMeta("gettingStartedBegun", "true")
    }
    setMeta("gettingStartedChecked", "true")
}

/** Completion is remembered even when later listening empties a Playlist or a Subscription leaves. */
fun LocalDatabase.updateGettingStartedProgress() = transaction {
    if (getMeta("starterViewsMade") == null && (getMeta("userCursor") == null || getMeta("catalogueCursor") == null)) return@transaction
    val previous = getMeta("gettingStartedSteps")?.toIntOrNull() ?: 0
    var steps = previous
    if (query("SELECT id FROM subscription WHERE unsubscribed_at IS NULL LIMIT 1").isNotEmpty()) steps = steps or 1
    val state = loadState()
    if (state.views.isNotEmpty()) steps = steps or 2
    if (state.playlists.any { it.entries.isNotEmpty() }) steps = steps or 4
    if (steps != previous) setMeta("gettingStartedSteps", steps.toString())
}
