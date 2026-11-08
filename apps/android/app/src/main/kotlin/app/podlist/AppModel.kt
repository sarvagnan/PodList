package app.podlist

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.podlist.data.*
import java.io.IOException
import java.security.MessageDigest
import java.util.UUID
import javax.net.ssl.SSLException
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.SerializationException

enum class ConnectionError { Address, Offline, Tls, Server, Response }
enum class SyncStatus { Loading, Ready, Offline, Error }
data class Session(val address: ServerAddress, val db: LocalDatabase, val deviceId: String)

/** Process-local lifecycle adapter; all protocol decisions and durable data live in :data. */
class AppModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("connection", 0)
    private val _session = MutableStateFlow<Session?>(null)
    val session = _session.asStateFlow()
    val starting = MutableStateFlow(true)
    val status = MutableStateFlow(SyncStatus.Loading)
    val revision = MutableStateFlow(0L)
    val connecting = MutableStateFlow(false)
    val connectionError = MutableStateFlow<ConnectionError?>(null)
    private val triggers = Channel<Unit>(Channel.CONFLATED)
    private var worker: Job? = null
    private val sessions = mutableMapOf<String, Session>()
    private val connectivity = application.getSystemService(ConnectivityManager::class.java)
    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) { requestSync() }
        override fun onLost(network: Network) {
            if (connectivity.activeNetwork == null) status.value = SyncStatus.Offline
        }
    }

    init {
        connectivity.registerDefaultNetworkCallback(callback)
        viewModelScope.launch {
            try {
                preferences.getString("server", null)?.let { address ->
                    activate(ServerAddress.parse(address, BuildConfig.DEBUG))
                }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                connectionError.value = classify(error)
            } finally { starting.value = false }
        }
    }

    fun requestSync() { triggers.trySend(Unit) }

    fun connect(input: String, connected: () -> Unit) {
        viewModelScope.launch { if (connectChecked(input)) connected() }
    }

    private suspend fun connectChecked(input: String): Boolean {
        if (connecting.value) return false
        connecting.value = true
        connectionError.value = null
        return try {
            val address = ServerAddress.parse(input, BuildConfig.DEBUG)
            withContext(Dispatchers.IO) { checkHealth(HttpTransport(address)) }
            if (_session.value?.address?.origin != address.origin) activate(address)
            withContext(Dispatchers.IO) { check(preferences.edit().putString("server", address.origin).commit()) }
            requestSync()
            true
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            connectionError.value = classify(error)
            false
        } finally { connecting.value = false }
    }

    private suspend fun activate(address: ServerAddress) {
        val previous = _session.value
        val db = sessions[address.origin]?.db ?: withContext(Dispatchers.IO) {
            val digest = MessageDigest.getInstance("SHA-256").digest(address.origin.toByteArray()).joinToString("") { "%02x".format(it) }
            val installationId = preferences.getString("deviceId", null) ?: UUID.randomUUID().toString()
            val registeredAt = preferences.getLong("registeredAt", System.currentTimeMillis())
            check(preferences.edit().putString("deviceId", installationId).putLong("registeredAt", registeredAt).commit())
            LocalDatabase(getApplication<Application>().getDatabasePath("library-$digest.sqlite").also { it.parentFile?.mkdirs() }.path).also {
                it.ensureState()
                it.setMeta("deviceId", installationId)
                it.setMeta("registeredAt", registeredAt.toString())
            }
        }
        worker?.cancelAndJoin()
        previous?.db?.onChanged = null
        previous?.db?.onEdit = null
        db.onChanged = { revision.update { it + 1 } }
        db.onEdit = { requestSync() }
        val next = Session(address, db, withContext(Dispatchers.IO) { db.installation().id })
        sessions[address.origin] = next
        _session.value = next
        status.value = SyncStatus.Loading
        val client = SyncClient(db, HttpTransport(address))
        worker = viewModelScope.launch {
            // Startup is immediate. Thereafter timeout starts after each completed pass.
            while (isActive) {
                status.value = SyncStatus.Loading
                try {
                    withContext(Dispatchers.IO) { client.sync() }
                    status.value = SyncStatus.Ready
                } catch (error: Exception) {
                    if (error is CancellationException) throw error
                    status.value = if (classify(error) == ConnectionError.Offline) SyncStatus.Offline else SyncStatus.Error
                }
                revision.update { it + 1 }
                withTimeoutOrNull(60_000) { triggers.receive() }
                delay(2_000)
                while (triggers.tryReceive().isSuccess) { /* coalesce bursts */ }
            }
        }
    }

    override fun onCleared() {
        connectivity.unregisterNetworkCallback(callback)
        // viewModelScope cancellation waits for the blocking IO call before the database closes.
        val databases = sessions.values.map { it.db }
        worker?.invokeOnCompletion { databases.forEach { it.close() } }
        if (worker == null) databases.forEach { it.close() }
        super.onCleared()
    }
}

private fun classify(error: Exception): ConnectionError = when (error) {
    is SSLException -> ConnectionError.Tls
    is HttpFailure -> ConnectionError.Server
    is SerializationException, is SyncResponseFailure -> ConnectionError.Response
    is IllegalArgumentException -> ConnectionError.Address
    is IOException -> ConnectionError.Offline
    else -> ConnectionError.Response
}
