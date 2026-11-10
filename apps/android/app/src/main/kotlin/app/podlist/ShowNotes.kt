package app.podlist

import android.graphics.Typeface
import android.net.Uri
import android.text.Editable
import android.text.Html
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.text.style.URLSpan
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextIndent
import androidx.compose.ui.unit.em

@Composable
internal fun showNotes(html: String): AnnotatedString {
    val typography = MaterialTheme.typography
    val links = TextLinkStyles(style = SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline))
    return remember(html, typography, links) { formatShowNotes(html, typography, links) }
}

/** Native text only: publisher layout, images, embedded content and executable links never reach the UI. */
internal fun formatShowNotes(html: String, typography: Typography, links: TextLinkStyles): AnnotatedString {
    val text = Html.fromHtml(notesMarkup(html), Html.FROM_HTML_MODE_LEGACY, null, NotesLists())
    val value = text.toString().trimEnd()
    return AnnotatedString.Builder(value).apply {
        fun range(span: Any, block: (Int, Int) -> Unit) {
            val start = text.getSpanStart(span).coerceIn(0, value.length)
            val end = text.getSpanEnd(span).coerceIn(start, value.length)
            if (end > start) block(start, end)
        }
        text.getSpans(0, text.length, RelativeSizeSpan::class.java).forEach { span ->
            // Only h1–h6 survive the allowlist, so these spans are publisher headings.
            val style = when {
                span.sizeChange >= 1.4f -> typography.titleLarge
                span.sizeChange >= 1.2f -> typography.titleMedium
                else -> typography.titleSmall
            }
            range(span) { start, end ->
                addStyle(style.toSpanStyle(), start, end)
                addStyle(ParagraphStyle(lineHeight = style.lineHeight), start, end)
            }
        }
        text.getSpans(0, text.length, StyleSpan::class.java).forEach { span ->
            range(span) { start, end ->
                addStyle(SpanStyle(fontWeight = if (span.style and Typeface.BOLD != 0) FontWeight.Bold else null,
                    fontStyle = if (span.style and Typeface.ITALIC != 0) FontStyle.Italic else null), start, end)
            }
        }
        Regex("(?m)^\\h*(?:•|[0-9]+\\.) .+$").findAll(value).forEach { line ->
            val indent = line.value.takeWhile { it == '\u00a0' }.length / 2
            addStyle(ParagraphStyle(textIndent = TextIndent(restLine = (1.25f + indent).em)), line.range.first, line.range.last + 1)
        }
        text.getSpans(0, text.length, URLSpan::class.java).forEach { span ->
            if (Uri.parse(span.url).scheme?.lowercase() in setOf("http", "https", "mailto")) {
                range(span) { start, end -> addLink(LinkAnnotation.Url(span.url, links), start, end) }
            }
        }
    }.toAnnotatedString()
}

private val hiddenNotesContent = Regex("<(script|style|iframe|object|svg)\\b[^>]*>.*?(?:</\\1\\s*>|$)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
private val notesTags = Regex("<!--[\\s\\S]*?(?:-->|$)|<\\s*(/?)\\s*([a-zA-Z][a-zA-Z0-9-]*)\\b[^>]*>")
private val notesAllowedTags = setOf("h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "b", "strong", "i", "em")

private fun notesMarkup(html: String): String = notesTags.replace(hiddenNotesContent.replace(html, "")) { match ->
    val closing = match.groupValues[1]
    when (val tag = match.groupValues[2].lowercase()) {
        in notesAllowedTags -> "<$closing$tag>"
        "ul", "ol", "li" -> "<${closing}podlist-$tag>"
        // Html parses href and decodes its entities; only safe URL schemes get a Compose link annotation.
        "a" -> match.value
        "div", "section", "article" -> if (closing.isEmpty()) "<p>" else "</p>"
        else -> ""
    }
}

/** Android Html treats ol like ul. Custom list tags retain numbering and nested list boundaries. */
private class NotesLists : Html.TagHandler {
    private data class ListState(val ordered: Boolean, var next: Int = 1)
    private val lists = mutableListOf<ListState>()
    override fun handleTag(opening: Boolean, tag: String, output: Editable, reader: org.xml.sax.XMLReader) {
        fun newline() { if (output.isNotEmpty() && output.last() != '\n') output.append('\n') }
        when (tag.lowercase()) {
            "podlist-ul", "podlist-ol" -> {
                newline()
                if (opening) lists.add(ListState(tag.equals("podlist-ol", ignoreCase = true)))
                else if (lists.isNotEmpty()) lists.removeAt(lists.lastIndex)
            }
            "podlist-li" -> {
                newline()
                if (opening) {
                    repeat((lists.size - 1).coerceAtLeast(0)) { output.append("\u00a0\u00a0") }
                    val list = lists.lastOrNull()
                    output.append(if (list?.ordered == true) "${list.next++}. " else "• ")
                }
            }
        }
    }
}
