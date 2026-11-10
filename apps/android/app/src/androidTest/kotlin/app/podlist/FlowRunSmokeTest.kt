package app.podlist

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/** Placeholder so the instrumented test setup builds; the flow run replaces it. */
@RunWith(AndroidJUnit4::class)
class FlowRunSmokeTest {
    @Test fun targetsTheApp() {
        assertEquals("app.podlist", InstrumentationRegistry.getInstrumentation().targetContext.packageName)
    }
}
