package app.podlist.domain

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.descriptors.element
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.*

/** nullable JsonElement alone would collapse explicit JSON null into an absent optional key. */
object HistoryItemSerializer : KSerializer<HistoryItem> {
    override val descriptor = buildClassSerialDescriptor("HistoryItem") {
        element<String>("episodeId")
        element<Long>("finishedAt")
        element<JsonElement>("followedBy", isOptional = true)
    }

    override fun serialize(encoder: Encoder, value: HistoryItem) {
        require(encoder is JsonEncoder)
        encoder.encodeJsonElement(buildJsonObject {
            put("episodeId", value.episodeId)
            put("finishedAt", value.finishedAt)
            value.followedBy?.let { put("followedBy", it) }
        })
    }

    override fun deserialize(decoder: Decoder): HistoryItem {
        require(decoder is JsonDecoder)
        val obj = decoder.decodeJsonElement().jsonObject
        val followedBy = obj["followedBy"]
        require(followedBy == null || followedBy == JsonNull || (followedBy is JsonPrimitive && followedBy.isString && followedBy.content.isNotEmpty()))
        return HistoryItem(obj.getValue("episodeId").jsonPrimitive.content, obj.getValue("finishedAt").jsonPrimitive.long, followedBy)
    }
}
