#if os(macOS)
import AppKit
import PodListData
import PodListDomain
import SwiftUI
import Testing
import UniformTypeIdentifiers
@testable import PodListUI

@Test func navigationMenuCommandsShowDestinationsInsteadOfImplyingEdits() {
    let destinations: [Destination] = [.trash, .subscriptions, .views]
    #expect(LibraryNavigationCommand.allCases.map(\.destination) == destinations)
    #expect(LibraryNavigationCommand.allCases.map(\.title) == ["Show Trash", "Show Subscriptions", "Show All Views"])
}

@Test func supplementalCommandsAreFiledByTaskAndObject() {
    #expect(Set(MenuActionMenu.file.items) == [.showImport, .cancelImport, .retryImport])
    #expect(MenuActionMenu.editHistory.items == [.showRestoredEntries, .showAddedEntries])
    #expect(MenuActionMenu.edit.items == [.clearSearch, .retry])
    #expect(Set(MenuActionMenu.podcast.items) == [.refresh, .retryFeedRefresh, .backToLibrary, .searchPodcasts])
    #expect(MenuActionMenu.views.items == [.createViewFromSearch, .openCreatedView])
    #expect(MenuActionMenu.episode.items == [.retrySelectedEpisodeDrop, .retryAllEpisodeDrops, .removeEpisodeDrop])
    #expect(MenuActionMenu.connection.items == [.connect, .standalone, .disconnect, .offerBringOver, .retryBringOver])
    #expect(MenuActionMenu.controls.items == [.backToNowPlaying, .retryPlayback])
    #expect(MenuActionMenu.automation.items == [.copyConfiguration, .retryAutomation])
    let items = MenuActionMenu.allCases.flatMap(\.items)
    #expect(Set(items).count == items.count)
}

@MainActor @Test func restoredEntriesCommandIsScopedToTheWindowAndRevealsTheAvailableEntries() async throws {
    let library = try await fixtureModel()
    let window = WindowModel()
    let otherWindow = WindowModel()
    window.navigate(to: .playlist("default"))
    let origin = window.restorationOrigin
    #expect(window.followUpActions(in: library) { library }[.showRestoredEntries] == nil)
    window.search = "Beta"
    #expect(!window.revealRestoredEntries([.init(playlistID: "default", episodeIDs: ["a"])], in: library, from: origin))
    #expect(otherWindow.followUpActions(in: library) { library }[.showRestoredEntries] == nil)
    let command = try #require(window.followUpActions(in: library) { library }[.showRestoredEntries])
    command()
    #expect(window.search.isEmpty && window.selection == ["a"] && window.scrollAnchor?.id == "a")
    #expect(window.followUpActions(in: library) { library }[.showRestoredEntries] == nil)
}

@Test func dialogButtonsAndMessageLocalHelpersHaveNoMenuEntries() {
    let surfaceOnly: [MenuAction] = [
        .done, .close, .cancel, .save, .cancelRename, .createPlaylist, .createView,
        .playNow, .playNext, .playLast, .go, .deletePermanently, .rewind,
        .bringOver, .notNow, .importSelection, .chooseFile, .dismissTutorial
    ]
    for action in surfaceOnly {
        #expect(action.menu == nil)
        #expect(!MenuActionMenu.allCases.flatMap(\.items).contains(action))
    }
    // Existing download recovery stays in Episode, without a second generic entry.
    #expect(EpisodeDownloadAction.allCases.map(\.title) == [
        "Download", "Cancel Download", "Retry Download", "Remove Download"
    ])
}

