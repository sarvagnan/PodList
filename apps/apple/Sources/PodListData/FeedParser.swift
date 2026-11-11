import Foundation

public struct ParsedEpisode: Codable, Equatable, Sendable {
    public let guid: String
    public let title: String
    public let description: String
    public let published: Int64
    public let duration: Double?
    public let audioUrl: String
    public let artworkUrl: String?
    public let chaptersUrl: String?
    public let link: String?
}
public struct ParsedFeed: Codable, Equatable, Sendable {
    public let title: String
    public let author: String?
    public let description: String?
    public let artworkUrl: String?
    public let episodes: [ParsedEpisode]
    public let link: String?
}
public struct FeedFailure: Error, Sendable { public let reason: String }

public enum FeedParser {
    public static let sizeLimit = 32 * 1024 * 1024
    public static func duration(_ raw: String?) -> Double? {
        guard let raw else { return nil }
        let parts = raw.components(separatedBy: ":")
        guard parts.count <= 3 else { return nil }
        var total = 0.0
        for part in parts {
            let trimmed = part.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let value = trimmed.isEmpty ? 0 : Double(trimmed), value.isFinite, value >= 0 else { return nil }
            total = total * 60 + value
        }
        return total.isFinite ? total : nil
    }
    public static func parse(_ xml: String) throws -> ParsedFeed {
        guard xml.utf8.count <= sizeLimit else { throw FeedFailure(reason: "XML is too large") }
        guard xml.range(of: #"<!\s*(DOCTYPE|ENTITY)"#, options: [.regularExpression, .caseInsensitive]) == nil else {
            throw FeedFailure(reason: "DTD and entities are forbidden")
        }
        let parser = XMLParser(data: Data(xml.utf8))
        parser.shouldProcessNamespaces = false
        parser.shouldResolveExternalEntities = false
        parser.externalEntityResolvingPolicy = .never
        let handler = FeedHandler()
        parser.delegate = handler
        guard parser.parse() else { throw FeedFailure(reason: parser.parserError?.localizedDescription ?? "Malformed XML") }
        return try handler.feed()
    }
    fileprivate static func date(_ raw: String?) -> Int64 {
        guard let raw else { return 0 }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: raw) { return Int64(date.timeIntervalSince1970 * 1000) }
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: raw) { return Int64(date.timeIntervalSince1970 * 1000) }
        var text = raw.replacingOccurrences(of: #"^[A-Za-z]{3},\s*"#, with: "", options: .regularExpression)
        // Normalize the RSS two-digit year explicitly; DateFormatter otherwise accepts it as year 26.
        let parts = text.split(whereSeparator: { $0.isWhitespace })
        if parts.count >= 3, parts[2].count == 2, let year = Int(parts[2]), parts[1].allSatisfy({ $0.isLetter }) {
            text = ([String(parts[0]), String(parts[1]), String(year >= 50 ? 1900 + year : 2000 + year)] + parts.dropFirst(3).map(String.init)).joined(separator: " ")
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.isLenient = false
        formatter.twoDigitStartDate = Date(timeIntervalSince1970: -631_152_000) // 1950-01-01
        for format in ["d MMM yyyy HH:mm:ss Z", "d MMM yyyy HH:mm Z", "d MMM yyyy HH:mm:ss z", "d MMM yyyy HH:mm:ss ZZZZZ", "d MMM yy HH:mm:ss Z", "yyyy-MM-dd"] {
            formatter.dateFormat = format
            if let date = formatter.date(from: text) { return Int64((date.timeIntervalSince1970 * 1000).rounded()) }
        }
        return 0
    }
}

