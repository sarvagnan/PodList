import Foundation
import Testing
import PodListDomain

private func applying(_ state: State, _ changes: [Change], at: Int64 = 100) -> State {
    changes.reduce(state) { StateRules.apply($0, change: $1, at: at) }
}
private func editState() -> State {
    var state = State.initial()
    state.playlists[0].clearOnPlayed = false
    state.playlists[0].entries = ["a", "b", "c", "d"].enumerated().map { Entry(episodeId: $0.element, position: Double($0.offset * 10), positionAt: 0) }
    state.playlists[0].cursor = "b"
    return state
}

@Test func historyGroupsTypingAndInvalidatesRedoOnlyForNewEdits() {
    var history = EditHistory<String>()
    history.record("first", typingGroup: "name")
    history.record("second", typingGroup: "name")
    #expect(history.undo == "first")
    history.endTyping(); history.record("third", typingGroup: "name")
    #expect(history.undo == "third")
    history.completeReverse(with: "redo third")
    #expect(history.undo == "first" && history.redo == "redo third")
    history.completeReverse(with: "third", redo: true)
    #expect(history.undo == "third" && history.redo == nil)
    history.completeReverse(with: "redo third"); history.record("new")
    #expect(history.redo == nil)
    history.clear(); #expect(history.undo == nil && history.redo == nil)
}