@MainActor @Test(.timeLimit(.minutes(1))) func failedEpisodeDropCommandUsesRetainedRecoveryAndValidatesBusyState() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: "PodListDropMenu-" + UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "menu", defaults: defaults)
    #expect(PersistentMenuActions.owns(.retryAllEpisodeDrops))
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] == nil)

    var retried = 0
    var complete: (() -> Void)?
    editor.failedEpisodeDrop = FailedEpisodeDrop(message: "Failed remote Episode") {
        retried += 1
        complete?()
    }
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] != nil)
    #expect(PersistentMenuActions.episodeDrops(editor)[.retry] == nil)
    editor.busy = true
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] == nil)
    editor.busy = false
    try await editor.edits.performExternal {
        #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] == nil)
        return nil
    }
    editor.episodeDrop = EpisodeDropProgress(playlistID: "default", total: 1)
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] == nil)
    editor.episodeDrop = nil
    let command = try #require(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops])
    await withCheckedContinuation { continuation in
        complete = { continuation.resume() }
        command()
    }
    #expect(retried == 1)
    editor.failedEpisodeDrop = nil
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] == nil)
}

@MainActor @Test func retrySelectedDropOnlyRetriesOneFailedSlotInTheSelectedPlaylist() async throws {
    let db = try await fixtureDatabase()
    try await db.record(.createPlaylist(playlistId: "other", name: "Other", clearOnPlayed: false), at: 1000)
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "selected-retry-menu")
    let first = EpisodeDropSlot(reference: .init(episodeID: "a"), title: "Alpha", failure: "Failed")
    let second = EpisodeDropSlot(reference: .init(episodeID: "b"), title: "Beta", failure: "Failed")
    let third = EpisodeDropSlot(reference: .init(episodeID: "pending"), title: "Pending", failure: "Failed")
    var retried: [String] = []
    editor.pendingEpisodeDrops = [
        PendingEpisodeDrop(playlistID: "other", beforeID: nil, slots: [first, second], selected: { retried += $0 }),
        PendingEpisodeDrop(playlistID: "default", beforeID: nil, slots: [third], selected: { retried += $0 })
    ]

    #expect(!PersistentMenuActions.owns(.retrySelectedEpisodeDrop))
    #expect(EpisodeDrop.selectedRetry(selection: [], playlistID: "other", editor: editor) == nil)
    #expect(EpisodeDrop.selectedRetry(selection: ["a"], playlistID: "other", editor: editor) == nil)
    #expect(EpisodeDrop.selectedRetry(selection: [first.id, second.id], playlistID: "other", editor: editor) == nil)
    #expect(EpisodeDrop.selectedRetry(selection: [third.id], playlistID: "other", editor: editor) == nil)
    editor.busy = true
    #expect(EpisodeDrop.selectedRetry(selection: [first.id], playlistID: "other", editor: editor) == nil)
    editor.busy = false
    try await editor.edits.performExternal {
        #expect(EpisodeDrop.selectedRetry(selection: [first.id], playlistID: "other", editor: editor) == nil)
        return nil
    }
    editor.episodeDrop = EpisodeDropProgress(playlistID: "default", total: 1)
    #expect(EpisodeDrop.selectedRetry(selection: [first.id], playlistID: "other", editor: editor) == nil)
    editor.episodeDrop = nil
    let retry = try #require(EpisodeDrop.selectedRetry(selection: [first.id], playlistID: "other", editor: editor))
    await retry()

    #expect(retried == ["a"])
    #expect(EpisodeDrop.failedIDs(editor: editor) == [second.id, third.id])
    #expect(EpisodeDrop.selectedRetry(selection: [first.id], playlistID: "other", editor: editor) == nil)
    #expect(PersistentMenuActions.episodeDrops(editor)[.retryAllEpisodeDrops] != nil)
    let state = try await db.loadState()
    #expect(state.playlists.first { $0.id == "other" }?.entries.map(\.episodeId) == ["a"])
}

