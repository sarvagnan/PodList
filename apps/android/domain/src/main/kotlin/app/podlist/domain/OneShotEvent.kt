package app.podlist.domain

/** Kept by the model so a new Activity cannot consume the same request again. */
class OneShotEvent<T>(private val value: T) {
    private var consumed = false

    @Synchronized
    fun take(): T? {
        if (consumed) return null
        consumed = true
        return value
    }
}
