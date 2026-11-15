import Foundation
import Testing
import PodListDomain
import PodListData
@testable import PodListUI

@Test func donationPolicyDisablesEitherTourSignalIncludingAnEmptyDirectoryVariable() {
    #expect(ActionDonations.isEnabled(bundleIdentifier: "app.podlist.mac", environment: [:]))
    #expect(ActionDonations.isEnabled(bundleIdentifier: nil, environment: [:]))
    #expect(!ActionDonations.isEnabled(bundleIdentifier: "app.podlist.uitour.capture", environment: [:]))
    #expect(!ActionDonations.isEnabled(bundleIdentifier: "app.podlist.mac", environment: ["PODLIST_UI_DATA_DIRECTORY": "/tmp/tour"]))
    #expect(!ActionDonations.isEnabled(bundleIdentifier: nil, environment: ["PODLIST_UI_DATA_DIRECTORY": ""]))
}

@MainActor @Test func tourDonationGateDoesNotCallItsHandler() {
    for (bundle, env): (String?, [String: String]) in [
        ("app.podlist.uitour.test", [:]),
        ("app.podlist.mac", ["PODLIST_UI_DATA_DIRECTORY": ""]),
        ("app.podlist.mac", [:])
    ] {
        let donations = ActionDonations(bundleIdentifier: bundle, environment: env)
        var received: [ActionDonation] = []
        donations.handler = { received.append($0) }
        donations.record(.play)
        #expect(received == (env.isEmpty && bundle == "app.podlist.mac" ? [.play] : []))
    }
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
    let app = ApplicationModel(store: MemoryConnectionStore(), automaticSync: false, databaseFactory: { _ in db })
    defer { app.disconnect() }
    var received: [ActionDonation] = []
    app.donations.handler = { received.append($0) }
    await app.startStandalone()
    _ = try await app.actions.perform("add_episodes", arguments: ["episode_ids": ["b"], "placement": "last"])
    _ = try await app.actions.perform("set_starred", arguments: ["episode_ids": ["a"], "starred": true])
    _ = try await app.actions.perform("set_played", arguments: ["episode_ids": ["b"], "played": true])
    #expect(received == [.add(["b"], playlist: "default", placement: .last), .star(["a"], starred: true), .markPlayed(["b"], played: true)])
}
