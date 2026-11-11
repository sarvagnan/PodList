import Foundation

public struct ProtocolValidationFailure: Error, Sendable, CustomStringConvertible {
    public let description: String
}

/// The subset of JSON Schema used by the generated protocol. The schema stays the source of bounds.
public enum ProtocolValidation {
    public static var schemaData: Data { get throws { try Data(contentsOf: Bundle.module.url(forResource: "operation.schema", withExtension: "json")!) } }
    private static let schema: Value = try! JSONDecoder().decode(Value.self, from: schemaData)

    public static func validate(_ operation: Operation) throws { try validate(operation, definition: "@podlist/domain/OperationEncoded") }
    public static func validate(_ rule: DownloadRule) throws { try validate(rule, definition: "@podlist/domain/DownloadRuleEncoded") }
    public static func validateDownloadRules(_ state: State) throws { for rule in state.downloadRules { try validate(rule) } }

    private static func validate<T: Encodable>(_ value: T, definition: String) throws {
        let encoded = try JSONDecoder().decode(Value.self, from: JSONEncoder().encode(value))
        guard let definition = schema.object?["$defs"]?.object?[definition], matches(encoded, definition) else {
            throw ProtocolValidationFailure(description: "The edit does not match the sync protocol schema.")
        }
    }

    private static func matches(_ value: Value, _ schema: Value) -> Bool {
        guard let s = schema.object else { return false }
        if let ref = s["$ref"]?.string {
            let key = String(ref.dropFirst("#/$defs/".count)).replacingOccurrences(of: "~1", with: "/").replacingOccurrences(of: "~0", with: "~")
            guard let target = Self.schema.object?["$defs"]?.object?[key], matches(value, target) else { return false }
        }
        if let choices = s["anyOf"]?.array, !choices.contains(where: { matches(value, $0) }) { return false }
        if let choices = s["enum"]?.array, !choices.contains(value) { return false }
        if let type = s["type"]?.string {
            let valid: Bool = switch (type, value) {
            case ("object", .object), ("array", .array), ("string", .string), ("boolean", .bool), ("null", .null): true
            case ("number", .number(let n)): n.isFinite
            case ("integer", .number(let n)): n.isFinite && n.rounded() == n
            default: false
            }
            if !valid { return false }
        }
        if case let .number(n) = value {
            if let min = s["minimum"]?.number, n < min { return false }
            if let max = s["maximum"]?.number, n > max { return false }
        }
        if case let .string(text) = value, let min = s["minLength"]?.number, Double(text.unicodeScalars.count) < min { return false }
        if let object = value.object {
            if let required = s["required"]?.array, required.contains(where: { object[$0.string ?? ""] == nil }) { return false }
            for (key, definition) in s["properties"]?.object ?? [:] {
                if let member = object[key], !matches(member, definition) { return false }
            }
        }
        if let array = value.array {
            if let min = s["minItems"]?.number, Double(array.count) < min { return false }
            let prefix = s["prefixItems"]?.array ?? []
            for (index, item) in array.enumerated() {
                if index < prefix.count { if !matches(item, prefix[index]) { return false } }
                else if let definition = s["items"], !matches(item, definition) { return false }
            }
        }
        return true
    }

    private indirect enum Value: Codable, Equatable, Sendable {
        case object([String: Value]), array([Value]), string(String), number(Double), bool(Bool), null
        var object: [String: Value]? { if case let .object(v) = self { v } else { nil } }
        var array: [Value]? { if case let .array(v) = self { v } else { nil } }
        var string: String? { if case let .string(v) = self { v } else { nil } }
        var number: Double? { if case let .number(v) = self { v } else { nil } }
        init(from decoder: any Decoder) throws {
            let c = try decoder.singleValueContainer()
            if c.decodeNil() { self = .null }
            else if let v = try? c.decode(Bool.self) { self = .bool(v) }
            else if let v = try? c.decode(Double.self) { self = .number(v) }
            else if let v = try? c.decode(String.self) { self = .string(v) }
            else if let v = try? c.decode([Value].self) { self = .array(v) }
            else { self = .object(try c.decode([String: Value].self)) }
        }
        func encode(to encoder: any Encoder) throws {
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
    }
}
