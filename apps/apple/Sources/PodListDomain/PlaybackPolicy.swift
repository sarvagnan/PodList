import Foundation

public enum SleepTimer: Equatable, Sendable {
    case until(uptime: Double), chapterEnd(position: Double), episodeEnd
}
public enum PlaybackBoundary: Sendable { case `continue`, sleep, advance }
public struct PlaybackTarget: Equatable, Sendable {
    public let playlist: Playlist
    public let entry: Entry
}

/// Platform-free decisions; State's reducer owns Cursor, History and Clear on Played.
public enum PlaybackPolicy {
    public static func target(_ state: State) -> PlaybackTarget? {
        guard let playlist = state.playlists.first(where: { $0.id == state.activePlaylistId }),
              let entry = playlist.entries.first(where: { $0.episodeId == playlist.cursor }) else { return nil }
        return PlaybackTarget(playlist: playlist, entry: entry)
    }
    public static func startPosition(_ position: Double, duration: Double?, skipIntro: Double) -> Double {
        skipIntro > 0 && position < skipIntro && (duration == nil || duration! > skipIntro) ? skipIntro : position
    }
    public static func boundary(position: Double, duration: Double?, skipOutro: Double, ended: Bool,
                                sleep: SleepTimer?, uptime: Double) -> PlaybackBoundary {
        let end = ended || (skipOutro > 0 && duration.map { position >= $0 - skipOutro } == true)
        switch sleep {
        case let .until(deadline) where uptime >= deadline: return .sleep
        case let .chapterEnd(end) where position >= end: return .sleep
        case .episodeEnd where end: return .sleep
        default: return end ? .advance : .continue
        }
    }
    public static func holdLoaded(playing: Bool, finished: Bool, ended: Bool) -> Bool { playing || (finished && !ended) }
    public static func sources(stored: URL?, host: URL?, proxy: URL?) -> [URL] {
        if let stored { return [stored] }
        return [host, proxy].compactMap { $0 }.reduce(into: []) { if !$0.contains($1) { $0.append($1) } }
    }
    public static func settings(_ global: PlaybackSettings, override: PlaybackSettingsOverride) -> PlaybackSettings {
        PlaybackSettings(speed: override.speed ?? global.speed, skipIntro: override.skipIntro ?? global.skipIntro,
                         skipOutro: override.skipOutro ?? global.skipOutro, volumeBoost: override.volumeBoost ?? global.volumeBoost)
    }
    public static func chapterIndex(_ chapters: [Chapter], position: Double) -> Int? { chapters.lastIndex { $0.start <= position } }
    public static func artwork(_ chapters: [Chapter], position: Double, episode: Artwork?, podcast: Artwork?) -> Artwork? {
        chapterIndex(chapters, position: position).flatMap { chapters[$0].artwork } ?? episode ?? podcast
    }
    public static func chapterSleep(_ chapters: [Chapter], position: Double) -> SleepTimer {
        chapters.first { $0.start > position }.map { .chapterEnd(position: $0.start) } ?? .episodeEnd
    }
}
