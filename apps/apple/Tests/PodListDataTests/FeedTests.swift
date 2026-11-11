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
