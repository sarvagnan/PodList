import Foundation

public enum ProtocolJSON {
    public static func encode<T: Encodable>(_ value: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return String(decoding: try encoder.encode(value), as: UTF8.self)
    }

    public static func decode<T: Decodable>(_ type: T.Type = T.self, from text: String) throws -> T {
        try JSONDecoder().decode(type, from: Data(text.utf8))
    }
}
