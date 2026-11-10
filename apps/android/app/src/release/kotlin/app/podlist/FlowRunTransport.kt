package app.podlist

import app.podlist.data.HttpTransport
import app.podlist.data.ServerAddress
import app.podlist.data.SyncTransport

// No test hook or added latency in release builds.
internal fun flowRunTransport(address: ServerAddress, subscriptionReadTimeoutMillis: Int = 2_000): SyncTransport =
    HttpTransport(address, subscriptionReadTimeoutMillis)
