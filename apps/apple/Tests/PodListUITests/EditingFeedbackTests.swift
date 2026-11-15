#if os(macOS)
import SwiftUI
import Testing
import PodListData
@testable import PodListUI

@MainActor @Test func editFeedbackKeepsContentHeightAcrossEmptyStatusUndoRedoAndErrors() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: UUID().uuidString,
                                     defaults: UserDefaults(suiteName: UUID().uuidString)!)
    func height() -> CGFloat {
        NSHostingView(rootView: VStack(spacing: 0) {
            LibraryFeedback(editor: editor)
            Color.clear.frame(height: 100)
        }.frame(width: 600)).fittingSize.height
    }
    #expect(height() == 132)
    _ = await editor.edits.edit([.setStar(episodeId: "a", starred: true)], name: "Star",
                               message: String(repeating: "Long feedback ", count: 50))
    #expect(height() == 132)
    await editor.undo()
    #expect(height() == 132)
    await editor.redo()
    #expect(height() == 132)
    editor.error = String(repeating: "An error ", count: 50)
    #expect(height() == 132)
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

@MainActor @Test func editFeedbackCancelNoticeExpiresAndDoesNotFollowNavigationOrNewSheets() async throws {
    let db = try await fixtureDatabase()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let window = EditingFeedbackLifetime(currentNotice: editing.feedbackNotice)
    editing.discardViewSession(UUID())
    let notice = try #require(editing.feedbackNotice)
    let beforeExpiry = notice.expiresAt.addingTimeInterval(-0.001)
    #expect(window.message(for: notice, at: beforeExpiry) == "View edits cancelled.")
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
    let initial = EditingNotice("View edits cancelled.", at: now)
    let row = EditingFeedbackLifetime(currentNotice: initial)
    #expect(row.message(for: initial, at: now) == nil)
    let repeated = EditingNotice("View edits cancelled.", at: now.addingTimeInterval(4))
    #expect(row.message(for: repeated, at: now.addingTimeInterval(5)) == "View edits cancelled.")
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
