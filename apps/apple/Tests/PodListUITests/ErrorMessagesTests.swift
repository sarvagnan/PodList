import Foundation
import Testing
@testable import PodListData
@testable import PodListUI

@MainActor @Test func playlistFailureDoesNotExposeDatabaseDetails() async throws {
    let db = try await fixtureDatabase()
    let editor = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    var spoken: [String] = []
    editor.announcements.post = { message, _ in spoken.append(message) }
    #expect(await editor.edit(name: "Edit Playlist") { _ in throw DatabaseFailure(description: "sqlite_secret_details") } == false)
    #expect(editor.error == "Could not save the Playlist change. Try again.")
    #expect(spoken == [editor.error!])
}

@Test func connectionFailureDoesNotExposeDatabaseDetails() {
    #expect(ConnectionValidation.message(for: DatabaseFailure(description: "sqlite_secret_details")) == "Could not open or sync the local Library. Try again. If it keeps failing, reopen PodList.")
    #expect(!ConnectionValidation.message(for: SyncResponseFailure("internal_cursor_details")).contains("internal_cursor_details"))
}

@Test func libraryFailureDoesNotExposeParserOrProtocolDetails() {
    #expect(!LibraryMessages.failure(FeedFailure(reason: "internal_parser_details")).contains("internal_parser_details"))
    #expect(!LibraryMessages.failure(SyncResponseFailure("internal_cursor_details")).contains("internal_cursor_details"))
}

@Test func operationMessagesNeverIncludeDiagnostics() {
    let failures: [any Error] = [DatabaseFailure(description: "private_sqlite_details"),
                                URLError(.notConnectedToInternet),
                                SyncResponseFailure("private_server_details"),
                                CocoaError(.fileWriteNoPermission)]
    for operation in FailureOperation.allCases {
        for failure in failures {
            #expect(LibraryMessages.failure(failure, operation: operation) == operation.message)
        }
    }
    #expect(LibraryMessages.bringOverIssues(["private_transfer_details"]) == FailureOperation.bringOver.message)
    #expect(LibraryMessages.bringOverIssues([]) == nil)
    #expect(LibraryMessages.failure(FormFailure(message: "Choose a different View name.")) == "Choose a different View name.")
}

@MainActor @Test func failedPlaylistWriteAndUndoOfferWorkingRetries() async throws {
    let db = try await fixtureDatabase()
    let editor = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    try await db.execute("CREATE TRIGGER fail_edits BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'private_sqlite_details'); END")
    #expect(await editor.setStar(["a"], starred: true) == false)
    #expect(editor.error == FailureOperation.playlistEdit.message && editor.canRetry)
    #expect(editor.history.undo == nil)
    try await db.execute("DROP TRIGGER fail_edits")
    await editor.retryFailure()
    #expect(editor.error == nil && !editor.canRetry)
    #expect(try await db.loadState().episodeStates["a"]?.starred == true)
    let step = editor.history.undo?.id
    try await db.execute("CREATE TRIGGER fail_edits BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'private_sqlite_details'); END")
    await editor.reverse()
    #expect(editor.error == FailureOperation.undo.message && editor.canRetry)
    #expect(editor.history.undo?.id == step && editor.history.redo == nil)
    try await db.execute("DROP TRIGGER fail_edits")
    await editor.retryFailure()
    #expect(editor.error == nil && !editor.canRetry)
    #expect(try await db.loadState().episodeStates["a"]?.starred != true)
    #expect(editor.history.redo?.id == step)
    try await db.execute("CREATE TRIGGER fail_edits BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'private_sqlite_details'); END")
    await editor.reverse(redo: true)
    #expect(editor.error == FailureOperation.redo.message && editor.canRetry)
    try await db.execute("DROP TRIGGER fail_edits")
    await editor.retryFailure()
    #expect(editor.error == nil && !editor.canRetry)
    #expect(try await db.loadState().episodeStates["a"]?.starred == true)
}

@MainActor @Test func persistedDownloadDetailsAreNeitherShownNorSpoken() async throws {
    let db = try await fixtureDatabase()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    await app.startStandalone()
    var spoken: [String] = []
    app.announcements.post = { message, _ in spoken.append(message) }
    func status(_ phase: DownloadPhase) throws -> DownloadStatus {
        try JSONDecoder().decode(DownloadStatus.self, from: Data("{\"phase\":\"\(phase.rawValue)\",\"manual\":true,\"received\":0,\"total\":0,\"error\":\"private_transport_details\"}".utf8))
    }
    app.receiveDownloadStatuses(["a": try status(.queued)])
    app.receiveDownloadStatuses(["a": try status(.failed)])
    app.receiveDownloadStatuses(["a": try status(.failed)])
    #expect(app.downloadStatuses["a"]?.error == FailureOperation.download.message)
    #expect(spoken.count == 1 && spoken[0].contains("Check your connection and retry"))
    #expect(!spoken[0].contains("private_transport_details"))
    app.disconnect()
}
