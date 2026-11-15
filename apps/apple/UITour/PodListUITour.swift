import Foundation
import XCTest
import XCUIAutomation

/// A foreground tour of the production UI. No in-app navigation or capture hooks.
@MainActor
final class PodListUITour: XCTestCase {
    private var app: XCUIApplication!
    private var appearance = ""
    private var library: XCUIElement {
        app.windows.containing(.any, identifier: "sidebar.Subscriptions").firstMatch
    }

    func testLight() throws { try tour("Light") }
    func testDark() throws { try tour("Dark") }

    private func tour(_ style: String) throws {
        continueAfterFailure = false
        appearance = style.lowercased()
        let env = ProcessInfo.processInfo.environment
        let runDirectory = try XCTUnwrap(env["PODLIST_UI_RUN_DIRECTORY"])
        let origin = try XCTUnwrap(env["PODLIST_UI_SERVER_ORIGIN"])
        let bundleURL = URL(fileURLWithPath: runDirectory).appendingPathComponent(appearance + "/PodList.app")
        let info = try NSDictionary(contentsOf: bundleURL.appendingPathComponent("Contents/Info.plist"), error: ())
        let identifier = try XCTUnwrap(info["CFBundleIdentifier"] as? String)
        // Fail before launching if invoked directly with the production app or server.
        guard identifier.hasPrefix("app.podlist.uitour.") else {
            throw NSError(domain: "PodListUITour", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Refusing to launch a production bundle identity"])
        }
        let server = try XCTUnwrap(URLComponents(string: origin))
        guard server.scheme == "http", server.host == "127.0.0.1", server.port != nil,
              server.path.isEmpty, server.user == nil, server.password == nil,
              server.query == nil, server.fragment == nil else {
            throw NSError(domain: "PodListUITour", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "Refusing to launch against a non-demo server origin"])
        }
        let data = URL(fileURLWithPath: runDirectory).appendingPathComponent(appearance + "/data", isDirectory: true)
        XCTAssertTrue(FileManager.default.fileExists(atPath: data.path))
        app = XCUIApplication(url: bundleURL)
        app.launchEnvironment["PODLIST_UI_DATA_DIRECTORY"] = data.path
        app.launchArguments = ["-PodList.serverOrigin", origin, "-PodList.appearance", style,
                               "-PodList.mcpEnabled", "NO", "-PodList.inspectorVisible", "YES",
                               "-ApplePersistenceIgnoreState", "YES"]
        defer {
            app.terminate()
        }
        app.launch()
        try ready(library)
        try ready(library.buttons["Open Market Hours, Subscription"])
        try ready(library.buttons["Open Now Playing"])
        XCTAssertFalse(library.buttons["Pause"].exists, "The restored player must be paused")
        try capture("01-subscriptions")

        try navigate("New this week")
        try ready(library.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Episodes, sortable columns")).firstMatch)
        try capture("02-new-this-week")
        try selectFirstEpisode()
        try capture("03-episode-inspector")
        try navigate("Starred")
        try capture("04-starred")
        try click(library.buttons["All Views"])
        try ready(library.buttons["New this week"])
        try capture("05-all-views")

        try navigate("Default")
        try ready(episodeList)
        try capture("06-default-playlist")
        try selectFirstEpisode()
        try capture("07-entry-inspector")
        try segment("History")
        try capture("08-history")
        try segment("Listening Timeline")
        try ready(library.descendants(matching: .any).matching(identifier: "Listening Timeline").firstMatch)
        try capture("09-listening-timeline")
        let rewind = library.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Rewind to ")).firstMatch
        try ready(rewind)
        // Standard XCUITest pointer input, even when the row already shows its action.
        rewind.hover()
        try capture("34a-timeline-rewind-button")
        try click(rewind)
        try sheet("Rewind Playlist")
        try capture("34-rewind-summary", in: library, expectsSheet: true)
        try dismissSheet("Cancel") // Preview only; do not change the Library.

        try navigate("Commute")
        try capture("10-commute")
        try click(library.buttons["Playlist Settings"])
        try sheet("Playlist Settings")
        try capture("11-playlist-settings", expectsSheet: true)
        try click(library.sheets.buttons["Rename"])
        try ready(library.sheets.textFields["Playlist name"])
        try capture("12-playlist-rename", expectsSheet: true)
        try click(library.sheets.buttons["Cancel Rename"])
        try dismissSheet("Done")
        // Use the documented command so the duplicate sidebar/toolbar buttons are irrelevant.
        app.typeKey("n", modifierFlags: [.command, .shift])
        try sheet("New Playlist")
        try capture("13-new-playlist", expectsSheet: true)
        try dismissSheet("Cancel")

        try navigate("Trash")
        try ready(library.staticTexts["Trash is empty"])
        try capture("14-trash")
        app.typeKey("f", modifierFlags: .command)
        let search = library.searchFields.firstMatch
        try click(search)
        search.typeText("rice")
        try ready(episodeList.staticTexts["Who sets the price of rice?"])
        try capture("15-search-rice")
        search.typeKey("a", modifierFlags: .command)
        search.typeKey(.delete, modifierFlags: [])

        try navigate("New this week")
        try click(library.buttons["Edit View"])
        try sheet("Edit View")
        try capture("16-edit-view", expectsSheet: true)
        try dismissSheet("Cancel")
        app.typeKey("n", modifierFlags: .command)
        try sheet("New View")
        try capture("17-new-view", expectsSheet: true)
        try dismissSheet("Cancel")

        try navigate("Subscriptions")
        try click(library.buttons["Open Market Hours, Subscription"])
        try ready(library.buttons["Show description"])
        try ready(episodeList.staticTexts["Who sets the price of rice?"])
        try capture("18-podcast-market-hours")
        try click(library.buttons["Show description"])
        try ready(library.buttons["Show less"])
        try capture("19-description-expanded")
        try click(library.buttons["Subscribed"])
        let armedAt = Date()
        // Never click Unsubscribe. The product's four-second arm expires naturally.
        try ready(library.buttons["Unsubscribe"], timeout: 1)
        try capture("20-unsubscribe-armed")
        let remaining = 6 - Date().timeIntervalSince(armedAt)
        if remaining > 0 { Thread.sleep(forTimeInterval: remaining) }
        try ready(library.buttons["Subscribed"])
        XCTAssertFalse(library.buttons["Unsubscribe"].exists)
        try capture("21-unsubscribe-disarmed")
        try click(library.buttons["Subscription settings"])
        try sheet("Market Hours settings")
        try capture("22-subscription-settings", expectsSheet: true)
        try dismissSheet("Done")

        try navigate("New this week")
        let add = episodeList.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Add ' AND label ENDSWITH ' to a Playlist'")).firstMatch
        try click(add)
        try sheet("Add Episode to a Playlist")
        try capture("23-add-to-playlist", expectsSheet: true)
        try dismissSheet("Cancel")
        try navigate("Subscriptions")
        app.typeKey("a", modifierFlags: [.command, .shift])
        try sheet("Add podcasts")
        try capture("24-add-podcasts", expectsSheet: true)
        try dismissSheet("Done")
        // The bulk editor needs a selection: select every Subscription first.
        try click(library.descendants(matching: .any).matching(identifier: "subscriptions.list").firstMatch)
        app.typeKey("a", modifierFlags: .command)
        try click(library.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Edit Download Rules for'")).firstMatch)
        try ready(library.sheets.firstMatch)
        try capture("25-download-rules", expectsSheet: true)
        try dismissSheet("Cancel")
        try navigate("Default")
        try click(library.buttons["Open Now Playing"])
        try ready(library.sheets.firstMatch)
        try capture("26-now-playing", expectsSheet: true)
        try dismissSheet("Done")

        app.typeKey(",", modifierFlags: .command)
        let settings = app.windows.containing(.any, identifier: "General").firstMatch
        try ready(settings)
        try click(settings.descendants(matching: .any).matching(identifier: "General").firstMatch)
        try ready(settings.popUpButtons["Speed"])
        try capture("27-settings-general-top", in: settings)
        let form = settings.scrollViews.firstMatch
        try ready(form)
        form.hover()
        form.scroll(byDeltaX: 0, deltaY: -280)
        try capture("28-settings-general-middle", in: settings)
        form.scroll(byDeltaX: 0, deltaY: -1800)
        try ready(settings.buttons["Disconnect"])
        try capture("29-settings-general-bottom", in: settings)
        try click(settings.descendants(matching: .any).matching(identifier: "Automation").firstMatch)
        let mcp = settings.checkBoxes["Enable MCP server"]
        try ready(mcp)
        XCTAssertEqual(String(describing: mcp.value ?? ""), "0", "MCP must remain off")
        try capture("30-settings-automation", in: settings)
        settings.typeKey("w", modifierFlags: .command)
        try ready(library)

        try menuCommand("Window", "Listening stats")
        let stats = app.windows.containing(.staticText, identifier: "Listening stats").firstMatch
        try ready(stats)
        try capture("31-listening-stats", in: stats)
        stats.typeKey("w", modifierFlags: .command)
        app.typeKey(",", modifierFlags: .command)
        try ready(settings)
        try click(settings.descendants(matching: .any).matching(identifier: "General").firstMatch)
        let generalForm = settings.scrollViews.firstMatch
        generalForm.hover()
        // Return from the bottom far enough to reveal the Library section.
        generalForm.scroll(byDeltaX: 0, deltaY: 1800)
        try reveal(settings.buttons["Getting started"], in: generalForm)
        try click(settings.buttons["Getting started"])
        try ready(settings.sheets.firstMatch)
        try capture("32-getting-started", in: settings, expectsSheet: true)
        try click(settings.sheets.buttons["Dismiss"])
        settings.typeKey("w", modifierFlags: .command)

        try navigate("New this week")
        try selectFirstEpisode()
        episodeList.typeKey("a", modifierFlags: .command)
        XCTAssertGreaterThan(episodeRows.matching(NSPredicate(format: "selected == true")).count, 1)
        try ready(library.buttons["Add to a Playlist"])
        try capture("33-multi-selection")
        if style == "Light" { try captureMenus() }
        XCTAssertTrue(library.buttons["Open Now Playing"].exists)
        XCTAssertTrue(library.buttons["Play"].exists)
        XCTAssertFalse(library.buttons["Pause"].exists, "Leave an Episode paused as after relaunch")
    }

    private func ready(_ element: XCUIElement, timeout: TimeInterval = 15,
                       file: StaticString = #filePath, line: UInt = #line) throws {
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "Missing \(element)", file: file, line: line)
    }

    private func click(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) throws {
        try ready(element, file: file, line: line)
        XCTAssertTrue(element.isEnabled, "Disabled \(element)", file: file, line: line)
        element.click()
    }

    private func navigate(_ name: String) throws {
        try click(library.descendants(matching: .any).matching(identifier: "sidebar." + name).firstMatch)
    }

    /// The content list: a Table, or an Outline when its rows can be dragged; never the sidebar.
    private var episodeList: XCUIElement {
        library.descendants(matching: .any).matching(NSPredicate(format: "(elementType == %d OR elementType == %d) AND label != 'Sidebar'",
            XCUIElement.ElementType.table.rawValue, XCUIElement.ElementType.outline.rawValue)).firstMatch
    }
    private var episodeRows: XCUIElementQuery {
        episodeList.descendants(matching: .any).matching(NSPredicate(format: "elementType == %d OR elementType == %d",
            XCUIElement.ElementType.tableRow.rawValue, XCUIElement.ElementType.outlineRow.rawValue))
    }

    private func selectFirstEpisode() throws {
        let row = episodeRows.firstMatch
        // SwiftUI outline rows report isEnabled == false to accessibility; they still select on click.
        try ready(row)
        // The row's centre can fall on its Play Now button; click the title area instead.
        row.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.5)).click()
        try ready(library.buttons["Add to a Playlist"])
    }

    private func segment(_ name: String) throws {
        try click(library.segmentedControls.buttons[name])
    }

    private func sheet(_ heading: String) throws {
        try ready(library.sheets.staticTexts[heading])
    }

    private func dismissSheet(_ button: String) throws {
        try click(library.sheets.buttons[button])
        XCTAssertTrue(library.sheets.firstMatch.waitForNonExistence(timeout: 10))
    }

    private func reveal(_ element: XCUIElement, in scroll: XCUIElement) throws {
        for _ in 0..<8 {
            if element.exists && element.isHittable { return }
            scroll.scroll(byDeltaX: 0, deltaY: -180)
        }
        XCTFail("Could not reveal \(element)")
    }

    private func capture(_ name: String, in window: XCUIElement? = nil, expectsSheet: Bool = false) throws {
        let target = window ?? library
        try ready(target)
        if expectsSheet { try ready(target.sheets.firstMatch) }
        XCTContext.runActivity(named: appearance + "/" + name) { _ in
            let screenshot = XCTAttachment(screenshot: target.screenshot())
            screenshot.name = appearance + "--" + name + ".png"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }
        // Snapshot the window only: never enumerate other apps, the desktop or Apple menu.
        let tree = try target.snapshot()
        attach(treeText(tree), name: appearance + "--" + name + ".txt")
        // Capturing the armed state must not silently turn into a disarmed-state image.
        if name == "20-unsubscribe-armed" {
            XCTAssertTrue(target.buttons["Unsubscribe"].exists,
                          "XCUITest capture exceeded the four-second arm; inspect this attachment on a faster run")
        }
    }

    private func attach(_ text: String, name: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func treeText(_ node: any XCUIElementSnapshot, depth: Int = 0, menus: Bool = false) -> String {
        if menus && ["Services", "Apple", "\u{f8ff}"].contains(node.title.isEmpty ? node.label : node.title) { return "" }
        func quote(_ value: String) -> String {
            String(data: try! JSONSerialization.data(withJSONObject: [value]), encoding: .utf8)!
                .dropFirst().dropLast().description
        }
        let role = roleName(node.elementType)
        var line = String(repeating: "  ", count: depth) + "role=\(role)(\(node.elementType.rawValue))"
        line += " subrole=unavailable label=\(quote(node.label)) title=\(quote(node.title))"
        line += " value=\(quote(node.value.map { String(describing: $0) } ?? "")) identifier=\(quote(node.identifier))"
        line += " enabled=\(node.isEnabled) selected=\(node.isSelected) frame=\(node.frame)"
        if menus { line += " keyboardShortcut=unavailable" }
        return line + "\n" + node.children.map { treeText($0, depth: depth + 1, menus: menus) }.joined()
    }

    private func roleName(_ type: XCUIElement.ElementType) -> String {
        switch type {
        case .application: "application"
        case .window: "window"
        case .sheet: "sheet"
        case .dialog: "dialog"
        case .alert: "alert"
        case .group: "group"
        case .button: "button"
        case .radioButton: "radioButton"
        case .checkBox: "checkBox"
        case .popUpButton: "popUpButton"
        case .comboBox: "comboBox"
        case .menuButton: "menuButton"
        case .menu: "menu"
        case .menuItem: "menuItem"
        case .menuBar: "menuBar"
        case .menuBarItem: "menuBarItem"
        case .toolbar: "toolbar"
        case .table: "table"
        case .tableRow: "tableRow"
        case .tableColumn: "tableColumn"
        case .outline: "outline"
        case .outlineRow: "outlineRow"
        case .cell: "cell"
        case .tab: "tab"
        case .tabGroup: "tabGroup"
        case .segmentedControl: "segmentedControl"
        case .scrollView: "scrollView"
        case .scrollBar: "scrollBar"
        case .staticText: "staticText"
        case .textField: "textField"
        case .textView: "textView"
        case .searchField: "searchField"
        case .image: "image"
        case .slider: "slider"
        case .splitGroup: "splitGroup"
        case .splitter: "splitter"
        case .disclosureTriangle: "disclosureTriangle"
        case .progressIndicator: "progressIndicator"
        case .link: "link"
        case .other: "other"
        default: "XCUIElementType"
        }
    }

    private func menuCommand(_ menu: String, _ command: String) throws {
        try click(app.menuBars.menuBarItems[menu])
        try click(app.menuItems[command])
    }

    private func captureMenus() throws {
        var text = "XCUITest public snapshots expose elementType, not AXRole/AXSubrole.\n"
        text += "Keyboard shortcuts are not exposed by XCUIElementAttributes in Xcode 27.2.\n"
        text += "Standard alternative: inspect NSMenuItem.keyEquivalent and keyEquivalentModifierMask in Xcode's LLDB debugger, or read the visible menus.\n\n"
        // AppKit's first menu is Apple. Never open it or the Services submenu.
        for item in app.menuBars.menuBarItems.allElementsBoundByIndex.dropFirst() {
            guard !["Apple", "\u{f8ff}", "Services"].contains(item.title.isEmpty ? item.label : item.title) else { continue }
            item.click()
            text += try treeText(item.snapshot(), menus: true) + "\n"
            app.typeKey(.escape, modifierFlags: [])
        }
        attach(text, name: "menus.txt")
    }
}
