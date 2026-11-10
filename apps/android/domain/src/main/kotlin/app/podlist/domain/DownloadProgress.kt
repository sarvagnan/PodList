package app.podlist.domain

/** Each transfer maps independently, including concurrent downloads and publisher lengths above 2 GiB. */
data class DownloadProgress(val received: Long, val total: Long) {
    val indeterminate: Boolean get() = total <= 0
    val boundedReceived: Long get() = if (indeterminate) received.coerceAtLeast(0) else received.coerceIn(0, total)
    val fraction: Float get() = if (indeterminate) 0f else (boundedReceived.toDouble() / total).toFloat()
    val maximum: Int get() = if (indeterminate) 0 else 10_000
    val progress: Int get() = (fraction * maximum).toInt().coerceIn(0, maximum)
}
