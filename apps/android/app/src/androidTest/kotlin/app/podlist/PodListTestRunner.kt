package app.podlist

import android.app.Application
import android.content.Context
import androidx.test.runner.AndroidJUnitRunner
import java.io.File

/** Clear the previous installation before providers, WorkManager or Application can cache it.
 * Deleting their databases from a JUnit rule is too late: those owners already exist by then.
 */
class PodListTestRunner : AndroidJUnitRunner() {
    override fun newApplication(cl: ClassLoader, className: String, context: Context): Application {
        clearStorage(context)
        clearStorage(context.createDeviceProtectedStorageContext())
        return super.newApplication(cl, className, context)
    }

    private fun clearStorage(context: Context) {
        listOf("files", "databases", "shared_prefs", "no_backup", "datastore", "cache", "code_cache")
            .map { File(context.dataDir, it) }.forEach(::deleteContents)
    }

    private fun deleteContents(directory: File) {
        if (!directory.exists()) return
        val children = checkNotNull(directory.listFiles()) { "Cannot list $directory" }
        children.forEach { check(it.deleteRecursively()) { "Cannot clear $it" } }
    }
}
