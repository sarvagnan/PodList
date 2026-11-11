package app.podlist

import android.app.Application

/** A single owner for the Activity, MediaLibraryService and background download workers.
 * Databases outlive Activities so rotating or leaving the UI never stops playback.
 */
class PodListApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        applyLaunchAppearance(app.podlist.data.DeviceSettingsStore(java.io.File(filesDir, "device-settings.properties")).appearance)
    }
    private val modelOwner = lazy { AppModel(this) }
    internal val modelInitialized: Boolean get() = modelOwner.isInitialized()
    val model: AppModel by modelOwner
}
