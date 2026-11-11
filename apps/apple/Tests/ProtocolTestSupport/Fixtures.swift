import Foundation

/// Structural JSON equality compares number values while preserving absent versus null fields.
public enum JSON: Codable, Equatable, Sendable {
    case object([String: JSON]), array([JSON]), string(String), number(Double), bool(Bool), null
    public init(from decoder: any Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let value = try? c.decode(Bool.self) { self = .bool(value) }
        else if let value = try? c.decode(Double.self) { self = .number(value) }
        else if let value = try? c.decode(String.self) { self = .string(value) }
        else if let value = try? c.decode([JSON].self) { self = .array(value) }
        else { self = .object(try c.decode([String: JSON].self)) }
    }
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case let .object(v): try c.encode(v)
        case let .array(v): try c.encode(v)
        case let .string(v): try c.encode(v)
        case let .number(v): try c.encode(v)
        case let .bool(v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
    public subscript(_ key: String) -> JSON { object[key]! }
    public var object: [String: JSON] { if case let .object(v) = self { return v }; fatalError("Expected JSON object") }
    public var array: [JSON] { if case let .array(v) = self { return v }; fatalError("Expected JSON array") }
    public var string: String { if case let .string(v) = self { return v }; fatalError("Expected JSON string") }
    public var double: Double { if case let .number(v) = self { return v }; fatalError("Expected JSON number") }
    public var int: Int64 { Int64(double) }
    public var bool: Bool { if case let .bool(v) = self { return v }; fatalError("Expected JSON bool") }
    public var nullableDouble: Double? { self == .null ? nil : double }
    public var nullableString: String? { self == .null ? nil : string }
    public func decode<T: Decodable>(_ type: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(type, from: JSONEncoder().encode(self))
    }
    public static func encoded<T: Encodable>(_ value: T) throws -> JSON {
        try JSONDecoder().decode(JSON.self, from: JSONEncoder().encode(value))
    }
}

public enum Fixtures {
    public static let protocolURL: URL = {
        var directory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        while directory.path != "/" {
            let candidate = directory.appendingPathComponent("packages/domain/protocol")
            if FileManager.default.fileExists(atPath: candidate.appendingPathComponent("operation.schema.json").path) { return candidate }
            directory.deleteLastPathComponent()
        }
        fatalError("Cannot find packages/domain/protocol by walking up from #filePath")
    }()
    public static func document(_ name: String) throws -> JSON {
        try JSONDecoder().decode(JSON.self, from: Data(contentsOf: protocolURL.appendingPathComponent(name)))
    }
    public static var vectorNames: [String] {
        get throws {
            try FileManager.default.contentsOfDirectory(atPath: protocolURL.appendingPathComponent("vectors").path)
                .filter { $0.hasSuffix(".json") }.sorted().map { "vectors/" + $0 }
        }
    }
}
