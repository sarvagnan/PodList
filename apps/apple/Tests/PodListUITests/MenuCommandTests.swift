#if os(macOS)
import AppKit
import PodListData
import PodListDomain
import SwiftUI
import Testing
import UniformTypeIdentifiers
@testable import PodListUI

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
    let content = EpisodeCopyContent(title: "Episode One", url: url)
    let provider = content.itemProvider()
    let text = try await copyData(provider, type: .utf8PlainText)
    let address = try await copyData(provider, type: .url)
    #expect(String(data: text, encoding: .utf8) == "Episode One\nhttps://example.com/episodes/one")
    #expect(String(data: address, encoding: .utf8) == url.absoluteString)
    let pending = EpisodeCopyContent(title: "Details pending", url: nil).itemProvider()
    #expect(!pending.hasItemConformingToTypeIdentifier(UTType.url.identifier))
    let pendingText = try await copyData(pending, type: .utf8PlainText)
    #expect(String(data: pendingText, encoding: .utf8) == "Details pending")
}

@Test func episodeShortcutsLeaveStandardAndExistingEquivalentsAvailable() {
    let shortcuts = PodListShortcut.allCases.compactMap(\.shortcut)
    #expect(Set(shortcuts.map { "\($0.modifiers.rawValue)/\($0.key.character)" }).count == shortcuts.count)
    // Apple's support.apple.com/en-us/102650 table, including Finder and text
    // editing; plus PodList's existing app, playback, list and text-size bindings.
    let command = Array("abcdefghijkmnopqrstuvwxyz,.;/`1234[]{}+-=0")
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
        #expect(shortcut.modifiers.contains(.command))
        for (modifiers, keys) in reserved where shortcut.modifiers == modifiers {
            #expect(!keys.contains(shortcut.key.character))
        }
    }
    #expect(PodListShortcut.download.shortcut == nil)
    #expect(PodListShortcut.allCases.map(\.notation) == [
        "⇧⌘L", "⇧⌘E", "—", "⇧⌘J", "⌥⌘J", "⌥⌘A", "⌘L", "⌥⌘,", "⌥⌘E", "⌥⌘←", "⌥⌘→"
    ])
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

@MainActor @Test func renameCommandsPreserveDraftsAndRejectUnavailableObjects() async throws {
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

    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "test", defaults: defaults)
    let view = fixtureState().views[0]
    #expect(ViewRenameAction.prepare(view, editor: editor))
    #expect(editor.draft("rename.\(view.id)") == view.name)
    editor.setDraft("Unfinished View", field: "rename.\(view.id)")
    #expect(ViewRenameAction.prepare(view, editor: editor))
    #expect(editor.draft("rename.\(view.id)") == "Unfinished View")
    editor.busy = true
    let otherView = fixtureState().views[1]
    #expect(!ViewRenameAction.prepare(otherView, editor: editor))
    #expect(editor.draft("rename.\(otherView.id)").isEmpty)
}
#endif