@Test func batchAddPreservesDisplayedOrderWithCursorEmptyPastEndAndExistingEntries() {
    for placement in Placement.allCases {
        for cursor in ["b", nil] as [String?] {
            for ids in [["x", "y", "z"], ["b", "d", "a"], ["a", "b", "c", "a"]] {
                var before = editState(); before.playlists[0].cursor = cursor
                let changes = EpisodeActions.addMany(ids, playlist: before.playlists[0], placement: placement)
                let after = applying(before, changes)
                var seen = Set<String>()
                let unique = ids.filter { seen.insert($0).inserted }
                #expect(after.playlists[0].entries.filter { unique.contains($0.episodeId) }.map(\.episodeId) == unique)
                #expect(Set(after.playlists[0].entries.map(\.episodeId)).count == after.playlists[0].entries.count)
                let reversed = applying(after, EpisodeActions.undoAdd(before.playlists[0], ids: unique))
                #expect(reversed.playlists[0].entries == before.playlists[0].entries)
                #expect(reversed.playlists[0].cursor == before.playlists[0].cursor)
                if placement == .now { #expect(after.playlists[0].cursor == unique.first) }
            }
        }
        var empty = editState(); empty.playlists[0].entries = []; empty.playlists[0].cursor = nil
        let after = applying(empty, EpisodeActions.addMany(["x", "y", "z"], playlist: empty.playlists[0], placement: placement))
        #expect(after.playlists[0].entries.map(\.episodeId) == ["x", "y", "z"])
    }
}

@Test func blockReorderPreservesPositionsAndCursor() {
    let state = editState()
    let moved = applying(state, EpisodeActions.move(["a", "c"], in: state.playlists[0], to: 4))
    #expect(moved.playlists[0].entries.map(\.episodeId) == ["b", "d", "a", "c"])
    #expect(moved.playlists[0].entries.map(\.position) == [10, 30, 0, 20])
    #expect(moved.playlists[0].cursor == "b")
    let front = applying(state, EpisodeActions.move(["c", "d"], in: state.playlists[0], to: 0))
    #expect(front.playlists[0].entries.map(\.episodeId) == ["c", "d", "a", "b"])
}

@Test func playedUndoRestoresEntriesAcrossPlaylistsWithoutSubtractingListening() {
    var state = editState(); state.playlists[0].clearOnPlayed = true
    var other = state.playlists[0]; other.id = "other"; other.isDefault = false; other.name = "Other"; other.clearOnPlayed = false
    state.playlists.append(other)
    state.listeningLog = ["2026-11-11": ["s": 42]]
    let change = Change.markPlayed(episodeId: "b", source: .user)
    let after = applying(state, [change])
    #expect(after.playlists[0].entries.map(\.episodeId) == ["a", "c", "d"])
    #expect(after.playlists.allSatisfy { $0.history.isEmpty })
    let undone = applying(after, EditUndo.inverse(state, change: change, at: 200), at: 200)
    #expect(undone.episodeStates["b"]?.played == nil)
    #expect(undone.playlists.map(\.entries).map { $0.map(\.episodeId) } == state.playlists.map(\.entries).map { $0.map(\.episodeId) })
    #expect(undone.playlists.map(\.cursor) == state.playlists.map(\.cursor))
    #expect(undone.playlists[0].entries[1].position == 10)
    #expect(undone.listeningLog == state.listeningLog)
}

@Test func namesIgnoreCaseAndSpacesButKeepRemoteDuplicates() {
    var state = editState(); state.playlists[0].name = "Commute"
    #expect(PlaylistNames.problem("  commute ", playlists: state.playlists) != nil)
    #expect(PlaylistNames.problem("\n ", playlists: []) != nil)
    #expect(PlaylistNames.problem(" commute ", playlists: state.playlists, excluding: "default") == nil)
    let duplicate = StateRules.apply(state, change: .createPlaylist(playlistId: "remote", name: "COMMUTE", clearOnPlayed: false), at: 1)
    #expect(duplicate.playlists.count == 2)
    #expect(PlaylistNames.nextFreeName("Commute", playlists: duplicate.playlists) == "Commute 2")
}

@Test func timelineGroupsStretchesAndPreviewsRewindKeepingManualEdits() throws {
    var state = editState(); state.playlists[0].clearOnPlayed = true
    state = applying(state, [.reportPosition(playlistId: "default", episodeId: "b", position: 12, listenedAt: 1_000)], at: 1_000)
    state = applying(state, [.reportPosition(playlistId: "default", episodeId: "b", position: 80, listenedAt: 70_000)], at: 70_000)
    state = applying(state, [.markPlayed(episodeId: "b", source: .playback(playlistId: "default"))], at: 80_000)
    state = applying(state, [.markPlayed(episodeId: "a", source: .user), .addEntry(playlistId: "default", episodeId: "x", placement: .last)], at: 90_000)
    let events = TimelinePresentation.events(state.playlists[0], now: 100_000)
    let stretch = try #require(events.first { $0.kind == "listened" })
    #expect(stretch.from == 12 && stretch.to == 80 && stretch.end == 70_000)
    #expect(events.first { $0.kind == "finished" }?.moment == 79_999)
    let preview = try #require(TimelinePresentation.preview(state, playlistID: "default", to: 1_000, at: 100_000))
    #expect(preview.cursor == "b" && preview.position == 12)
    #expect(preview.unplayed == ["b"] && preview.restored == ["b"])
    let rewound = applying(state, [.rewind(playlistId: "default", to: 1_000)], at: 100_000)
    #expect(rewound.episodeStates["a"]?.played?.source == .user)
    #expect(rewound.playlists[0].entries.contains { $0.episodeId == "x" })
    let reversed = applying(rewound, TimelinePresentation.undo(before: state, after: rewound, playlistID: "default", at: 110_000), at: 110_000)
    #expect(reversed.playlists[0].entries.map(\.episodeId) == state.playlists[0].entries.map(\.episodeId))
    #expect(reversed.playlists[0].cursor == state.playlists[0].cursor)
    #expect(reversed.episodeStates["b"]?.played?.source == .playback(playlistId: "default"))
}

@Test func timelineHidesOldSamplesFinishesAndEditsAgainstCurrentDate() {
    let now: Int64 = 50 * 86_400_000
    let cutoff = now - TimelineRules.retentionMillis
    var playlist = State.initial().playlists[0]
    playlist.timeline = [TimelinePoint(at: cutoff - 1, episodeId: "old", position: 10), TimelinePoint(at: cutoff, episodeId: "edge", position: 20)]
    playlist.history = [.init(episodeId: "old", finishedAt: cutoff - 1), .init(episodeId: "edge", finishedAt: cutoff)]
    playlist.edits = [.init(at: cutoff - 1, kind: "added", episodeId: "old"), .init(at: cutoff, kind: "added", episodeId: "edge")]
    let events = TimelinePresentation.events(playlist, now: now)
    #expect(events.count == 3)
    #expect(events.allSatisfy { $0.episodeID == "edge" && $0.at == cutoff })
    #expect(TimelinePresentation.events(playlist, now: now + 1).isEmpty)
    #expect(playlist.history.count == 2) // History and the permanent log are not pruned by presentation.
}