@MainActor @Test func failedDropRemovalMenuUsesRowOperationAndKeepsSuccessfulEntries() async throws {
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "remove-menu")
    #expect(PersistentMenuActions.owns(.removeEpisodeDrop))
    #expect(PersistentMenuActions.episodeDrops(editor)[.removeEpisodeDrop] == nil)
    let before = try await db.loadState()
    let reference = DraggedEpisode(episodeID: "missing", feedURL: nil, guid: nil, title: "Missing")
    let failed = EpisodeDropSlot(reference: reference, title: "Missing", failure: "Failed")
    let committed = EpisodeDropSlot(reference: reference, title: "Added", committed: true)
    editor.pendingEpisodeDrops = [PendingEpisodeDrop(playlistID: "default", beforeID: nil, slots: [failed, committed], selected: { _ in })]
    #expect(EpisodeDrop.failedIDs(editor: editor, playlistID: "other").isEmpty)
    editor.busy = true
    #expect(PersistentMenuActions.episodeDrops(editor)[.removeEpisodeDrop] == nil)
    editor.busy = false
    editor.episodeDrop = EpisodeDropProgress(playlistID: "default", total: 1)
    #expect(PersistentMenuActions.episodeDrops(editor)[.removeEpisodeDrop] == nil)
    editor.episodeDrop = nil
    let remove = try #require(PersistentMenuActions.episodeDrops(editor)[.removeEpisodeDrop])
    remove()
    #expect(editor.pendingEpisodeDrops.isEmpty)
    #expect(editor.failedEpisodeDrop == nil)
    #expect(PersistentMenuActions.episodeDrops(editor)[.removeEpisodeDrop] == nil)
    #expect(try await db.loadState() == before)
}

@Test func focusedRetryCommandValidatesAndInvokesTheSurfaceHandler() throws {
    var calls = 0
    let disabled = FocusedRecoveryActions.context(enabled: false) { calls += 1 }
    #expect(disabled[.retry] == nil)
    let enabled = FocusedRecoveryActions.context(enabled: true) { calls += 1 }
    let command = try #require(enabled[.retry])
    command()
    #expect(calls == 1)
}

@Test func viewCommandsResolveTheSelectedViewWithoutNavigating() async throws {
    let library = try await fixtureModel()
    let id = try #require(library.state.views.first?.id)
    #expect(ViewSelectionAction.view(in: library, destination: .views, selection: [id])?.id == id)
    #expect(ViewSelectionAction.view(in: library, destination: .view(id), selection: [])?.id == id)
    #expect(ViewSelectionAction.view(in: library, destination: .views, selection: []) == nil)
    #expect(ViewSelectionAction.view(in: library, destination: .views, selection: [id, "other"]) == nil)
    #expect(ViewSelectionAction.view(in: library, destination: .views, selection: ["deleted"]) == nil)
    #expect(ViewSelectionAction.view(in: library, destination: .subscriptions, selection: [id]) == nil)
}

@Test func rowTypeSelectionMatchesPrefixesCyclesAndExpires() {
    let rows = [TypeSelectionRow(id: "0", title: "Café"),
                TypeSelectionRow(id: "1", title: "Commute"),
                TypeSelectionRow(id: "2", title: "News")]
    var typing = RowTypeSelection()
    #expect(typing.select("c", in: rows, selected: nil, at: 1) == "0")
    #expect(typing.select("c", in: rows, selected: "0", at: 1.2) == "1")
    #expect(typing.select("o", in: rows, selected: "1", at: 1.3) == "1")
    #expect(typing.select("n", in: rows, selected: "1", at: 3) == "2")
    #expect(typing.select("CAFE", in: rows, selected: "2", at: 5) == "0")
    #expect(typing.select("z", in: rows, selected: "0", at: 7) == nil)
    #expect(typing.select("n", in: [], selected: nil, at: 9) == nil)
}

@Test func rowTypeSelectionUsesDisplayOrderAndOneSecondTimeout() {
    let rows = [TypeSelectionRow(id: "later", title: "Joinery without screws"),
                TypeSelectionRow(id: "earlier", title: "Joints and hinges"),
                TypeSelectionRow(id: "other", title: "Other news")]
    var typing = RowTypeSelection()
    #expect(typing.select("j", in: rows, selected: nil, at: 1) == "later")
    #expect(typing.select("o", in: rows, selected: "later", at: 1.1) == "later")
    #expect(typing.select("i", in: rows, selected: "later", at: 1.2) == "later")
    // At exactly one second, start a new prefix, rather than extending "joi".
    #expect(typing.select("o", in: rows, selected: "later", at: 2.2) == "other")
    #expect(typing.select("", in: rows, selected: "other", at: 2.3) == nil)
    #expect(typing.select("j", in: rows, selected: "other", at: 4) == "later")
    #expect(typing.select("J", in: rows, selected: "later", at: 4.1) == "earlier")
    #expect(typing.select("j", in: rows, selected: "earlier", at: 4.2) == "later")
    // A changed sort order is the matching order, independent of ID ordering.
    var sorted = RowTypeSelection()
    #expect(sorted.select("jo", in: Array(rows.reversed()), selected: nil, at: 1) == "earlier")
}

