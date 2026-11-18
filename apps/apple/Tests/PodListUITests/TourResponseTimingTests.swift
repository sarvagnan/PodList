#if DEBUG && os(macOS)
import Foundation
import Testing
@testable import PodListUI

private let tourID = "app.podlist.uitour.example.light"

@Test func tourTimingRequiresDisposableBundleIdentity() {
    for identity in ["app.podlist.mac", "app.podlist.uitour", nil] {
        #expect(TourResponseTiming.outputURL("/private/tmp/sample.tsv", bundleIdentifier: identity) == nil)
    }
}

@Test func tourTimingRequiresExplicitAbsoluteFileInsideTemp() {
    for path in [nil, "", "sample.tsv", "/", "/private/tmp", "/private/tmp/",
                 "/private/tmp-trap/sample.tsv", "/Users/Shared/sample.tsv",
                 "/private/tmp/../sample.tsv"] {
        #expect(TourResponseTiming.outputURL(path, bundleIdentifier: tourID) == nil)
    }
}

@Test func tourTimingAcceptsGuestAndUserTemporaryPaths() {
    let name = "podlist-\(UUID()).tsv"
    for directory in ["/tmp", "/private/tmp", NSTemporaryDirectory()] {
        let path = URL(fileURLWithPath: directory).appendingPathComponent(name)
        #expect(TourResponseTiming.outputURL(path.path, bundleIdentifier: tourID)?.lastPathComponent == name)
    }
}

@Test func tourTimingRejectsDirectoriesAndSymlinks() throws {
    let files = FileManager.default
    let directory = files.temporaryDirectory.appendingPathComponent("podlist-\(UUID())")
    try files.createDirectory(at: directory, withIntermediateDirectories: false)
    defer { try? files.removeItem(at: directory) }
    let link = directory.appendingPathComponent("outside")
    try files.createSymbolicLink(at: link, withDestinationURL: URL(fileURLWithPath: "/Users/Shared"))
    let dangling = directory.appendingPathComponent("dangling.tsv")
    try files.createSymbolicLink(at: dangling, withDestinationURL: directory.appendingPathComponent("missing.tsv"))

    for path in [directory, link, link.appendingPathComponent("sample.tsv"), dangling] {
        #expect(TourResponseTiming.outputURL(path.path, bundleIdentifier: tourID) == nil)
    }
}
#endif
