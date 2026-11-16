#if os(macOS)
import AppKit
import Testing
@testable import PodListUI

@MainActor @Test func librarySpaceOnlyUsesListSidebarOrWindowFocus() throws {
    // Unordered windows: no activation or screen input.
    let library = NSWindow(contentRect: .zero, styleMask: [.titled], backing: .buffered, defer: false)
    let other = NSWindow(contentRect: .zero, styleMask: [.titled], backing: .buffered, defer: false)
    library.isReleasedWhenClosed = false
    other.isReleasedWhenClosed = false
    defer { library.close(); other.close() }

    func handles(_ responder: NSResponder?, keyWindow: NSWindow? = nil, sheet: Bool = false,
                 characters: String? = " ", modifiers: NSEvent.ModifierFlags = []) -> Bool {
        LibraryPlaybackSpaceHost.handlesSpace(characters: characters, modifiers: modifiers,
            responder: responder, libraryWindow: library, keyWindow: keyWindow ?? library, sheet: sheet)
    }
    let table = NSTableView()
    let sidebar = NSOutlineView()
    for responder in [library, table, sidebar] as [NSResponder] {
        #expect(handles(responder))
        #expect(handles(responder, modifiers: [.capsLock, .function]))
        #expect(!handles(responder, sheet: true))
        // Settings, Now Playing, Add Podcasts and all other windows retain Space,
        // even if their first responder is a list or window background.
        #expect(!handles(responder, keyWindow: other))
        for modifiers: NSEvent.ModifierFlags in [.command, .control, .option, .shift] {
            #expect(!handles(responder, modifiers: modifiers))
        }
        #expect(!handles(responder, characters: "\r"))
        #expect(!handles(responder, characters: nil))
    }

    let text = NSTextView()
    let link = NSTextView()
    link.isEditable = false
    link.textStorage?.setAttributedString(NSAttributedString(string: "Podcast", attributes: [.link: URL(string: "https://example.com")!]))
    let cellButton = NSButton(title: "Row action", target: nil, action: nil)
    table.addSubview(cellButton)
    let controls: [NSResponder] = [
        NSButton(title: "Play", target: nil, action: nil),
        NSButton(checkboxWithTitle: "Clear on Played", target: nil, action: nil),
        NSPopUpButton(), NSSwitch(), NSSegmentedControl(), link, text, NSTextField(),
        NSView(), NSResponder(), cellButton
    ]
    for responder in controls {
        #expect(!handles(responder))
        #expect(!handles(responder, sheet: true))
        #expect(!handles(responder, keyWindow: other))
    }
    #expect(!handles(nil))
    #expect(!LibraryPlaybackSpaceHost.handlesSpace(characters: " ", modifiers: [],
        responder: table, libraryWindow: library, keyWindow: nil, sheet: false))
    #expect(!LibraryPlaybackSpaceHost.handlesSpace(characters: " ", modifiers: [],
        responder: table, libraryWindow: nil, keyWindow: other, sheet: false))
    #expect(!library.isVisible && !other.isVisible)
}
#endif
