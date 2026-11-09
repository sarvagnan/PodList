package app.podlist

import android.content.Context
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.work.*
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

internal fun scheduleFeedRefresh(context: Context) {
    val network = NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN).build()
    val request = PeriodicWorkRequestBuilder<FeedRefreshWorker>(30, TimeUnit.MINUTES)
        .setConstraints(Constraints.Builder().setRequiredNetworkRequest(network, NetworkType.CONNECTED).build()).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork("standalone-feeds", ExistingPeriodicWorkPolicy.KEEP, request)
}
class FeedRefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val model = (applicationContext as PodListApplication).model
        val session = withContext(Dispatchers.Main) { model.sessionFor(null) }
        return try {
            withContext(Dispatchers.IO) { session.source.refresh() }
            Result.success()
        } catch (error: CancellationException) { throw error }
        catch (_: Exception) { Result.retry() }
    }
}
