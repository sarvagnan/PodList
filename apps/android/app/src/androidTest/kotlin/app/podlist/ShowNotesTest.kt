package app.podlist

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ShowNotesTest {
    @Test fun publisherStructureUsesAppTypographyWithoutEmbeddedContent() {
        val html = InstrumentationRegistry.getInstrumentation().context.assets.open("show-notes.html").bufferedReader().use { it.readText() }
        val typography = Typography()
        val notes = formatShowNotes(html, typography, TextLinkStyles())
        assertTrue(notes.text.contains("1. Find a quiet place."))
        assertTrue(notes.text.contains("2. Keep the following in mind:"))
        assertTrue(notes.text.contains("• Listening can be partial."))
        assertTrue(notes.text.contains("3. Return to the conversation."))
        assertTrue(notes.spanStyles.any { it.item.fontSize == typography.titleLarge.fontSize })
        assertTrue(notes.spanStyles.any { it.item.fontSize == typography.titleMedium.fontSize })
        assertTrue(notes.spanStyles.any { it.item.fontWeight == FontWeight.Bold })
        assertTrue(notes.spanStyles.any { it.item.fontStyle == FontStyle.Italic })
        assertFalse(notes.text.contains("hiddenScript"))
        assertFalse(notes.text.contains("hiddenFrame"))
        assertFalse(notes.text.contains("remote.png"))
        assertFalse(notes.text.contains('\uFFFC'))
        assertEquals(listOf("https://example.org/transcript", "https://example.org/research", "mailto:editor@example.org"),
            notes.getLinkAnnotations(0, notes.length).map { (it.item as androidx.compose.ui.text.LinkAnnotation.Url).url })
        assertTrue(notes.text.contains("Unsafe destination"))
    }

    @Test fun malformedNotesRemainReadableAndUnclosedScriptsAreSuppressed() {
        val notes = formatShowNotes("<h2>Context</h2><p>Keep <strong>reading</p><script>never shown", Typography(), TextLinkStyles())
        assertTrue(notes.text.contains("Context"))
        assertTrue(notes.text.contains("Keep reading"))
        assertFalse(notes.text.contains("never shown"))
    }
}
