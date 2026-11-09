package app.podlist.domain

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

data class ListeningTotal(val seconds: Double, val finished: Int)
data class ListeningDay(val day: LocalDate, val seconds: Double)
data class ListeningStats(val totals: List<ListeningTotal>, val days: List<ListeningDay>, val streak: Int, val podcasts: List<Pair<String, Double>>) {
    companion object {
        /** Logged days keep their original Device calendar; Played timestamps use this Device's zone. */
        fun calculate(log: ListeningLog, played: List<Played>, now: Instant, zone: ZoneId): ListeningStats {
            val today = now.atZone(zone).toLocalDate()
            val starts = listOf(today.minusDays(today.dayOfWeek.value - 1L), today.withDayOfMonth(1), null)
            val totals = starts.map { start ->
                ListeningTotal(log.filterKeys { start == null || (it >= start.toString() && it <= today.toString()) }.values.sumOf { it.values.sum() },
                    played.count { it.source is PlayedSource.Playback && it.at <= now.toEpochMilli() && (start == null || Instant.ofEpochMilli(it.at).atZone(zone).toLocalDate() >= start) })
            }
            fun seconds(day: LocalDate) = log[day.toString()].orEmpty().values.sum()
            val days = (29L downTo 0L).map { today.minusDays(it).let { day -> ListeningDay(day, seconds(day)) } }
            var cursor = if (seconds(today) > 0) today else today.minusDays(1)
            var streak = 0
            while (seconds(cursor) > 0) { streak++; cursor = cursor.minusDays(1) }
            val podcasts = mutableMapOf<String, Double>()
            log.values.forEach { amounts -> amounts.forEach { (id, amount) -> podcasts[id] = (podcasts[id] ?: 0.0) + amount } }
            return ListeningStats(totals, days, streak, podcasts.toList().filter { it.second > 0 }.sortedWith(compareByDescending<Pair<String, Double>> { it.second }.thenBy { it.first }))
        }
    }
}

object PlaylistNames {
    enum class Problem { Empty, Duplicate }
    fun validate(name: String, playlists: List<Playlist>, excluding: String? = null): Problem? = when {
        name.trim().isEmpty() -> Problem.Empty
        playlists.any { it.id != excluding && it.name.equals(name.trim(), ignoreCase = true) } -> Problem.Duplicate
        else -> null
    }
}
