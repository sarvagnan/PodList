package app.podlist.domain

object ViewEdits {
    enum class Problem { LengthRange, DateRange }
    fun problem(filter: ViewFilter): Problem? {
        if (filter.minDuration != null && filter.maxDuration != null && filter.minDuration > filter.maxDuration) return Problem.LengthRange
        val published = filter.published as? PublishedFilter.Between
        if (published?.from != null && published.to != null && published.from > published.to) return Problem.DateRange
        return null
    }
    fun podcasts(mode: PodcastMode?, ids: List<String>): PodcastFilter? = if (mode == null || ids.isEmpty()) null else PodcastFilter(mode, ids.distinct())
}
