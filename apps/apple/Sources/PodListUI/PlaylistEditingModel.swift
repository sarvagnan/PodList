import Foundation
import Observation
import PodListData
import PodListDomain

public struct NamedEdit: Sendable {
    public let name: String
    public let changes: [Change]
    public let reload: Bool
}

/// App-wide, session-scoped edit history. Playback reporting and sync are never undo steps.
@MainActor @Observable
public final class PlaylistEditingModel {
    public private(set) var history = EditHistory<NamedEdit>()
    public private(set) var busy = false
    public private(set) var status: String?
    public private(set) var error: String?
    public let drafts: PlaylistDrafts
    @ObservationIgnored private let database: LocalDatabase
    @ObservationIgnored private let changed: @MainActor () async -> Void
    @ObservationIgnored private let player: @MainActor () -> PlaybackController?

    public init(database: LocalDatabase, drafts: PlaylistDrafts,
                player: @escaping @MainActor () -> PlaybackController? = { nil },
                changed: @escaping @MainActor () async -> Void = {}) {
        self.database = database; self.drafts = drafts; self.player = player; self.changed = changed
    }
    public var undoTitle: String { history.undo.map { "Undo \($0.name)" } ?? "Undo" }
    public var redoTitle: String { history.redo.map { "Redo \($0.name)" } ?? "Redo" }

