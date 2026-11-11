import Foundation
import PodListDomain

/// Bounded ID3v2.3/v2.4 CHAP fallback, matching Android. Unsupported flags and malformed frames
/// stop probing; neither media-sized allocations nor arbitrary offsets come from tag contents.
public enum ID3Chapters {
    public static let probeBytes = 512 * 1024
    public static func parse(_ data: Data) -> [Chapter] {
        let bytes = Array(data.prefix(probeBytes))
        func ascii(_ at: Int, _ count: Int) -> String { String(bytes: bytes[at..<(at + count)], encoding: .isoLatin1) ?? "" }
        func number(_ at: Int, syncsafe: Bool = false) -> Int {
            (0..<4).reduce(0) { ($0 << (syncsafe ? 7 : 8)) | (Int(bytes[at + $1]) & (syncsafe ? 127 : 255)) }
        }
        guard bytes.count >= 10, ascii(0, 3) == "ID3", [3, 4].contains(bytes[3]), bytes[5] & 0xC0 == 0 else { return [] }
        let version = bytes[3], end = min(bytes.count, 10 + number(6, syncsafe: true))
        func size(_ at: Int) -> Int { number(at, syncsafe: version == 4) }
        var at = 10, chapters: [Chapter] = []
        while at + 10 <= end {
            let id = ascii(at, 4), length = size(at + 4), body = at + 10
            guard id.utf8.allSatisfy({ (65...90).contains($0) || (48...57).contains($0) }), length > 0, length <= end - body else { break }
            let bodyEnd = body + length
            if id == "CHAP", bytes[at + 9] == 0 {
                var idEnd = body
                while idEnd < bodyEnd && bytes[idEnd] != 0 { idEnd += 1 }
                if idEnd + 17 <= bodyEnd {
                    let start = Double(number(idEnd + 1)) / 1000
                    var title = "", sub = idEnd + 17
                    while sub + 10 <= bodyEnd {
                        let subSize = size(sub + 4)
                        guard subSize > 0, subSize <= bodyEnd - sub - 10 else { break }
                        if ascii(sub, 4) == "TIT2" {
                            let encoding: String.Encoding = switch bytes[sub + 10] {
                            case 1: .utf16
                            case 2: .utf16BigEndian
                            case 3: .utf8
                            default: .isoLatin1
                            }
                            title = (String(bytes: bytes[(sub + 11)..<(sub + 10 + subSize)], encoding: encoding) ?? "").components(separatedBy: "\0").first ?? ""
                        }
                        sub += 10 + subSize
                    }
                    chapters.append(.init(start: start, title: title, artwork: nil, url: nil))
                }
            }
            at = bodyEnd
        }
        return chapters.sorted { $0.start < $1.start }
    }
}
