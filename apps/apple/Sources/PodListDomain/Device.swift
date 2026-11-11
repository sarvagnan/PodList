import Foundation

public struct DownloadRule: Codable, Equatable, Sendable {
    public var subscriptionId: String
    public var deviceId: String
    public var mode: DownloadMode
    public var keepAtMost: Int64?
    public var since: Int64?

    public init(subscriptionId: String, deviceId: String, mode: DownloadMode, keepAtMost: Int64?, since: Int64? = nil) {
        self.subscriptionId = subscriptionId
        self.deviceId = deviceId
        self.mode = mode
        self.keepAtMost = keepAtMost
        self.since = since
    }

    private enum CodingKeys: String, CodingKey {
        case subscriptionId, deviceId, mode, keepAtMost, since
    }

    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        subscriptionId = try c.decode(String.self, forKey: .subscriptionId)
        deviceId = try c.decode(String.self, forKey: .deviceId)
        mode = try c.decode(DownloadMode.self, forKey: .mode)
        keepAtMost = try c.decode(Int64?.self, forKey: .keepAtMost)
        since = try c.decodeIfPresent(Int64.self, forKey: .since)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(subscriptionId, forKey: .subscriptionId)
        try c.encode(deviceId, forKey: .deviceId)
        try c.encode(mode, forKey: .mode)
        try c.encode(keepAtMost, forKey: .keepAtMost)
        try c.encodeIfPresent(since, forKey: .since)
    }
}

public struct Device: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var kind: DeviceKind
    public var registeredAt: Int64

    public init(id: String, name: String, kind: DeviceKind, registeredAt: Int64) {
        self.id = id
        self.name = name
        self.kind = kind
        self.registeredAt = registeredAt
    }
}

public enum DownloadMode: String, Codable, CaseIterable, Sendable {
    case never, onEntry, allNew
}

public enum DeviceKind: String, Codable, CaseIterable, Sendable {
    case pwa, desktop, android, web
}
