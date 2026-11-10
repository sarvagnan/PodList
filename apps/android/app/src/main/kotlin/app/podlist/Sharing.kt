package app.podlist

import android.content.Context
import android.content.Intent

internal fun shareText(context: Context, title: String, link: String?, includeTitle: Boolean = false) {
    if (link == null) return
    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, if (includeTitle) "$title\n$link" else link)
        putExtra(Intent.EXTRA_TITLE, title)
        putExtra(Intent.EXTRA_SUBJECT, title)
    }, null))
}
