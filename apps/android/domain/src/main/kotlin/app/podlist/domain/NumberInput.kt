package app.podlist.domain

import java.text.NumberFormat
import java.text.ParsePosition
import java.util.Locale

object NumberInput {
    fun parse(text: String, locale: Locale = Locale.getDefault()): Double? {
        val clean = text.trim()
        if (clean.isEmpty()) return null
        val position = ParsePosition(0)
        val number = NumberFormat.getNumberInstance(locale).apply { isGroupingUsed = false }.parse(clean, position)?.toDouble()
        return number?.takeIf { position.index == clean.length && it.isFinite() }
    }
    enum class Problem { Number, Minimum, WholeNumber, Maximum }

    fun problem(text: String, minimum: Double = 0.0, integer: Boolean = false): Problem? {
        if (text.isBlank()) return null
        val parsed = parse(text) ?: return Problem.Number
        return when {
            integer && parsed % 1 != 0.0 -> Problem.WholeNumber
            parsed < minimum -> Problem.Minimum
            integer && parsed > Int.MAX_VALUE -> Problem.Maximum
            else -> null
        }
    }

    fun valid(text: String, minimum: Double = 0.0, integer: Boolean = false): Boolean =
        problem(text, minimum, integer) == null

    fun format(value: Double, locale: Locale = Locale.getDefault()): String = NumberFormat.getNumberInstance(locale).apply {
        isGroupingUsed = false; maximumFractionDigits = 8
    }.format(value)
}

val PlaybackSpeeds = listOf(.75, .8, 1.0, 1.2, 1.25, 1.3, 1.5, 1.75, 2.0, 2.5, 3.0)
