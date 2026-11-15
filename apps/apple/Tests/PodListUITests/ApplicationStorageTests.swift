#if DEBUG
import Foundation
import Testing
import PodListAutomation

@Test func uiTestStorageRejectsProductionIdentityAndNonTemporaryPaths() throws {
    let root = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("podlist-uitour-storage-test/data")
    let identity = "app.podlist.uitour.test"
    #expect(throws: (any Error).self) {
        try ApplicationStorage.isolatedDirectory(root.path, bundleIdentifier: "app.podlist.mac")
    }
    for path in [nil, "relative/data", "/", "/Users/Shared/PodList", "/private/tmp/../PodList"] as [String?] {
        #expect(throws: (any Error).self) {
            try ApplicationStorage.isolatedDirectory(path, bundleIdentifier: identity)
        }
    }
    #expect(try ApplicationStorage.isolatedDirectory(root.path, bundleIdentifier: identity).path == root.resolvingSymlinksInPath().path)
}

@Test func uiTestStorageAcceptsPrivateTmp() throws {
    // The tour's run directory lives in /private/tmp, which symlink resolution spells /tmp.
    let url = try ApplicationStorage.isolatedDirectory("/private/tmp/podlist-uitour-run/dark/data",
                                                       bundleIdentifier: "app.podlist.uitour.test")
    #expect(url.path.hasSuffix("/podlist-uitour-run/dark/data"))
}
#endif
