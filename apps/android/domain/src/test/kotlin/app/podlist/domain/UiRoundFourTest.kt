package app.podlist.domain

import java.io.File
import javax.xml.parsers.DocumentBuilderFactory
import org.junit.jupiter.api.Test
import kotlin.test.*

class UiRoundFourTest {
    @Test fun `model-owned requests survive a new consumer without replaying`() {
        val help = OneShotEvent("Views")
        assertEquals("Views", help.take())
        val recreatedConsumer = help
        assertNull(recreatedConsumer.take())
        assertEquals("Views", OneShotEvent("Views").take())
    }

    @Test fun `only one consumer handles a reveal`() {
        val reveal = OneShotEvent("playlist:default")
        val results = java.util.Collections.synchronizedList(mutableListOf<String>())
        val consumers = List(20) { Thread { reveal.take()?.let(results::add) } }
        consumers.forEach(Thread::start)
        consumers.forEach(Thread::join)
        assertEquals(listOf("playlist:default"), results)
        assertNull(reveal.take())
    }

    private val resources by lazy {
        val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(File("../app/src/main/res/values/strings.xml"))
        val strings = document.getElementsByTagName("string")
        (0 until strings.length).associate { index ->
            val item = strings.item(index)
            item.attributes.getNamedItem("name").nodeValue to item.textContent
        }
    }

    private fun statusWords(filter: ViewFilter) = ViewSummary.statuses(filter).map {
        resources.getValue(when (it) {
            ViewSummary.Status.Unplayed -> "unplayed"
            ViewSummary.Status.Played -> "played"
            ViewSummary.Status.InProgress -> "in_progress_condition"
            ViewSummary.Status.Starred -> "starred"
            ViewSummary.Status.NotStarred -> "m4_not_starred"
        })
    }

    @Test fun `View status summaries name facts without label value contradictions`() {
        assertEquals(listOf("Unplayed", "Starred"), statusWords(ViewFilter(played = PlayedFilter.Unplayed, starred = true)))
        assertEquals(listOf("Played", "Not Starred"), statusWords(ViewFilter(played = PlayedFilter.Played, starred = false)))
        assertEquals(listOf("In progress"), statusWords(ViewFilter(played = PlayedFilter.InProgress)))
        assertEquals(emptyList(), statusWords(ViewFilter()))
    }

    @Test fun `long View summaries retain the leading conditions and count the rest`() {
        assertEquals("Unplayed · Starred", ViewSummary.compact(listOf("Unplayed", "Starred")) { error("No hidden conditions") })
        assertEquals("Last 7 days · Unplayed · Starred · 2 more conditions", ViewSummary.compact(listOf("Last 7 days", "Unplayed", "Starred", "Not in any Playlist", "Shortest first")) { "$it more conditions" })
        assertEquals("Last %1\$d days", resources.getValue("published_days"))
        assertEquals("Newest first", resources.getValue("newest_first"))
    }
    @Test fun `a View summary is omitted only when it repeats the entire name`() {
        assertEquals("", ViewSummary.distinctSummary("Starred", "Starred"))
        assertEquals("", ViewSummary.distinctSummary("  STARRED ", "Starred"))
        assertEquals("Unplayed · Starred", ViewSummary.distinctSummary("Starred", "Unplayed · Starred"))
        assertEquals("Starred", ViewSummary.distinctSummary("Favourites", "Starred"))
    }

    @Test fun `Listening Timeline uses one Position when the displayed ends match`() {
        assertEquals("12:34", TimelinePresentation.positionLabel("12:34", "12:34"))
        assertEquals("12:34–13:00", TimelinePresentation.positionLabel("12:34", "13:00"))
        assertEquals("0:00", TimelinePresentation.positionLabel("0:00", "0:00"))
        assertEquals("Listened 12:34 · until 14:00", resources.getValue("m4_listened_stretch").format("12:34", "14:00"))
    }
}
