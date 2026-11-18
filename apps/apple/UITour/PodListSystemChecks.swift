import AppKit
import Foundation
import XCTest
import XCUIAutomation

/// Run only in the disposable VM. No actions are executed in Shortcuts.
@MainActor
final class PodListSystemChecks: XCTestCase {
    private var app: XCUIApplication!
    private var run: URL!
    private let bundle = URL(fileURLWithPath: "/Applications/PodList UI Check.app")
    private var identity = ""
    private var exchange: URL!
    private var library: XCUIElement {
        app.windows.containing(.any, identifier: "sidebar.Subscriptions").firstMatch
    }

    private struct Catalog: Decodable {
        let intents: [String]
        let shortcuts: [String]
    }

    private func launch(mcp: Bool, spotlightPredicate: String? = nil) throws {
        continueAfterFailure = false
        let env = ProcessInfo.processInfo.environment
        run = URL(fileURLWithPath: try XCTUnwrap(env["PODLIST_UI_RUN_DIRECTORY"]))
        // This marker is written only in the guest, never in the host staging directory.
        XCTAssertTrue(FileManager.default.fileExists(atPath: run.appendingPathComponent("system-vm").path),
                      "System checks require a throwaway VM; use ui-tour.sh --system-checks")
        let info = try NSDictionary(contentsOf: bundle.appendingPathComponent("Contents/Info.plist"), error: ())
        let identifier = try XCTUnwrap(info["CFBundleIdentifier"] as? String)
        identity = identifier
        guard identifier == "app.podlist.uitour.system" else { throw failure("Non-test bundle refused") }
        let origin = try XCTUnwrap(env["PODLIST_UI_SERVER_ORIGIN"])
        let server = try XCTUnwrap(URLComponents(string: origin))
        guard server.scheme == "http", server.host == "127.0.0.1", server.port != nil,
              server.path.isEmpty, server.user == nil, server.password == nil,
              server.query == nil, server.fragment == nil else { throw failure("Non-demo server refused") }
        app = XCUIApplication(url: bundle)
        app.launchEnvironment["PODLIST_UI_DATA_DIRECTORY"] = dataDirectory.path
        app.launchEnvironment["PODLIST_UI_SPOTLIGHT_QUERY"] = spotlightPredicate
        app.launchArguments = ["-PodList.serverOrigin", origin, "-PodList.mcpEnabled", mcp ? "YES" : "NO",
                               "-AppleLanguages", "(en)", "-AppleLocale", "en_US",
                               "-ApplePersistenceIgnoreState", "YES"]
        app.launch()
        XCTAssertTrue(library.waitForExistence(timeout: 60))
        XCTAssertTrue(library.buttons["Open Market Hours, Subscription"].waitForExistence(timeout: 60))
    }

    private var dataDirectory: URL { run.appendingPathComponent("system/data", isDirectory: true) }

