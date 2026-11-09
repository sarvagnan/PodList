package app.podlist.domain

import kotlin.math.ceil
import kotlin.math.log10
import kotlin.math.pow

object ListeningPresentation {
    const val unselectedBarAlpha = .72f

    data class Time(val hours: Long, val minutes: Long, val underMinute: Boolean)

    fun time(seconds: Double): Time {
        val minutes = (seconds.coerceAtLeast(0.0) / 60).toLong()
        return Time(minutes / 60, minutes % 60, seconds > 0 && minutes == 0L)
    }

    fun chartMaximum(seconds: Double): Double {
        val minutes = (seconds / 60).coerceAtLeast(1.0)
        val unit = 10.0.pow(log10(minutes).toInt())
        return ceil(minutes / unit) * unit * 60
    }

    fun barFraction(seconds: Double, maximum: Double): Float =
        (seconds / maximum.coerceAtLeast(1.0)).coerceIn(0.0, 1.0).toFloat()
}
