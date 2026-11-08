package app.podlist.domain

import java.time.Instant
import java.time.ZoneOffset
import kotlin.math.floor

object Listening {
    data class Sample(val at: Double, val position: Double)
    data class Measured(val day: String, val seconds: Double)

    fun sample(before: Sample?, after: Sample, speed: Double, offsetMinutes: Int): List<Measured> {
        if (before == null || speed <= 0) return emptyList()
        val elapsed = (after.at - before.at) / 1000
        val progress = (after.position - before.position) / speed
        if (elapsed <= 0 || elapsed > 30 || progress <= 0 || progress > elapsed + 1) return emptyList()
        val seconds = minOf(elapsed, progress)
        if (!seconds.isFinite()) return emptyList()
        val offset = offsetMinutes * 60_000.0
        val start = after.at - seconds * 1000
        val midnight = (floor((start - offset) / 86_400_000) + 1) * 86_400_000 + offset
        fun day(at: Double) = Instant.ofEpochMilli(floor(at - offset).toLong()).atOffset(ZoneOffset.UTC).toLocalDate().toString()
        return if (midnight >= after.at) listOf(Measured(day(start), seconds)) else listOf(
            Measured(day(start), (midnight - start) / 1000), Measured(day(after.at), (after.at - midnight) / 1000)
        )
    }

    fun add(log: ListeningLog, amounts: List<ListeningAmount>): ListeningLog {
        val next = log.toMutableMap()
        for (amount in amounts) {
            val subscriptions = next[amount.day] ?: emptyMap()
            next[amount.day] = subscriptions + (amount.subscriptionId to ((subscriptions[amount.subscriptionId] ?: 0.0) + amount.seconds))
        }
        return next
    }
}
