import AppKit
import Foundation
import QuartzCore
import XCTest
import XCUIAutomation

/// A foreground tour using public UI routes. A tour-only hook delays one Undo.
@MainActor
final class PodListUITour: XCTestCase {
    private var app: XCUIApplication!
    private var appearance = ""
    private var library: XCUIElement {
        // The scene identifier stays the same when the sidebar is hidden.
        app.windows.matching(NSPredicate(format: "identifier BEGINSWITH %@", "library-AppWindow-")).firstMatch
    }

    func testLight() throws { try tour("Light") }
    func testDark() throws { try tour("Dark") }
    func testBordersLight() throws { try tour("Light", showBorders: true) }
    func testBordersDark() throws { try tour("Dark", showBorders: true) }
    /// ui-tour.sh --timings: only the response-timing runs, for quick performance checks.
    func testTimingsLight() throws { try tour("Light", timingsOnly: true) }

    private func tour(_ style: String, showBorders: Bool = false, timingsOnly: Bool = false) throws {
        continueAfterFailure = false
        appearance = (showBorders ? "borders-" : "") + style.lowercased()
        let env = ProcessInfo.processInfo.environment
        let runDirectory = try XCTUnwrap(env["PODLIST_UI_RUN_DIRECTORY"])
        guard FileManager.default.fileExists(atPath: URL(fileURLWithPath: runDirectory).appendingPathComponent("uitour-vm").path) else {
            throw NSError(domain: "PodListUITour", code: 3, userInfo: [NSLocalizedDescriptionKey: "UI tours require a throwaway VM; use PODLIST_UI_VM with ui-tour.sh"])
        }
        // AppKit implements this getter on macOS 27, but the SDK does not declare it.
        let workspace = NSWorkspace.shared
        let key = "accessibilityDisplayShouldShowBorders"
        if workspace.responds(to: NSSelectorFromString(key)) {
            let actual = try XCTUnwrap(workspace.value(forKey: key) as? Bool, "Could not read Show Borders in the guest")
            XCTAssertEqual(actual, showBorders, "Guest Show Borders must be \(showBorders ? "on" : "off") before \(appearance) captures")
        } else {
            XCTAssertFalse(showBorders, "Show Borders verification requires NSWorkspace.\(key) in the guest")
        }
        let root = URL(fileURLWithPath: runDirectory, isDirectory: true)
        let fixture = root.appendingPathComponent(appearance, isDirectory: true)
        let origin: String
        if timingsOnly {
            origin = try XCTUnwrap(env["PODLIST_UI_SERVER_ORIGIN"])
        } else {
            origin = try String(contentsOf: fixture.appendingPathComponent("origin"), encoding: .utf8)
        }
        let data = fixture.appendingPathComponent("data", isDirectory: true)
        let timings = data.appendingPathComponent("response-timings-\(UUID()).tsv")
        try launch(from: root, copy: appearance, style: style, origin: origin, timings: showBorders ? nil : timings,
                   delayEntryUndo: !showBorders && !timingsOnly)
        defer { app.terminate() }
        try ready(library)
        try ready(library.buttons["Open Market Hours, Subscription"])
        try ready(library.buttons["Open Now Playing"])
        if timingsOnly {
            // A fresh VM and app are cold; the full tour times them about ten minutes in.
            try recordResponseTimings(from: timings, warmUpRuns: 3)
            return
        }
        if showBorders {
            try captureShowBorders()
            return
        }
        try captureLibrary(timings: timings, style: style)
        app.terminate()
        try captureLargeSidebar(from: root, style: style)
    }

    private func launch(from root: URL, copy: String, style: String, origin: String, timings: URL? = nil,
                        delayEntryUndo: Bool = false) throws {
        let bundleURL = root.appendingPathComponent(copy + "/PodList.app")
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
        let data = root.appendingPathComponent(copy + "/data", isDirectory: true)
        XCTAssertTrue(FileManager.default.fileExists(atPath: data.path))
        app = XCUIApplication(url: bundleURL)
        app.launchEnvironment["PODLIST_UI_DATA_DIRECTORY"] = data.path
        if let timings { app.launchEnvironment["PODLIST_UI_TIMINGS_FILE"] = timings.path }
        if delayEntryUndo { app.launchEnvironment["PODLIST_UI_DELAY_ENTRY_UNDO"] = "1" }
        app.launchArguments = ["-PodList.serverOrigin", origin, "-PodList.appearance", style,
                               "-PodList.mcpEnabled", "NO",
                               "-AppleKeyboardUIMode", "3",
                               "-ApplePersistenceIgnoreState", "YES"]
        app.launch()
    }

