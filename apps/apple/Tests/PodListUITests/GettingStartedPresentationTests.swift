#if os(macOS)
import SwiftUI
import Testing
import PodListData
@testable import PodListUI

@MainActor @Test func gettingStartedNeverReplacesNumbersWithCheckMarksOrDoneLabels() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                    defaults: UserDefaults(suiteName: UUID().uuidString)!)
    editor.showGettingStarted = true
    editor.reconcile(.init(state: .initial(), subscriptions: [], episodes: []))
    func image() throws -> NSBitmapImageRep {
        let renderer = ImageRenderer(content: GettingStartedScreen(editor: editor, add: nil).frame(width: 500))
        let data = try #require(renderer.nsImage?.tiffRepresentation)
        return try #require(NSBitmapImageRep(data: data))
    }
    let introduction = try image()
    // Subscriptions, Views and Entries must never turn any numbered point into a tick
    // or add completion labels. Compare the actual rendered card before and after.
    let snapshot = try await db.readLibrary()
    editor.reconcile(.init(state: snapshot.state, subscriptions: snapshot.subscriptions, episodes: snapshot.episodes))
    #expect(editor.showGettingStarted)
    // Anti-aliasing can differ by a few pixels between renders under parallel load; a tick or
    // label replacing a number changes hundreds.
    #expect(try differingPixels(image(), introduction) < 50)
}
private func differingPixels(_ a: NSBitmapImageRep, _ b: NSBitmapImageRep) -> Int {
    guard a.pixelsWide == b.pixelsWide, a.pixelsHigh == b.pixelsHigh else { return .max }
    var count = 0
    for y in 0..<a.pixelsHigh {
        for x in 0..<a.pixelsWide {
            guard let p = a.colorAt(x: x, y: y), let q = b.colorAt(x: x, y: y) else { continue }
            let delta = abs(p.redComponent - q.redComponent) + abs(p.greenComponent - q.greenComponent)
                + abs(p.blueComponent - q.blueComponent) + abs(p.alphaComponent - q.alphaComponent)
            if delta > 0.1 { count += 1 }
        }
    }
    return count
}
#endif