@MainActor @Test func textNavigationAndSheetCancellationWinOverPlayback() {
    let left = String(UnicodeScalar(NSLeftArrowFunctionKey)!)
    let right = String(UnicodeScalar(NSRightArrowFunctionKey)!)
    for arrow in [left, right] {
        for modifiers: NSEvent.ModifierFlags in [.command, [.command, .shift], [.command, .capsLock, .function]] {
            #expect(PlaybackKeyboardGuard.route(characters: arrow, modifiers: modifiers, editable: true, sheet: false) == .text)
            #expect(PlaybackKeyboardGuard.route(characters: arrow, modifiers: modifiers, editable: false, sheet: false) == .menu)
        }
        #expect(PlaybackKeyboardGuard.route(characters: arrow, modifiers: [.command, .control], editable: true, sheet: false) == .menu)
        #expect(PlaybackKeyboardGuard.route(characters: arrow, modifiers: .option, editable: true, sheet: false) == .menu)
    }
    #expect(PlaybackKeyboardGuard.route(characters: " ", modifiers: [], editable: true, sheet: false) == .text)
    #expect(PlaybackKeyboardGuard.route(characters: " ", modifiers: .shift, editable: true, sheet: false) == .text)
    #expect(PlaybackKeyboardGuard.route(characters: " ", modifiers: .command, editable: true, sheet: false) == .menu)
    for editable in [false, true] {
        #expect(PlaybackKeyboardGuard.route(characters: ".", modifiers: .command, editable: editable, sheet: true) == .cancelSheet)
        #expect(PlaybackKeyboardGuard.route(characters: ".", modifiers: .command, editable: editable, sheet: false) == .menu)
    }
    // Return belongs to the field editor while renaming/editing, and to the
    // sheet's default action even if the parent window still has a selection.
    #expect(PlaybackKeyboardGuard.route(characters: "\r", modifiers: [], editable: true, sheet: false) == .text)
    #expect(PlaybackKeyboardGuard.route(characters: "\r", modifiers: [], editable: false, sheet: false) == .menu)
    for editable in [false, true] {
        #expect(PlaybackKeyboardGuard.route(characters: "\r", modifiers: [], editable: editable, sheet: true) == .sheetDefault)
        #expect(PlaybackKeyboardGuard.route(characters: "\r", modifiers: .command, editable: editable, sheet: true) == .menu)
        #expect(PlaybackKeyboardGuard.route(characters: " ", modifiers: [], editable: editable, sheet: true) == (editable ? .text : .sheetSpace))
    }
}

@Test func playlistSettingsRestoreCommandUsesTheSheetActionAndEnablement() throws {
    var restoredFromSheet = 0
    var restoredFromTrash = 0
    let trash = { restoredFromTrash += 1 }
    for (deleted, busy, enabled) in [(false, false, false), (true, true, false), (true, false, true)] {
        let button = PlaylistSettingsCommandContext.restoreAction(isDeleted: deleted, busy: busy) { restoredFromSheet += 1 }
        let sheet = PlaylistSettingsCommandContext(restore: button)
        let command = PlaylistSettingsCommandContext.focusedRestore(sheet: sheet, trash: trash)
        #expect((button != nil) == enabled)
        #expect((command != nil) == enabled)
        command?()
    }
    #expect(restoredFromSheet == 1)
    #expect(restoredFromTrash == 0)
    let command = try #require(PlaylistSettingsCommandContext.focusedRestore(sheet: nil, trash: trash))
    command()
    #expect(restoredFromTrash == 1)
}

