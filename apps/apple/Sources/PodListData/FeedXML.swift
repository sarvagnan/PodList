import Foundation

/// RSS-only, non-validating lexer. No I/O, entity declarations or recursive descent.
/// A closing tag pops one element regardless of its name, as on the server. EOF
/// retains completed fields/attributes but drops the final unfinished text run.
internal final class FeedXML {
    private let xml: [UInt8]
    private var pos = 0
    init(_ source: String) {
        xml = Array(source.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n").utf8)
    }
    private func starts(_ marker: String, at index: Int? = nil) -> Bool {
        let index = index ?? pos
        let bytes = marker.utf8
        return index + bytes.count <= xml.count && xml[index..<(index + bytes.count)].elementsEqual(bytes)
    }
    private func after(_ marker: String, from start: Int) throws -> Int {
        var index = start
        while index < xml.count {
            if starts(marker, at: index) { return index + marker.utf8.count }
            index += 1
        }
        throw FeedFailure(reason: "Unclosed XML token")
    }
    private func string(_ start: Int, _ end: Int) -> String { String(decoding: xml[start..<end], as: UTF8.self) }
    private func whitespace(_ c: UInt8) -> Bool { c == 32 || c == 9 || c == 10 || c == 13 }
    private func declaration() throws {
        var brackets = 0
        var quote: UInt8?
        pos += 2
        while pos < xml.count {
            let c = xml[pos]
            pos += 1
            if let q = quote { if c == q { quote = nil }; continue }
            if starts("<!--", at: pos - 1) { pos = try after("-->", from: pos + 3); continue }
            switch c {
            case 34, 39: quote = c
            case 91: brackets += 1
            case 93: if brackets > 0 { brackets -= 1 }
            case 62: if brackets == 0 { return }
            default: break
            }
        }
        throw FeedFailure(reason: "Unclosed XML declaration")
    }
    func read(open: (String, [String: String]) -> Void, close: (String) -> Void, text: (String) -> Void) throws {
        var stack: [String] = []
        var pending = ""
        func flush() { text(Self.decode(pending.trimmingCharacters(in: .whitespacesAndNewlines))); pending = "" }
        while pos < xml.count {
            if xml[pos] != 60 {
                let start = pos
                while pos < xml.count && xml[pos] != 60 { pos += 1 }
                pending += string(start, pos)
                continue
            }
            if starts("<!--") { pos = try after("-->", from: pos + 4) }
            else if starts("<![CDATA[") {
                flush()
                let end = try after("]]>", from: pos + 9)
                text(string(pos + 9, end - 3)); pos = end
            } else if starts("<!") { try declaration() }
            else if starts("<?") { flush(); pos = try after("?>", from: pos + 2) }
            else if starts("</") {
                flush(); pos = try after(">", from: pos + 2)
                if let name = stack.popLast() { close(name) }
            } else {
                flush(); pos += 1
                let start = pos
                while pos < xml.count && !whitespace(xml[pos]) && xml[pos] != 47 && xml[pos] != 62 { pos += 1 }
                let name = string(start, pos)
                guard !name.isEmpty else { throw FeedFailure(reason: "Missing tag name") }
                var attributes: [String: String] = [:]
                var selfClosing = false
                while true {
                    while pos < xml.count && whitespace(xml[pos]) { pos += 1 }
                    guard pos < xml.count else { throw FeedFailure(reason: "Unclosed opening tag") }
                    if xml[pos] == 62 { pos += 1; break }
                    if starts("/>") { selfClosing = true; pos += 2; break }
                    let keyStart = pos
                    while pos < xml.count && !whitespace(xml[pos]) && xml[pos] != 61 && xml[pos] != 60 && xml[pos] != 62 && !starts("/>") { pos += 1 }
                    guard pos > keyStart else { throw FeedFailure(reason: "Invalid attribute") }
                    let key = string(keyStart, pos)
                    while pos < xml.count && whitespace(xml[pos]) { pos += 1 }
                    if pos < xml.count && xml[pos] == 61 {
                        pos += 1
                        while pos < xml.count && whitespace(xml[pos]) { pos += 1 }
                        if pos < xml.count && (xml[pos] == 34 || xml[pos] == 39) {
                            let quote = xml[pos]; pos += 1
                            let valueStart = pos
                            while pos < xml.count && xml[pos] != quote { pos += 1 }
                            guard pos < xml.count else { throw FeedFailure(reason: "Unclosed attribute") }
                            attributes[key] = Self.decode(string(valueStart, pos).trimmingCharacters(in: .whitespacesAndNewlines)); pos += 1
                        }
                    }
                }
                guard selfClosing || stack.count <= 100 else { throw FeedFailure(reason: "XML nesting is too deep") }
                open(name, attributes)
                if selfClosing { close(name) } else { stack.append(name) }
            }
        }
        // The reference parser never saves its final pending text at EOF.
        while let name = stack.popLast() { close(name) }
    }
    // fast-xml-parser htmlEntities: XML + COMMON_HTML + CURRENCY. Decode once.
    private static let entities: [String: String] = [
        "amp": "&", "apos": "'", "gt": ">", "lt": "<", "quot": "\"",
        "nbsp": "\u{a0}", "copy": "©", "reg": "®", "trade": "™", "mdash": "—", "ndash": "–",
        "hellip": "…", "laquo": "«", "raquo": "»", "lsquo": "‘", "rsquo": "’", "ldquo": "“", "rdquo": "”",
        "bull": "•", "para": "¶", "sect": "§", "deg": "°", "frac12": "½", "frac14": "¼", "frac34": "¾",
        "cent": "¢", "pound": "£", "curren": "¤", "yen": "¥", "euro": "€", "dollar": "$", "fnof": "ƒ",
        "inr": "₹", "af": "؋", "birr": "ብር", "peso": "₱", "rub": "₽", "won": "₩", "yuan": "¥", "cedil": "¸"
    ]
    private static func decode(_ raw: String) -> String {
        raw.replacing(/&(#x[0-9a-fA-F]+|#X[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/) { match in
            let token = String(match.1)
            guard token.hasPrefix("#") else { return entities[token] ?? String(match.0) }
            let hex = token.lowercased().hasPrefix("#x")
            guard let cp = UInt32(token.dropFirst(hex ? 2 : 1), radix: hex ? 16 : 10), cp <= 0x10ffff else { return String(match.0) }
            if cp == 0 || (0xd800...0xdfff).contains(cp) || (cp < 32 && ![9, 10, 13].contains(cp)) { return "" }
            return UnicodeScalar(cp).map(String.init) ?? String(match.0)
        }
    }
}