    @discardableResult
    public func edit(_ changes: [Change], name: String, message: String? = nil, reload: Bool = false) async -> Bool {
        await edit(name: name, message: message, reload: reload) { _ in changes }
    }
    @discardableResult
    public func edit(name: String, message: String? = nil, reload: Bool = false, start: Bool = false,
                     build: @escaping @Sendable (State) throws -> [Change]) async -> Bool {
        guard !busy else { return false }
        busy = true; error = nil
        defer { busy = false }
        do {
            let action: @MainActor () async throws -> Void = {
                let inverse = try await self.database.reversibleEdit(at: Self.now, build: build)
                if !inverse.isEmpty { self.history.record(NamedEdit(name: name, changes: inverse, reload: reload || start)) }
                self.status = message ?? name
            }
            if let player = player() { try await player.performUserEdit(reload: reload, start: start, action: action) }
            else { try await action() }
            await changed()
            return true
        } catch { self.error = String(describing: error); await changed(); return false }
    }
    public func reverse(redo: Bool = false) async {
        guard !busy, let step = redo ? history.redo : history.undo else { return }
        busy = true; error = nil
        defer { busy = false }
        do {
            let action: @MainActor () async throws -> Void = {
                let inverse = try await self.database.reversibleEdit(at: Self.now) { _ in step.changes }
                self.history.completeReverse(with: NamedEdit(name: step.name, changes: inverse, reload: step.reload), redo: redo)
                self.status = "\(redo ? "Redone" : "Undone"): \(step.name)"
                let restoredIDs = step.changes.compactMap { change -> String? in
                    if case let .restorePlaylist(id) = change { return id }; return nil
                }
                if !restoredIDs.isEmpty, let state = try? await self.database.loadState() {
                    let names = state.playlists.filter { restoredIDs.contains($0.id) }.map { "“\($0.name)”" }.joined(separator: ", ")
                    self.status = "\(self.status ?? "") · Restored Playlist \(names)"
                }
            }
            if let player = player() { try await player.performUserEdit(reload: step.reload, action: action) }
            else { try await action() }
            await changed()
        } catch { self.error = "Could not \(redo ? "redo" : "undo"): \(error)"; await changed() }
    }
    @discardableResult
    public func add(_ ids: [String], to target: String? = nil, newName: String? = nil, placement: Placement) async -> String? {
        guard !ids.isEmpty else { return nil }
        let newID = UUID().uuidString
        let succeeded = await edit(name: placement == .now ? "Play Now" : placement == .next ? "Play Next" : "Play Last", start: placement == .now) { state in
            let id = newName != nil ? newID : target ?? state.activePlaylistId
            var changes: [Change] = []
            let playlist: Playlist
            if let newName {
                let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
                changes.append(.createPlaylist(playlistId: id, name: name, clearOnPlayed: false))
                playlist = Playlist(id: id, name: name, isDefault: false, clearOnPlayed: false, entries: [], cursor: nil, history: [], timeline: [])
            } else {
                guard let existing = state.playlists.first(where: { $0.id == id }) else { throw DatabaseFailure(description: "Playlist unavailable.") }
                playlist = existing
            }
            changes += EpisodeActions.addMany(ids, playlist: playlist, placement: placement)
            if placement == .now { changes.append(.setActivePlaylist(playlistId: id)) }
            return changes
        }
        guard succeeded else { return nil }
        if newName != nil { return newID }
        if let target { return target }
        return try? await database.loadState().activePlaylistId
    }
    public func create(name: String) async -> String? {
        let id = UUID().uuidString
        return await edit([.createPlaylist(playlistId: id, name: name.trimmingCharacters(in: .whitespacesAndNewlines), clearOnPlayed: false)], name: "New Playlist") ? id : nil
    }
    public func rename(_ id: String, name: String) async -> Bool {
        let saved = await edit([.renamePlaylist(playlistId: id, name: name.trimmingCharacters(in: .whitespacesAndNewlines))], name: "Rename Playlist")
        if saved { drafts.remove("rename/\(id)"); drafts.remove("rename-open/\(id)") }
        return saved
    }
    public func delete(_ playlist: Playlist) async -> Bool {
        guard !playlist.isDefault else { return false }
        return await edit([.deletePlaylist(playlistId: playlist.id)], name: "Move to Trash", message: "Playlist \(playlist.name) moved to Trash", reload: true)
    }
    public func restore(_ id: String) async -> Bool {
        let success = await edit([.restorePlaylist(playlistId: id)], name: "Restore Playlist")
        if success, let p = try? await database.loadState().playlists.first(where: { $0.id == id }) { status = "Restored Playlist “\(p.name)”" }
        return success
    }
    public func setStar(_ ids: [String], starred: Bool) async {
        _ = await edit(ids.map { .setStar(episodeId: $0, starred: starred) }, name: starred ? "Star" : "Unstar")
    }
    public func markPlayed(_ ids: [String], played: Bool) async {
        _ = await edit(ids.map { played ? .markPlayed(episodeId: $0, source: .user) : .markUnplayed(episodeId: $0) }, name: played ? "Mark Played" : "Mark Unplayed", reload: true)
    }
    public func remove(_ ids: [String], playlistID: String) async {
        _ = await edit(ids.map { .removeEntry(playlistId: playlistID, episodeId: $0) }, name: "Remove from Playlist", reload: true)
    }
    public func move(_ ids: Set<String>, playlistID: String, to boundary: Int) async {
        _ = await edit(name: "Move Entries") { state in
            guard let playlist = state.playlists.first(where: { $0.id == playlistID }) else { return [] }
            return EpisodeActions.move(ids, in: playlist, to: boundary)
        }
    }
    public func move(_ ids: Set<String>, playlistID: String, down: Bool) async {
        _ = await edit(name: down ? "Move Down" : "Move Up") { state in
            guard let playlist = state.playlists.first(where: { $0.id == playlistID }) else { return [] }
            var order = playlist.entries.map(\.episodeId)
            if down {
                for index in order.indices.reversed() where index + 1 < order.count && ids.contains(order[index]) && !ids.contains(order[index + 1]) { order.swapAt(index, index + 1) }
            } else {
                for index in order.indices where index > 0 && ids.contains(order[index]) && !ids.contains(order[index - 1]) { order.swapAt(index, index - 1) }
            }
            return order.enumerated().map { .moveEntry(playlistId: playlistID, episodeId: $0.element, after: $0.offset > 0 ? order[$0.offset - 1] : nil) }
        }
    }
    public func playFromHere(playlistID: String, episodeID: String?) async {
        _ = await edit([.setActivePlaylist(playlistId: playlistID), .setCursor(playlistId: playlistID, episodeId: episodeID)], name: "Play from Here", reload: true, start: episodeID != nil)
    }
    @discardableResult
    private func edit(_ changes: [Change], name: String, reload: Bool, start: Bool) async -> Bool {
        await edit(name: name, reload: reload, start: start) { _ in changes }
    }
    public func rewind(_ id: String, to: Int64) async -> Bool {
        await edit([.rewind(playlistId: id, to: to)], name: "Rewind", reload: true)
    }
    private static var now: Int64 { Int64(Date().timeIntervalSince1970 * 1000) }
}

/// Durable, server-scoped drafts. Closing a sheet or quitting never accepts or discards input.
@MainActor @Observable
public final class PlaylistDrafts {
    private var values: [String: String]
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let key: String
    public init(scope: String, defaults: UserDefaults = .standard) {
        self.defaults = defaults; key = "PodList.playlistDrafts/" + scope
        values = defaults.dictionary(forKey: key) as? [String: String] ?? [:]
    }
    public subscript(_ field: String) -> String {
        get { values[field] ?? "" }
        set { values[field] = newValue; defaults.set(values, forKey: key) }
    }
    public func remove(_ field: String) { values.removeValue(forKey: field); defaults.set(values, forKey: key) }
}
