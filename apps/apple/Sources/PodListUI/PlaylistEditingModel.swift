import Foundation
import Observation
import PodListData
import PodListDomain

public struct NamedEdit: Sendable {
    public var id = UUID()
    public let name: String
    public let changes: [Change]
    public let reload: Bool
    public var action: (@MainActor @Sendable () async throws -> Void)? = nil
    public var inverseAction: (@MainActor @Sendable () async throws -> Void)? = nil
    public var sessionID: UUID? = nil
    public var message: String? = nil
}

/// App-wide, session-scoped edit history. Playback reporting and sync are never undo steps.
@MainActor @Observable
public final class PlaylistEditingModel {
    public private(set) var history = EditHistory<NamedEdit>()
    public private(set) var busy = false
    private(set) var feedbackNotice: EditingNotice?
    public private(set) var status: String? {
        get { feedbackNotice?.message }
        set { feedbackNotice = newValue.map { EditingNotice($0) } }
    }
    public private(set) var error: String?
    public let drafts: PlaylistDrafts
    @ObservationIgnored private var ended = false
    @ObservationIgnored private let database: LocalDatabase
    @ObservationIgnored private let changed: @MainActor () async -> Void
    @ObservationIgnored private let donate: @MainActor (ActionDonation) -> Void
    @ObservationIgnored private var intentUndoTask: Task<Void, Never>?
    @ObservationIgnored private let player: @MainActor () -> PlaybackController?

    public init(database: LocalDatabase, drafts: PlaylistDrafts,
                player: @escaping @MainActor () -> PlaybackController? = { nil },
                donate: @escaping @MainActor (ActionDonation) -> Void = { _ in },
                changed: @escaping @MainActor () async -> Void = {}) {
        self.database = database; self.drafts = drafts; self.donate = donate; self.player = player; self.changed = changed
    }
    public func endSession() { ended = true; history.clear() }
    func discardViewSession(_ id: UUID) {
        history.removeAll { $0.sessionID == id }
        status = "View edits cancelled."; error = nil
    }
    /// Share the same serialization and history for metadata requests and State edits.
    public func performExternal(recordHistory: Bool = true, _ apply: @MainActor () async throws -> NamedEdit) async throws {
        guard !busy else { throw DatabaseFailure(description: "An edit is already in progress. Try again.") }
        busy = true; error = nil
        defer { busy = false }
        do {
            let step = try await apply()
            if !ended, recordHistory { history.record(step) }
            status = step.message ?? step.name
            await changed()
        } catch { self.error = String(describing: error); throw error }
    }
    func showNotice(_ text: String?) { status = text }
    public var undoTitle: String { history.undo.map { "Undo \($0.name)" } ?? "Undo" }
    public var redoTitle: String { history.redo.map { "Redo \($0.name)" } ?? "Redo" }

    @discardableResult
    public func edit(_ changes: [Change], name: String, message: String? = nil, reload: Bool = false, undoManager: UndoManager? = nil) async -> Bool {
        await edit(name: name, message: message, reload: reload, undoManager: undoManager) { _ in changes }
    }
    @discardableResult
    public func edit(name: String, message: String? = nil, reload: Bool = false, start: Bool = false, undoManager: UndoManager? = nil,
                     build: @escaping @Sendable (State) throws -> [Change]) async -> Bool {
        guard !busy, !ended else { return false }
        busy = true; error = nil
        defer { busy = false }
        do {
            let action: @MainActor () async throws -> Void = {
                let inverse = try await self.database.reversibleEdit(at: Self.now, build: build)
                if !inverse.isEmpty {
                    let step = NamedEdit(name: name, changes: inverse, reload: reload || start)
                    self.history.record(step)
                    if let undoManager { self.registerIntentUndo(undoManager, id: step.id, name: step.name, redo: false) }
                }
                self.status = message ?? name
            }
            if let player = player() { try await player.performUserEdit(reload: reload, start: start, action: action) }
            else { try await action() }
            await changed()
            return true
        } catch { self.error = String(describing: error); await changed(); return false }
    }
    public func reverse(redo: Bool = false) async {
        await beginReverse(redo: redo)?.value
    }
    private func beginReverse(redo: Bool, expectedID: UUID? = nil) -> Task<Void, Never>? {
        guard !busy, !ended, let step = redo ? history.redo : history.undo,
              expectedID == nil || expectedID == step.id else { return nil }
        busy = true; error = nil
        return Task { @MainActor in
            defer { self.busy = false }
            do {
                let action: @MainActor () async throws -> Void = {
                    if let external = step.action, let inverse = step.inverseAction {
                        try await external()
                        self.history.completeReverse(with: NamedEdit(id: step.id, name: step.name, changes: [], reload: true, action: inverse, inverseAction: external, sessionID: step.sessionID), redo: redo)
                        self.status = "\(redo ? "Redone" : "Undone"): \(step.name)"
                        return
                    }
                    let inverse = try await self.database.reversibleEdit(at: Self.now) { _ in step.changes }
                    self.history.completeReverse(with: NamedEdit(id: step.id, name: step.name, changes: inverse, reload: step.reload), redo: redo)
                    self.status = "\(redo ? "Redone" : "Undone"): \(step.name)"
                    let restoredIDs = step.changes.compactMap { change -> String? in
                        if case let .restorePlaylist(id) = change { return id }; return nil
                    }
                    if !restoredIDs.isEmpty, let state = try? await self.database.loadState() {
                        let names = state.playlists.filter { restoredIDs.contains($0.id) }.map { "“\($0.name)”" }.joined(separator: ", ")
                        self.status = "\(self.status ?? "") · Restored Playlist \(names)"
                    }
                }
                if step.action != nil { try await action(); player()?.refresh() }
                else if let player = player() { try await player.performUserEdit(reload: step.reload, action: action) }
                else { try await action() }
                await changed()
            } catch { self.error = "Could not \(redo ? "redo" : "undo"): \(error)"; await changed() }
        }
    }

