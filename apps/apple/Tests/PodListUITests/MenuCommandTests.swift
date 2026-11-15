#if os(macOS)
import AppKit
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
    let shortcuts = PodListShortcut.allCases.map(\.shortcut)
    #expect(Set(shortcuts.map { "\($0.modifiers.rawValue)/\($0.key.character)" }).count == shortcuts.count)
    // All new shortcuts have Control, unlike existing PodList menu equivalents.
    // Avoid standard ⌃⌘F (Full Screen), ⌃⌘Q (Lock Screen), ⌃⌘D (Dictionary),
    // ⌃⌘Space (Character Viewer), and Finder's ⌃⌘N/A/T/↑ equivalents as well.
    let reserved: Set<Character> = ["f", "q", "d", " ", "n", "a", "t", Character(UnicodeScalar(NSUpArrowFunctionKey)!)]
    for shortcut in shortcuts {
        #expect(shortcut.modifiers.contains(.control))
        #expect(shortcut.modifiers.contains(.command))
        if shortcut.modifiers == [.control, .command] { #expect(!reserved.contains(shortcut.key.character)) }
    }
}
#endif
