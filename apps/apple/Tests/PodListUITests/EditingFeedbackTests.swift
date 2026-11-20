#if os(macOS)
import SwiftUI
import Testing
import PodListData
@testable import PodListUI

@MainActor @Test func editFeedbackKeepsContentHeightAcrossEmptyStatusUndoRedoAndErrors() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                     defaults: UserDefaults(suiteName: UUID().uuidString)!)
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    func height(scale: CGFloat = 1) -> CGFloat {
        NSHostingView(rootView: VStack(spacing: 0) {
            LibraryFeedback(editor: editor, surface: .library, sync: app)
            Color.clear.frame(height: 100)
        }.environment(\.macTextScale, scale).frame(width: 600)).fittingSize.height
    }
    func expectStableHeight() {
        #expect(height() == 132)
        #expect(height(scale: 2) == 164)
    }
    expectStableHeight()
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: true)], name: "Star",
                               message: String(repeating: "Long feedback ", count: 50))
    expectStableHeight()
    await editor.undo()
    expectStableHeight()
    await editor.redo()
    expectStableHeight()
    editor.error = String(repeating: "An error ", count: 50)
    expectStableHeight()
}

@MainActor @Test func editFeedbackUsesTheLatestNoticeOrEditInOneStatusSlot() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                     defaults: UserDefaults(suiteName: UUID().uuidString)!)
    editor.notice = "Exported 1 Subscription."
    #expect(editor.edits.status == "Exported 1 Subscription.")
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: true)], name: "Star", message: "Starred Episode")
    #expect(editor.notice == "Starred Episode")
    editor.notice = "Unsubscribed from Podcast"
    #expect(editor.edits.status == "Unsubscribed from Podcast")
    await editor.undo()
    #expect(editor.notice == "Undone: Star")
}

@MainActor @Test func libraryFeedbackCollapsesEmptySpaceAndAddsOnlyItsOwnLineHeight() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                     defaults: UserDefaults(suiteName: UUID().uuidString)!)
    func height(surface: EditingFeedbackSurface = .library) -> CGFloat {
        NSHostingView(rootView: VStack(spacing: 0) {
            LibraryFeedback(editor: editor, surface: surface, reservesSpace: false)
            Color.clear.frame(height: 100)
        }.frame(width: 600)).fittingSize.height
    }
    #expect(height() == 100)
    editor.error = String(repeating: "An error ", count: 50)
    #expect(height() > 100 && height() <= 132)
    editor.error = nil
    #expect(height() == 100)
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: true)], name: "Star")
    #expect(height() > 100 && height() <= 132)
    #expect(height(surface: .secondary) == 100)
    await editor.undo()
    #expect(height() > 100 && height() <= 132)
    #expect(height(surface: .secondary) == 100)
}

@MainActor @Test func editFeedbackCancelNoticeExpiresAndDoesNotFollowNavigationOrNewSheets() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let window = EditingFeedbackLifetime(currentNotice: editing.feedbackNotice)
    editing.discardViewSession(UUID())
    let notice = try #require(editing.feedbackNotice)
    let beforeExpiry = notice.expiresAt.addingTimeInterval(-0.001)
    #expect(window.message(for: notice, at: beforeExpiry) == "Cancelled View edits")
    #expect(window.message(for: notice, at: notice.expiresAt) == nil)
    #expect(window.message(for: notice, at: notice.expiresAt.addingTimeInterval(60)) == nil)

    // Navigation changes the window row's identity; a new sheet also creates its own row.
    let nextScreen = EditingFeedbackLifetime(currentNotice: editing.feedbackNotice)
    let addPlaylistSheet = EditingFeedbackLifetime(currentNotice: editing.feedbackNotice)
    #expect(nextScreen.message(for: notice, at: beforeExpiry) == nil)
    #expect(addPlaylistSheet.message(for: notice, at: beforeExpiry) == nil)

    editing.showNotice("Added to Playlist")
    let newNotice = try #require(editing.feedbackNotice)
    #expect(addPlaylistSheet.message(for: newNotice, at: newNotice.expiresAt.addingTimeInterval(-1)) == "Added to Playlist")
}

