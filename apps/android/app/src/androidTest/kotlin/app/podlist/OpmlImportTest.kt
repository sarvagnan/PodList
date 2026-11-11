package app.podlist

import android.app.Application
import android.content.Context
import android.content.ContextWrapper
import java.util.UUID
import android.net.Uri
import androidx.lifecycle.ViewModelStore
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.podlist.data.*
import java.io.File
import java.io.IOException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

private class ImportTestApplication(context: Context) : Application() {
    init {
        val prefix = "opml-test-${UUID.randomUUID()}-"
        attachBaseContext(object : ContextWrapper(context) {
            override fun getSharedPreferences(name: String, mode: Int) = super.getSharedPreferences(prefix + name, mode)
        })
    }
}

/** Exercises the real app-owned actions; the consumer can disappear without owning the job. */
@RunWith(AndroidJUnit4::class)
class OpmlImportTest {
    @Test fun previewConfirmDismissRetryDuplicatesAndRestart() {
        val application = ImportTestApplication(ApplicationProvider.getApplicationContext<Application>())
        val main = InstrumentationRegistry.getInstrumentation()
        val store = ViewModelStore()
        lateinit var model: AppModel
        main.runOnMainSync { model = AppModel(application); store.put("opml-test", model) }
        val db = LocalDatabase(":memory:", standalone = true)
        db.ensureState()
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)
        val failing = AtomicBoolean(true)
        val calls = java.util.Collections.synchronizedList(mutableListOf<String>())
        val source = DeviceLibrary(db, PublisherTransport { url, _ ->
            calls += url
            if (url.endsWith("/good")) { entered.countDown(); check(release.await(10, TimeUnit.SECONDS)) }
            if (url.endsWith("/bad") && failing.get()) throw IOException()
            PublisherResponse(200, "<rss><channel><title>Podcast</title></channel></rss>")
        })
        val session = Session(source, db, "opml-test")
        val actions = OpmlActions(model, session, application.contentResolver)
        val file = File(application.cacheDir, "opml-test.opml")
        file.writeText("<opml><body><outline xmlUrl='https://test/good'/><outline xmlUrl='https://test/bad'/><outline xmlUrl='https://test/good'/></body></opml>")
        fun waitFor(condition: () -> Boolean) {
            val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10)
            while (!condition()) { check(System.nanoTime() < deadline) { "Import timed out: ${actions.state.value}" }; Thread.sleep(10) }
        }
        try {
            main.runOnMainSync { actions.read(Uri.fromFile(file)) }
            waitFor { !actions.state.value.busy }
            assertEquals(2, actions.state.value.selection!!.urls.size)
            assertEquals(0, actions.state.value.selection!!.existing)
            assertTrue(calls.isEmpty())
            main.runOnMainSync { actions.cancelSelection() }
            assertNull(actions.state.value.selection)
            main.runOnMainSync { actions.read(Uri.fromFile(file)) }
            waitFor { !actions.state.value.busy }
            main.runOnMainSync { actions.confirm() }
            assertTrue(entered.await(10, TimeUnit.SECONDS))
            assertEquals(0, actions.state.value.progress!!.processed)
            assertEquals(2, actions.state.value.progress!!.total)
            // No Settings or Add podcasts consumer is mounted while this job completes.
            release.countDown()
            waitFor { !actions.state.value.busy }
            assertEquals(2, actions.state.value.progress!!.processed)
            assertEquals(1, actions.state.value.summary!!.added)
            assertEquals(LookupError.Offline, actions.state.value.summary!!.failed.single().error)
            failing.set(false)
            main.runOnMainSync { actions.retryFailed() }
            waitFor { !actions.state.value.busy }
            assertTrue(actions.state.value.summary!!.failed.isEmpty())
            assertEquals(1, calls.count { it.endsWith("/good") })
            assertEquals(2, calls.count { it.endsWith("/bad") })
            main.runOnMainSync { actions.read(Uri.fromFile(file)) }
            waitFor { !actions.state.value.busy }
            assertEquals(2, actions.state.value.selection!!.existing)
            main.runOnMainSync { actions.confirm() }
            waitFor { !actions.state.value.busy }
            assertEquals(2, actions.state.value.summary!!.alreadySubscribed)
            assertEquals(3, calls.size)
            db.setMeta("opmlPending", file.readText()); db.setMeta("opmlName", file.name)
            val relaunched = OpmlActions(model, session, application.contentResolver)
            main.runOnMainSync { relaunched.resumeSaved() }
            waitFor { relaunched.state.value.progress?.processed == 2 && !relaunched.state.value.busy }
            assertEquals(2, relaunched.state.value.summary!!.alreadySubscribed)
            assertEquals(3, calls.size)
            file.writeText("<broken>")
            main.runOnMainSync { actions.read(Uri.fromFile(file)) }
            waitFor { !actions.state.value.busy }
            assertNull(actions.state.value.selection)
            assertNotNull(actions.state.value.error)
        } finally {
            release.countDown()
            main.runOnMainSync { store.clear() }
            file.delete(); db.close()
        }
    }
}
