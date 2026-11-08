package app.podlist.domain

import kotlin.math.abs

/** Pure accounting of a loaded Entry's measurement boundaries and reports; no audio or platform APIs.
 * The adapter durably records each returned batch before delivering the next event.
 */
class ListeningSession(
    private val playlistId: String,
    private val episodeId: String,
    private val subscriptionId: String?,
    initialPosition: Double,
    initialSpeed: Double,
    initialDuration: Double?,
    private val threshold: Double? = null,
    private val reportEveryMillis: Long = 15_000,
    initialAt: Long = 0
) {
    sealed interface Event {
        data object Play : Event
        data object Pause : Event
        data class Position(val seconds: Double, val duration: Double?) : Event
        data class Seek(val seconds: Double) : Event
        data class Speed(val value: Double) : Event
        data object Discontinuity : Event
        data object Failure : Event
        data object Ended : Event
        data object Flush : Event
    }

    private var position = initialPosition
    private var speed = initialSpeed
    private var duration = initialDuration
    private var playing = false
    private var finished = false
    private var before: Listening.Sample? = null
    private var pending = emptyList<ListeningAmount>()
    private var lastReportAt = initialAt
    private var lastReportPosition = initialPosition

    fun accept(event: Event, at: Long, offsetMinutes: Int): List<Change> {
        val changes = mutableListOf<Change>()
        fun report() {
            if (finished && pending.isEmpty()) return
            if (abs(position - lastReportPosition) < 1 && pending.isEmpty()) return
            lastReportAt = at
            lastReportPosition = position
            changes += if (finished) Change.RecordListening(pending) else Change.ReportPosition(
                playlistId, episodeId, maxOf(0.0, position), at, pending.takeIf { it.isNotEmpty() }
            )
            pending = emptyList()
        }
        fun finish() {
            if (finished) return
            report()
            finished = true
            changes += Change.MarkPlayed(episodeId, PlayedSource.Playback(playlistId))
        }
        when (event) {
            Event.Play -> { playing = true; before = Listening.Sample(at.toDouble(), position) }
            Event.Pause -> { playing = false; before = null; report() }
            Event.Discontinuity -> before = null
            Event.Failure -> { playing = false; before = null }
            is Event.Position -> {
                val after = Listening.Sample(at.toDouble(), event.seconds)
                if (playing && subscriptionId != null) {
                    pending = pending + Listening.sample(before, after, speed, offsetMinutes).map {
                        ListeningAmount(it.day, subscriptionId, it.seconds)
                    }
                }
                before = if (playing) after else null
                position = event.seconds
                duration = event.duration ?: duration
                if (PlayedRules.isFinished(position, duration, threshold)) finish()
                if (playing && at - lastReportAt >= reportEveryMillis) report()
            }
            is Event.Seek -> {
                report()
                before = null
                position = maxOf(0.0, minOf(event.seconds, duration ?: event.seconds))
                report()
            }
            is Event.Speed -> { report(); before = null; speed = event.value }
            Event.Ended -> { report(); finish(); playing = false; before = null }
            Event.Flush -> report()
        }
        return changes
    }
}
