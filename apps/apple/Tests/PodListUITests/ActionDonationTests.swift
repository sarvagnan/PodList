import Foundation
import Testing
import PodListDomain
import PodListData
@testable import PodListUI

@Test func donationPolicyRequiresReleaseAndNeitherTourSignal() {
    for release in [false, true] {
        for bundle: String? in [nil, "app.podlist.mac", "app.podlist.uitour.capture"] {
            for directory: String? in [nil, "", "/tmp/tour"] {
                let environment = directory.map { ["PODLIST_UI_DATA_DIRECTORY": $0] } ?? [:]
                let expected = release && bundle != "app.podlist.uitour.capture" && directory == nil
                #expect(ActionDonations.isEnabled(bundleIdentifier: bundle, environment: environment,
                                                  isReleaseBuild: release) == expected)
            }
        }
    }
}

@MainActor @Test func donationGateOnlyCallsItsHandlerForEligibleReleaseBuilds() {
    for release in [false, true] {
        for bundle: String? in [nil, "app.podlist.mac", "app.podlist.uitour.test"] {
            for directory: String? in [nil, "", "/tmp/tour"] {
                let environment = directory.map { ["PODLIST_UI_DATA_DIRECTORY": $0] } ?? [:]
                let donations = ActionDonations(bundleIdentifier: bundle, environment: environment, isReleaseBuild: release)
                var received: [ActionDonation] = []
                donations.handler = { received.append($0) }
                donations.record(.play)
                let expected = release && bundle != "app.podlist.uitour.test" && directory == nil
                #expect(donations.isEnabled == expected)
                #expect(received == (expected ? [.play] : []))
            }
        }
    }
}

@MainActor @Test func donationPolicyDefaultsToTheCompiledBuildConfiguration() {
    #if DEBUG
    let expected = false
    #else
    let expected = true
    #endif
    #expect(ActionDonations.isReleaseBuild == expected)
    #expect(ActionDonations.isEnabled(bundleIdentifier: "app.podlist.mac", environment: [:]) == expected)
    let donations = ActionDonations(bundleIdentifier: "app.podlist.mac", environment: [:])
    var received: [ActionDonation] = []
    donations.handler = { received.append($0) }
    donations.record(.play)
    #expect(received == (expected ? [.play] : []))
}

@MainActor @Test func sharedEditingPathsDonateOnceAndUndoRedoDoNotDonate() async throws {
    let db = try await fixtureDatabase()
    var received: [ActionDonation] = []
    let defaults = UserDefaults(suiteName: UUID().uuidString)!
    let editor = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "donation", defaults: defaults), donate: { received.append($0) })
    _ = await editor.add(["a", "b"], placement: .next)
    #expect(received == [.add(["a", "b"], playlist: "default", placement: .next)])
    await editor.reverse(); await editor.reverse(redo: true)
    #expect(received.count == 1)
    _ = await editor.setStar(["a"], starred: true)
    _ = await editor.markPlayed(["b"], played: true)
    _ = await editor.add(["a"], placement: .now)
    _ = await editor.playFromHere(playlistID: "default", episodeID: "a")
    #expect(received == [.add(["a", "b"], playlist: "default", placement: .next), .star(["a"], starred: true),
                         .markPlayed(["b"], played: true), .playEpisode("a", playlist: "default"), .playInPlaylist("a", playlist: "default")])
    let count = received.count
    #expect(await editor.add(["a"], to: "missing", placement: .last) == nil)
    #expect(received.count == count)
    let target = try #require(await editor.add(["a"], newName: "Donated Playlist", placement: .last))
    #expect(received.last == .add(["a"], playlist: target, placement: .last))
}

@MainActor @Test func automationUsesSharedDonationPathWithoutDuplicatingActions() async throws {
    let db = try await fixtureDatabase()
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db },
                               donations: ActionDonations(bundleIdentifier: "app.podlist.mac", environment: [:], isReleaseBuild: true))
    defer { app.disconnect() }
    var received: [ActionDonation] = []
    app.donations.handler = { received.append($0) }
    await app.startStandalone()
    _ = try await app.actions.perform("add_episodes", arguments: ["episode_ids": ["b"], "placement": "last"])
    _ = try await app.actions.perform("set_starred", arguments: ["episode_ids": ["a"], "starred": true])
    _ = try await app.actions.perform("set_played", arguments: ["episode_ids": ["b"], "played": true])
    #expect(received == [.add(["b"], playlist: "default", placement: .last), .star(["a"], starred: true), .markPlayed(["b"], played: true)])
}
