package app.podlist

import android.app.Application
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

/** A single owner for the Activity, MediaLibraryService and background download workers.
 * Databases outlive Activities so rotating or leaving the UI never stops playback.
 */
class PodListApplication : Application() {
    internal val playbackWrites by lazy {
        PlaybackWrites(CoroutineScope(SupervisorJob())) { android.util.Log.e("PodList", "Could not save playback", it) }
    }

    private val modelOwner = lazy { AppModel(this) }
    internal val modelInitialized: Boolean get() = modelOwner.isInitialized()
    val model: AppModel by modelOwner
}
