package app.podlist.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RefreshSummary(val checked: Int, val updated: Int, val notModified: Int, val failed: Int) {
    init {
        require(updated >= 0 && notModified >= 0 && failed >= 0)
        require(checked.toLong() == updated.toLong() + notModified + failed)
    }
}

@Serializable
internal sealed interface SubscriptionRefreshResult {
    @Serializable
    @SerialName("Updated")
    data class Updated(val added: Int, val changed: Int) : SubscriptionRefreshResult

    @Serializable
    @SerialName("NotModified")
    data object NotModified : SubscriptionRefreshResult
}

class SubscriptionNotFound(cause: Exception? = null) : Exception("Subscription not found", cause)
class PublisherRefreshFailed(cause: Exception) : Exception("Could not refresh the publisher feed", cause)