/// Only the first child of each name counts, and only its direct text (or CDATA).
private final class Fields {
    let wanted: Set<String>
    let attributes: [String: String]
    private var seen: Set<String> = []
    private var values: [String: String] = [:]
    init(_ wanted: Set<String>, _ attributes: [String: String] = [:]) { self.wanted = wanted; self.attributes = attributes }
    func open(_ name: String, attributes: [String: String]) -> Bool {
        guard wanted.contains(name) || self.attributes[name] != nil, seen.insert(name).inserted else { return false }
        if let attribute = self.attributes[name], let raw = attributes[attribute] {
            set(name, raw.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        return wanted.contains(name)
    }
    func set(_ name: String, _ value: String) { if !value.isEmpty { values[name] = value } }
    subscript(_ key: String) -> String? { values[key] }
}
private final class FeedHandler: NSObject, XMLParserDelegate {
    private var root: String?
    private var depth = 0
    private var channelSeen = false
    private var inChannel = false
    private let channel = Fields(["link", "title", "itunes:author", "itunes:owner", "description", "itunes:summary"], ["itunes:image": "href"])
    private var imageSeen = false
    private var inImage = false
    private let image = Fields(["url"])
    private var item: Fields?
    private var episodes: [ParsedEpisode] = []
    private var target: Fields?
    private var field: String?
    private var fieldDepth = 0
    private var value = ""
    private var run = ""

    private func flushRun() {
        if !run.isEmpty { value += run.trimmingCharacters(in: .whitespacesAndNewlines); run = "" }
    }
    func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        if field != nil { flushRun() }
        depth += 1
        if field != nil { return }
        var fields: Fields?
        switch depth {
        case 1: root = name
        case 2:
            if name == "channel" && !channelSeen { channelSeen = true; inChannel = true }
        case 3 where inChannel:
            if name == "item" {
                item = Fields(["link", "guid", "title", "itunes:title", "content:encoded", "description", "itunes:summary", "pubDate", "itunes:duration"],
                              ["enclosure": "url", "itunes:image": "href", "podcast:chapters": "url"])
            } else if name == "image" && !imageSeen { imageSeen = true; inImage = true }
            else { fields = channel }
        case 4: fields = item ?? (inImage ? image : nil)
        default: break
        }
        if let fields, fields.open(name, attributes: attributes) { target = fields; field = name; fieldDepth = depth; value = "" }
    }
    func parser(_ parser: XMLParser, foundCharacters text: String) { if field != nil && depth == fieldDepth { run += text } }
    func parser(_ parser: XMLParser, foundCDATA data: Data) { self.parser(parser, foundCharacters: String(decoding: data, as: UTF8.self)) }
    func parser(_ parser: XMLParser, didEndElement name: String, namespaceURI: String?, qualifiedName: String?) {
        if field != nil { flushRun() }
        if let field, depth == fieldDepth { target?.set(field, value); self.field = nil; target = nil }
        if inChannel && depth == 3 && name == "item" { if let item { finish(item) }; item = nil }
        if inChannel && depth == 3 && name == "image" { inImage = false }
        if inChannel && depth == 2 { inChannel = false }
        depth -= 1
    }
    func parser(_ parser: XMLParser, resolveExternalEntityName name: String, systemID: String?) -> Data? { parser.abortParsing(); return nil }
    private func finish(_ item: Fields) {
        guard let audio = item["enclosure"] else { return }
        episodes.append(ParsedEpisode(guid: item["guid"] ?? audio, title: item["title"] ?? item["itunes:title"] ?? "Untitled episode",
                                      description: item["content:encoded"] ?? item["description"] ?? item["itunes:summary"] ?? "",
                                      published: FeedParser.date(item["pubDate"]), duration: FeedParser.duration(item["itunes:duration"]),
                                      audioUrl: audio, artworkUrl: item["itunes:image"], chaptersUrl: item["podcast:chapters"], link: item["link"]))
    }
    func feed() throws -> ParsedFeed {
        guard root == "rss", channelSeen, let title = channel["title"] else { throw FeedFailure(reason: "RSS channel must have a title") }
        return ParsedFeed(title: title, author: channel["itunes:author"] ?? channel["itunes:owner"],
                          description: channel["description"] ?? channel["itunes:summary"], artworkUrl: channel["itunes:image"] ?? image["url"],
                          episodes: episodes, link: channel["link"])
    }
}
