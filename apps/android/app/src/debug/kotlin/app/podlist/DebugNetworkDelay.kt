package app.podlist

import app.podlist.data.HttpTransport
import app.podlist.data.ServerAddress
import app.podlist.data.SyncTransport
import java.util.concurrent.atomic.AtomicInteger

/** Instrumentation-only completion delay, after real HTTP IO, never on the UI thread.
 * Zero by default; sampled once per request so changing it cannot affect an in-flight request.
 * The release source set supplies a plain transport and contains none of this state.
 */
object DebugNetworkDelay {
    @Volatile var millis: Long = 0
    @Volatile var holdSubscriptionCompletion: Boolean = false
    val pending = AtomicInteger(0)
}

internal fun flowRunTransport(address: ServerAddress, subscriptionReadTimeoutMillis: Int = 2_000): SyncTransport {
    val http = HttpTransport(address, subscriptionReadTimeoutMillis)
    return SyncTransport { method, path, body ->
        val delay = DebugNetworkDelay.millis.coerceIn(0, 5_000)
        DebugNetworkDelay.pending.incrementAndGet()
        try {
            val response = http.request(method, path, body)
            if (method == "POST" && path == "/api/subscriptions") {
                while (DebugNetworkDelay.holdSubscriptionCompletion) Thread.sleep(16)
            }
            if (delay > 0) Thread.sleep(delay)
            response
        } finally {
            DebugNetworkDelay.pending.decrementAndGet()
        }
    }
}