    private func captureLibrary(timings: URL, style: String) throws {
        let sidebar = library.outlines["Sidebar"]
        try ready(sidebar)
        XCTAssertGreaterThanOrEqual(sidebar.frame.width, 180, "The first-launch sidebar must respect its minimum width")
        let libraryStatus = library.descendants(matching: .any).matching(identifier: "library.status").firstMatch
        try ready(libraryStatus)
        XCTAssertTrue(sidebarItem("Commute").exists, "The appearance must start with a freshly seeded Commute")
        XCTAssertFalse(sidebarItem("Commute edited").exists, "This appearance inherited another pass’s rename")
        XCTAssertGreaterThan(libraryStatus.frame.height, 0)
        XCTAssertLessThanOrEqual(libraryStatus.frame.height, 33, "Sync and edit feedback must share one compact row")
        XCTAssertFalse(sidebar.images["Clear on Played on"].exists, "Clear on Played must not repeat the Add to a Playlist glyph")
        // A combined sidebar row exposes its description as a static text value.
        let defaultRow = sidebar.descendants(matching: .any).matching(identifier: "sidebar.Default").firstMatch
        XCTAssertTrue((defaultRow.label + " " + String(describing: defaultRow.value ?? "")).contains("Clear on Played on"),
                      "Removing the glyph must retain Clear on Played in the row's accessibility description")
        XCTAssertFalse(library.buttons["Pause"].exists, "The restored player must be paused")
        try capture("01-subscriptions")
        try checkOPMLOpenShortcut()

        try openNewThisWeek()
        let firstEpisodeTitle = "Who sets the price of rice?"
        let initialFirstRowOffset = try firstEpisodeOffset(title: firstEpisodeTitle)
        let leadingTitleX = library.staticTexts["New this week"].firstMatch.frame.minX
        XCTAssertFalse(library.toolbars.buttons["New View…"].exists)
        XCTAssertGreaterThanOrEqual(library.frame.width, 950)
        assertLibraryPanes(sidebar: true, inspector: false, after: "opening a View with no selection")
        let playerTop = library.buttons["Open Now Playing"].frame.minY
        let fullyVisibleRows = episodeRows.allElementsBoundByIndex.filter {
            $0.frame.height > 4 && $0.frame.minY >= episodeList.frame.minY && $0.frame.maxY <= playerTop
        }
        XCTAssertGreaterThanOrEqual(fullyVisibleRows.count, min(8, episodeRows.count), "At least eight Episodes should fit when available")
        try capture("02-new-this-week")
        try selectFirstEpisode()
        try ready(episodeInspector)
        try capture("03-episode-inspector")
        XCTAssertGreaterThanOrEqual(episodeList.frame.width, 450, "The Inspector must leave room for the list")
        try assertInspectorActionTargets()
        try hideInspector()
        try navigate("Subscriptions")
        try openNewThisWeek()
        XCTAssertEqual(try firstEpisodeOffset(title: firstEpisodeTitle), initialFirstRowOffset, accuracy: 1,
                       "Returning to a short View must keep its first row below the column header")
        XCTAssertFalse(episodeInspector.exists, "Restored selection must respect the hidden Inspector")
        XCTAssertTrue(episodeRows.firstMatch.isSelected, "Returning to the View must restore selection")
        try firstEpisodePoint().click()
        XCTAssertFalse(episodeInspector.exists, "Reselecting an Episode must respect an explicit off choice")
        app.typeKey("i", modifierFlags: [.command, .option])
        try ready(episodeInspector)
        XCTAssertFalse(episodeInspector.buttons["Show in Window"].exists)
        app.typeKey("i", modifierFlags: [.command, .option])
        XCTAssertTrue(episodeInspector.waitForNonExistence(timeout: 5))
        episodeList.typeKey(.downArrow, modifierFlags: [])
        XCTAssertFalse(episodeInspector.exists, "Moving selection must respect an explicit off choice")
        try click(inspectorButton)
        try ready(episodeInspector)
        try focusListSearch()
        app.typeText("no matching tour episode")
        try ready(text("No Matching Episodes"))
        assertLibraryPanes(sidebar: true, inspector: false, after: "clearing the selection through Search")
        app.typeKey(.escape, modifierFlags: [])
        try selectFirstEpisode()
        try ready(episodeInspector)
        app.typeText("jo")
        let joinery = episodeRows.containing(.staticText, identifier: "Joinery without screws").firstMatch
        try ready(joinery)
        XCTAssertTrue(joinery.isSelected, "Type-select must select the Episode by title")
        XCTAssertTrue(library.frame.contains(joinery.frame), "Type-select must reveal the match")
        try ready(text("Joinery without screws", in: episodeInspector))
        try navigate("Starred")
        try capture("04-starred")
        XCTAssertFalse(sidebarItem("All Views").exists)
        try menuCommand("Saved Views", "Show All Views")
        try ready(library.descendants(matching: .any).matching(identifier: "views.list").firstMatch)
        try capture("05-all-views")

        try navigate("Default")
        try ready(episodeList)
        XCTAssertEqual(library.staticTexts["Default"].firstMatch.frame.minX, leadingTitleX, accuracy: 1,
                       "The Playlist title must retain the library's leading title position")
        assertLibraryPanes(sidebar: true, inspector: false, after: "opening a Playlist with no selection")
        let searchField = librarySearchField
        try ready(searchField)
        XCTAssertEqual(searchField.label, "Search this list")
        XCTAssertGreaterThan(searchField.frame.width, 100, "Search must remain a full field at the default window width")
        try capture("06-default-playlist")
        let closedHeader = playlistHeaderFrames
        XCTAssertEqual(playlistPlayButton.label, "Play This Playlist")
        XCTAssertFalse(library.toolbars.buttons["New Playlist…"].exists)
        let firstEntry = episodeRows.firstMatch
        let firstEntryPoint = try firstEpisodePoint()
        let clickLocation = firstEntryPoint.screenPoint
        let firstEntryBefore = firstEntry.frame
        firstEntryPoint.click()
        assertLibraryPanes(sidebar: true, inspector: true, after: "selecting the first Entry")
        XCTAssertTrue(firstEntry.isSelected)
        XCTAssertTrue(firstEntry.frame.contains(clickLocation), "The clicked point must remain inside the selected Entry")
        XCTAssertEqual(firstEntry.frame.minY, firstEntryBefore.minY, accuracy: 1, "Opening the Inspector moved the selected Entry vertically")
        XCTAssertNotEqual(playlistPlayButton.label, "Play This Playlist", "The same Play control now targets the selection")
        let openHeader = playlistHeaderFrames
        assertPlaylistHeader(openHeader)
        XCTContext.runActivity(named: "Inspector open: Playlist section dx \(openHeader.section.minX - closedHeader.section.minX) pt, Play dx \(openHeader.play.minX - closedHeader.play.minX) pt, Inspector toggle dx \(openHeader.inspector.minX - closedHeader.inspector.minX) pt, clicked Entry width \(firstEntryBefore.width) to \(firstEntry.frame.width) pt") { _ in }
        try capture("07-entry-inspector")
        try assertInspectorActionTargets()

        let secondEntry = episodeRows.element(boundBy: 1)
        try ready(secondEntry)
        secondEntry.coordinate(withNormalizedOffset: CGVector(dx: 0.12, dy: 0.5)).click()
        XCTAssertTrue(secondEntry.isSelected)
        assertLibraryPanes(sidebar: true, inspector: true, after: "selecting another Entry")
        assertPlaylistHeader(openHeader)

        try segment("History")
        assertLibraryPanes(sidebar: true, inspector: false, after: "opening History without a selection")
        assertPlaylistHeader(closedHeader)
        try capture("08-history")
        let historyDescription = text("Manual Played marks do not create History")
        try ready(historyDescription)
        XCTAssertLessThanOrEqual(historyDescription.frame.maxY, library.buttons["Open Now Playing"].frame.minY - 22,
                                 "History must fit above the player at the default window size")
        try segment("Listening Timeline")
        try ready(library.descendants(matching: .any).matching(identifier: "Listening Timeline").firstMatch)
        assertLibraryPanes(sidebar: true, inspector: false, after: "opening Listening Timeline")
        assertPlaylistHeader(closedHeader)
        try capture("09-listening-timeline")
        let rewindButtons = library.buttons.matching(identifier: "timeline.rewind")
        let rewind = rewindButtons.firstMatch
        XCTAssertFalse(rewind.exists, "An unselected Timeline must have no row Rewind button")
        try ready(episodeRows.firstMatch)
        let timelineFrame = episodeList.frame
        let rows = episodeRows.allElementsBoundByIndex
        var selectedIndex: Int?
        for (index, row) in rows.enumerated() {
            guard row.frame.height > 4, timelineFrame.minY <= row.frame.midY,
                  row.frame.midY < min(timelineFrame.maxY, library.buttons["Open Now Playing"].frame.minY) else { continue }
            // The title side is a row target regardless of how macOS exposes the List.
            row.coordinate(withNormalizedOffset: CGVector(dx: 0.12, dy: 0.5)).click()
            XCTAssertTrue(row.isSelected, "Clicking a Timeline row must select it")
            if rewind.waitForExistence(timeout: 1) {
                selectedIndex = index
                break
            }
        }
        try ready(rewind)
        XCTAssertTrue(rewind.label.hasSuffix("…"), "Rewind opens a preview and needs an ellipsis")
        XCTAssertEqual(rewindButtons.count, 1, "Only the selected Timeline row can show Rewind")
        try capture("34a-timeline-rewind-button")
        if let selectedIndex, selectedIndex + 1 < rows.count {
            episodeList.typeKey(.downArrow, modifierFlags: [])
            XCTAssertTrue(rows[selectedIndex + 1].isSelected, "Down Arrow must select the next Timeline row")
            episodeList.typeKey(.upArrow, modifierFlags: [])
            XCTAssertTrue(rows[selectedIndex].isSelected)
        }
        try click(rewind)
        try sheet("Rewind Playlist")
        try capture("34-rewind-summary", in: library, expectsSheet: true)
        try dismissSheet("Cancel") // Preview only; do not change the Library.

        try navigate("Commute")
        try capture("10-commute")
        let commuteHeader = playlistHeaderFrames
        let entryColumn = episodeList.buttons["Entry"].firstMatch.frame
        // Every toolbar control needs its own accessible name (round 9: a pull-down was announced
        // by its symbol name).
        for control in library.toolbars.descendants(matching: .any).matching(NSPredicate(format: "elementType IN %@", [XCUIElement.ElementType.button.rawValue, XCUIElement.ElementType.menuButton.rawValue, XCUIElement.ElementType.popUpButton.rawValue])).allElementsBoundByIndex {
            XCTAssertFalse(control.label.isEmpty, "Toolbar control \(control.identifier) \(control.title) has no accessible name")
        }
        try click(library.descendants(matching: .any).matching(identifier: "playlist.settings").firstMatch)
        try sheet("Playlist Settings")
        try capture("11-playlist-settings", expectsSheet: true)
        try assertSheetCheckboxSpace()
        let renameField = library.sheets.textFields["Playlist name"]
        try click(renameField)
        app.typeKey("a", modifierFlags: .command)
        app.typeKey(.delete, modifierFlags: [])
        XCTAssertFalse(library.sheets.buttons["Save"].isEnabled, "An empty Playlist name cannot be saved")
        app.typeText("Default")
        XCTAssertFalse(library.sheets.buttons["Save"].isEnabled, "Playlist names must be unique")
        app.typeKey("a", modifierFlags: .command)
        app.typeText("Commute edited")
        XCTAssertTrue(library.sheets.buttons["Save"].isEnabled)
        XCTAssertFalse(library.sheets.buttons["Save Name"].exists)
        XCTAssertFalse(library.sheets.buttons["Cancel Rename"].exists)
        try capture("12-playlist-rename", expectsSheet: true)
        try dismissSheet("Cancel")
        try ready(library.descendants(matching: .any).matching(identifier: "sidebar.Commute").firstMatch)
        XCTAssertFalse(library.descendants(matching: .any).matching(identifier: "sidebar.Commute edited").firstMatch.exists)
        try click(library.descendants(matching: .any).matching(identifier: "playlist.settings").firstMatch)
        try sheet("Playlist Settings")
        XCTAssertEqual(library.sheets.textFields["Playlist name"].value as? String, "Commute")
        try click(library.sheets.textFields["Playlist name"])
        app.typeKey("a", modifierFlags: .command)
        app.typeText("Commute edited")
        try dismissSheet("Save")
        try ready(library.descendants(matching: .any).matching(identifier: "sidebar.Commute edited").firstMatch)
        app.typeKey("z", modifierFlags: .command)
        try ready(library.descendants(matching: .any).matching(identifier: "sidebar.Commute").firstMatch)
        try ready(library.buttons["Redo Settings for Commute"])
        assertPlaylistHeader(commuteHeader)
        XCTAssertEqual(episodeList.buttons["Entry"].firstMatch.frame.minY, entryColumn.minY, accuracy: 1)
        try openNewPlaylist()
        XCTAssertFalse(library.sheets.staticTexts["Enter a Playlist name."].exists)
        try capture("13-new-playlist", expectsSheet: true)
        let newPlaylistName = library.sheets.textFields["Playlist name"]
        try click(newPlaylistName)
        let originalPlaylistName = newPlaylistName.value as? String
        app.typeText("Tour draft")
        XCTAssertEqual(newPlaylistName.value as? String, "Tour draft")
        app.typeKey("z", modifierFlags: .command)
        XCTAssertEqual(newPlaylistName.value as? String, originalPlaylistName, "Command-Z in a sheet text field must undo typing")
        app.typeKey("z", modifierFlags: [.command, .shift])
        XCTAssertEqual(newPlaylistName.value as? String, "Tour draft", "Shift-Command-Z must redo the field edit")
        try dismissSheet("Cancel")
        assertPlaylistHeader(commuteHeader)
        XCTAssertEqual(episodeList.buttons["Entry"].firstMatch.frame.minY, entryColumn.minY, accuracy: 1)

        try navigate("Trash")
        try ready(text("Trash is empty"))
        try capture("14-trash")
        try navigate("Search")
        try ready(library.buttons["Create View…"])
        XCTAssertFalse(libraryStatus.buttons["Redo Settings for Commute"].exists)
        try menuCommand("Edit", "Redo Settings for Commute", until: sidebarItem("Commute edited"))
        XCTAssertFalse(libraryStatus.buttons["Undo Settings for Commute"].exists)
        // This is a Library Undo. Put the native list in focus before invoking
        // the command so a field editor cannot consume it as a text Undo.
        try firstEpisodePoint().click()
        XCTAssertFalse(searchField.value(forKey: "hasKeyboardFocus") as? Bool == true)
        try menuCommand("Edit", "Undo Settings for Commute", until: sidebarItem("Commute"))
        // The list click selected an Episode. Clear that selection before
        // capturing Search with no selection and no Inspector.
        try focusListSearch()
        app.typeText("no matching tour episode")
        try ready(text("No Matching Episodes"))
        assertLibraryPanes(sidebar: true, inspector: false, after: "clearing the Search selection")
        app.typeKey(.escape, modifierFlags: [])
        try ready(searchField)
        XCTAssertEqual(searchField.label, "Search Library")
        try focusListSearch()
        app.typeText("rice")
        try ready(text(firstEpisodeTitle, in: episodeList))
        XCTAssertEqual(searchField.value as? String, "rice")
        XCTAssertEqual(searchField.label, "Search Library", "Typing must preserve the Search field's name")
        assertLibraryPanes(sidebar: true, inspector: false, after: "filtering Search without selecting a result")
        try capture("15-search-rice")
        app.typeKey("a", modifierFlags: .command)
        app.typeKey(.delete, modifierFlags: [])

        try checkPlaylistSettingsTrash()
        try navigate("New this week")
        let viewHeader = episodeList.buttons["Episode"].firstMatch.frame
        try click(button("Edit View"))
        try sheet("Edit View")
        XCTAssertEqual(try firstEpisodeOffset(title: firstEpisodeTitle), initialFirstRowOffset, accuracy: 1,
                       "Returning from Search and Playlist Settings must preserve the first row's alignment")
        assertPopUpNames(["Published", "Podcasts", "Played", "Starred", "In a Playlist", "Sort"])
        try capture("16-edit-view", expectsSheet: true)
        let viewName = library.sheets.textFields["View name"]
        try click(viewName)
        app.typeKey("a", modifierFlags: .command)
        app.typeKey(.delete, modifierFlags: [])
        XCTAssertFalse(library.sheets.buttons["Save"].isEnabled)
        app.typeText("Starred")
        XCTAssertFalse(library.sheets.buttons["Save"].isEnabled, "View names must be unique")
        app.typeKey("a", modifierFlags: .command)
        app.typeText("New this week edited")
        XCTAssertFalse(library.sheets.buttons["Rename…"].exists)
        XCTAssertFalse(library.descendants(matching: .any).matching(identifier: "sidebar.New this week edited").firstMatch.exists,
                       "A name stays a draft until the sheet Save")
        try dismissSheet("Save")
        try ready(library.descendants(matching: .any).matching(identifier: "sidebar.New this week edited").firstMatch)
        XCTAssertEqual(episodeList.buttons["Episode"].firstMatch.frame.minY, viewHeader.minY, accuracy: 1,
                       "Save feedback must not move a View’s list")
        app.typeKey("z", modifierFlags: .command)
        try ready(library.descendants(matching: .any).matching(identifier: "sidebar.New this week").firstMatch)
        XCTAssertEqual(episodeList.buttons["Episode"].firstMatch.frame.minY, viewHeader.minY, accuracy: 1,
                       "Undo feedback must not move a View’s list")
        app.typeKey("n", modifierFlags: .command)
        try sheet("New View")
        XCTAssertFalse(library.sheets.staticTexts["Enter a View name."].exists)
        XCTAssertFalse(library.sheets.buttons["Create View"].isEnabled)
        XCTAssertFalse(library.sheets.buttons["Done"].exists)
        for label in ["Mentions (Optional)", "Minimum Length (Optional)", "Maximum Length (Optional)", "Episodes to Show (Optional)"] {
            XCTAssertTrue(library.sheets.staticTexts[label].exists)
        }
        try capture("17-new-view", expectsSheet: true)
        try assertSheetAtBothTextSizes()
        try dismissSheet("Cancel")

        try navigate("Subscriptions")
        try click(library.buttons["Open Deep Field, Subscription"])
        try ready(library.staticTexts["Deep Field by Ines Okafor."])
        XCTAssertFalse(button("Show description").exists, "A short description must not offer an expansion that changes nothing")
        try navigate("Subscriptions")
        try click(library.buttons["Open Market Hours, Subscription"])
        try ready(button("Show description"))
        try ready(text("Who sets the price of rice?", in: episodeList))
        try assertPodcastWindowBounds()
        XCTAssertEqual(searchField.label, "Search Episodes")
        try focusListSearch()
        app.typeText("rice")
        XCTAssertEqual(searchField.value as? String, "rice")
        XCTAssertEqual(searchField.label, "Search Episodes")
        app.typeKey("a", modifierFlags: .command)
        app.typeKey(.delete, modifierFlags: [])
        let episodeHeading = episodeList.buttons["Episode"].firstMatch
        let episodeCount = library.staticTexts.matching(identifier: "podcast.episodeCount").firstMatch
        XCTAssertEqual(episodeHeading.frame.minX, episodeCount.frame.minX, accuracy: 8, "Podcast table and metadata must share a leading edge")
        let collapsedPublished = episodeList.buttons["Published"].firstMatch.frame
        try capture("18-podcast-market-hours")
        let collapsedDescription = library.staticTexts.matching(identifier: "podcast.description").firstMatch.frame
        try click(button("Show description"))
        try ready(button("Hide Description"))
        let description = library.staticTexts.matching(identifier: "podcast.description").firstMatch
        XCTAssertGreaterThan(description.frame.height, collapsedDescription.height)
        XCTAssertTrue(((description.value as? String) ?? description.label).hasSuffix("Thanks for listening to Market Hours."), "Expansion must retain the complete description")
        try assertPodcastWindowBounds()
        try assertExpandedPodcastControls()
        try capture("19-description-expanded")
        try click(button("Hide Description"))
        try ready(button("Show description"))
        let restoredColumns = XCTNSPredicateExpectation(predicate: NSPredicate { [self] _, _ in
            abs(episodeList.buttons["Published"].firstMatch.frame.minX - collapsedPublished.minX) <= 1
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [restoredColumns], timeout: 3), .completed, "Hide Description must restore the Podcast table columns")
        let subscriptionFrame = library.buttons["Subscribed"].frame
        let shareFrame = library.buttons["Share Podcast"].frame
        try click(library.buttons["Subscribed"])
        // Keep the pointer on the control while capturing, then disarm with a click elsewhere
        // (pointer-exit disarming uses onHover, which XCUITest's synthesized hover doesn't reach).
        try ready(library.buttons["Unsubscribe"], timeout: 3)
        XCTAssertEqual(library.buttons["Unsubscribe"].frame, subscriptionFrame)
        XCTAssertEqual(library.buttons["Share Podcast"].frame, shareFrame)
        try capture("20-unsubscribe-armed")
        library.staticTexts.matching(identifier: "podcast.episodeCount").firstMatch.click()
        try ready(library.buttons["Subscribed"])
        XCTAssertFalse(library.buttons["Unsubscribe"].exists)
        XCTAssertEqual(library.buttons["Subscribed"].frame, subscriptionFrame)
        XCTAssertEqual(library.buttons["Share Podcast"].frame, shareFrame)
        try assertPodcastWindowBounds()
        try capture("21-unsubscribe-disarmed")
        try click(button("Subscription settings"))
        try sheet("Market Hours settings")
        XCTAssertFalse(library.sheets.buttons["Mark All Played"].exists)
        assertPopUpNames(["Downloads on This Mac", "Played Threshold", "Speed", "Skip Intro", "Skip Outro", "Volume Boost"])
        try capture("22-subscription-settings", expectsSheet: true)
        try assertSheetAtBothTextSizes()
        library.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(library.sheets.firstMatch.waitForNonExistence(timeout: 10))
        try click(button("Subscription Settings"))
        try sheet("Market Hours settings")
        library.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(library.sheets.firstMatch.waitForNonExistence(timeout: 10))

        try navigate("New this week")
        try selectFirstEpisode()
        try ready(episodeInspector)
        let add = episodeList.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Add ' AND label ENDSWITH ' to a Playlist'")).firstMatch
        try click(add)
        try sheet("to a Playlist")
        let addSheet = library.sheets.firstMatch
        try ready(addSheet.buttons["Add"])
        XCTAssertTrue(addSheet.buttons["Play Next"].exists)
        XCTAssertTrue(addSheet.buttons["Play Now"].exists)
        XCTAssertFalse(addSheet.buttons["Play Last"].exists, "The plain Add action appends without starting playback")
        try capture("23-add-to-playlist", expectsSheet: true)
        try dismissSheet("Cancel")
        try navigate("Subscriptions")
        app.typeKey("a", modifierFlags: [.command, .shift])
        let addPodcasts = app.windows.matching(NSPredicate(format: "title == %@", "Add Podcasts")).firstMatch
        try ready(addPodcasts)
        assertNoHistoryButtons(in: addPodcasts)
        XCTAssertFalse(addPodcasts.buttons["Close"].exists, "Utility panels close with standard window commands")
        XCTAssertFalse(library.sheets.firstMatch.exists)
        let podcastQuery = addPodcasts.textFields["addPodcasts.query"]
        assertKeyboardFocus(podcastQuery)
        XCTAssertEqual(podcastQuery.label, "Podcast Name or Feed Address")
        try capture("24-add-podcasts", in: addPodcasts)
        podcastQuery.typeText("PodList tour draft")
        XCTAssertEqual(podcastQuery.label, "Podcast Name or Feed Address", "Typing must preserve the query field's name")
        let minimize = addPodcasts.buttons["_XCUI:MinimizeWindow"]
        let zoom = addPodcasts.buttons["_XCUI:ZoomWindow"]
        XCTAssertFalse(minimize.exists && minimize.isEnabled, "Add Podcasts is a utility panel")
        XCTAssertFalse(zoom.exists && zoom.isEnabled, "Add Podcasts must not offer a document window's zoom control")
        // Utility panels hide with their application and retain discovery state.
        XCUIApplication(bundleIdentifier: "com.apple.finder").activate()
        XCTAssertTrue(addPodcasts.waitForNonExistence(timeout: 10))
        app.activate()
        try ready(addPodcasts)
        XCTAssertEqual(podcastQuery.value as? String, "PodList tour draft")
        // Discovery stays open while Library is used and reopening brings it forward.
        try navigate("Default")
        XCTAssertTrue(addPodcasts.exists)
        try menuCommand("File", "Add Podcasts…", until: podcastQuery, requiringFocus: true)
        XCTAssertEqual(app.windows.matching(NSPredicate(format: "title == %@", "Add Podcasts")).count, 1)
        addPodcasts.typeKey("w", modifierFlags: .command)
        XCTAssertTrue(addPodcasts.waitForNonExistence(timeout: 10))
        app.typeKey("a", modifierFlags: [.command, .shift])
        try ready(addPodcasts)
        XCTAssertEqual(podcastQuery.value as? String, "PodList tour draft")
        assertKeyboardFocus(podcastQuery)
        podcastQuery.typeKey("a", modifierFlags: .command)
        podcastQuery.typeKey(.delete, modifierFlags: [])
        podcastQuery.typeText("Market Hours")
        podcastQuery.typeKey(.return, modifierFlags: [])
        let resultList = addPodcasts.descendants(matching: .any).matching(identifier: "addPodcasts.results").firstMatch
        let openPodcast = "Open Podcast page for Market Hours"
        let result = resultList.descendants(matching: .any).matching(NSPredicate(
            format: "elementType == %d OR elementType == %d",
            XCUIElement.ElementType.tableRow.rawValue, XCUIElement.ElementType.outlineRow.rawValue))
            .containing(.button, identifier: openPodcast).firstMatch
        try ready(result)
        // Click the row gap beyond its title button so the gesture exercises row activation.
        let selectResult = result.coordinate(withNormalizedOffset: CGVector(dx: 0.72, dy: 0.5))
        XCTAssertLessThan(result.buttons[openPodcast].frame.maxX, result.frame.minX + result.frame.width * 0.72)
        let back = library.buttons["Back to Library"]
        selectResult.click()
        XCTAssertTrue(result.wait(for: \.isSelected, toEqual: true, timeout: 5), "Single-click must select the result")
        XCTAssertFalse(back.exists, "Single-click on the row must leave the Podcast page closed")
        addPodcasts.typeKey(.return, modifierFlags: [])
        try ready(back)
        try ready(text(firstEpisodeTitle, in: episodeList))
        try click(back)
        XCTAssertTrue(back.waitForNonExistence(timeout: 5), "Return to Library before testing double-click")
        // Opening the Podcast page made Library key. Give Add Podcasts focus again.
        try click(podcastQuery)
        selectResult.doubleClick()
        try ready(back)
        try ready(text(firstEpisodeTitle, in: episodeList))
        // Focus the panel again so Escape closes it after opening the Podcast page.
        try click(podcastQuery)
        podcastQuery.typeKey("a", modifierFlags: .command)
        podcastQuery.typeKey(.delete, modifierFlags: [])
        addPodcasts.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(addPodcasts.waitForNonExistence(timeout: 10))
        try navigate("Subscriptions")
        // The bulk editor needs a selection: select every Subscription first.
        try click(library.descendants(matching: .any).matching(identifier: "subscriptions.list").firstMatch)
        app.typeKey("a", modifierFlags: .command)
        try click(library.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Edit Download Rules for'")).firstMatch)
        try ready(library.sheets.firstMatch)
        assertPopUpNames(["Downloads on This Mac"])
        try capture("25-download-rules", expectsSheet: true)
        try dismissSheet("Cancel")
        try navigate("Default")
        try click(library.buttons["Open Now Playing"])
        let nowPlaying = app.windows.matching(NSPredicate(format: "title == %@", "Now Playing")).firstMatch
        try ready(nowPlaying)
        XCTAssertFalse(library.sheets.firstMatch.exists)
        XCTAssertFalse(nowPlaying.buttons["Close"].exists, "Now Playing uses standard window closing")
        for name in ["Play", "Episode Details", "Open Active Playlist"] {
            let control = nowPlaying.buttons[name]
            try ready(control)
            XCTAssertTrue(nowPlaying.frame.contains(control.frame), "Main playback controls must fit without scrolling")
            XCTAssertLessThanOrEqual(control.frame.maxY, nowPlaying.frame.maxY - 16)
        }
        XCTAssertFalse(nowPlaying.scrollViews.staticTexts["Now Playing"].exists, "The title bar already names the window")
        let playlistLink = nowPlaying.buttons["Open Active Playlist"]
        if !nowPlaying.buttons["Next Chapter"].exists {
            XCTAssertLessThan(nowPlaying.frame.maxY - playlistLink.frame.maxY, 80, "Now Playing must fit its content without an empty bottom band")
        }
        try capture("26-now-playing", in: nowPlaying)
        // Playback stays open while the person browses Library.
        try navigate("Trash")
        try ready(text("Trash is empty"))
        XCTAssertTrue(nowPlaying.exists)
        try navigate("Default")
        try click(library.buttons["Open Now Playing"])
        XCTAssertEqual(app.windows.matching(NSPredicate(format: "title == %@", "Now Playing")).count, 1)
        let playerScroll = nowPlaying.scrollViews.firstMatch
        let details = nowPlaying.buttons["Episode Details"]
        try reveal(details, in: playerScroll)
        XCTAssertLessThanOrEqual(details.frame.maxY, nowPlaying.frame.maxY - 16)
        try click(details)
        let addFromDetails = button("Add to a Playlist", in: nowPlaying)
        try reveal(addFromDetails, in: playerScroll)
        addFromDetails.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).click()
        try sheet("to a Playlist")
        XCTAssertFalse(nowPlaying.sheets.firstMatch.exists, "Playlist edits must present on Library")
        try dismissSheet("Cancel")
        try click(library.buttons["Open Now Playing"])
        nowPlaying.typeKey("w", modifierFlags: .command)
        XCTAssertTrue(nowPlaying.waitForNonExistence(timeout: 10))
        try click(library.buttons["Open Now Playing"])
        try ready(nowPlaying)
        nowPlaying.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(nowPlaying.waitForNonExistence(timeout: 10))

        let settings = try openGeneralSettings()
        assertSettingsControlsNamed(in: settings)
        try capture("27-settings-general-top", in: settings)
        // Settings sizes to its content; scroll only if the pane still scrolls.
        XCTAssertLessThanOrEqual(settings.frame.height, 680 + 120, "A long Settings pane must stop at a height that opens fully on screen, and scroll")
        let form = settings.scrollViews.firstMatch
        if form.exists { form.hover(); form.scroll(byDeltaX: 0, deltaY: -280) }
        assertSettingsControlsNamed(in: settings)
        try capture("28-settings-general-middle", in: settings)
        if form.exists { form.scroll(byDeltaX: 0, deltaY: -1800) }
        try ready(button("Disconnect", in: settings))
        assertSettingsControlsNamed(in: settings)
        try capture("29-settings-general-bottom", in: settings)
        let mcp = try openAutomationSettings(in: settings)
        let automationScope = settings.staticTexts["This setting applies only to this Mac. App Intents and Shortcuts are always available."].firstMatch
        try ready(automationScope)
        let compactAutomation = NSPredicate { _, _ in
            settings.frame.contains(automationScope.frame) && settings.frame.maxY - automationScope.frame.maxY < 100
        }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: compactAutomation, object: nil)], timeout: 10), .completed,
                       "MCP-off Automation must size to its content without a large empty band below it")
        assertSettingsControlsNamed(in: settings)
        try capture("30-settings-automation", in: settings)
        let automationOffHeight = settings.frame.height
        try click(mcp)
        let copyConfiguration = settings.buttons["Copy Configuration"]
        try ready(copyConfiguration)
        assertSettingsControlsNamed(in: settings)
        let expandedAutomation = NSPredicate { _, _ in settings.frame.height > automationOffHeight + 80 }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: expandedAutomation, object: nil)], timeout: 10), .completed,
                       "Automation must grow to show enabled MCP configuration")
        let automationForm = settings.scrollViews.firstMatch
        if automationForm.exists { automationForm.scroll(byDeltaX: 0, deltaY: 1800) }
        try click(mcp)
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: compactAutomation, object: nil)], timeout: 10), .completed,
                       "Automation must shrink again when MCP configuration disappears")
        settings.typeKey("w", modifierFlags: .command)
        try ready(library)

        let stats = app.windows.matching(NSPredicate(format: "title == %@", "Listening Stats")).firstMatch
        try menuCommand("Window", "Listening Stats", until: stats)
        XCTAssertFalse(stats.scrollViews.staticTexts["Listening Stats"].exists, "The title bar already names the window")
        XCTAssertFalse(stats.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "0:00 listened")).firstMatch.exists,
                       "Sub-minute listening must use visible seconds rather than round to zero")
        try capture("31-listening-stats", in: stats)
        stats.typeKey("w", modifierFlags: .command)
        app.typeKey(",", modifierFlags: .command)
        try ready(settings)
        try click(settingsTab("General", in: settings))
        let generalForm = settings.scrollViews.firstMatch
        if generalForm.exists {
            generalForm.hover()
            // Return from the bottom far enough to reveal the Library section.
            generalForm.scroll(byDeltaX: 0, deltaY: 1800)
            try reveal(button("Getting started", in: settings), in: generalForm)
        }
        try click(button("Getting started", in: settings))
        let introduction = app.windows["Getting Started"].firstMatch
        try ready(introduction.buttons["Hide Getting Started"])
        XCTAssertFalse(settings.sheets.firstMatch.exists)
        try capture("32-getting-started", in: introduction)
        introduction.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(introduction.waitForNonExistence(timeout: 10))
        try menuCommand("Help", "Getting Started", until: introduction)
        try ready(introduction.buttons["Hide Getting Started"])
        introduction.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(introduction.waitForNonExistence(timeout: 10))
        settings.typeKey("w", modifierFlags: .command)

        try navigate("New this week")
        try selectFirstEpisode()
        let rowCount = episodeRows.count
        XCTAssertGreaterThan(rowCount, 1)
        episodeList.typeKey("a", modifierFlags: .command)
        let selectedRows = episodeRows.matching(NSPredicate(format: "selected == true"))
        let allSelected = NSPredicate { _, _ in selectedRows.count == rowCount }
        _ = XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: allSelected, object: nil)], timeout: 5)
        let selectedCount = selectedRows.count
        XCTAssertEqual(selectedCount, rowCount, "Command-A selected \(selectedCount) of \(rowCount) Episode rows")
        let summary = library.descendants(matching: .any).matching(identifier: "library.episodeSelectionInspector").firstMatch
        XCTAssertTrue(summary.waitForExistence(timeout: 15), "Missing Inspector summary with \(selectedCount) Episode rows selected")
        try ready(button("Add to a Playlist"))
        try capture("33-multi-selection")
        if style == "Light" { try captureMenus() }
        try menuCommand("Controls", "Play")
        try ready(library.buttons["Pause"])
        try menuCommand("Controls", "Pause")
        try ready(library.buttons["Play"])
        XCTAssertTrue(library.buttons["Open Now Playing"].exists)
        XCTAssertTrue(library.buttons["Play"].exists)
        XCTAssertFalse(library.buttons["Pause"].exists, "Leave an Episode paused as after relaunch")

        // This completed edit replaces the redo stack. Run it after the earlier
        // Settings-for-Commute Redo and the menu inventory.
        try navigate("Commute")
        try checkDelayedEntryUndo()
        try recordResponseTimings(from: timings)

        // Resize only after the default-size captures and timings.
        // CRITIQUE step 1: the narrowest supported size, and content scrolled beneath the bars.
        try navigate("Starred")
        try navigate("New this week")
        try selectFirstEpisode()
        try ready(episodeInspector)
        try ready(sidebar)
        try assertEpisodeTableLayout() // Exercise the Published-text overlap check before metadata gives way.
        try shrinkToMinimumSize(library)
        assertLibraryPanes(sidebar: true, inspector: false, after: "narrowing with an automatically shown Inspector")
        try firstEpisodePoint().click()
        assertLibraryPanes(sidebar: true, inspector: false, after: "selecting an Episode in a narrow window")
        try click(inspectorButton)
        assertLibraryPanes(sidebar: false, inspector: true, after: "opening the Inspector explicitly at minimum width")
        let playbackState = episodeRows.containing(.staticText, identifier: firstEpisodeTitle).firstMatch
            .descendants(matching: .any).matching(identifier: "Playback State").firstMatch
        try ready(playbackState)
        XCTAssertEqual(playbackState.value as? String, "In progress")
        try capture("35-minimum-window")
        try assertEpisodeTableLayout()
        try scrollEpisodesBeneathBars()
        try capture("36-scrolled-under-bars")
        try checkNarrowPaneSwaps()
        try captureHalfDisplay()
    }

    private func checkDelayedEntryUndo() throws {
        let returning = "When a currency disappears"
        let retained = "Inflation, explained with sandwiches"
        let removedRow = episodeRows.containing(.staticText, identifier: returning).firstMatch
        let retainedRow = episodeRows.containing(.staticText, identifier: retained).firstMatch
        try ready(removedRow)
        removedRow.coordinate(withNormalizedOffset: CGVector(dx: 0.12, dy: 0.5)).click()
        XCTAssertTrue(removedRow.isSelected)
        episodeList.typeKey(.delete, modifierFlags: [])
        XCTAssertTrue(removedRow.waitForNonExistence(timeout: 10))
        let undo = library.buttons["Undo Remove from Playlist"]
        try ready(undo)
        try ready(retainedRow)
        retainedRow.coordinate(withNormalizedOffset: CGVector(dx: 0.12, dy: 0.5)).click()
        XCTAssertTrue(retainedRow.isSelected)
        let search = librarySearchField
        try ready(search)
        let searchPoint = search.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))

        try click(undo)
        searchPoint.click()
        app.typeText("Inflation")

        // An unchanged query at completion reveals the Entry immediately, so the
        // recovery action also proves that the edit arrived during the delay.
        let reveal = library.buttons["Show Restored Entries"]
        try ready(reveal)
        try ready(text("Undone: Remove from Playlist"))
        XCTAssertEqual(search.value as? String, "Inflation")
        XCTAssertTrue(retainedRow.isSelected, "The later query and the selected matching Entry must survive Undo")
        XCTAssertFalse(removedRow.exists, "Undo must preserve the filter until the person asks to reveal the Entry")
        try capture("44-delayed-entry-undo")

        try click(reveal)
        try ready(removedRow)
        XCTAssertTrue(removedRow.isSelected, "Show Restored Entries must reveal and select the restored Entry")
        XCTAssertTrue(reveal.waitForNonExistence(timeout: 5))
        // Clear the restored selection so the tiled Commute capture starts
        // with the same empty selection as the first visit.
        try focusListSearch()
        app.typeText("no matching tour episode")
        XCTAssertTrue(removedRow.waitForNonExistence(timeout: 10))
        assertLibraryPanes(sidebar: true, inspector: false, after: "clearing the restored Entry selection")
        app.typeKey(.escape, modifierFlags: [])
        try ready(removedRow)
        XCTAssertFalse(removedRow.isSelected)
    }

    private func checkNarrowPaneSwaps() throws {
        try hideInspector()
        assertLibraryPanes(sidebar: false, inspector: false, after: "closing Inspector")

        // SwiftUI can grow the window when revealing the sidebar. Restore the
        // narrow width with the sidebar visible before exercising each open route.
        try showSidebar()
        narrowLibraryForPaneSwap()
        try click(inspectorButton)
        assertLibraryPanes(sidebar: false, inspector: true, after: "clicking the Inspector button")
        XCTAssertEqual(library.frame.width, 760, accuracy: 1, "Screen 43 must capture the minimum-width Library")
        try capture("43-narrow-inspector-no-sidebar")

        try showSidebar()
        assertLibraryPanes(sidebar: true, inspector: false, after: "showing the sidebar with Control-Command-S")
        narrowLibraryForPaneSwap()
        app.typeKey("i", modifierFlags: [.command, .option])
        assertLibraryPanes(sidebar: false, inspector: true, after: "opening Inspector with Option-Command-I")

        try showSidebar()
        narrowLibraryForPaneSwap()
        try menuCommand("View", "Show Inspector")
        assertLibraryPanes(sidebar: false, inspector: true, after: "choosing View > Show Inspector")

        try showSidebar()
        assertLibraryPanes(sidebar: true, inspector: false, after: "showing the sidebar again")
        app.typeKey("s", modifierFlags: [.command, .control])
        assertLibraryPanes(sidebar: false, inspector: false, after: "hiding the sidebar with Control-Command-S")
    }

    private func narrowLibraryForPaneSwap() {
        let window = library
        for inset in [-1.0, 2] where window.frame.width > 761 {
            let edge = window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 0.5))
                .withOffset(CGVector(dx: inset, dy: 0))
            let target = window.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5))
                .withOffset(CGVector(dx: 200, dy: 0))
            edge.click(forDuration: 0.3, thenDragTo: target)
        }
        XCTAssertEqual(window.frame.width, 760, accuracy: 1, "The pane swap must start at the minimum Library width")
        assertLibraryPanes(sidebar: true, inspector: false, after: "resizing for the Inspector command")
    }

    private func assertLibraryPanes(sidebar: Bool, inspector: Bool, after action: String,
                                    file: StaticString = #filePath, line: UInt = #line) {
        let window = library
        // Read both panes from one tree. A failed element-specific wait can make
        // XCTest try to resolve the staged application URL again for diagnostics.
        let deadline = Date().addingTimeInterval(5)
        var summary = "Library snapshot unavailable"
        repeat {
            if let snapshot = try? window.snapshot() {
                let elements = descendants(snapshot)
                let hasSidebar = elements.contains { $0.elementType == .outline && $0.label == "Sidebar" }
                let hasInspector = elements.contains {
                    $0.label == "Episode Inspector" || $0.identifier == "library.episodeSelectionInspector"
                        || ($0.elementType == .staticText && $0.value as? String == "Select an Episode")
                }
                let inspectorToggle = elements.first { $0.identifier == "library.inspector" }?.label
                if hasSidebar == sidebar, hasInspector == inspector,
                   inspectorToggle == (inspector ? "Hide Inspector" : "Show Inspector") { return }
                summary = "width \(snapshot.frame.width), sidebar \(hasSidebar), Inspector \(hasInspector), toggle \(inspectorToggle ?? "missing")"
            }
            Thread.sleep(forTimeInterval: 0.1)
        } while Date() < deadline
        XCTFail("Expected sidebar \(sidebar) and Inspector \(inspector) after \(action). Found \(summary).", file: file, line: line)
    }

    private func scrollEpisodesBeneathBars() throws {
        // Track the same two rows before and after scrolling. Overlay scrollers
        // are not always present in the Episode list's accessibility tree.
        let first = episodeRows.containing(.staticText, identifier: "Who sets the price of rice?").firstMatch
        let last = episodeRows.containing(.staticText, identifier: "Inflation, explained with sandwiches").firstMatch
        try ready(first)
        try ready(last)
        let headerBottom = episodeList.buttons["Episode"].firstMatch.frame.maxY
        let playerTop = library.buttons["Open Now Playing"].frame.minY - 22
        let startingBottom = last.frame.maxY
        XCTAssertGreaterThanOrEqual(first.frame.minY, headerBottom - 1, "The first Episode starts below the column header")
        XCTAssertGreaterThan(startingBottom, playerTop, "The last Episode initially extends under the player")

        let listPoint = episodeList.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4))
        let scrolled = NSPredicate { _, _ in
            guard let lastFrame = try? last.snapshot().frame, !lastFrame.isEmpty,
                  lastFrame.maxY < startingBottom - 8, lastFrame.maxY <= playerTop + 1 else { return false }
            guard let firstFrame = try? first.snapshot().frame else { return true }
            return firstFrame.isEmpty || firstFrame.minY < headerBottom - 4
        }
        for delta in [-160.0, -400.0] {
            listPoint.hover()
            episodeList.scroll(byDeltaX: 0, deltaY: delta)
            let moved = XCTNSPredicateExpectation(predicate: scrolled, object: nil)
            if XCTWaiter.wait(for: [moved], timeout: 5) == .completed { return }
        }
        XCTFail("Scrolling must move the first Episode beneath the column header and bring the last Episode clear of the player")
    }

    private func checkPlaylistSettingsTrash() throws {
        try navigate("Commute")
        try ready(episodeRows.firstMatch)
        let entryCount = episodeRows.count
        let settings = library.descendants(matching: .any).matching(identifier: "playlist.settings").firstMatch
        try click(settings)
        try sheet("Playlist Settings")
        let panel = library.sheets.firstMatch
        let field = panel.textFields["Playlist name"]
        let delete = panel.buttons["Delete Playlist"]
        let restore = panel.buttons["Restore Playlist"]
        let save = panel.buttons["Save"]
        let close = panel.buttons["Close"]
        try click(field)
        app.typeKey("a", modifierFlags: .command)
        app.typeText("Morning Commute")
        try click(delete)
        try ready(text("“Commute” is in the Trash.", in: panel))
        try ready(restore)
        try ready(close)
        XCTAssertFalse(save.exists)
        XCTAssertFalse(panel.buttons["Cancel"].exists)
        XCTAssertFalse(field.isEnabled)
        XCTAssertEqual(field.value as? String, "Morning Commute")
        XCTAssertTrue(sidebarItem("Commute").waitForNonExistence(timeout: 5))
        let trash = sidebarItem("Trash")
        let trashDescription = trash.label + " " + String(describing: trash.value ?? "")
        XCTAssertTrue(trashDescription.contains("1"), "The sidebar must count the deleted Playlist")
        XCTAssertTrue(library.title.hasPrefix("Commute"), "Keep the Playlist title behind its Settings sheet")
        XCTAssertTrue(library.title.contains("In the Trash"), "Mark the background Playlist as in the Trash")
        XCTAssertEqual(episodeRows.count, entryCount, "Keep the Playlist Entries visible behind Settings")
        try capture("11a-playlist-settings-deleted", expectsSheet: true)

        // The Restore command belongs to the deleted settings sheet from screen 11a.
        try menuCommand("Playlist", "Restore", until: save, retryFocus: text("Playlist Settings", in: panel))
        XCTAssertTrue(save.wait(for: \.isEnabled, toEqual: true, timeout: 10))
        try ready(sidebarItem("Commute"))
        XCTAssertTrue(field.isEnabled)
        XCTAssertEqual(field.value as? String, "Morning Commute")

        try click(delete)
        XCTAssertTrue(restore.wait(for: \.isEnabled, toEqual: true, timeout: 10))
        // Use the Edit command's shortcut while the sheet owns the key window.
        app.typeKey("z", modifierFlags: .command)
        XCTAssertTrue(save.wait(for: \.isEnabled, toEqual: true, timeout: 10))
        XCTAssertTrue(field.isEnabled)
        XCTAssertEqual(field.value as? String, "Morning Commute")
        try ready(sidebarItem("Commute"))

        try click(delete)
        XCTAssertTrue(close.wait(for: \.isEnabled, toEqual: true, timeout: 5))
        panel.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(panel.waitForNonExistence(timeout: 10), "Return must activate Close")
        try ready(library.buttons["Open Market Hours, Subscription"])
        try navigate("Trash")
        try click(library.buttons["Restore Playlist Commute"])
        try navigate("Commute")
        try click(settings)
        try sheet("Playlist Settings")
        XCTAssertEqual(field.value as? String, "Commute", "Close discards the draft")
        try click(delete)
        XCTAssertTrue(close.wait(for: \.isEnabled, toEqual: true, timeout: 5))
        panel.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(panel.waitForNonExistence(timeout: 10), "Escape must activate Close")
        try navigate("Trash")
        try click(library.buttons["Restore Playlist Commute"])
    }

    private func captureLargeSidebar(from root: URL, style: String) throws {
        let origin = try String(contentsOf: root.appendingPathComponent("sidebar-origin"), encoding: .utf8)
        try launch(from: root, copy: "sidebar-" + appearance, style: style, origin: origin)
        let sidebar = library.outlines["Sidebar"]
        try ready(sidebarItem("Tour View 04"), timeout: 60)
        try ready(library.buttons["Open Now Playing"])
        let player = library.descendants(matching: .any).matching(identifier: "library.player").firstMatch
        try ready(player)
        try capture("40-large-sidebar")

        let last = sidebarItem("Search")
        let sidebarPoint = sidebar.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4))
        // Poll in test code: XCUIElement queries inside an NSPredicate block can fail
        // mid-query in the VM (seen 18 Nov in Dark only).
        var reachedBottom = false
        for _ in 0..<6 where !reachedBottom {
            sidebarPoint.hover()
            sidebar.scroll(byDeltaX: 0, deltaY: -600)
            for _ in 0..<8 where !reachedBottom {
                if last.waitForExistence(timeout: 0.5) {
                    let frame = last.frame
                    reachedBottom = !frame.isEmpty && sidebar.frame.contains(frame) && frame.maxY <= player.frame.minY
                }
                if !reachedBottom { Thread.sleep(forTimeInterval: 0.25) }
            }
        }
        XCTAssertTrue(reachedBottom, "The last sidebar row must scroll above the player")
        try ready(sidebarItem("Tour Playlist 30"))
        try capture("41-large-sidebar-bottom")
        try captureSidebarFolding(in: sidebar)
    }

    private func captureSidebarFolding(in sidebar: XCUIElement) throws {
        let views = sidebar.staticTexts["Views"]
        let playlists = sidebar.staticTexts["Playlists"]
        let newView = sidebar.buttons["New View…"]
        let newPlaylist = sidebar.buttons["New Playlist…"]
        let selectedView = sidebarItem("New this week")
        let defaultPlaylist = sidebarItem("Default")

        func toggle(_ header: XCUIElement, named name: String) throws {
            try ready(header)
            header.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).hover()
            let disclosure = sidebar.outlineRows.containing(.staticText, identifier: name)
                .firstMatch.disclosureTriangles.firstMatch
            try click(disclosure.exists ? disclosure : header)
        }

        sidebar.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4)).hover()
        try reveal(views, in: sidebar, scrollDelta: 600)
        try ready(newView)
        try openNewThisWeek()
        let viewWindow = app.windows.matching(NSPredicate(format: "title BEGINSWITH %@", "New this week")).firstMatch
        let viewEpisode = text("Who sets the price of rice?", in: episodeTable(in: viewWindow))
        try ready(viewEpisode)

        try toggle(views, named: "Views")
        XCTAssertTrue(selectedView.waitForNonExistence(timeout: 5), "Folding Views must hide the selected row")
        XCTAssertTrue(newView.waitForNonExistence(timeout: 5), "Folding Views must hide New View")
        XCTAssertTrue(viewEpisode.exists, "Folding the selected View must keep its detail visible")
        try toggle(views, named: "Views")
        try ready(selectedView)
        try ready(newView)

        try reveal(defaultPlaylist, in: sidebar)
        try ready(newPlaylist)
        try toggle(playlists, named: "Playlists")
        XCTAssertTrue(defaultPlaylist.waitForNonExistence(timeout: 5), "Folding Playlists must hide its rows")
        XCTAssertTrue(newPlaylist.waitForNonExistence(timeout: 5), "Folding Playlists must hide New Playlist")
        try capture("42-large-sidebar-playlists-folded")
        try toggle(playlists, named: "Playlists")
        try ready(defaultPlaylist)
        try ready(newPlaylist)
    }

    private func captureHalfDisplay() throws {
        let screenWidth = try XCTUnwrap(NSScreen.main, "The VM tour requires a display").frame.width
        try tileLibraryOnLeft { frame in
            // macOS can inset a tile from the display edge and the centre divider.
            return abs(frame.minX) <= 32 && abs(frame.width - screenWidth / 2) <= 32
        }
        XCTAssertFalse(library.outlines["Sidebar"].exists, "Widening must leave the sidebar hidden")
        let tiledFrame = library.frame
        func restoreTileIfNeeded() throws {
            try tileLibraryOnLeft { frame in
                abs(frame.minX - tiledFrame.minX) <= 1 && abs(frame.width - tiledFrame.width) <= 1
            }
        }
        try showSidebar()
        try restoreTileIfNeeded()

        try navigate("Subscriptions")
        try openNewThisWeek()
        try firstEpisodePoint().click()
        if !episodeInspector.exists {
            try menuCommand("Episode", "Show Episode Details", until: episodeInspector)
        }
        try ready(episodeInspector)
        try restoreTileIfNeeded()
        try capture("37-half-display-episode-inspector")
        try assertEpisodeTableLayout()

        if !library.outlines["Sidebar"].exists {
            try showSidebar()
            try restoreTileIfNeeded()
        }
        try navigate("Subscriptions")
        try click(library.buttons["Open Market Hours, Subscription"])
        try ready(text("Who sets the price of rice?", in: episodeList))
        for name in ["Share Podcast", "Copy Feed Address"] {
            let action = library.buttons[name]
            try ready(action)
            XCTAssertTrue(action.isHittable && library.frame.contains(action.frame))
        }
        assertLibraryPanes(sidebar: true, inspector: false, after: "opening the tiled Podcast page")
        try capture("38-half-display-podcast-market-hours")
        try assertEpisodeTableLayout()

        try navigate("Commute")
        try ready(episodeRows.firstMatch)
        assertLibraryPanes(sidebar: true, inspector: false, after: "opening tiled Commute without a selection")
        try capture("39-half-display-commute")
        try assertEpisodeTableLayout(inPlaylist: true)
    }

    private func tileLibraryOnLeft(matching tile: (CGRect) -> Bool) throws {
        if tile(library.frame) { return }
        let windowMenu = app.menuBars.menuBarItems["Window"]
        let moveAndResize = windowMenu.menuItems["Move & Resize"].firstMatch
        let left = moveAndResize.menuItems["Left"].firstMatch
        // The VM sometimes needs a second attempt to open the submenu or apply the tile.
        for _ in 0..<3 {
            try click(windowMenu)
            if moveAndResize.waitForExistence(timeout: 5) {
                moveAndResize.hover()
                if left.waitForExistence(timeout: 5), left.isEnabled {
                    left.click()
                    let deadline = Date().addingTimeInterval(5)
                    repeat {
                        if tile(library.frame) { return }
                        Thread.sleep(forTimeInterval: 0.1)
                    } while Date() < deadline
                }
            }
            refocusLibraryAfterMenu()
        }
        XCTFail("Window > Move & Resize > Left must tile the Library to half the display. Found \(library.frame).")
    }

    private func recordResponseTimings(from output: URL, warmUpRuns: Int = 0) throws {
        let newThisWeek = sidebarItem("New this week")
        let episodeTitle = "Who sets the price of rice?"
        let listedEpisode = text(episodeTitle, in: episodeTable(in: library))
        let settings = settingsWindow
        let newPlaylist = library.sheets.firstMatch
        // The fixture has one match for "rice". Require the filtered count and the matching row.
        let filteredWindow = app.windows.matching(NSPredicate(format: "title BEGINSWITH %@", "New this week – 1 Episode")).firstMatch
        let filteredEpisode = text(episodeTitle, in: episodeTable(in: filteredWindow))
        let runCount = 5
        var recording = false
        var inputs: [String: [Range<TimeInterval>]] = [:]
        @discardableResult
        func perform(_ step: String, until result: XCUIElement, input: () -> Void) -> Bool {
            // These bounds identify the intended event in the app log, excluding
            // setup and screenshot captures. Both times in each delta come from the app.
            let start = CACurrentMediaTime()
            input()
            if recording { inputs[step, default: []].append(start..<CACurrentMediaTime()) }
            return result.exists || result.waitForExistence(timeout: 30)
        }

        // ui-tour-guest.sh starts an opt-in profiler when this step appears in the log.
        XCTContext.runActivity(named: "Begin response timing runs") { _ in }
        for run in 0..<(warmUpRuns + runCount) {
            recording = run >= warmUpRuns
            try navigate("Subscriptions")
            try ready(library.buttons["Open Market Hours, Subscription"])

            if perform("playlist", until: newPlaylist, input: { app.typeKey("n", modifierFlags: [.command, .shift]) }) {
                try dismissSheet("Cancel")
            }

            if perform("settings", until: settings, input: { app.typeKey(",", modifierFlags: .command) }) {
                settings.typeKey("w", modifierFlags: .command)
                XCTAssertTrue(settings.waitForNonExistence(timeout: 15), "Close Settings before the next task")
            }

            try ready(newThisWeek)
            guard perform("sidebar", until: listedEpisode, input: { newThisWeek.click() }) else { continue }
            if episodeInspector.exists {
                try focusListSearch()
                app.typeText("no matching tour episode")
                try ready(text("No Matching Episodes"))
                app.typeKey(.escape, modifierFlags: [])
                try ready(listedEpisode)
            }
            XCTAssertFalse(episodeInspector.exists, "Measure the first selection with a hidden Inspector")
            let episode = try firstEpisodePoint()
            XCTAssertTrue(perform("inspector", until: episodeInspector) { episode.click() },
                          "The first selection must open the Inspector at the default width")
            let second = episodeRows.element(boundBy: 1)
            try ready(second)
            let title = second.staticTexts.firstMatch
            let secondTitle = (title.value as? String) ?? title.label
            XCTAssertFalse(secondTitle.isEmpty, "Use the second row’s title for the open-Inspector timing")
            perform("inspector-open", until: text(secondTitle, in: episodeInspector)) {
                second.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.5)).click()
            }

            try focusListSearch()
            app.typeText("ric")
            perform("filter", until: filteredEpisode) { app.typeKey("e", modifierFlags: []) }
            app.typeKey(.escape, modifierFlags: [])
        }

        let log = (try? String(contentsOf: output, encoding: .utf8)) ?? ""
        let samples = log.split(separator: "\n").compactMap { line -> (step: String, input: TimeInterval, ms: Double)? in
            let fields = line.split(separator: "\t")
            guard fields.count == 4, let input = Double(fields[1]), let ms = Double(fields[3]),
                  input.isFinite, ms.isFinite, ms >= 0 else { return nil }
            return (String(fields[0]), input, ms)
        }
        func summary(_ step: String, _ name: String, loggedAs: String? = nil) -> String {
            let observed = inputs[step, default: []].compactMap { range in
                samples.first { $0.step == (loggedAs ?? step) && range.contains($0.input) }?.ms
            }.sorted()
            return timingSummary(name, observed, runs: runCount)
        }

        let process = ProcessInfo.processInfo
        let report = [
            "Appearance: \(appearance)",
            "VM hardware model: \(hardwareModel()) (\(process.processorCount) CPUs, \(process.physicalMemory / (1 << 30)) GiB RAM)",
            "macOS: \(process.operatingSystemVersionString)",
            "Method: input event to first presented frame, measured in-app in the VM. Ends at the target time of the first display-link frame after the result appears.",
            "Default window size, local demo Library, p75 by nearest rank. RESP-01 target: p75 ≤ 200 ms over at least five samples.",
            "If sidebar navigation does not reach the Episode list, the selection and filter runs for that iteration are skipped.",
            "",
            summary("sidebar", "Sidebar → New this week Episode list"),
            summary("inspector", "Select Episode → Episode Inspector (pane opens)"),
            summary("inspector-open", "Select Episode → Episode Inspector (pane stays open)", loggedAs: "inspector"),
            summary("playlist", "Shift-Cmd-N → New Playlist sheet"),
            summary("settings", "Cmd-, → Settings window"),
            summary("filter", "Final e in rice → filtered Episode list"),
        ].joined(separator: "\n")
        attach(report + "\n", name: appearance + "--timings.txt")
    }

    private func timingSummary(_ name: String, _ observed: [Double], runs: Int) -> String {
        let coverage = "\(name): samples=\(observed.count)/\(runs)"
        guard observed.count == runs, let max = observed.last else {
            return coverage + ", unobserved (short sample count)"
        }
        let rank = Int(ceil(Double(observed.count) * 0.75))
        return coverage + String(format: ", p75=%.1f ms, max=%.1f ms", observed[rank - 1], max)
    }

    private func hardwareModel() -> String {
        var size = 0
        guard sysctlbyname("hw.model", nil, &size, nil, 0) == 0, size > 1 else { return "unavailable" }
        var bytes = [UInt8](repeating: 0, count: size)
        guard sysctlbyname("hw.model", &bytes, &size, nil, 0) == 0 else { return "unavailable" }
        return String(decoding: bytes.prefix { $0 != 0 }, as: UTF8.self)
    }

    private func captureShowBorders() throws {
        try openNewThisWeek()
        try ready(episodeRows.firstMatch)
        try capture("02-new-this-week")
        try selectFirstEpisode()
        try ready(episodeInspector)
        try capture("03-episode-inspector")
        try openNewPlaylist()
        try capture("13-new-playlist", expectsSheet: true)
        try dismissSheet("Cancel")
        let settings = try openGeneralSettings()
        try capture("27-settings-general-top", in: settings)
        _ = try openAutomationSettings(in: settings)
        try capture("30-settings-automation", in: settings)
    }

    private func openNewThisWeek() throws {
        try navigate("New this week")
        try ready(episodeTable(in: library))
    }

    private func episodeTable(in window: XCUIElement) -> XCUIElement {
        window.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Episodes, sortable columns")).firstMatch
    }

    private var librarySearchField: XCUIElement {
        library.toolbars.descendants(matching: .any).matching(identifier: "library.search").firstMatch
    }

    private func focusListSearch() throws {
        let search = librarySearchField
        try ready(search)
        search.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).click()
    }

    private func checkOPMLOpenShortcut() throws {
        // AppKit exposes the panel as a window, with its controls hosted by the
        // Open and Save Panel service. Its Open control has a title but no label.
        let chooser = app.windows.matching(identifier: "open-panel").firstMatch
        XCTAssertFalse(chooser.exists, "The OPML chooser must be closed before ⌘O")
        app.typeKey("o", modifierFlags: .command)
        try ready(chooser)
        try ready(text("Choose an OPML", in: chooser))
        app.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(chooser.waitForNonExistence(timeout: 5), "Escape must dismiss the OPML chooser")
        XCTAssertTrue(library.buttons["Open Market Hours, Subscription"].wait(for: \.isEnabled, toEqual: true, timeout: 5),
                      "The Library must be usable again after dismissing the chooser")
    }

    private func assertPopUpNames(_ names: [String], file: StaticString = #filePath, line: UInt = #line) {
        let popUps = library.sheets.firstMatch.popUpButtons
        for name in names {
            let popUp = popUps.matching(NSPredicate(format: "label == %@", name)).firstMatch
            if !popUp.waitForExistence(timeout: 5) {
                XCTFail("Expected a pop-up named \(name). Sheet pop-up labels: \(popUps.allElementsBoundByIndex.map(\.label))",
                        file: file, line: line)
            }
        }
    }

    private func firstEpisodeOffset(title: String) throws -> CGFloat {
        let table = episodeTable(in: library)
        let first = table.staticTexts.matching(NSPredicate(format: "value == %@ OR label == %@", title, title)).firstMatch
        let header = table.buttons["Episode"].firstMatch
        try ready(first)
        try ready(header)
        let offset = first.frame.minY - header.frame.maxY
        XCTAssertGreaterThanOrEqual(offset, 0, "The View's first row must be below the column header")
        return offset
    }

    private func openNewPlaylist() throws {
        // Use the documented File command to create a Playlist.
        app.typeKey("n", modifierFlags: [.command, .shift])
        try sheet("New Playlist")
    }

    private var settingsWindow: XCUIElement { app.windows.containing(.any, identifier: "General").firstMatch }

    private func openGeneralSettings() throws -> XCUIElement {
        app.typeKey(",", modifierFlags: .command)
        let settings = settingsWindow
        try ready(settings)
        try click(settingsTab("General", in: settings))
        try ready(text("Speed", in: settings))
        try ready(settingsTab("Automation", in: settings))
        XCTAssertFalse(mcpSetting(in: settings).exists, "Only the General pane should be exposed")
        return settings
    }

    private func openAutomationSettings(in settings: XCUIElement) throws -> XCUIElement {
        try click(settingsTab("Automation", in: settings))
        let mcp = mcpSetting(in: settings)
        try ready(mcp)
        XCTAssertEqual(String(describing: mcp.value ?? ""), "0", "MCP must remain off")
        return mcp
    }

    private func settingsTab(_ name: String, in settings: XCUIElement) -> XCUIElement {
        settings.toolbars.descendants(matching: .any).matching(identifier: name).firstMatch
    }

    private func mcpSetting(in settings: XCUIElement) -> XCUIElement {
        settings.descendants(matching: .any).matching(NSPredicate(
            format: "label == %@ OR title == %@", "Enable MCP Server", "Enable MCP Server")).firstMatch
    }

    private func assertEpisodeTableLayout(inPlaylist: Bool = false, file: StaticString = #filePath, line: UInt = #line) throws {
        let titleColumn = inPlaylist ? "Entry" : "Episode"
        let metadataColumn = inPlaylist ? "Position" : "Published"
        let heading = episodeList.buttons[titleColumn].firstMatch
        try ready(heading, file: file, line: line)
        XCTAssertGreaterThanOrEqual(heading.frame.width, 120, "\(titleColumn) header must remain readable", file: file, line: line)
        let row = try episodeRows.firstMatch.snapshot()
        let cells = row.children.filter { $0.elementType == .cell }
        let titleCell = try XCTUnwrap(cells.first, file: file, line: line)
        let content = descendants(titleCell)
        let buttons = content.filter { $0.elementType == .button }
        XCTAssertEqual(buttons.count, inPlaylist ? 1 : 2, "Check all \(titleColumn) row controls", file: file, line: line)
        // Playlist rows put their ordinal before the title.
        let title = try XCTUnwrap(content.filter { $0.elementType == .staticText }.dropFirst(inPlaylist ? 1 : 0).first,
                                  file: file, line: line)
        // The title can truncate inside its column; measure the cell separately.
        XCTAssertGreaterThanOrEqual(titleCell.frame.width, 180, "The \(titleColumn) column must keep room for titles", file: file, line: line)
        XCTAssertGreaterThanOrEqual(title.frame.width, 80, "Episode title text must remain readable", file: file, line: line)
        for button in buttons {
            XCTAssertFalse(button.frame.intersects(title.frame), "Row control overlaps the Episode title", file: file, line: line)
        }
        // Published or Position can give way at narrow widths. If shown, test its actual text
        // frames; also reject overlaps with any other metadata that remains visible.
        let metadata = cells.dropFirst().flatMap { descendants($0) }.filter { $0.elementType == .staticText }
        if episodeList.buttons[metadataColumn].firstMatch.exists {
            XCTAssertFalse(metadata.isEmpty, "A shown \(metadataColumn) column must expose its text", file: file, line: line)
        } else {
            XCTAssertEqual(cells.count, 1, "At the narrowest size metadata gives way to \(titleColumn)", file: file, line: line)
        }
        for button in buttons {
            XCTAssertGreaterThanOrEqual(button.frame.minX, titleCell.frame.minX, file: file, line: line)
            XCTAssertLessThanOrEqual(button.frame.maxX, titleCell.frame.maxX, "Row control must fit inside \(titleColumn)", file: file, line: line)
            for text in metadata {
                XCTAssertFalse(button.frame.intersects(text.frame), "Row control overlaps \(metadataColumn) or other metadata", file: file, line: line)
            }
        }
    }

    private func descendants(_ node: XCUIElementSnapshot) -> [XCUIElementSnapshot] {
        [node] + node.children.flatMap { descendants($0) }
    }

    /// Standard pointer input: drag the window's bottom-right corner past its minimum size,
    /// so AppKit clamps it to the minimum. Edges are tried if the corner misses the resize area.
    private func shrinkToMinimumSize(_ window: XCUIElement, file: StaticString = #filePath, line: UInt = #line) throws {
        let start = window.frame
        let origin = window.coordinate(withNormalizedOffset: .zero)
        let attempts: [(CGVector, CGVector)] = [
            (CGVector(dx: 1, dy: 1), CGVector(dx: -1, dy: -1)),
            (CGVector(dx: 1, dy: 1), CGVector(dx: 2, dy: 2)),
        ]
        for (anchor, offset) in attempts where window.frame.width > start.width - 100 {
            let corner = window.coordinate(withNormalizedOffset: anchor).withOffset(offset)
            corner.click(forDuration: 0.3, thenDragTo: origin.withOffset(CGVector(dx: 200, dy: 150)))
        }
        if window.frame.width > start.width - 100 {
            window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 0.5)).withOffset(CGVector(dx: 2, dy: 0))
                .click(forDuration: 0.3, thenDragTo: origin.withOffset(CGVector(dx: 200, dy: start.height / 2)))
            window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 1)).withOffset(CGVector(dx: 0, dy: 2))
                .click(forDuration: 0.3, thenDragTo: origin.withOffset(CGVector(dx: window.frame.width / 2, dy: 150)))
        }
        let shrunk = window.frame
        XCTAssertLessThan(shrunk.width, start.width - 100, "The window must resize to its minimum width", file: file, line: line)
        XCTAssertLessThan(shrunk.height, start.height - 100, "The window must resize to its minimum height", file: file, line: line)
        XCTAssertGreaterThanOrEqual(shrunk.width, 760, "The window must not shrink below its minimum width", file: file, line: line)
        XCTAssertGreaterThanOrEqual(shrunk.height, 500, "The window must not shrink below its minimum height", file: file, line: line)
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

    private func assertPodcastWindowBounds(file: StaticString = #filePath, line: UInt = #line) throws {
        let firstHeader = library.outlines["Sidebar"].staticTexts["Views"]
        let play = library.buttons["Play"]
        for control in [firstHeader, play] {
            try ready(control, file: file, line: line)
            XCTAssertFalse(control.frame.isEmpty, "Control must have a visible frame", file: file, line: line)
            XCTAssertTrue(library.frame.contains(control.frame), "Podcast page pushed \(control) outside the window", file: file, line: line)
        }
    }

    private func assertExpandedPodcastControls(file: StaticString = #filePath, line: UInt = #line) throws {
        let rule = library.popUpButtons.matching(identifier: "downloadRule.mode").firstMatch
        let count = library.staticTexts.matching(identifier: "podcast.episodeCount").firstMatch
        for control in [rule, count] {
            try ready(control, file: file, line: line)
            XCTAssertTrue(library.frame.contains(control.frame), "Expanded description hid a page control", file: file, line: line)
            XCTAssertTrue(control.isHittable, "Page controls must be visible without scrolling", file: file, line: line)
        }
        for scroll in library.scrollViews.allElementsBoundByIndex {
            XCTAssertFalse(scroll.popUpButtons.matching(identifier: "downloadRule.mode").firstMatch.exists,
                           "Download Rule must be outside scrolling content", file: file, line: line)
            XCTAssertFalse(scroll.staticTexts.matching(identifier: "podcast.episodeCount").firstMatch.exists,
                           "Episode count must be outside scrolling content", file: file, line: line)
        }
        XCTAssertLessThan(rule.frame.maxY, count.frame.minY, file: file, line: line)
    }

    private struct PlaylistHeaderFrames {
        var play: CGRect
        var section: CGRect
        var inspector: CGRect
    }

    private var playlistHeaderFrames: PlaylistHeaderFrames {
        let section = library.toolbars.descendants(matching: .any).matching(identifier: "playlist.section").firstMatch
        return PlaylistHeaderFrames(play: playlistPlayButton.frame, section: section.frame, inspector: inspectorButton.frame)
    }

    private func assertPlaylistHeader(_ expected: PlaylistHeaderFrames,
                                      file: StaticString = #filePath, line: UInt = #line) {
        let actual = playlistHeaderFrames
        let actualPlay = actual.play
        let actualSection = actual.section
        let toolbar = library.toolbars.firstMatch
        XCTAssertTrue(toolbar.frame.contains(actualSection), "The section switcher must be in the toolbar", file: file, line: line)
        XCTAssertTrue(toolbar.frame.contains(actualPlay), "The Playlist action must be in the toolbar", file: file, line: line)
        XCTAssertGreaterThan(actualPlay.minX, actualSection.maxX, "Play belongs in trailing actions, outside the switcher", file: file, line: line)
        // Compare positions at the same pane visibility. The open transition
        // is logged separately, and a second selection must leave controls fixed.
        XCTAssertEqual(actualPlay.width, expected.play.width, accuracy: 1, "Playlist action changed form", file: file, line: line)
        XCTAssertEqual(actualPlay.minY, expected.play.minY, accuracy: 1, "Playlist action moved", file: file, line: line)
        XCTAssertEqual(actualPlay.minX, expected.play.minX, accuracy: 1, "Playlist action moved horizontally", file: file, line: line)
        XCTAssertEqual(actualSection.minX, expected.section.minX, accuracy: 1, "Section control moved horizontally", file: file, line: line)
        XCTAssertEqual(actualSection.minY, expected.section.minY, accuracy: 1, "Section control moved", file: file, line: line)
        assertInspectorPosition(expected.inspector, file: file, line: line)
        XCTAssertLessThan(abs(actualPlay.midY - actualSection.midY), 8, "Controls must share a row", file: file, line: line)
    }

    private func sidebarItem(_ name: String) -> XCUIElement {
        library.descendants(matching: .any).matching(identifier: "sidebar." + name).firstMatch
    }

    private func navigate(_ name: String) throws {
        try click(sidebarItem(name))
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

    private var episodeInspector: XCUIElement {
        library.descendants(matching: .any).matching(identifier: "Episode Inspector").firstMatch
    }

    private func firstEpisodePoint() throws -> XCUICoordinate {
        let list = episodeList
        try ready(episodeRows.firstMatch)
        let listFrame = list.frame
        var visibleTop = listFrame.minY
        for title in ["Episode", "Entry"] {
            let header = list.buttons[title].firstMatch
            if header.exists { visibleTop = max(visibleTop, header.frame.maxY) }
        }
        // When the list is partly scrolled, click the first row with an
        // exposed area below the sticky column headers.
        let point = episodeRows.allElementsBoundByIndex.lazy.compactMap { row -> XCUICoordinate? in
            let frame = row.frame
            let top = max(frame.minY, visibleTop)
            let bottom = min(frame.maxY, listFrame.maxY)
            guard bottom - top > 4 else { return nil }
            let y = ((top + bottom) / 2 - frame.minY) / frame.height
            return row.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: y))
        }.first
        return try XCTUnwrap(point, "No Episode row has an exposed area below the column headers")
    }

    private func selectFirstEpisode() throws {
        try firstEpisodePoint().click()
        try ready(button("Add to a Playlist"))
    }

    private func segment(_ name: String) throws {
        // macOS 27 exposes segmented pickers as radio groups.
        try click(playlistSection(name))
    }

    private var inspectorButton: XCUIElement {
        library.toolbars.buttons.matching(identifier: "library.inspector").firstMatch
    }
    private func hideInspector() throws {
        try ready(inspectorButton)
        if inspectorButton.label == "Hide Inspector" { try click(inspectorButton) }
        XCTAssertTrue(episodeInspector.waitForNonExistence(timeout: 5))
    }
    private func showSidebar() throws {
        app.typeKey("s", modifierFlags: [.command, .control])
        try ready(library.outlines["Sidebar"])
    }
    private func assertInspectorPosition(_ original: CGRect, file: StaticString = #filePath, line: UInt = #line) {
        let actual = inspectorButton.frame
        XCTAssertEqual(actual.minX, original.minX, accuracy: 1, "Selection moved the Inspector toggle", file: file, line: line)
        XCTAssertEqual(actual.minY, original.minY, accuracy: 1, file: file, line: line)
        let selectionActions = library.toolbars.buttons["Add to a Playlist"].firstMatch
        XCTAssertLessThan(selectionActions.frame.maxX, actual.minX, "Inspector must follow selection commands", file: file, line: line)
        let search = librarySearchField
        if search.exists && search.isHittable {
            XCTAssertLessThan(actual.maxX, search.frame.minX, "Inspector must precede Search", file: file, line: line)
        }
    }

    private var playlistPlayButton: XCUIElement { library.toolbars.buttons.matching(identifier: "toolbar.play").firstMatch }
    private func playlistSection(_ name: String) -> XCUIElement {
        library.toolbars.descendants(matching: .any).matching(NSPredicate(
            format: "(elementType == %d OR elementType == %d) AND label == %@",
            XCUIElement.ElementType.radioButton.rawValue, XCUIElement.ElementType.button.rawValue, name)).firstMatch
    }

    /// Sheet headings and button titles are matched case-insensitively by prefix, so title-case
    /// and trailing-ellipsis changes in the app don't break the tour.
    private func sheet(_ heading: String) throws {
        try ready(library.sheets.firstMatch)
        try ready(library.sheets.firstMatch.descendants(matching: .any).matching(NSPredicate(
            format: "label CONTAINS[c] %@ OR value CONTAINS[c] %@ OR title CONTAINS[c] %@", heading, heading, heading)).firstMatch)
        assertNoHistoryButtons(in: library.sheets.firstMatch)
    }

    private func assertNoHistoryButtons(in root: XCUIElement) {
        XCTAssertEqual(root.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ OR label BEGINSWITH %@", "Undo", "Redo")).count, 0,
                       "Sheets and auxiliary windows must show status and errors without app-wide history buttons")
    }

    /// Any element showing the text, whether SwiftUI exposes it as label, value or title.
    private func text(_ string: String, in root: XCUIElement? = nil) -> XCUIElement {
        (root ?? library).descendants(matching: .any).matching(NSPredicate(
            format: "label CONTAINS[c] %@ OR value CONTAINS[c] %@ OR title CONTAINS[c] %@", string, string, string)).firstMatch
    }

    private func button(_ title: String, in root: XCUIElement? = nil) -> XCUIElement {
        // Link-styled buttons are exposed as links.
        (root ?? library).descendants(matching: .any).matching(NSPredicate(
            format: "(elementType == %d OR elementType == %d) AND (label BEGINSWITH[c] %@ OR title BEGINSWITH[c] %@)",
            XCUIElement.ElementType.button.rawValue, XCUIElement.ElementType.link.rawValue, title, title)).firstMatch
    }

    private func dismissSheet(_ button: String) throws {
        try click(library.sheets.buttons[button])
        XCTAssertTrue(library.sheets.firstMatch.waitForNonExistence(timeout: 10))
    }

    private func reveal(_ element: XCUIElement, in scroll: XCUIElement, scrollDelta: Double = -180) throws {
        for _ in 0..<8 {
            // Glass action strips can report isHittable == false although the control is
            // visible; accept a control whose centre lies inside the scroll view.
            if element.exists, !element.frame.isEmpty, element.isHittable
                || scroll.frame.contains(CGPoint(x: element.frame.midX, y: element.frame.midY)) { return }
            scroll.scroll(byDeltaX: 0, deltaY: scrollDelta)
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
                          "Pointer or focus left the armed Unsubscribe control")
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

    private func menuCommand(_ menu: String, _ command: String, until result: XCUIElement? = nil,
                             requiringFocus: Bool = false, retryFocus: XCUIElement? = nil,
                             file: StaticString = #filePath, line: UInt = #line) throws {
        let menuItem = app.menuBars.menuBarItems[menu]
        let action = menuItem.menuItems.matching(NSPredicate(format: "title == %@ OR label == %@", command, command)).firstMatch
        try ready(menuItem, file: file, line: line)
        var clicked = false
        for attempt in 0..<3 {
            menuItem.click()
            if action.waitForExistence(timeout: 3), let snapshot = try? action.snapshot(), snapshot.isEnabled {
                let frame = snapshot.frame
                if !frame.isEmpty, frame.midX.isFinite, frame.midY.isFinite {
                    // SwiftUI commands share the menuAction: identifier. Use
                    // the visible snapshot to avoid XCTest's hover re-lookup.
                    let menuFrame = menuItem.frame
                    menuItem.coordinate(withNormalizedOffset: .zero)
                        .withOffset(CGVector(dx: frame.midX - menuFrame.minX, dy: frame.midY - menuFrame.minY))
                        .click()
                    clicked = true
                    guard let result else { return }
                    // Reopening an existing utility panel must give its field focus.
                    let reached = requiringFocus ? waitForKeyboardFocus(result) : result.waitForExistence(timeout: 5)
                    if reached { return }
                }
            }
            if attempt < 2 {
                if let retryFocus {
                    // Clicking inside a sheet closes the menu without sending Escape to the sheet.
                    retryFocus.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).click()
                } else { refocusLibraryAfterMenu() }
            }
        }
        if clicked, let result {
            var diagnostic = ""
            if menu == "Edit", let status = try? library.descendants(matching: .any)
                .matching(identifier: "library.status").firstMatch.snapshot() {
                let labels = descendants(status).compactMap { element -> String? in
                    guard element.elementType == .button || element.elementType == .staticText else { return nil }
                    return element.label.isEmpty ? element.value as? String : element.label
                }
                diagnostic = " Library status: " + labels.joined(separator: " | ")
            }
            XCTFail("\(menu) > \(command) did not \(requiringFocus ? "focus" : "show") \(result) after three attempts.\(diagnostic)",
                    file: file, line: line)
        } else {
            XCTFail("\(menu) > \(command) was unavailable after three attempts", file: file, line: line)
        }
    }

    private func refocusLibraryAfterMenu() {
        app.typeKey(.escape, modifierFlags: [])
        app.typeKey(.escape, modifierFlags: [])
        library.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0)).withOffset(CGVector(dx: 0, dy: 8)).click()
    }

    private func captureMenus() throws {
        var capturedMenus = Set<String>()
        var text = "XCUITest public snapshots expose elementType, not AXRole/AXSubrole.\n"
        text += "Keyboard shortcuts are not exposed by XCUIElementAttributes in Xcode 27.2.\n"
        text += "Standard alternative: inspect NSMenuItem.keyEquivalent and keyEquivalentModifierMask in Xcode's LLDB debugger, or read the visible menus.\n\n"
        // AppKit's first menu is Apple. Never open it or the Services submenu.
        for item in app.menuBars.menuBarItems.allElementsBoundByIndex.dropFirst() {
            guard !["Apple", "\u{f8ff}", "Services"].contains(item.title.isEmpty ? item.label : item.title) else { continue }
            item.click()
            let snapshot = try item.snapshot()
            capturedMenus.insert(snapshot.title.isEmpty ? snapshot.label : snapshot.title)
            assertMenuOrganization(snapshot)
            text += treeText(snapshot, menus: true) + "\n"
            app.typeKey(.escape, modifierFlags: [])
        }
        let expectedMenus: Set<String> = ["PodList", "File", "Edit", "View", "Podcast", "Saved Views", "Episode", "Playlist", "Controls", "Window", "Help"]
        XCTAssertTrue(expectedMenus.isSubset(of: capturedMenus), "Missing menus: \(expectedMenus.subtracting(capturedMenus))")
        attach(text, name: "menus.txt")
    }

    private func assertSettingsControlsNamed(in settings: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        let controls = settings.popUpButtons.allElementsBoundByIndex + settings.switches.allElementsBoundByIndex
            + settings.checkBoxes.allElementsBoundByIndex + settings.textFields.allElementsBoundByIndex
            + settings.sliders.allElementsBoundByIndex
        for control in controls {
            XCTAssertFalse(control.label.isEmpty && control.title.isEmpty,
                           "Every Settings pop-up, switch, checkbox, text field and slider needs an accessible name: \(control.elementType) \(control.identifier)",
                           file: file, line: line)
        }
    }

    private func assertSheetAtBothTextSizes(file: StaticString = #filePath, line: UInt = #line) throws {
        let sheet = library.sheets.firstMatch
        let width = sheet.frame.width
        // One accessibility snapshot per check; querying each field's frame separately
        // took most of the tour's time.
        func fields() throws -> [XCUIElementSnapshot] {
            var found: [XCUIElementSnapshot] = []
            func walk(_ node: XCUIElementSnapshot) {
                if [.textField, .popUpButton, .checkBox, .staticText].contains(node.elementType), !node.frame.isEmpty { found.append(node) }
                node.children.forEach(walk)
            }
            walk(try sheet.snapshot())
            return found
        }
        func assertHorizontalBounds() throws -> CGFloat {
            let snapshot = try fields()
            XCTAssertFalse(snapshot.isEmpty, file: file, line: line)
            for field in snapshot {
                XCTAssertGreaterThanOrEqual(field.frame.minX, sheet.frame.minX, "Clipped label or control: \(field.label)", file: file, line: line)
                XCTAssertLessThanOrEqual(field.frame.maxX, sheet.frame.maxX, "Clipped label or control: \(field.label)", file: file, line: line)
                if field.elementType != .staticText { XCTAssertFalse(field.label.isEmpty, "Every field needs an accessible name", file: file, line: line) }
            }
            return snapshot.filter { $0.elementType == .staticText }.map(\.frame.height).max() ?? 0
        }
        let textHeight = try assertHorizontalBounds()
        // View › Bigger is ⌘+ (menu path checked once in captureMenus); ten steps reach 200%.
        for _ in 0..<10 { app.typeKey("+", modifierFlags: .command) }
        XCTAssertEqual(sheet.frame.width, width, accuracy: 1, "Text Size must not widen the sheet", file: file, line: line)
        XCTAssertGreaterThan(try assertHorizontalBounds(), textHeight * 1.4, "⌘+ must enlarge sheet text", file: file, line: line)
        app.typeKey("0", modifierFlags: .command)
        XCTAssertEqual(sheet.frame.width, width, accuracy: 1, file: file, line: line)
    }

    private func assertSheetCheckboxSpace() throws {
        let checkbox = library.sheets.firstMatch.checkBoxes["Clear on Played"]
        try ready(checkbox)
        // Tab through the native key-view loop, without activating the checkbox
        // with a pointer. Keyboard navigation is enabled for this test app only.
        for _ in 0..<30 {
            if checkbox.value(forKey: "hasKeyboardFocus") as? Bool == true { break }
            app.typeKey(.tab, modifierFlags: [])
        }
        XCTAssertTrue(checkbox.value(forKey: "hasKeyboardFocus") as? Bool == true,
                      "Keyboard navigation must reach the sheet checkbox")
        // macOS reports a checkbox value as a number (0 or 1), not a string.
        let initial = String(describing: try XCTUnwrap(checkbox.value))
        XCTAssertFalse(library.buttons["Pause"].exists, "The current Episode must remain paused")
        app.typeKey(.space, modifierFlags: [])
        let toggled = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            checkbox.value.map { String(describing: $0) } != initial
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [toggled], timeout: 5), .completed,
                       "Space must toggle the focused checkbox")
        XCTAssertFalse(library.buttons["Pause"].exists, "Checkbox activation must not start playback")
        app.typeKey(.space, modifierFlags: [])
        let restored = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            checkbox.value.map { String(describing: $0) } == initial
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [restored], timeout: 5), .completed)
        XCTAssertFalse(library.buttons["Pause"].exists, "The tour must keep the Episode paused")
    }

    private func assertInspectorActionTargets(file: StaticString = #filePath, line: UInt = #line) throws {
        let inspector = episodeInspector
        try ready(inspector)
        // Unlabelled, disabled buttons are the scroll view's own scroller parts.
        let buttons = inspector.buttons.allElementsBoundByIndex.filter { !$0.label.isEmpty }
        XCTAssertFalse(buttons.isEmpty, "Inspector actions must be exposed", file: file, line: line)
        for button in buttons {
            XCTAssertGreaterThanOrEqual(button.frame.width, 20, "\(button.label) is too narrow", file: file, line: line)
            XCTAssertGreaterThanOrEqual(button.frame.height, 20, "\(button.label) is too short", file: file, line: line)
        }
    }

    private func assertKeyboardFocus(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(waitForKeyboardFocus(element),
                      "The search field must receive keyboard focus when Add Podcasts opens", file: file, line: line)
    }

    private func waitForKeyboardFocus(_ element: XCUIElement) -> Bool {
        let focused = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            element.exists && element.value(forKey: "hasKeyboardFocus") as? Bool == true
        }, object: nil)
        return XCTWaiter.wait(for: [focused], timeout: 5) == .completed
    }

    private func assertMenuOrganization(_ menu: any XCUIElementSnapshot) {
        let name = menu.title.isEmpty ? menu.label : menu.title
        func titles(_ node: any XCUIElementSnapshot) -> [String] {
            guard !["Apple", "\u{f8ff}", "Services"].contains(node.title) else { return [] }
            let own = node.elementType == .menuItem ? [node.title.isEmpty ? node.label : node.title] : []
            return own + node.children.flatMap { titles($0) }
        }
        let items = Set(titles(menu))
        let removed: Set<String> = [
            "Current Dialog", "OPML Import", "Done", "Cancel", "Save", "Cancel Rename",
            "Create Playlist", "Create View", "Play Next", "Play Last", "Delete Permanently", "Apply", "Rewind", "Bring Over", "Not Now", "Go",
            "Import", "Choose a File…", "Hide Getting Started", "Resume Playback", "Pause Playback",
            "Show Notes in Window", "Show in Window", "Show Notes"
        ]
        XCTAssertTrue(items.isDisjoint(with: removed), "\(name) includes a sheet button or transient helper: \(items.intersection(removed))")
        let required: [String: Set<String>] = [
            "PodList": ["Settings…", "Connection", "Check and Connect", "Start on This Mac", "Disconnect", "Bring Library from This Mac…", "Retry Bring Over", "Automation", "Copy Configuration", "Retry MCP Server"],
            "File": ["New Window", "New View…", "New Playlist…", "Open in New Window", "Add Podcasts…", "Import OPML…", "Export OPML…", "Cancel Import", "Retry Failed Imports", "Show Import Results"],
            "Edit": ["Search Library", "Clear Search", "Retry Failed Operation"],
            "View": ["Sort By", "Default Order", "Descending", "Listening Stats", "Show Daily Table"],
            "Podcast": ["Show Subscriptions", "Refresh All Feeds", "Refresh Podcast", "Retry Feed Refresh", "Back to Library", "Search Podcasts", "Mark All Played", "Subscription Settings…", "Edit Download Rules…"],
            "Saved Views": ["Open View", "Show All Views", "Create View from Search…", "Edit View…", "Rename View…", "Delete View"],
            "Episode": ["Show Episode Details", "Play Now", "Play Now In", "Play Next In", "Play Last In", "Add to a Playlist…", "Download", "Cancel Download", "Retry Download", "Remove Download", "Move Up", "Move Down", "Remove from Playlist", "Retry Failed Episode Drop", "Remove Failed Episode Drops"],
            "Playlist": ["Show Trash", "Open Playlist", "Entries", "History", "Listening Timeline", "Clear on Played", "Restore", "Delete Permanently…", "Rewind to Here…", "Rename Playlist…", "Delete Playlist"],
            "Controls": ["Go to Time…", "Back to Now Playing", "Playback Speed", "Sleep Timer", "Go to Chapter", "Retry Playback"],
            "Window": ["Now Playing", "Listening Stats"],
            "Help": ["PodList Help", "Getting Started"]
        ]
        XCTAssertTrue(required[name, default: []].isSubset(of: items), "\(name) is missing persistent commands: \(required[name, default: []].subtracting(items))")
        if name == "PodList" {
            let configurationItems = titles(menu).filter { ["Settings…", "Connection", "Automation"].contains($0) }
            XCTAssertEqual(configurationItems, ["Settings…", "Connection", "Automation"])
        }
        if ["Playlist", "Podcast", "Saved Views"].contains(name) {
            XCTAssertTrue(items.isDisjoint(with: ["Trash", "Subscriptions", "All Views"]), "Navigation commands need Show verbs")
        }
        if name == "Podcast" {
            XCTAssertTrue(!items.isDisjoint(with: ["Subscribe", "Unsubscribe"]))
        }
        if name == "Controls" {
            XCTAssertEqual(titles(menu).filter { ["Play", "Pause"].contains($0) }.count, 1,
                           "Controls must offer one state-dependent Play/Pause command")
        }
        if name == "View" {
            XCTAssertTrue(!items.isDisjoint(with: ["Show Description", "Hide Description"]))
        }
        let owners = ["Connection": "PodList", "Refresh All Feeds": "Podcast", "Refresh Podcast": "Podcast", "Retry Feed Refresh": "Podcast", "Add Podcasts…": "File",
                      "Back to Library": "Podcast", "Clear Search": "Edit", "Show Import Results": "File",
                      "Cancel Import": "File", "Retry Failed Imports": "File", "Retry Failed Operation": "Edit", "Retry Failed Episode Drop": "Episode",
                      "Retry Bring Over": "PodList", "Copy Configuration": "PodList", "Retry MCP Server": "PodList", "Retry Playback": "Controls",
                      "Show Description": "View", "Hide Description": "View", "Show Daily Table": "View"]
        for (command, owner) in owners where name != owner {
            XCTAssertFalse(items.contains(command), "\(command) belongs in \(owner), not \(name)")
        }
    }
}
