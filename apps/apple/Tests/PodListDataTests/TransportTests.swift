import Foundation
import Testing
import PodListData
import ProtocolTestSupport

@Test func pullPageRequiresAndPreservesNullSnapshot() throws {
    let wire = #"{"cursor":12,"snapshot":null,"operations":[]}"#
    let page = try ProtocolJSON.decode(PullPage.self, from: wire)
    #expect(page.cursor == 12)
    #expect(page.snapshot == nil)
    #expect(try JSON.encoded(page) == ProtocolJSON.decode(JSON.self, from: wire))
    #expect(throws: DecodingError.self) { try ProtocolJSON.decode(PullPage.self, from: #"{"cursor":12,"operations":[]}"#) }
}

@Test func serverAddressStoresOnlyOrigins() throws {
    #expect(try ServerAddress(" https://EXAMPLE.test:8443/ ").origin.absoluteString == "https://example.test:8443")
    #expect(try ServerAddress("http://localhost:8080", allowInsecureLocalhost: true).origin.scheme == "http")
    for input in ["https://test/api", "https://user:pass@test", "https://test?secret=x", "https://test#part", "file:///tmp/a", "http://test", "https://test:0", "https://test:65536"] {
        #expect(throws: SyncResponseFailure.self) { try ServerAddress(input) }
    }
    #expect(throws: SyncResponseFailure.self) { try ServerAddress("http://example.test", allowInsecureLocalhost: true) }
}
