package app.podlist.domain

object ViewSummary {
    enum class Status { Unplayed, Played, InProgress, Starred, NotStarred }

    fun statuses(filter: ViewFilter): List<Status> = buildList {
        filter.played?.let { add(when (it) {
            PlayedFilter.Unplayed -> Status.Unplayed
            PlayedFilter.Played -> Status.Played
            PlayedFilter.InProgress -> Status.InProgress
        }) }
        filter.starred?.let { add(if (it) Status.Starred else Status.NotStarred) }
    }

    fun compact(conditions: List<String>, more: (Int) -> String): String {
        val visible = conditions.take(3)
        return (visible + if (conditions.size > 3) listOf(more(conditions.size - 3)) else emptyList()).joinToString(" · ")
    }
}
