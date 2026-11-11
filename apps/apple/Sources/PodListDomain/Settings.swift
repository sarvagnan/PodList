import Foundation

public struct PlaybackSettings: Codable, Equatable, Sendable {
    public var speed: Double
    public var skipIntro: Double
    public var skipOutro: Double
    public var volumeBoost: Bool

    public init(speed: Double, skipIntro: Double, skipOutro: Double, volumeBoost: Bool) {
        self.speed = speed
        self.skipIntro = skipIntro
        self.skipOutro = skipOutro
        self.volumeBoost = volumeBoost
    }
}

public struct PlaybackSettingsOverride: Codable, Equatable, Sendable {
    public var speed: Double?
    public var skipIntro: Double?
    public var skipOutro: Double?
    public var volumeBoost: Bool?

    public init(speed: Double? = nil, skipIntro: Double? = nil, skipOutro: Double? = nil, volumeBoost: Bool? = nil) {
        self.speed = speed
        self.skipIntro = skipIntro
        self.skipOutro = skipOutro
        self.volumeBoost = volumeBoost
    }
}
