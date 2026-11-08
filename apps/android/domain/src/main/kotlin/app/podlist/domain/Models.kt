package app.podlist.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonPrimitive

/** Wire JSON uses _tag, includes required nulls, and omits absent optional keys. */
val ProtocolJson = Json { classDiscriminator = "_tag"; ignoreUnknownKeys = true }
const val DefaultPlaylistId = "default"
typealias ListeningLog = Map<String, Map<String, Double>>

@Serializable data class PlaybackSettings(val speed: Double, val skipIntro: Double, val skipOutro: Double, val volumeBoost: Boolean)
@Serializable data class PlaybackSettingsOverride(val speed: Double? = null, val skipIntro: Double? = null, val skipOutro: Double? = null, val volumeBoost: Boolean? = null)
@Serializable data class Entry(val episodeId: String, val position: Double, val positionAt: Long)
// JsonNull represents an explicit null; Kotlin null represents an absent optional key.
@Serializable(with = HistoryItemSerializer::class) data class HistoryItem(val episodeId: String, val finishedAt: Long, val followedBy: JsonElement? = null) {
    fun followingId(): String? = followedBy?.takeUnless { it == JsonNull }?.jsonPrimitive?.content
}
@Serializable data class TimelinePoint(val at: Long, val episodeId: String, val position: Double)
@Serializable data class PlaylistEdit(val at: Long, val kind: String, val episodeId: String)
@Serializable data class Playlist(
    val id: String, val name: String, val isDefault: Boolean, val clearOnPlayed: Boolean,
    val entries: List<Entry>, val cursor: String?, val history: List<HistoryItem>,
    val timeline: List<TimelinePoint>, val edits: List<PlaylistEdit>? = null
)
@Serializable sealed interface PlayedSource {
    @Serializable @SerialName("User") data object User : PlayedSource
    @Serializable @SerialName("Playback") data class Playback(val playlistId: String) : PlayedSource
}
@Serializable data class Played(val at: Long, val source: PlayedSource)
@Serializable data class EpisodeState(val episodeId: String, val played: Played?, val starred: Boolean)
@Serializable data class TrashedPlaylist(val playlist: Playlist, val deletedAt: Long)
@Serializable data class DownloadRule(val subscriptionId: String, val deviceId: String, val mode: DownloadMode, val keepAtMost: Long?, val since: Long? = null)
@Serializable enum class DownloadMode { @SerialName("never") Never, @SerialName("onEntry") OnEntry, @SerialName("allNew") AllNew }
@Serializable enum class DeviceKind { @SerialName("pwa") Pwa, @SerialName("desktop") Desktop }
@Serializable data class Device(val id: String, val name: String, val kind: DeviceKind, val registeredAt: Long)
@Serializable data class Artwork(val url: String)
@Serializable data class Chapter(val start: Double, val title: String, val artwork: Artwork?, val url: String?)
@Serializable data class Subscription(
    val id: String, val feedUrl: String, val title: String, val author: String?, val description: String?,
    val artwork: Artwork?, val subscribedAt: Long, val unsubscribedAt: Long?,
    val playedThreshold: Double?, val playbackSettings: PlaybackSettingsOverride
)
@Serializable data class Episode(
    val id: String, val subscriptionId: String, val guid: String, val title: String, val description: String,
    val published: Long, val duration: Double?, val audioUrl: String, val artwork: Artwork?,
    val chapters: List<Chapter>, val audioUpdatedAt: Long?
)
@Serializable sealed interface PublishedFilter {
    @Serializable @SerialName("LastDays") data class LastDays(val days: Long) : PublishedFilter
    @Serializable @SerialName("Between") data class Between(val from: Long?, val to: Long?) : PublishedFilter
}
@Serializable enum class PodcastMode { @SerialName("include") Include, @SerialName("exclude") Exclude }
@Serializable data class PodcastFilter(val mode: PodcastMode, val subscriptionIds: List<String>)
@Serializable enum class PlayedFilter { @SerialName("unplayed") Unplayed, @SerialName("inProgress") InProgress, @SerialName("played") Played }
@Serializable data class ViewFilter(
    val published: PublishedFilter? = null, val podcasts: PodcastFilter? = null, val text: String? = null,
    val played: PlayedFilter? = null, val starred: Boolean? = null, val notInAnyPlaylist: Boolean? = null,
    val minDuration: Double? = null, val maxDuration: Double? = null
)
@Serializable enum class ViewSort {
    @SerialName("publishedDesc") PublishedDesc, @SerialName("publishedAsc") PublishedAsc,
    @SerialName("durationAsc") DurationAsc, @SerialName("durationDesc") DurationDesc
}
@Serializable data class View(val id: String, val name: String, val filter: ViewFilter, val sort: ViewSort, val limit: Long?)
@Serializable data class State(
    val playlists: List<Playlist>, val activePlaylistId: String, val episodeStates: Map<String, EpisodeState>,
    val views: List<View>, val downloadRules: List<DownloadRule>, val playbackSettings: PlaybackSettings,
    val trash: List<TrashedPlaylist>? = null, val trashDays: Long? = null, val listeningLog: ListeningLog? = null
) {
    companion object {
        fun initial(settings: PlaybackSettings = PlaybackSettings(1.0, 0.0, 0.0, false)) = State(
            listOf(Playlist(DefaultPlaylistId, "Default", true, true, emptyList(), null, emptyList(), emptyList())),
            DefaultPlaylistId, emptyMap(), emptyList(), emptyList(), settings
        )
        fun decode(json: String): State = ProtocolJson.decodeFromString(json)
    }
    fun encode(): String = ProtocolJson.encodeToString(this)
}
@Serializable enum class Placement { @SerialName("now") Now, @SerialName("next") Next, @SerialName("last") Last }
@Serializable data class ListeningAmount(val day: String, val subscriptionId: String, val seconds: Double)
@Serializable data class Operation(val id: String, val deviceId: String, val sequence: Long, val recordedAt: Long, val change: Change) {
    init { require(id.isNotEmpty() && deviceId.isNotEmpty()); require(sequence >= 0 && recordedAt >= 0) }
    companion object { fun decode(json: String): Operation = ProtocolJson.decodeFromString(json) }
    fun encode(): String = ProtocolJson.encodeToString(this)
}
@Serializable sealed interface Change {
    @Serializable @SerialName("AddEntry") data class AddEntry(val playlistId: String, val episodeId: String, val placement: Placement) : Change
    @Serializable @SerialName("MoveEntry") data class MoveEntry(val playlistId: String, val episodeId: String, val after: String?) : Change
    @Serializable @SerialName("RemoveEntry") data class RemoveEntry(val playlistId: String, val episodeId: String) : Change
    @Serializable @SerialName("SetCursor") data class SetCursor(val playlistId: String, val episodeId: String?) : Change
    @Serializable @SerialName("ReportPosition") data class ReportPosition(val playlistId: String, val episodeId: String, val position: Double, val listenedAt: Long, val listening: List<ListeningAmount>? = null) : Change
    @Serializable @SerialName("RecordListening") data class RecordListening(val amounts: List<ListeningAmount>) : Change
    @Serializable @SerialName("MarkPlayed") data class MarkPlayed(val episodeId: String, val source: PlayedSource) : Change
    @Serializable @SerialName("MarkUnplayed") data class MarkUnplayed(val episodeId: String) : Change
    @Serializable @SerialName("MarkSubscriptionPlayed") data class MarkSubscriptionPlayed(val subscriptionId: String) : Change
    @Serializable @SerialName("SetStar") data class SetStar(val episodeId: String, val starred: Boolean) : Change
    @Serializable @SerialName("CreatePlaylist") data class CreatePlaylist(val playlistId: String, val name: String, val clearOnPlayed: Boolean) : Change
    @Serializable @SerialName("RenamePlaylist") data class RenamePlaylist(val playlistId: String, val name: String) : Change
    @Serializable @SerialName("SetClearOnPlayed") data class SetClearOnPlayed(val playlistId: String, val clearOnPlayed: Boolean) : Change
    @Serializable @SerialName("DeletePlaylist") data class DeletePlaylist(val playlistId: String) : Change
    @Serializable @SerialName("RestorePlaylist") data class RestorePlaylist(val playlistId: String) : Change
    @Serializable @SerialName("SetTrashDays") data class SetTrashDays(val days: Long) : Change
    @Serializable @SerialName("SetActivePlaylist") data class SetActivePlaylist(val playlistId: String) : Change
    @Serializable @SerialName("Rewind") data class Rewind(val playlistId: String, val to: Long) : Change
    @Serializable @SerialName("SaveView") data class SaveView(val view: View) : Change
    @Serializable @SerialName("DeleteView") data class DeleteView(val viewId: String) : Change
    @Serializable @SerialName("SetDownloadRule") data class SetDownloadRule(val rule: DownloadRule) : Change
    @Serializable @SerialName("SetPlaybackSettings") data class SetPlaybackSettings(val settings: PlaybackSettings) : Change
    @Serializable @SerialName("SetSubscriptionOverrides") data class SetSubscriptionOverrides(val subscriptionId: String, val playbackSettings: PlaybackSettingsOverride, val playedThreshold: Double?) : Change
}