    /// The system holds only a reference to an existing history step, never another inverse.
    /// Matching the step prevents a stale Siri Undo from reversing a later menu edit.
    func registerIntentUndo(_ manager: UndoManager?, since previousID: UUID?) {
        guard let manager, let step = history.undo, step.id != previousID else { return }
        registerIntentUndo(manager, id: step.id, name: step.name, redo: false)
    }
    private func registerIntentUndo(_ manager: UndoManager, id: UUID, name: String, redo: Bool) {
        manager.registerUndo(withTarget: self) { [weak manager] editor in
            guard let manager, let task = editor.beginReverse(redo: redo, expectedID: id) else { return }
            // UndoManager collects Redo synchronously, while the existing edit serializes IO.
            editor.registerIntentUndo(manager, id: id, name: name, redo: !redo)
            editor.intentUndoTask = Task { @MainActor in
                await task.value
                if editor.error != nil { manager.removeAllActions(withTarget: editor) }
            }
        }
        manager.setActionName(name)
    }
    func settleIntentUndo() async { await intentUndoTask?.value }
    @discardableResult
    public func add(_ ids: [String], to target: String? = nil, newName: String? = nil, placement: Placement, undoManager: UndoManager? = nil) async -> String? {
        guard !ids.isEmpty else { return nil }
        let newID = UUID().uuidString
        let succeeded = await edit(name: placement == .now ? "Play Now" : placement == .next ? "Play Next" : "Play Last", start: placement == .now, undoManager: undoManager) { state in
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
        let result: String?
        if newName != nil { result = newID }
        else if let target { result = target }
        else { result = try? await database.loadState().activePlaylistId }
        if let result {
            if placement == .now, let id = ids.first { donate(.playEpisode(id, playlist: result)) }
            else { donate(.add(ids, playlist: result, placement: placement)) }
        }
        return result
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
    @discardableResult
    public func setStar(_ ids: [String], starred: Bool, undoManager: UndoManager? = nil) async -> Bool {
        let succeeded = await edit(ids.map { .setStar(episodeId: $0, starred: starred) }, name: starred ? "Star" : "Unstar", undoManager: undoManager)
        if succeeded, !ids.isEmpty { donate(.star(ids, starred: starred)) }
        return succeeded
    }
    @discardableResult
    public func markPlayed(_ ids: [String], played: Bool, undoManager: UndoManager? = nil) async -> Bool {
        let succeeded = await edit(ids.map { played ? .markPlayed(episodeId: $0, source: .user) : .markUnplayed(episodeId: $0) }, name: played ? "Mark Played" : "Mark Unplayed", reload: true, undoManager: undoManager)
        if succeeded, !ids.isEmpty { donate(.markPlayed(ids, played: played)) }
        return succeeded
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
    @discardableResult
    public func playFromHere(playlistID: String, episodeID: String?, undoManager: UndoManager? = nil) async -> Bool {
        let succeeded = await edit([.setActivePlaylist(playlistId: playlistID), .setCursor(playlistId: playlistID, episodeId: episodeID)], name: "Play from Here", reload: true, start: episodeID != nil, undoManager: undoManager)
        if succeeded, let episodeID { donate(.playInPlaylist(episodeID, playlist: playlistID)) }
        return succeeded
    }
    @discardableResult
    private func edit(_ changes: [Change], name: String, reload: Bool, start: Bool, undoManager: UndoManager? = nil) async -> Bool {
        await edit(name: name, reload: reload, start: start, undoManager: undoManager) { _ in changes }
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
    public func addTarget(prefix: String, active: String, playlists: [Playlist], preferNew: Bool) -> String {
        if preferNew { return "new" }
        let saved = self[prefix + "/target"]
        if self[prefix + "/open"] == "true" || (saved == "new" && !self[prefix + "/name"].isEmpty), saved == "new" || playlists.contains(where: { $0.id == saved }) { return saved }
        return active
    }
    public func remove(_ field: String) { values.removeValue(forKey: field); defaults.set(values, forKey: key) }
}
