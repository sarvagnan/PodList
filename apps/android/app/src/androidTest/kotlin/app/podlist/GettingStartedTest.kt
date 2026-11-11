package app.podlist

import androidx.compose.runtime.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import app.podlist.data.*
import app.podlist.domain.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GettingStartedTest {
    @get:Rule val compose = createComposeRule()

    @Test fun reopenedIntroductionKeepsNumberedPointsAndAllHelpWithSubscriptionsAndEntries() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState(); db.initializeStandalone()
            db.upsertLibrary(listOf(Subscription("s", "https://podcast.test/rss", "Podcast", null, null, null, 0, null, null, PlaybackSettingsOverride())), emptyList())
            db.record(Change.AddEntry("default", "e", Placement.Last), 100)
            db.reopenGettingStarted()
            val data = readScreen(db, null)
            val session = Session(DeviceLibrary(db), db, "test")
            compose.setContent { PodListTheme(Appearance.Light) { GettingStarted(data, session) {} } }
            for (number in listOf("1", "2", "3")) compose.onNodeWithText(number).assertExists()
            for (key in listOf(R.string.m4_step_podcasts_help, R.string.m4_step_views_help, R.string.m4_step_playlists_help)) {
                val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
                compose.onNodeWithText(context.getString(key)).assertExists()
            }
            compose.onNodeWithContentDescription("Done").assertDoesNotExist()
            compose.onAllNodes(hasText("(done)", substring = true, ignoreCase = true)).assertCountEquals(0)
            compose.onNodeWithText("Show help for completed steps").assertDoesNotExist()
        }
    }

    @Test fun secondViewHasNoIntroductionAndReturningHomeKeepsIt() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState(); db.initializeStandalone()
            var data by mutableStateOf(readScreen(db, null, addFlowOpen = false))
            val session = Session(DeviceLibrary(db), db, "test")
            compose.setContent { PodListTheme(Appearance.Light) { GettingStarted(data, session) {} } }
            compose.onNodeWithText("Getting started").assertExists()
            val second = data.state.views[1].id
            compose.runOnIdle { data = readScreen(db, "view:$second", addFlowOpen = false) }
            compose.onNodeWithText("Getting started").assertDoesNotExist()
            compose.runOnIdle { db.reopenGettingStarted(); data = readScreen(db, "view:$second", addFlowOpen = false) }
            compose.onNodeWithText("Getting started").assertDoesNotExist()
            compose.runOnIdle { data = readScreen(db, null, addFlowOpen = false) }
            compose.onNodeWithText("Getting started").assertExists()
        }
    }

}
