package app.podlist.domain

data class DownloadEpisode(val id: String, val subscriptionId: String, val published: Long, val entry: Boolean, val played: Boolean, val starred: Boolean)
data class StoredDownload(val episodeId: String, val manual: Boolean)
data class DownloadPlan(val fetch: List<String>, val discard: List<String>, val legacySince: Map<String, Long>)

/** Rules consume State and Library facts, including orphaned stored Episodes. No platform or clock. */
object DownloadPlanner {
    fun plan(deviceId: String, rules: List<DownloadRule>, episodes: List<DownloadEpisode>, stored: List<StoredDownload>, legacySince: Map<String, Long>, now: Long): DownloadPlan {
        val mine = rules.filter { it.deviceId == deviceId }
        val legacy = mine.filter { it.mode == DownloadMode.AllNew && it.since == null }
            .associate { it.subscriptionId to (legacySince[it.subscriptionId] ?: now) }
        val wanted = linkedSetOf<String>()
        val bySubscription = episodes.groupBy { it.subscriptionId }
        for (rule in mine) {
            if (rule.mode == DownloadMode.Never) continue
            val own = bySubscription[rule.subscriptionId].orEmpty()
            own.filter { it.entry && !it.played }.forEach { wanted += it.id }
            if (rule.mode == DownloadMode.AllNew) {
                val fresh = own.filter { !it.entry && !it.played && it.published >= (rule.since ?: legacy.getValue(rule.subscriptionId)) }.sortedByDescending { it.published }
                (rule.keepAtMost?.let { fresh.take(it.coerceIn(0, Int.MAX_VALUE.toLong()).toInt()) } ?: fresh).forEach { wanted += it.id }
            }
        }
        val storedIds = stored.map { it.episodeId }.toSet()
        val starred = episodes.filter { it.starred }.map { it.id }.toSet()
        return DownloadPlan(wanted.filter { it !in storedIds }, stored.filter { !it.manual && it.episodeId !in wanted && it.episodeId !in starred }.map { it.episodeId }, legacy)
    }
}