private func copyData(_ provider: NSItemProvider, type: UTType) async throws -> Data {
    try await withCheckedThrowingContinuation { continuation in
        _ = provider.loadDataRepresentation(for: type) { data, error in
            if let data { continuation.resume(returning: data) }
            else { continuation.resume(throwing: error ?? CocoaError(.fileReadUnknown)) }
        }
    }
}

@Test func episodeCopyExportsTitleAndURLForBothPasteDestinations() async throws {
    let url = URL(string: "https://example.com/episodes/one")!
    let content = SelectionCopyContent(title: "Episode One", url: url)
    let provider = content.itemProvider()
    let text = try await copyData(provider, type: .utf8PlainText)
    let address = try await copyData(provider, type: .url)
    #expect(String(data: text, encoding: .utf8) == "Episode One\nhttps://example.com/episodes/one")
    #expect(String(data: address, encoding: .utf8) == url.absoluteString)
    let pending = SelectionCopyContent(title: "Details pending", url: nil).itemProvider()
    #expect(!pending.hasItemConformingToTypeIdentifier(UTType.url.identifier))
    let pendingText = try await copyData(pending, type: .utf8PlainText)
    #expect(String(data: pendingText, encoding: .utf8) == "Details pending")
}

@Test func customShortcutsLeaveStandardAndExistingEquivalentsAvailable() {
    let shortcuts = PodListShortcut.allCases.compactMap(\.shortcut)
    #expect(Set(shortcuts.map { "\($0.modifiers.rawValue)/\($0.key.character)" }).count == shortcuts.count)
    // Apple's support.apple.com/en-us/102650 table, including Finder and text
    // editing; plus PodList's existing app, playback, list and text-size bindings.
    // Command–R refreshes the Library in PodList; the Finder's alias command
    // uses it in its own app.
    // Command-F is assigned to Library Search ahead of the system Find group.
    let command = Array("abcdeghijkmnopqstuvwxyz,.;/`1234[]{}+-=0")
        + [Character(" "), KeyEquivalent.leftArrow.character, KeyEquivalent.rightArrow.character,
           KeyEquivalent.upArrow.character, KeyEquivalent.downArrow.character, KeyEquivalent.delete.character,
           KeyEquivalent.tab.character]
    let shiftCommand = Array("acdfghiknopqrstuz:|?+-")
        + [KeyEquivalent.leftArrow.character, KeyEquivalent.rightArrow.character,
           KeyEquivalent.upArrow.character, KeyEquivalent.downArrow.character, KeyEquivalent.delete.character,
           KeyEquivalent.tab.character, Character(" "), "3", "4", "5", "6"]
    let optionCommand = Array("cdfhilmnpstvwy")
        + [Character(" "), KeyEquivalent.escape.character, KeyEquivalent.upArrow.character,
           KeyEquivalent.downArrow.character]
    let reserved: [(EventModifiers, [Character])] = [
        (.command, command), ([.shift, .command], shiftCommand), ([.option, .command], optionCommand),
        ([.option, .shift, .command], ["n", "v", "q", KeyEquivalent.delete.character])
    ]
    for shortcut in shortcuts {
        #expect(!shortcut.modifiers.contains(.control))
        if shortcut.key == .return {
            #expect(shortcut.modifiers.isEmpty)
        } else { #expect(shortcut.modifiers.contains(.command)) }
        for (modifiers, keys) in reserved where shortcut.modifiers == modifiers {
            #expect(!keys.contains(shortcut.key.character))
        }
    }
    #expect(PodListShortcut.download.shortcut == nil)
    #expect(PodListShortcut.playNow.shortcut == KeyboardShortcut(.return, modifiers: []))
    #expect(MenuAction.refresh.shortcut == KeyboardShortcut("r", modifiers: .command))
    #expect(MenuAction.refresh.rawValue == PodListShortcut.refreshAllFeeds.title)
    #expect(PodcastCommandContext.refreshTitle == "Refresh Podcast")
    #expect(PodListShortcut.allCases.map(\.notation) == [
        "⌘F", "↩", "⇧⌘L", "⇧⌘E", "—", "⇧⌘J", "⌥⌘J", "⌥⌘A", "⌘L", "⌥⌘,", "⌥⌘E", "⌥⌘←", "⌥⌘→", "⌘R"
    ])
}

