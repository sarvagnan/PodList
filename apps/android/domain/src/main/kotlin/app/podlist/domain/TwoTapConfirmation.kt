package app.podlist.domain

/** Transient UI confirmation. Times use a monotonic clock; ignored rapid taps never extend it. */
data class TwoTapConfirmation(val armedAtMillis: Long? = null, val expiresAtMillis: Long = 0) {
    val isArmed: Boolean get() = armedAtMillis != null

    fun arm(nowMillis: Long, timeoutMillis: Long) = TwoTapConfirmation(nowMillis, nowMillis + timeoutMillis)
    fun disarm() = TwoTapConfirmation()
    fun isArmedAt(nowMillis: Long): Boolean = isArmed && nowMillis < expiresAtMillis
    fun canConfirm(nowMillis: Long, doubleTapTimeoutMillis: Long): Boolean =
        isArmedAt(nowMillis) && nowMillis - requireNotNull(armedAtMillis) > doubleTapTimeoutMillis
}
