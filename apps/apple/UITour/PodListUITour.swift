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
                               "-PodList.mcpEnabled", "NO", "-PodList.uiTestUnsubscribeArmSeconds", "15", "-PodList.inspectorVisible", "YES",
                               "-AppleKeyboardUIMode", "3",
                               "-ApplePersistenceIgnoreState", "YES"]
        defer {
            app.terminate()
        }
        app.launch()
        try ready(library)
        try ready(library.buttons["Open Market Hours, Subscription"])
        try ready(library.buttons["Open Now Playing"])
        let sidebar = library.outlines["Sidebar"]
        try ready(sidebar)
        XCTAssertGreaterThanOrEqual(sidebar.frame.width, 180, "The first-launch sidebar must respect its minimum width")
        XCTAssertFalse(library.buttons["Pause"].exists, "The restored player must be paused")
        try capture("01-subscriptions")

        try navigate("New this week")
        try ready(library.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Episodes, sortable columns")).firstMatch)
        let leadingTitleX = library.staticTexts["New this week"].firstMatch.frame.minX
        XCTAssertFalse(library.toolbars.buttons["New View…"].exists)
        try capture("02-new-this-week")
        try selectFirstEpisode()
        try capture("03-episode-inspector")
        try assertInspectorActionTargets()
        // After the baseline captures; the next navigation clears this selection.
        app.typeText("jo")
        let joinery = episodeRows.containing(.staticText, identifier: "Joinery without screws").firstMatch
        try ready(joinery)
        XCTAssertTrue(joinery.isSelected, "Type-select must select the Episode by title")
        XCTAssertTrue(library.frame.contains(joinery.frame), "Type-select must reveal the match")
        let inspector = library.descendants(matching: .any).matching(identifier: "Episode Inspector").firstMatch
        try ready(text("Joinery without screws", in: inspector))
        try navigate("Starred")
        try capture("04-starred")
        try navigate("All Views")
        try ready(library.descendants(matching: .any).matching(identifier: "views.list").firstMatch)
        try capture("05-all-views")

        try navigate("Default")
        try ready(episodeList)
        XCTAssertEqual(library.staticTexts["Default"].firstMatch.frame.minX, leadingTitleX, accuracy: 1,
                       "The Playlist title must retain the library's leading title position")
        try capture("06-default-playlist")
        let unselectedSection = playlistSection("Entries").frame
        let unselectedPlay = playlistPlayButton.frame
        XCTAssertEqual(playlistPlayButton.label, "Play This Playlist")
        XCTAssertFalse(library.toolbars.buttons["New Playlist…"].exists)
        try ready(inspectorButton)
        let unselectedInspector = inspectorButton.frame
        try selectFirstEpisode()
        XCTAssertNotEqual(playlistPlayButton.label, "Play This Playlist", "The same Play control now targets the selection")
        assertInspectorPosition(unselectedInspector)
        assertPlaylistHeader(play: unselectedPlay, section: unselectedSection)
        try capture("07-entry-inspector")
        try assertInspectorActionTargets()
        // The section switcher and Playlist action belong to the window toolbar.
        let defaultHeader = playlistPlayButton.frame
        let defaultSection = playlistSection("Entries").frame
        try segment("History")
        try capture("08-history")
        assertPlaylistHeader(play: defaultHeader, section: defaultSection)
        assertInspectorPosition(unselectedInspector)
        let historyDescription = text("Manual Played marks do not create History")
        try ready(historyDescription)
        XCTAssertLessThanOrEqual(historyDescription.frame.maxY, library.buttons["Open Now Playing"].frame.minY - 22,
                                 "History must fit above the player at the default window size")
        try segment("Listening Timeline")
        try ready(library.descendants(matching: .any).matching(identifier: "Listening Timeline").firstMatch)
        try capture("09-listening-timeline")
        assertPlaylistHeader(play: defaultHeader, section: defaultSection)
        assertInspectorPosition(unselectedInspector)
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
        let commuteHeader = playlistPlayButton.frame
        let commuteSection = playlistSection("Entries").frame
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
        assertPlaylistHeader(play: commuteHeader, section: commuteSection)
        XCTAssertEqual(episodeList.buttons["Entry"].firstMatch.frame.minY, entryColumn.minY, accuracy: 1)
        // Use the documented File command to create a Playlist.
        app.typeKey("n", modifierFlags: [.command, .shift])
        try sheet("New Playlist")
        XCTAssertFalse(library.sheets.staticTexts["Enter a Playlist name."].exists)
        try capture("13-new-playlist", expectsSheet: true)
        try dismissSheet("Cancel")
        assertPlaylistHeader(play: commuteHeader, section: commuteSection)
        XCTAssertEqual(episodeList.buttons["Entry"].firstMatch.frame.minY, entryColumn.minY, accuracy: 1)

        try navigate("Trash")
        try ready(text("Trash is empty"))
        try capture("14-trash")
        try navigate("Search")
        // Only an on-screen field: a toolbar can also hold an off-screen overflow copy.
        try ready(library.searchFields.firstMatch)
        let search = try XCTUnwrap(library.searchFields.allElementsBoundByIndex.first {
            $0.frame.origin.x.isFinite && $0.frame.width > 0 && $0.isHittable
        }, "No on-screen search field")
        search.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).click()
        app.typeText("rice")
        try ready(text("Who sets the price of rice?", in: episodeList))
        try capture("15-search-rice")
        app.typeKey("a", modifierFlags: .command)
        app.typeKey(.delete, modifierFlags: [])

        try navigate("New this week")
        let viewHeader = episodeList.buttons["Episode"].firstMatch.frame
        try click(button("Edit View"))
        try sheet("Edit View")
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
        for label in ["Mentions (Optional)", "Minimum length (Optional)", "Maximum length (Optional)", "Episodes to Show (Optional)"] {
            XCTAssertTrue(library.sheets.staticTexts[label].exists)
        }
        try capture("17-new-view", expectsSheet: true)
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
        try capture("18-podcast-market-hours")
        let collapsedDescription = library.staticTexts.matching(identifier: "podcast.description").firstMatch.frame
        try click(button("Show description"))
        try ready(button("Show less"))
        let description = library.staticTexts.matching(identifier: "podcast.description").firstMatch
        XCTAssertGreaterThan(description.frame.height, collapsedDescription.height)
        XCTAssertTrue(((description.value as? String) ?? description.label).hasSuffix("Thanks for listening to Market Hours."), "Expansion must retain the complete description")
        try assertPodcastWindowBounds()
        try capture("19-description-expanded")
        // The expanded header can scroll; collapse it before testing the fixed action frames.
        let showLess = button("Show less")
        if let header = library.scrollViews.allElementsBoundByIndex.first(where: { $0.frame.contains(showLess.frame) || $0.staticTexts.matching(identifier: "podcast.description").firstMatch.exists }) {
            try reveal(showLess, in: header)
        }
        try click(showLess)
        try ready(button("Show description"))
        let subscriptionFrame = library.buttons["Subscribed"].frame
        let shareFrame = library.buttons["Share Podcast"].frame
        try click(library.buttons["Subscribed"])
        let armedAt = Date()
        // Never click Unsubscribe. The arm (held for 15 s in tour builds, 4 s otherwise)
        // expires naturally.
        try ready(library.buttons["Unsubscribe"], timeout: 3)
        XCTAssertEqual(library.buttons["Unsubscribe"].frame, subscriptionFrame)
        XCTAssertEqual(library.buttons["Share Podcast"].frame, shareFrame)
        try capture("20-unsubscribe-armed")
        let remaining = 17 - Date().timeIntervalSince(armedAt)
        if remaining > 0 { Thread.sleep(forTimeInterval: remaining) }
        try ready(library.buttons["Subscribed"])
        XCTAssertFalse(library.buttons["Unsubscribe"].exists)
        XCTAssertEqual(library.buttons["Subscribed"].frame, subscriptionFrame)
        XCTAssertEqual(library.buttons["Share Podcast"].frame, shareFrame)
        try assertPodcastWindowBounds()
        try capture("21-unsubscribe-disarmed")
        try click(button("Subscription settings"))
        try sheet("Market Hours settings")
        try capture("22-subscription-settings", expectsSheet: true)
        library.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(library.sheets.firstMatch.waitForNonExistence(timeout: 10))
        try click(button("Subscription Settings"))
        try sheet("Market Hours settings")
        library.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(library.sheets.firstMatch.waitForNonExistence(timeout: 10))

        try navigate("New this week")
        let add = episodeList.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Add ' AND label ENDSWITH ' to a Playlist'")).firstMatch
        try click(add)
        try sheet("to a Playlist")
        try capture("23-add-to-playlist", expectsSheet: true)
        try dismissSheet("Cancel")
        try navigate("Subscriptions")
        app.typeKey("a", modifierFlags: [.command, .shift])
        let addPodcasts = app.windows.matching(NSPredicate(format: "title == %@", "Add Podcasts")).firstMatch
        try ready(addPodcasts)
        XCTAssertFalse(library.sheets.firstMatch.exists)
        let podcastQuery = addPodcasts.textFields["addPodcasts.query"]
        assertKeyboardFocus(podcastQuery)
        try capture("24-add-podcasts", in: addPodcasts)
        podcastQuery.typeText("PodList tour draft")
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
        try menuCommand("File", "Add Podcasts…")
        XCTAssertEqual(app.windows.matching(NSPredicate(format: "title == %@", "Add Podcasts")).count, 1)
        assertKeyboardFocus(podcastQuery)
        addPodcasts.typeKey("w", modifierFlags: .command)
        XCTAssertTrue(addPodcasts.waitForNonExistence(timeout: 10))
        app.typeKey("a", modifierFlags: [.command, .shift])
        try ready(addPodcasts)
        XCTAssertEqual(podcastQuery.value as? String, "PodList tour draft")
        assertKeyboardFocus(podcastQuery)
        podcastQuery.typeKey("a", modifierFlags: .command)
        podcastQuery.typeKey(.delete, modifierFlags: [])
        try click(addPodcasts.buttons["Close"])
        XCTAssertTrue(addPodcasts.waitForNonExistence(timeout: 10))
        try navigate("Subscriptions")
        // The bulk editor needs a selection: select every Subscription first.
        try click(library.descendants(matching: .any).matching(identifier: "subscriptions.list").firstMatch)
        app.typeKey("a", modifierFlags: .command)
        try click(library.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Edit Download Rules for'")).firstMatch)
        try ready(library.sheets.firstMatch)
        try capture("25-download-rules", expectsSheet: true)
        try dismissSheet("Cancel")
        try navigate("Default")
        try click(library.buttons["Open Now Playing"])
        let nowPlaying = app.windows.matching(NSPredicate(format: "title == %@", "Now Playing")).firstMatch
        try ready(nowPlaying)
        XCTAssertFalse(library.sheets.firstMatch.exists)
        for name in ["Play", "Episode Details", "Open Active Playlist"] {
            let control = nowPlaying.buttons[name]
            try ready(control)
            XCTAssertTrue(nowPlaying.frame.contains(control.frame), "Main playback controls must fit without scrolling")
            XCTAssertLessThanOrEqual(control.frame.maxY, nowPlaying.buttons["Close"].frame.minY)
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
        XCTAssertLessThanOrEqual(details.frame.maxY, nowPlaying.buttons["Close"].frame.minY)
        try click(details)
        let addFromDetails = button("Add to a Playlist", in: nowPlaying)
        try reveal(addFromDetails, in: playerScroll)
        addFromDetails.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).click()
        try sheet("to a Playlist")
        XCTAssertFalse(nowPlaying.sheets.firstMatch.exists, "Playlist edits must present on Library")
        try dismissSheet("Cancel")
        try click(library.buttons["Open Now Playing"])
        let done = nowPlaying.buttons["Close"]
        // XCUITest can resolve Close to an off-screen frame (inf, inf) and then hang on the
        // click; close the window with its standard command in that case.
        if done.waitForExistence(timeout: 5), done.frame.origin.x.isFinite, done.frame.width > 0 {
            done.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).click()
        } else {
            nowPlaying.typeKey("w", modifierFlags: .command)
        }
        XCTAssertTrue(nowPlaying.waitForNonExistence(timeout: 10))

        app.typeKey(",", modifierFlags: .command)
        let settings = app.windows.containing(.any, identifier: "General").firstMatch
        try ready(settings)
        try click(settings.descendants(matching: .any).matching(identifier: "General").firstMatch)
        try ready(text("Speed", in: settings))
        try capture("27-settings-general-top", in: settings)
        // Settings sizes to its content; scroll only if the pane still scrolls.
        let form = settings.scrollViews.firstMatch
        if form.exists { form.hover(); form.scroll(byDeltaX: 0, deltaY: -280) }
        try capture("28-settings-general-middle", in: settings)
        if form.exists { form.scroll(byDeltaX: 0, deltaY: -1800) }
        try ready(button("Disconnect", in: settings))
        try capture("29-settings-general-bottom", in: settings)
        try click(settings.descendants(matching: .any).matching(identifier: "Automation").firstMatch)
        let mcp = settings.descendants(matching: .any).matching(NSPredicate(format: "label == %@ OR title == %@", "Enable MCP Server", "Enable MCP Server")).firstMatch
        try ready(mcp)
        XCTAssertEqual(String(describing: mcp.value ?? ""), "0", "MCP must remain off")
        for control in settings.switches.allElementsBoundByIndex + settings.checkBoxes.allElementsBoundByIndex {
            XCTAssertFalse(control.label.isEmpty && control.title.isEmpty, "Every Settings switch and checkbox needs an accessible name")
        }
        try capture("30-settings-automation", in: settings)
        settings.typeKey("w", modifierFlags: .command)
        try ready(library)

        try menuCommand("Window", "Listening Stats")
        let stats = app.windows.matching(NSPredicate(format: "title == %@", "Listening Stats")).firstMatch
        try ready(stats)
        try capture("31-listening-stats", in: stats)
        stats.typeKey("w", modifierFlags: .command)
        app.typeKey(",", modifierFlags: .command)
        try ready(settings)
        try click(settings.descendants(matching: .any).matching(identifier: "General").firstMatch)
        let generalForm = settings.scrollViews.firstMatch
        if generalForm.exists {
            generalForm.hover()
            // Return from the bottom far enough to reveal the Library section.
            generalForm.scroll(byDeltaX: 0, deltaY: 1800)
            try reveal(button("Getting started", in: settings), in: generalForm)
        }
        try click(button("Getting started", in: settings))
        try ready(settings.sheets.firstMatch)
        XCTAssertTrue(settings.sheets.buttons["Hide Getting Started"].exists)
        try capture("32-getting-started", in: settings, expectsSheet: true)
        settings.typeKey(.escape, modifierFlags: [])
        XCTAssertTrue(settings.sheets.firstMatch.waitForNonExistence(timeout: 10))
        try click(button("Getting started", in: settings))
        try ready(settings.sheets.firstMatch)
        settings.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(settings.sheets.firstMatch.waitForNonExistence(timeout: 10))
        settings.typeKey("w", modifierFlags: .command)

        try navigate("New this week")
        try selectFirstEpisode()
        episodeList.typeKey("a", modifierFlags: .command)
        XCTAssertGreaterThan(episodeRows.matching(NSPredicate(format: "selected == true")).count, 1)
        try ready(button("Add to a Playlist"))
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

    private func assertPodcastWindowBounds(file: StaticString = #filePath, line: UInt = #line) throws {
        let firstHeader = library.outlines["Sidebar"].staticTexts["Views"]
        let play = library.buttons["Play"]
        for control in [firstHeader, play] {
            try ready(control, file: file, line: line)
            XCTAssertFalse(control.frame.isEmpty, "Control must have a visible frame", file: file, line: line)
            XCTAssertTrue(library.frame.contains(control.frame), "Podcast page pushed \(control) outside the window", file: file, line: line)
        }
    }

    private func assertPlaylistHeader(play: CGRect, section: CGRect,
                                      file: StaticString = #filePath, line: UInt = #line) {
        let actualPlay = playlistPlayButton.frame
        let actualSection = playlistSection("Entries").frame
        let toolbar = library.toolbars.firstMatch
        XCTAssertTrue(toolbar.frame.contains(actualSection), "The section switcher must be in the toolbar", file: file, line: line)
        XCTAssertTrue(toolbar.frame.contains(actualPlay), "The Playlist action must be in the toolbar", file: file, line: line)
        XCTAssertGreaterThan(actualPlay.minX, actualSection.maxX, "Play belongs in trailing actions, outside the switcher", file: file, line: line)
        // Principal placement must preserve X when sections or selection actions change.
        XCTAssertEqual(actualPlay.width, play.width, accuracy: 1, "Playlist action changed form", file: file, line: line)
        XCTAssertEqual(actualPlay.minY, play.minY, accuracy: 1, "Playlist action moved", file: file, line: line)
        XCTAssertEqual(actualPlay.minX, play.minX, accuracy: 1, "Playlist action moved horizontally", file: file, line: line)
        XCTAssertEqual(actualSection.minX, section.minX, accuracy: 1, "Section control moved horizontally", file: file, line: line)
        XCTAssertEqual(actualSection.minY, section.minY, accuracy: 1, "Section control moved", file: file, line: line)
        XCTAssertLessThan(abs(actualPlay.midY - actualSection.midY), 8, "Controls must share a row", file: file, line: line)
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
        try ready(button("Add to a Playlist"))
    }

    private func segment(_ name: String) throws {
        // macOS 27 exposes segmented pickers as radio groups.
        try click(playlistSection(name))
    }

    private var inspectorButton: XCUIElement {
        library.toolbars.buttons.matching(identifier: "library.inspector").firstMatch
    }
    private func assertInspectorPosition(_ original: CGRect, file: StaticString = #filePath, line: UInt = #line) {
        let actual = inspectorButton.frame
        XCTAssertEqual(actual.minX, original.minX, accuracy: 1, "Selection moved the Inspector toggle", file: file, line: line)
        XCTAssertEqual(actual.minY, original.minY, accuracy: 1, file: file, line: line)
        let selectionActions = library.toolbars.buttons["Add to a Playlist"].firstMatch
        XCTAssertLessThan(selectionActions.frame.maxX, actual.minX, "Inspector must follow selection commands", file: file, line: line)
        if let search = library.searchFields.allElementsBoundByIndex.first(where: { $0.isHittable }) {
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

    private func reveal(_ element: XCUIElement, in scroll: XCUIElement) throws {
        for _ in 0..<8 {
            // Glass action strips can report isHittable == false although the control is
            // visible; accept a control whose centre lies inside the scroll view.
            if element.exists, !element.frame.isEmpty, element.isHittable
                || scroll.frame.contains(CGPoint(x: element.frame.midX, y: element.frame.midY)) { return }
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
                          "Capture outlasted the armed state; raise -PodList.uiTestUnsubscribeArmSeconds")
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
        try click(app.menuBars.menuBarItems[menu].menuItems[command].firstMatch)
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
        let expectedMenus: Set<String> = ["PodList", "File", "Edit", "View", "Podcast", "Views", "Episode", "Playlist", "Controls", "Window", "Help"]
        XCTAssertTrue(expectedMenus.isSubset(of: capturedMenus), "Missing menus: \(expectedMenus.subtracting(capturedMenus))")
        attach(text, name: "menus.txt")
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
        let inspector = library.descendants(matching: .any).matching(identifier: "Episode Inspector").firstMatch
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
        let focused = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            element.value(forKey: "hasKeyboardFocus") as? Bool == true
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [focused], timeout: 5), .completed,
                       "The search field must receive keyboard focus when Add Podcasts opens", file: file, line: line)
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
            "Import", "Choose a File…", "Hide Getting Started"
        ]
        XCTAssertTrue(items.isDisjoint(with: removed), "\(name) includes a sheet button or transient helper: \(items.intersection(removed))")
        let required: [String: Set<String>] = [
            "PodList": ["Settings…", "Connection", "Check and Connect", "Start on This Mac", "Disconnect", "Bring Library from This Mac…", "Retry Bring Over", "Automation", "Copy Configuration", "Retry MCP Server"],
            "File": ["New Window", "New View…", "New Playlist…", "Open in New Window", "Add Podcasts…", "Import OPML…", "Export OPML…", "Cancel Import", "Retry Failed Imports", "Show Import Results"],
            "Edit": ["Search Library", "Clear Search", "Retry Failed Operation"],
            "View": ["Sort by", "Default Order", "Descending", "Listening Stats", "Show Daily Table"],
            "Podcast": ["Refresh Library", "Back to Library", "Search Podcasts", "Mark All Played", "Subscription Settings…", "Edit Download Rules…"],
            "Views": ["Open View", "All Views", "Create View from Search…", "Edit View…", "Rename View…", "Delete View"],
            "Episode": ["Show Episode Details", "Play Now", "Add to a Playlist…", "Download", "Cancel Download", "Retry Download", "Remove Download", "Move Up", "Move Down", "Remove from Playlist", "Retry Failed Episode Drop", "Remove Failed Episode Drops"],
            "Playlist": ["Open Playlist", "Entries", "History", "Listening Timeline", "Clear on Played", "Restore", "Delete Permanently…", "Rewind to Here…", "Rename Playlist…", "Delete Playlist"],
            "Controls": ["Go to Time…", "Back to Now Playing", "Playback Speed", "Sleep Timer", "Go to Chapter", "Retry Playback"],
            "Window": ["Now Playing", "Listening Stats"],
            "Help": ["PodList Help", "Getting Started"]
        ]
        XCTAssertTrue(required[name, default: []].isSubset(of: items), "\(name) is missing persistent commands: \(required[name, default: []].subtracting(items))")
        if name == "PodList" {
            let configurationItems = titles(menu).filter { ["Settings…", "Connection", "Automation"].contains($0) }
            XCTAssertEqual(configurationItems, ["Settings…", "Connection", "Automation"])
        }
        if name == "Podcast" {
            XCTAssertTrue(!items.isDisjoint(with: ["Subscribe", "Unsubscribe"]))
        }
        if name == "View" {
            XCTAssertTrue(!items.isDisjoint(with: ["Show Description", "Hide Description"]))
        }
        let owners = ["Connection": "PodList", "Refresh Library": "Podcast", "Add Podcasts…": "File",
                      "Back to Library": "Podcast", "Clear Search": "Edit", "Show Import Results": "File",
                      "Cancel Import": "File", "Retry Failed Imports": "File", "Retry Failed Operation": "Edit", "Retry Failed Episode Drop": "Episode",
                      "Retry Bring Over": "PodList", "Copy Configuration": "PodList", "Retry MCP Server": "PodList", "Retry Playback": "Controls",
                      "Show Description": "View", "Hide Description": "View", "Show Daily Table": "View"]
        for (command, owner) in owners where name != owner {
            XCTAssertFalse(items.contains(command), "\(command) belongs in \(owner), not \(name)")
        }
    }
}