@MainActor @Test func openingLibrarySearchChangesScopeAndPreservesAnExistingQuery() {
    let window = WindowModel()
    window.navigate(to: .view("a"))
    window.search = "View filter"
    window.selection = ["view-episode"]
    window.openLibrarySearch()
    #expect(window.destination == .search)
    #expect(window.search.isEmpty)
    #expect(window.selection.isEmpty)

    window.search = "Library query"
    window.selection = ["library-episode"]
    window.openLibrarySearch()
    #expect(window.search == "Library query")
    #expect(window.selection == ["library-episode"])

    window.beginPodcastPage("https://example.com/feed")
    window.search = "Podcast filter"
    window.openLibrarySearch()
    #expect(window.podcastFeed == nil)
    #expect(window.destination == .search)
    #expect(window.search.isEmpty)
    #expect(window.selection == ["library-episode"])

    window.navigate(to: .view("a"))
    #expect(window.selection == ["view-episode"])
}

@Test func downloadCommandsTargetOnlyEligibleSelectedEpisodes() {
    let phases: [String: DownloadPhase] = ["q": .queued, "t": .transferring, "s": .stored, "f": .failed, "otherWindow": .stored]
    let ids = ["new", "q", "t", "s", "f", "q"]
    #expect(EpisodeDownloadAction.download.targets(in: ids) { phases[$0] } == ["new"])
    #expect(EpisodeDownloadAction.cancel.targets(in: ids) { phases[$0] } == ["q", "t", "f"])
    #expect(EpisodeDownloadAction.retry.targets(in: ids) { phases[$0] } == ["f"])
    #expect(EpisodeDownloadAction.remove.targets(in: ids) { phases[$0] } == ["s"])
    for action in EpisodeDownloadAction.allCases {
        #expect(action.targets(in: []) { phases[$0] }.isEmpty)
        #expect(!action.targets(in: ids) { phases[$0] }.contains("otherWindow"))
    }
    let primaryCases: [(DownloadPhase?, EpisodeDownloadAction)] = [
        (nil, .download), (.queued, .cancel), (.transferring, .cancel), (.stored, .remove), (.failed, .retry)
    ]
    for (phase, action) in primaryCases {
        #expect(EpisodeDownloadAction.primary(for: phase) == action)
        #expect(action.accepts(phase))
    }
    // A different window's single selection cannot use the first window's target.
    #expect(EpisodeDownloadAction.remove.targets(in: ["otherWindow"]) { phases[$0] } == ["otherWindow"])
    #expect(EpisodeDownloadAction.cancel.targets(in: ["s"]) { phases[$0] }.isEmpty)
    #expect(EpisodeDownloadAction.remove.targets(in: ["q"]) { phases[$0] }.isEmpty)
}

@Test func downloadContextMenusOmitInapplicableCommandsForSingleAndMixedSelections() {
    let phases: [String: DownloadPhase] = ["queued": .queued, "stored": .stored, "failed": .failed]
    func actions(_ ids: [String]) -> [EpisodeDownloadAction] {
        EpisodeDownloadAction.available(in: ids) { phases[$0] }
    }
    #expect(actions([]).isEmpty)
    #expect(actions(["new"]) == [.download])
    #expect(actions(["queued"]) == [.cancel])
    #expect(actions(["stored"]) == [.remove])
    #expect(actions(["failed"]) == [.cancel, .retry])
    #expect(actions(["queued", "stored"]) == [.cancel, .remove])
    #expect(actions(["new", "queued", "stored", "failed"]) == EpisodeDownloadAction.allCases)
}

