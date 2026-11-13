import Testing
import PodListData
import ProtocolTestSupport

@Test(arguments: try Fixtures.document("feeds.json")["feeds"].array)
func feedVector(_ vector: JSON) throws {
    if vector.object["error"] == .bool(true) {
        #expect(throws: (any Error).self) { try FeedParser.parse(vector["xml"].string) }
    } else {
        #expect(try FeedParser.parse(vector["xml"].string) == vector["expected"].decode(ParsedFeed.self))
    }
}
@Test(arguments: try Fixtures.document("feeds.json")["durations"].array)
func durationVector(_ vector: JSON) {
    #expect(FeedParser.duration(vector["input"].nullableString) == vector["expected"].nullableDouble)
}
@Test func feedSizeCountsUTF8() {
    #expect(throws: FeedFailure.self) { try FeedParser.parse("<rss>" + String(repeating: "é", count: FeedParser.sizeLimit / 2) + "</rss>") }
}
@Test func feedDoesNotExpandDTDBombs() throws {
    let declarations = (1...9).map { n in
        "<!ENTITY lol\(n) '\(String(repeating: "&lol\(n - 1);", count: 10))'>"
    }.joined()
    let literal = String(repeating: "&lol9;", count: 10_000)
    let xml = "<!DOCTYPE rss [<!ENTITY lol0 'EXPANDED'>\(declarations)]>" +
        "<rss><channel><title>Safe</title><description>\(literal)</description></channel></rss>"
    #expect(try FeedParser.parse(xml).description == literal)
}
@Test func feedNestingIsBounded() {
    let xml = "<rss><channel><title>Safe</title>" + String(repeating: "<unused>", count: 1000) +
        String(repeating: "</unused>", count: 1000) + "</channel></rss>"
    #expect(throws: FeedFailure.self) { try FeedParser.parse(xml) }
}
@Test func feedDeclarationLiteralsAreInert() throws {
    let xml = "<rss><channel><!-- <!DOCTYPE fake [ -->" +
        "<title><![CDATA[<!DOCTYPE literal> &amp;]]></title>" +
        "<item><enclosure url=\"https://test/<!DOCTYPE literal>\"/></item></channel></rss>"
    let feed = try FeedParser.parse(xml)
    #expect(feed.title == "<!DOCTYPE literal> &amp;")
    #expect(feed.episodes.first?.audioUrl == "https://test/<!DOCTYPE literal>")
}
