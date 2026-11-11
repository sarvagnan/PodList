import Foundation
import AVFoundation

@MainActor
public protocol PlayerAudio: AnyObject {
    var position: Double { get }
    var duration: Double? { get }
    var isPlaying: Bool { get }
    var event: (@MainActor (PlayerAudioEvent) -> Void)? { get set }
    func load(_ url: URL, position: Double, speed: Double, boost: Bool, play: Bool)
    func play(speed: Double)
    func pause()
    func seek(_ position: Double) async
    func stop()
}
public enum PlayerAudioEvent: Sendable { case tick, playing, waiting, paused, discontinuity, ended, failure }
public struct PlayerClock: Sendable {
    public var now: @Sendable () -> Int64
    public var uptime: @Sendable () -> Double
    public var offset: @Sendable (Int64) -> Int
    public init(now: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) },
                uptime: @escaping @Sendable () -> Double = { ProcessInfo.processInfo.systemUptime },
                offset: @escaping @Sendable (Int64) -> Int = { -TimeZone.current.secondsFromGMT(for: Date(timeIntervalSince1970: Double($0) / 1000)) / 60 }) {
        self.now = now; self.uptime = uptime; self.offset = offset
    }
}

/// The adapter emits discontinuities for buffering, external seeks and rate changes. All state
/// decisions and durable writes belong to PlaybackController, never an AVFoundation callback.
@MainActor
public final class AVPlayerAudio: PlayerAudio {
    private let player = AVPlayer()
    private var timeToken: Any?
    private var statusObservation: NSKeyValueObservation?
    private var controlObservation: NSKeyValueObservation?
    private var rateObservation: NSKeyValueObservation?
    private var notifications: [NSObjectProtocol] = []
    private var preparing: Task<Void, Never>?
    private var generation = UUID()
    private var requestedPosition = 0.0
    private var requestedSpeed = 1.0
    private var requestedPlayback = false
    public var event: (@MainActor (PlayerAudioEvent) -> Void)?
    public var position: Double { let value = player.currentTime().seconds; return value.isFinite ? max(0, value) : 0 }
    public var duration: Double? {
        guard let seconds = player.currentItem?.duration.seconds, seconds.isFinite, seconds > 0 else { return nil }
        return seconds
    }
    public var isPlaying: Bool { player.timeControlStatus == .playing }

    public init() {
        player.automaticallyWaitsToMinimizeStalling = true
        timeToken = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] _ in
            Task { @MainActor in self?.event?(.tick) }
        }
        controlObservation = player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
            Task { @MainActor in
                guard let self else { return }
                switch self.player.timeControlStatus {
                case .playing: self.event?(.playing)
                case .waitingToPlayAtSpecifiedRate: self.event?(.waiting)
                case .paused: self.event?(.paused)
                @unknown default: break
                }
            }
        }
        rateObservation = player.observe(\.rate, options: [.new]) { [weak self] _, _ in
            Task { @MainActor in self?.event?(.discontinuity) }
        }
    }
    isolated deinit {
        if let timeToken { player.removeTimeObserver(timeToken) }
        notifications.forEach(NotificationCenter.default.removeObserver)
        preparing?.cancel()
    }
    public func load(_ url: URL, position: Double, speed: Double, boost: Bool, play: Bool) {
        stop()
        let token = generation
        requestedPosition = position; requestedSpeed = speed; requestedPlayback = play
        // Restoring a paused bar performs no network IO. Prepare only when Play is requested.
        preparing = Task { [weak self] in
            guard let self else { return }
            let item = AVPlayerItem(url: url)
            item.audioTimePitchAlgorithm = .spectral
            if boost { await VolumeBoost.attach(to: item) }
            guard !Task.isCancelled, self.generation == token else { return }
            self.statusObservation = item.observe(\.status, options: [.new]) { [weak self, weak item] _, _ in
                Task { @MainActor in
                    guard let self, self.generation == token, item?.status == .failed else { return }
                    self.event?(.failure)
                }
            }
            self.notifications = [
                NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in
                    Task { @MainActor in guard self?.generation == token else { return }; self?.event?(.ended) }
                },
                NotificationCenter.default.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { [weak self] _ in
                    Task { @MainActor in guard self?.generation == token else { return }; self?.event?(.failure) }
                },
                NotificationCenter.default.addObserver(forName: .AVPlayerItemTimeJumped, object: item, queue: .main) { [weak self] _ in
                    Task { @MainActor in guard self?.generation == token else { return }; self?.event?(.discontinuity) }
                }
            ]
            self.player.replaceCurrentItem(with: item)
            self.player.seek(to: CMTime(seconds: self.requestedPosition, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
                Task { @MainActor in guard let self, self.generation == token, finished else { return }; if self.requestedPlayback { self.play(speed: self.requestedSpeed) } }
            }
        }
    }
    public func play(speed: Double) {
        requestedSpeed = speed; requestedPlayback = true
        if player.currentItem != nil { player.playImmediately(atRate: Float(speed)) }
    }
    public func pause() { requestedPlayback = false; player.pause() }
    public func seek(_ position: Double) async {
        requestedPosition = position
        guard player.currentItem != nil else { return }
        await withCheckedContinuation { continuation in
            player.seek(to: CMTime(seconds: position, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) { _ in continuation.resume() }
        }
        if requestedPlayback { player.playImmediately(atRate: Float(requestedSpeed)) }
    }
    public func stop() {
        generation = UUID(); requestedPlayback = false; preparing?.cancel(); preparing = nil
        statusObservation = nil
        notifications.forEach(NotificationCenter.default.removeObserver); notifications = []
        player.pause(); player.replaceCurrentItem(with: nil)
    }
}