@MainActor @Test func playlistRenamePreservesDraftsAndRejectsDefaultPlaylists() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: "PodListMenuTests-" + UUID().uuidString)!
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "test", defaults: defaults))
    let original = fixtureState().playlists[0]
    #expect(!PlaylistRenameAction.prepare(original, editing: editing))
    #expect(editing.drafts["rename-open/\(original.id)"].isEmpty)
    var playlist = original; playlist.id = "custom"; playlist.name = "Commute"; playlist.isDefault = false
    #expect(PlaylistRenameAction.prepare(playlist, editing: editing))
    #expect(editing.drafts["rename/\(playlist.id)"] == "Commute")
    editing.drafts["rename/\(playlist.id)"] = "Unfinished"
    #expect(PlaylistRenameAction.prepare(playlist, editing: editing))
    #expect(editing.drafts["rename/\(playlist.id)"] == "Unfinished")
    editing.drafts["rename/\(playlist.id)"] = ""
    #expect(PlaylistRenameAction.prepare(playlist, editing: editing))
    #expect(editing.drafts["rename/\(playlist.id)"].isEmpty)
}
@Test func trashCommandsRejectHiddenExpiredBusyAndOtherWindowSelections() async throws {
    let library = try await fixtureModel()
    #expect(TrashSelectionAction.playlist(in: library, selection: "deleted", search: "", busy: false)?.id == "deleted")
    #expect(TrashSelectionAction.playlist(in: library, selection: "deleted", search: "dele", busy: false)?.id == "deleted")
    #expect(TrashSelectionAction.playlist(in: library, selection: nil, search: "", busy: false) == nil)
    #expect(TrashSelectionAction.playlist(in: library, selection: "default", search: "", busy: false) == nil)
    #expect(TrashSelectionAction.playlist(in: library, selection: "deleted", search: "no match", busy: false) == nil)
    #expect(TrashSelectionAction.playlist(in: library, selection: "deleted", search: "", busy: true) == nil)
    let expired = LibraryModel(snapshot: library.snapshot, deviceID: library.deviceID, now: 400 * 86_400_000)
    #expect(TrashSelectionAction.playlist(in: expired, selection: "deleted", search: "", busy: false) == nil)
    // Two windows resolve independently, without a global or first-item fallback.
    let first = TrashSelectionAction.playlist(in: library, selection: "deleted", search: "", busy: false)
    let second = TrashSelectionAction.playlist(in: library, selection: "other", search: "", busy: false)
    #expect(first?.id == "deleted")
    #expect(second == nil)
}

@MainActor @Test func markAllPlayedMenuTargetsOneSubscriptionAndKeepsNamedUndo() async throws {
    let db = try await fixtureDatabase()
    let defaults = UserDefaults(suiteName: "PodListMenuPlayed-" + UUID().uuidString)!
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "menu", defaults: defaults)
    #expect(SubscriptionPlayedAction.action(nil, editor: editor) == nil)
    #expect(SubscriptionPlayedAction.action(subscription("removed", removed: true), editor: editor) == nil)
    editor.busy = true
    #expect(SubscriptionPlayedAction.action(subscription(), editor: editor) == nil)
    editor.busy = false
    let action = try #require(SubscriptionPlayedAction.action(subscription(), editor: editor))
    action()
    // The shared button handler schedules an asynchronous, serialised library edit.
    for _ in 0..<10_000 {
        if editor.edits.history.undo != nil && !editor.edits.busy { break }
        await Task.yield()
    }
    #expect(editor.edits.undoTitle == "Undo Mark Played")
    let state = try await db.loadState()
    #expect(state.episodeStates["a"]?.played != nil)
    #expect(state.episodeStates["b"]?.played != nil)
    #expect(state.episodeStates["t1"]?.played == nil)
    #expect(state.episodeStates["orphan"]?.played == nil)
    await editor.undo()
    let restored = try await db.loadState()
    #expect(restored.episodeStates["a"]?.played == nil)
    #expect(restored.episodeStates["b"]?.played != nil)
    #expect(restored.playlists[0].entries.map(\.episodeId) == fixtureState().playlists[0].entries.map(\.episodeId))
    #expect(restored.episodeStates["t1"]?.played == nil)
}
#endif
