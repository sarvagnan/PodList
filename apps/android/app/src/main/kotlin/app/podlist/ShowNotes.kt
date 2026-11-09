package app.podlist

import android.text.Html
import android.text.style.URLSpan
import androidx.compose.runtime.Composable
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.text.*
import androidx.compose.ui.text.style.TextDecoration

@Composable
internal fun showNotes(html: String): AnnotatedString {
    val text = Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY)
    val links = TextLinkStyles(style = SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline))
    return AnnotatedString.Builder(text.toString()).apply {
        text.getSpans(0, text.length, URLSpan::class.java).forEach { span ->
            addLink(LinkAnnotation.Url(span.url, links), text.getSpanStart(span), text.getSpanEnd(span))
        }
    }.toAnnotatedString()
}