    func testShortcutsDiscovery() throws {
        try launch(mcp: false)
        let shortcuts = XCUIApplication(bundleIdentifier: "com.apple.shortcuts")
        defer {
            if shortcuts.state != .notRunning { capture(shortcuts, name: "shortcuts-at-exit") }
            shortcuts.terminate()
            app.terminate()
        }
        let catalog = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: run.appendingPathComponent("system/catalog.json")))
        XCTAssertFalse(catalog.intents.isEmpty)
        shortcuts.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        shortcuts.launch()
        // First launch can offer onboarding. Never click a sign-in or iCloud control.
        let start = shortcuts.buttons["Start Using Shortcuts"]
        if start.waitForExistence(timeout: 5) { start.click() }
        let windowCount = shortcuts.windows.count
        shortcuts.typeKey("n", modifierFlags: .command)
        let deadline = Date().addingTimeInterval(15)
        while shortcuts.windows.count <= windowCount && Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
        XCTAssertGreaterThan(shortcuts.windows.count, windowCount, "New Shortcut must open an editor window")
        let editor = shortcuts.windows.firstMatch
        let search = editor.searchFields.matching(NSPredicate(
            format: "label CONTAINS[c] 'action' OR placeholderValue CONTAINS[c] 'action'")).firstMatch
        // On some macOS versions the action search has no accessible label.
        let field = search.waitForExistence(timeout: 10) ? search : editor.searchFields.firstMatch
        defer {
            if editor.exists { capture(editor, name: "shortcuts-editor-at-close") }
            // No action was added and the VM is discarded after the run, so just quit Shortcuts.
            // (Closing the editor window made XCUITest re-resolve Shortcuts by path, which fails.)
            shortcuts.terminate()
        }
        XCTAssertTrue(field.waitForExistence(timeout: 15), "New shortcut must expose the action library")
        field.click()
        field.typeText("PodList")

        var found = Set<String>()
        var foundShortcuts = Set<String>()
        var names = Set<String>()
        // Bounded polling allows LaunchServices/App Intents indexing to finish. Only inspect
        // the blank editor's action library; never open or run a result.
        let indexingDeadline = Date().addingTimeInterval(180)
        var attempt = 0
        while Date() < indexingDeadline {
            if attempt > 0 && attempt.isMultiple(of: 6) {
                // Re-query after LaunchServices has had time to register the new identity.
                field.click()
                field.typeKey("a", modifierFlags: .command)
                field.typeText("PodList")
            }
            let snapshot = try editor.snapshot()
            let strings = visibleNames(snapshot)
            names.formUnion(strings)
            for title in catalog.intents where strings.contains(where: { matches($0, title: title) }) { found.insert(title) }
            for title in catalog.shortcuts where strings.contains(where: { matches($0, title: title) }) { foundShortcuts.insert(title) }
            if attempt == 0 || found.count == catalog.intents.count {
                capture(editor, name: "shortcuts-podlist-\(attempt)")
            }
            if found.count == catalog.intents.count { break }
            // Action lists can be virtualized. Scroll only a library container containing
            // a known action, so the empty shortcut canvas cannot receive input.
            let scroll = editor.scrollViews.containing(.any, identifier: catalog.intents[0]).firstMatch
            if scroll.exists { scroll.scroll(byDeltaX: 0, deltaY: -300) }
            Thread.sleep(forTimeInterval: 5)
            attempt += 1
        }
        capture(editor, name: "shortcuts-final")
        if found.isEmpty {
            // Include the entire library hierarchy, including empty/loading result containers.
            attach(editor.debugDescription, name: "shortcuts-empty-action-library.txt")
            attach(shortcuts.debugDescription, name: "shortcuts-empty-application.txt")
        }
        attach("Expected intents:\n\(catalog.intents.joined(separator: "\n"))\n\nFound intents:\n\(found.sorted().joined(separator: "\n"))\n\nApp Shortcuts shown (optional):\n\(foundShortcuts.sorted().joined(separator: "\n"))\n\nAll action-library labels:\n\(names.sorted().joined(separator: "\n"))", name: "shortcuts-actions.txt")
        XCTAssertEqual(found, Set(catalog.intents), "Missing PodList actions: \(Set(catalog.intents).subtracting(found).sorted())")
        // Shortcuts versions differ in whether App Shortcut tiles appear in this search.
        // If any are shown, require the complete provider catalog.
        if !foundShortcuts.isEmpty {
            XCTAssertEqual(foundShortcuts, Set(catalog.shortcuts), "Partial App Shortcuts catalog")
        }
    }

    /// Independent from the visual tour: indexing can take longer than a visual step.
    func testLibraryLinksAndSpotlight() async throws {
        try launch(mcp: false, spotlightPredicate: #"title == "Who sets the price of rice?""#)
        defer { app.terminate() }
        let reportURL = dataDirectory.appendingPathComponent("spotlight-query.json")
        let deadline = Date().addingTimeInterval(180)
        while !FileManager.default.fileExists(atPath: reportURL.path) && Date() < deadline {
            try await Task.sleep(for: .seconds(1))
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: reportURL.path),
                      "PodList must report its Core Spotlight query result. See guest-diagnostics/spotlight.log.")
        let report = try Data(contentsOf: reportURL)
        attach(String(decoding: report, as: UTF8.self), name: "spotlight-query-results.txt")
        let query = try JSONDecoder().decode(SpotlightReport.self, from: report)
        XCTAssertNil(query.error, "Core Spotlight query failed in PodList")
        let match = try XCTUnwrap(query.matches.first { $0.key.hasPrefix("podlist://episode/") },
                                 "Spotlight must find the indexed fixture Episode")
        XCTAssertEqual(match.value, "Who sets the price of rice?")
        let url = try XCTUnwrap(URL(string: match.key))
        // Close every Library first so the URL must open a new Library window.
        library.buttons[XCUIIdentifierCloseWindow].click()
        XCTAssertTrue(library.waitForNonExistence(timeout: 10))
        XCTAssertTrue(NSWorkspace.shared.open(url))
        XCTAssertTrue(library.waitForExistence(timeout: 30))
        let inspector = library.descendants(matching: .any).matching(NSPredicate(format: "label == 'Episode Inspector'")).firstMatch
        XCTAssertTrue(inspector.waitForExistence(timeout: 20))
        XCTAssertTrue(inspector.staticTexts["Who sets the price of rice?"].waitForExistence(timeout: 20), "App link must select the fixture Episode")
        XCTAssertFalse(library.buttons["Pause"].exists, "Opening a link must not start playback")
        capture(library, name: "app-link-episode")
        XCTAssertTrue(NSWorkspace.shared.open(try XCTUnwrap(URL(string: "podlist://episode/removed-system-check"))))
        XCTAssertTrue(app.staticTexts["Cannot Open PodList Link"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["This Episode is no longer in this Library. It may have been removed or belong to another Library."].exists)
        capture(app, name: "app-link-unavailable")
    }

    private struct SpotlightReport: Decodable {
        let matches: [String: String]
        let error: String?
    }

    func testShareFromSafari() throws {
        try launch(mcp: false)
        defer { app.terminate() }
        let addPodcasts = app.windows["Add Podcasts"]
        XCTAssertFalse(addPodcasts.exists)

        let origin = try XCTUnwrap(ProcessInfo.processInfo.environment["PODLIST_UI_SERVER_ORIGIN"])
        let address = try XCTUnwrap(URL(string: origin + "/api/health?share=podcast&from=system-check"))
        let safariID = "com.apple.Safari"
        let safari = XCUIApplication(bundleIdentifier: safariID)
        let safariURL = try XCTUnwrap(NSWorkspace.shared.urlForApplication(withBundleIdentifier: safariID))
        let opened = expectation(description: "Open the guest fixture URL in Safari")
        NSWorkspace.shared.open([address], withApplicationAt: safariURL, configuration: .init()) { _, error in
            XCTAssertNil(error)
            opened.fulfill()
        }
        wait(for: [opened], timeout: 30)
        defer {
            if safari.state != .notRunning { safari.terminate() }
        }
        XCTAssertTrue(safari.windows.firstMatch.waitForExistence(timeout: 30))
        let shareButton = safari.toolbars.buttons["Share"].firstMatch
        if shareButton.waitForExistence(timeout: 5) {
            shareButton.click()
        } else {
            safari.menuBars.menuBarItems["File"].click()
            safari.menuItems.matching(NSPredicate(format: "label BEGINSWITH %@", "Share")).firstMatch.click()
        }
        let destination = safari.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@ OR title == %@", "PodList", "PodList")).firstMatch
        let listed = destination.waitForExistence(timeout: 20)
        if !listed { capture(safari, name: "safari-share-picker") }
        XCTAssertTrue(listed, "Safari's Share picker must offer PodList for the fixture URL")
        destination.click()

        XCTAssertTrue(addPodcasts.waitForExistence(timeout: 30))
        let query = addPodcasts.textFields["addPodcasts.query"]
        XCTAssertTrue(query.waitForExistence(timeout: 10))
        XCTAssertEqual(query.value as? String, address.absoluteString)
        XCTAssertTrue(addPodcasts.buttons["Search"].isEnabled, "The shared address must be staged for Search")
        capture(addPodcasts, name: "share-staged-address")
    }

    func testMCPWindowLifecycle() throws {
        try launch(mcp: true)
        defer { app.terminate() }
        // XCTest's runner is sandboxed even when the target disables App Sandbox.
        // Only write inside its own temporary directory. The guest supervisor reads
        // this flushed stdout marker and launches the MCP client outside that sandbox.
        exchange = FileManager.default.temporaryDirectory.appendingPathComponent("podlist-mcp-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: exchange, withIntermediateDirectories: true)
        attach(exchange.path, name: "mcp-exchange-path.txt")
        print("PODLIST_MCP_EXCHANGE=\(exchange.path)")
        fflush(stdout)
        try waitFor("edit-ready")
        app.activate()
        app.menuBars.menuBarItems["Edit"].click()
        let undoName = try String(contentsOf: exchange.appendingPathComponent("undo-title"), encoding: .utf8)
        let undo = app.menuItems[undoName]
        XCTAssertTrue(undo.waitForExistence(timeout: 10))
        XCTAssertTrue(undo.isEnabled)
        capture(app, name: "mcp-native-undo")
        undo.click()
        try signal("undo-done")
        try waitFor("undo-verified")
        capture(app, name: "mcp-restored")
        let pid = try XCTUnwrap(NSRunningApplication.runningApplications(withBundleIdentifier: identity).first?.processIdentifier)
        // Close the last native window, not the process. The delegate keeps services alive.
        library.buttons[XCUIIdentifierCloseWindow].click()
        XCTAssertTrue(library.waitForNonExistence(timeout: 10))
        XCTAssertEqual(app.windows.count, 0)
        XCTAssertNotEqual(app.state, .notRunning)
        try signal("window-closed")
        try waitFor("closed-verified")
        // LaunchServices reopen is the same path as opening the running app from Finder/Dock.
        try signal("reopen-requested")
        try waitFor("reopen-opened")
        XCTAssertTrue(library.waitForExistence(timeout: 20), "Reopening must restore the Library window")
        XCTAssertEqual(NSRunningApplication.runningApplications(withBundleIdentifier: identity).first?.processIdentifier, pid, "Reopen must preserve the same app process")
        capture(app, name: "mcp-reopened")
        try signal("window-reopened")
        try waitFor("reopen-verified")
        // Use native Quit so applicationShouldTerminate stops the listener gracefully.
        app.typeKey("q", modifierFlags: .command)
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 20))
        try signal("app-quit")
        try waitFor("complete")
    }

    private func waitFor(_ name: String) throws {
        let deadline = Date().addingTimeInterval(60)
        while Date() < deadline {
            if let message = try? String(contentsOf: exchange.appendingPathComponent("client-failed"), encoding: .utf8) {
                attach(message, name: "mcp-client-failed.txt")
                throw failure("MCP client failed: \(message); see system-results/mcp-client.log")
            }
            if FileManager.default.fileExists(atPath: exchange.appendingPathComponent(name).path) { return }
            Thread.sleep(forTimeInterval: 0.1)
        }
        throw failure("Timed out waiting for MCP client: \(name)")
    }

    private func signal(_ name: String) throws { try Data().write(to: exchange.appendingPathComponent(name), options: .atomic) }
    private func failure(_ message: String) -> NSError { NSError(domain: "PodListSystemChecks", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    private func matches(_ value: String, title: String) -> Bool {
        value == title || value.hasPrefix(title + ", PodList") || value == title + " (PodList)"
            || value.components(separatedBy: .newlines).contains(title)
    }
    private func visibleNames(_ node: any XCUIElementSnapshot) -> [String] {
        [node.label, node.title, node.value as? String ?? ""] + node.children.flatMap { visibleNames($0) }
    }
    private func attach(_ text: String, name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    private func capture(_ target: XCUIElement, name: String) {
        let attachment = XCTAttachment(screenshot: target.screenshot())
        attachment.name = name + ".png"
        attachment.lifetime = .keepAlways
        add(attachment)
        attach(target.debugDescription, name: name + ".txt")
    }
}
