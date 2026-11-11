import Foundation
import MediaPlayer
#if os(macOS)
import AppKit
#endif

public enum NowPlayingMapping {
    public static func info(_ value: PlaybackDisplay) -> [String: Any] {
        var result: [String: Any] = [
            MPMediaItemPropertyTitle: value.title,
            MPMediaItemPropertyArtist: value.podcast,
            MPMediaItemPropertyAlbumTitle: value.podcast,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: value.position,
            MPNowPlayingInfoPropertyPlaybackRate: value.playing && !value.buffering ? value.speed : 0.0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: value.speed,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
            MPNowPlayingInfoPropertyExternalContentIdentifier: value.episodeID
        ]
        if let duration = value.duration { result[MPMediaItemPropertyPlaybackDuration] = duration }
        if let index = value.chapterIndex {
            result[MPNowPlayingInfoPropertyChapterNumber] = index
            result[MPNowPlayingInfoPropertyChapterCount] = value.chapters.count
            result[MPMediaItemPropertyComments] = value.chapters[index].title
        }
        return result
    }
}

@MainActor final class SystemPlayback {
    private weak var controller: PlaybackController?
    private let center = MPNowPlayingInfoCenter.default()
    private let remote = MPRemoteCommandCenter.shared()
    private var targets: [(MPRemoteCommand, Any)] = []
    private var artworkURL: URL?
    private var artwork: MPMediaItemArtwork?
    private var artworkTask: Task<Void, Never>?
    private var latest: PlaybackDisplay?
    init(controller: PlaybackController) {
        self.controller = controller
        remote.skipForwardCommand.preferredIntervals = [30]
        remote.skipBackwardCommand.preferredIntervals = [15]
        bind(remote.playCommand) { $0.play() }
        bind(remote.pauseCommand) { $0.pause() }
        bind(remote.togglePlayPauseCommand) { $0.toggle() }
        bind(remote.stopCommand) { $0.stop() }
        bind(remote.skipForwardCommand) { $0.skip(30) }
        bind(remote.skipBackwardCommand) { $0.skip(-15) }
        let position = remote.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            let seconds = event.positionTime
            Task { @MainActor in self?.controller?.seek(seconds) }
            return .success
        }
        targets.append((remote.changePlaybackPositionCommand, position))
        // Keyboard ⏩/⏪ and headset next/previous arrive as track commands. As on Android, they skip
        // within the Episode rather than changing Entries.
        bind(remote.nextTrackCommand) { $0.skip(30) }
        bind(remote.previousTrackCommand) { $0.skip(-15) }
        update(nil)
    }
    private func bind(_ command: MPRemoteCommand, action: @escaping @MainActor (PlaybackController) -> Void) {
        let target = command.addTarget { [weak self] _ in
            Task { @MainActor in if let controller = self?.controller { action(controller) } }
            return .success
        }
        targets.append((command, target))
    }
    func update(_ value: PlaybackDisplay?) {
        latest = value
        for (command, _) in targets { command.isEnabled = value != nil }
        guard let value else {
            center.nowPlayingInfo = nil; center.playbackState = .stopped
            artworkTask?.cancel(); artworkURL = nil; artwork = nil; return
        }
        if artworkURL != value.artwork {
            artworkURL = value.artwork; artwork = nil; artworkTask?.cancel()
            #if os(macOS)
            if let url = value.artwork, ["http", "https"].contains(url.scheme ?? "") {
                artworkTask = Task { [weak self] in
                    guard let (data, _) = try? await URLSession.shared.data(from: url), data.count <= 8 * 1024 * 1024,
                          !Task.isCancelled, let image = NSImage(data: data), let self, self.artworkURL == url else { return }
                    self.artwork = Self.artwork(image)
                    self.publish()
                }
            }
            #endif
        }
        publish()
    }
    #if os(macOS)
    /// MediaPlayer calls the request handler on its own queue, so it must not be main-actor isolated.
    /// NSImage is immutable here; the handler only returns this retained image.
    nonisolated private static func artwork(_ image: NSImage) -> MPMediaItemArtwork {
        nonisolated(unsafe) let image = image
        return MPMediaItemArtwork(boundsSize: image.size) { @Sendable _ in image }
    }
    #endif
    private func publish() {
        guard let latest else { return }
        var info = NowPlayingMapping.info(latest)
        if let artwork { info[MPMediaItemPropertyArtwork] = artwork }
        center.nowPlayingInfo = info
        center.playbackState = latest.playing ? .playing : .paused
    }
    func close() {
        targets.forEach { $0.0.removeTarget($0.1) }; targets = []
        artworkTask?.cancel(); center.nowPlayingInfo = nil; center.playbackState = .stopped
    }
}