@Test func editFeedbackLifetimeRenewsRepeatedMessagesAndHandlesClearing() {
    let now = Date(timeIntervalSince1970: 1_000)
    let initial = EditingNotice("Cancelled View edits", at: now)
    let row = EditingFeedbackLifetime(currentNotice: initial)
    #expect(row.message(for: initial, at: now) == nil)
    let repeated = EditingNotice("Cancelled View edits", at: now.addingTimeInterval(4))
    #expect(row.message(for: repeated, at: now.addingTimeInterval(5)) == "Cancelled View edits")
    #expect(row.message(for: repeated, at: now.addingTimeInterval(9)) == nil)
    #expect(row.message(for: nil, at: now) == nil)
}

@MainActor @Test func editFeedbackExpirationPreservesUndoAndLaterFeedback() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let row = EditingFeedbackLifetime(currentNotice: editing.feedbackNotice)
    #expect(await editing.edit([.setStar(episodeId: "a", starred: true)], name: "Star"))
    let notice = try #require(editing.feedbackNotice)
    #expect(row.message(for: notice, at: notice.expiresAt) == nil)
    #expect(editing.undoTitle == "Undo Star")
    await editing.reverse()
    let undoNotice = try #require(editing.feedbackNotice)
    #expect(row.message(for: undoNotice, at: undoNotice.expiresAt.addingTimeInterval(-1)) == "Undone: Star")
    #expect(editing.redoTitle == "Redo Star")
}
#endif

#if os(macOS)
@MainActor @Test func sharedFeedbackAnnouncesEachEditErrorAndImportResultOnce() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                     defaults: UserDefaults(suiteName: UUID().uuidString)!)
    var messages: [String] = [], priorities: [Bool] = []
    editor.edits.announcements.post = { messages.append($0); priorities.append($1) }
    _ = LibraryFeedback(editor: editor)
    _ = EditingFeedback(editing: editor.edits)
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: true)], name: "Star")
    #expect(messages == ["Star"] && priorities == [false])
    editor.notice = "Imported 2; already in the Library 1; failed 0."
    #expect(messages.count == 2 && priorities.last == false)
    editor.error = "Could not read the feed. Try again."
    editor.edits.announcements.error(editor.error)
    #expect(messages.count == 3 && priorities.last == true)
    editor.error = nil
    editor.error = "Could not read the feed. Try again."
    #expect(messages.count == 4)
    editor.error = nil
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: false)], name: "Unstar")
    await editor.undo()
    #expect(messages.suffix(2) == ["Unstar", "Undone: Unstar"])
}

@MainActor @Test func downloadsAnnounceTransitionsOnceAndIgnoreStoredDownloadsAtLaunch() async throws {
    let db = try await fixtureDatabase()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    await app.startStandalone()
    var messages: [String] = [], priorities: [Bool] = []
    app.announcements.post = { messages.append($0); priorities.append($1) }
    func status(_ phase: DownloadPhase, error: String? = nil) throws -> DownloadStatus {
        var value: [String: Any] = ["phase": phase.rawValue, "manual": true, "received": 0, "total": 0]
        if let error { value["error"] = error }
        return try JSONDecoder().decode(DownloadStatus.self, from: JSONSerialization.data(withJSONObject: value))
    }
    app.receiveDownloadStatuses(["a": try status(.stored)])
    #expect(messages.isEmpty)
    app.receiveDownloadStatuses(["a": try status(.queued)])
    app.receiveDownloadStatuses(["a": try status(.transferring)])
    app.receiveDownloadStatuses(["a": try status(.stored)])
    app.receiveDownloadStatuses(["a": try status(.stored)])
    #expect(messages.count == 1 && messages[0].hasPrefix("Downloaded ") && priorities == [false])
    app.receiveDownloadStatuses(["a": try status(.queued)])
    app.receiveDownloadStatuses(["a": try status(.failed, error: "Connection lost")])
    app.receiveDownloadStatuses(["a": try status(.failed, error: "Connection lost")])
    #expect(messages.count == 2 && messages.last?.contains("Check your connection and retry") == true && priorities.last == true)
    app.receiveDownloadStatuses(["a": try status(.queued)])
    app.receiveDownloadStatuses(["a": try status(.failed, error: "Connection lost")])
    #expect(messages.count == 3 && messages[2] == messages[1] && priorities.last == true)
    app.receiveDownloadStatuses(["a": try status(.queued)])
    app.receiveDownloadStatuses(["a": try status(.stored)])
    #expect(messages.count == 4 && messages.last == messages.first && priorities.last == false)
}
#endif
