package app.podlist.domain

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.nullable
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/** An omitted key leaves the cached link alone. A published null clears it. */
@Serializable(with = WebsiteUrlSerializer::class)
sealed interface WebsiteUrl {
    data object Omitted : WebsiteUrl
    data class Published(val value: String?) : WebsiteUrl
}

internal object WebsiteUrlSerializer : KSerializer<WebsiteUrl> {
    private val wire = String.serializer().nullable
    override val descriptor = wire.descriptor

    override fun deserialize(decoder: Decoder): WebsiteUrl =
        WebsiteUrl.Published(wire.deserialize(decoder))

    override fun serialize(encoder: Encoder, value: WebsiteUrl) {
        require(value is WebsiteUrl.Published)
        wire.serialize(encoder, value.value)
    }
}
