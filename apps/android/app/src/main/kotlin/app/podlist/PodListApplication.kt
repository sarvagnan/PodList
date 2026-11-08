package app.podlist

import android.app.Application

/** A single owner for the Activity, MediaLibraryService and background download workers.
 * Databases outlive Activities so rotating or leaving the UI never stops playback.
 */
class PodListApplication : Application() {
    val model: AppModel by lazy { AppModel(this) }
}
