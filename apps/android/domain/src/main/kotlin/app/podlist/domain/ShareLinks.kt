package app.podlist.domain

import java.net.URI

/** Only publisher web addresses are shareable; a guid is an identity, never a page address. */
object ShareLinks {
    private fun web(value: String?): String? = value?.trim()?.takeIf { text ->
        runCatching { val uri = URI(text); uri.scheme in listOf("http", "https") && !uri.host.isNullOrBlank() }.getOrDefault(false)
    }
    fun podcast(website: String?, feed: String?): String? = web(website) ?: web(feed)
    fun episode(website: String?, podcastWebsite: String?, feed: String?, audio: String?): String? =
        web(website) ?: podcast(podcastWebsite, feed) ?: web(audio)
}
