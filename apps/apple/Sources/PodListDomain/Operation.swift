import Foundation

public struct Operation: Codable, Equatable, Sendable {
    public var id: String
    public var deviceId: String
    public var sequence: Int64
    public var recordedAt: Int64
    public var change: Change

    public init(id: String, deviceId: String, sequence: Int64, recordedAt: Int64, change: Change) {
        self.id = id
        self.deviceId = deviceId
        self.sequence = sequence
        self.recordedAt = recordedAt
        self.change = change
    }
}
