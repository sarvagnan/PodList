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
        let renderer = ImageRenderer(content: GettingStartedSteps().frame(width: 500))
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
#endif
