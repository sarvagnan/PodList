import Foundation
#if os(macOS)
import AppKit
#endif
import Observation
import PodListData
import PodListDomain

public enum LibraryMessages {
    public static func failure(_ error: any Error) -> String {
        if let failure = error as? SyncResponseFailure { return failure.reason }
        if let failure = error as? FeedFailure { return "Could not read the feed. " + failure.reason }
        if let failure = error as? HttpFailure { return "The server returned HTTP \(failure.status). Try again." }
        if error is URLError { return "Could not reach the podcast or server. Check your connection and try again." }
        if error is DecodingError { return "The response could not be read. Try again." }
        return "Could not complete this action. Try again."
    }
}

public enum ViewNames {
    public static func problem(_ name: String, views: [PodListDomain.View], excluding id: String? = nil) -> String? {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.isEmpty { return "Enter a View name." }
        if let taken = views.first(where: { $0.id != id && $0.name.trimmingCharacters(in: .whitespacesAndNewlines).caseInsensitiveCompare(clean) == .orderedSame }) { return "The View name ‘\(taken.name)’ is already in use." }
        return nil
    }
}

public enum ViewEdits {
    public static func problem(_ view: PodListDomain.View) -> String? {
        let f = view.filter
        if [f.minDuration, f.maxDuration].compactMap({ $0 }).contains(where: { !$0.isFinite || $0 < 0 }) { return "Length must be a nonnegative number." }
        if let min = f.minDuration, let max = f.maxDuration, min > max { return "Minimum length must not exceed maximum length." }
        if let limit = view.limit, limit < 1 { return "Show must be a positive whole number." }
        if case let .lastDays(days) = f.published, days < 1 { return "Published days must be positive." }
        if case let .between(from, to) = f.published, let from, let to, from > to { return "From must be before Through." }
        return nil
    }
}

/// A clock-driven two-click control: other interactions explicitly reset it.
public struct UnsubscribeControl: Sendable {
    public private(set) var armedUntil: Date?
    public init() {}
    public func isArmed(at now: Date) -> Bool { armedUntil.map { now < $0 } ?? false }
    public mutating func click(at now: Date) -> Bool {
        if isArmed(at: now) { reset(); return true }
        armedUntil = now.addingTimeInterval(4); return false
    }
    public mutating func reset() { armedUntil = nil }
}

@MainActor @Observable
public final class LibraryEditingModel {
    public let source: PodcastLibrary
    public let scope: String
    public var error: String?
    public var notice: String?
    public var busy = false
    public var importCompleted = 0
    public var importTotal = 0
    public var importFailed: [String] = []
    public var importFailureReasons: [String: String] = [:]
    public var showGettingStarted: Bool { didSet { defaults.set(showGettingStarted, forKey: key("gettingStarted")) } }
    public var steps: Int { didSet { defaults.set(steps, forKey: key("steps")) } }
    public private(set) var undoName: String?
    public private(set) var redoName: String?
    @ObservationIgnored private let db: LocalDatabase
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let changed: @MainActor @Sendable () async -> Void
    #if os(macOS)
    @ObservationIgnored public weak var undoManager: UndoManager?
    @ObservationIgnored public private(set) var nativeUndoTask: Task<Void, Never>?
    private final class WeakUndoManager { weak var value: UndoManager?; init(_ value: UndoManager) { self.value = value } }
    @ObservationIgnored private var nativeManagers: [WeakUndoManager] = []
    #endif
    @ObservationIgnored private var ended = false
    @ObservationIgnored private var undoAction: (@MainActor () async throws -> Void)?
    @ObservationIgnored private var redoAction: (@MainActor () async throws -> Void)?

    public init(database: LocalDatabase, source: PodcastLibrary, scope: String, defaults: UserDefaults = .standard,
                changed: @escaping @MainActor @Sendable () async -> Void = {}) {
        db = database; self.source = source; self.scope = scope; self.defaults = defaults; self.changed = changed
        showGettingStarted = defaults.object(forKey: "PodList.\(scope).gettingStarted") as? Bool ?? true
        steps = defaults.integer(forKey: "PodList.\(scope).steps")
    }
    private func key(_ suffix: String) -> String { "PodList.\(scope).\(suffix)" }
    public func draft(_ field: String) -> String { defaults.string(forKey: key("draft." + field)) ?? "" }
    public func endSession() {
        ended = true; undoAction = nil; redoAction = nil; undoName = nil; redoName = nil
        #if os(macOS)
        nativeUndoTask?.cancel()
        for manager in nativeManagers { manager.value?.removeAllActions(withTarget: self) }
        nativeManagers = []
        #endif
    }
    public func hasDraft(_ field: String) -> Bool { defaults.object(forKey: key("draft." + field)) != nil }
    public func clearDraft(_ field: String) { defaults.removeObject(forKey: key("draft." + field)) }
    public func setDraft(_ value: String, field: String) { defaults.set(value, forKey: key("draft." + field)) }
    public func reconcile(_ snapshot: LibrarySnapshot) {
        if snapshot.subscriptions.contains(where: { $0.unsubscribedAt == nil }) { completeStep(1) }
        if snapshot.state.playlists.contains(where: { !$0.entries.isEmpty }) { completeStep(4) }
    }
    public func completeStep(_ step: Int) { steps |= step }
    public func initialize() async throws {
        // Only seed after the database is read, once per Library; an empty sync is not first run.
        guard try await db.getMeta("macGettingStartedSeeded") == nil else { return }
        let snapshot = try await db.readLibrary()
        if snapshot.state.views.isEmpty && snapshot.subscriptions.isEmpty {
            let starters: [PodListDomain.View] = [
                .init(id: "starter-week", name: "New this week", filter: .init(published: .lastDays(days: 7), played: .unplayed), sort: .publishedDesc, limit: nil),
                .init(id: "starter-short", name: "Under 30 minutes", filter: .init(played: .unplayed, maxDuration: 1800), sort: .durationAsc, limit: nil),
                .init(id: "starter-starred", name: "Starred", filter: .init(starred: true), sort: .publishedDesc, limit: nil)
            ]
            try await db.recordAll(starters.map { .saveView(view: $0) }, at: Self.now)
        }
        try await db.setMeta("macGettingStartedSeeded", "true")
        await changed()
    }
    private static var now: Int64 { Int64(Date().timeIntervalSince1970 * 1000) }
    public func edit(_ change: Change) async throws {
        try await db.record(change, at: Self.now); await changed()
    }
    public func savedView(_ id: String) async throws -> PodListDomain.View? { try await db.loadState().views.first { $0.id == id } }
    public func saveView(_ view: PodListDomain.View) async throws {
        let previous = try await db.saveUniqueView(view, at: Self.now)
        let clean = PodListDomain.View(id: view.id, name: view.name.trimmingCharacters(in: .whitespacesAndNewlines), filter: view.filter, sort: view.sort, limit: view.limit)
        let db = db
        offerUndo("View edit", undo: { [db] in
            if let previous { _ = try await db.saveUniqueView(previous, at: Self.now) } else { try await db.record(.deleteView(viewId: clean.id), at: Self.now) }
        }, redo: { [db] in _ = try await db.saveUniqueView(clean, at: Self.now) })
        completeStep(2); await changed()
    }
    public func deleteView(_ view: PodListDomain.View) async throws {
        try await db.record(.deleteView(viewId: view.id), at: Self.now)
        let db = db
        offerUndo("Delete View", undo: { [db] in _ = try await db.saveUniqueView(view, at: Self.now) }, redo: { [db] in try await db.record(.deleteView(viewId: view.id), at: Self.now) })
        notice = "View \(view.name) deleted"; await changed()
    }
    public func subscribe(_ feed: String) async throws {
        let sub = try await source.subscribe(feed)
        let source = source
        offerUndo("Subscribe", undo: { [source] in try await source.unsubscribe(sub.id) }, redo: { [source] in _ = try await source.subscribe(feed) })
        notice = "Subscribed to \(sub.title)"; completeStep(1); await changed()
    }
    public func unsubscribe(_ sub: Subscription) async throws {
        try await source.unsubscribe(sub.id)
        let source = source
        offerUndo("Unsubscribe", undo: { [source] in _ = try await source.subscribe(sub.feedUrl) }, redo: { [source] in try await source.unsubscribe(sub.id) })
        notice = "Unsubscribed from \(sub.title)"; await changed()
    }
    public func bring(_ feed: String, guid: String, play: Bool, app: ApplicationModel) async throws {
        let id = try await source.bringEpisode(feed, guid: guid)
        await changed()
        if play { app.playback?.playNow(id) }
        else { try await edit(.addEntry(playlistId: try await db.loadState().activePlaylistId, episodeId: id, placement: .last)) }
        completeStep(4)
    }
    #if os(macOS)
    private func registerNativeUndo(_ manager: UndoManager, name: String,
                                    action: @escaping @MainActor () async throws -> Void,
                                    inverse: @escaping @MainActor () async throws -> Void) {
        guard !ended else { return }
        nativeManagers.removeAll { $0.value == nil }
        if !nativeManagers.contains(where: { $0.value === manager }) { nativeManagers.append(WeakUndoManager(manager)) }
        manager.registerUndo(withTarget: self) { target in
            MainActor.assumeIsolated {
                target.registerNativeUndo(manager, name: name, action: inverse, inverse: action)
                target.nativeUndoTask = Task { @MainActor [weak target] in
                    guard let target else { return }
                    do { try await action(); target.error = nil; target.undoName = nil; target.redoName = nil; await target.changed() }
                    catch { target.error = "Could not undo or redo. " + LibraryMessages.failure(error) }
                }
            }
        }
        manager.setActionName(name)
    }
    #endif
    private func offerUndo(_ name: String, undo: @escaping @MainActor () async throws -> Void, redo: @escaping @MainActor () async throws -> Void) {
        guard !ended else { return }
        undoName = name; redoName = nil; undoAction = undo; redoAction = redo
        #if os(macOS)
        if let manager = undoManager ?? NSApplication.shared.keyWindow?.undoManager { registerNativeUndo(manager, name: name, action: undo, inverse: redo) }
        #endif
    }
    public func undo() async {
        guard let undoAction, let name = undoName else { return }
        do {
            try await undoAction(); undoName = nil; redoName = name; error = nil
            #if os(macOS)
            (undoManager ?? NSApplication.shared.keyWindow?.undoManager)?.removeAllActions(withTarget: self)
            #endif
            await changed()
        }
        catch { self.error = "Could not undo. " + LibraryMessages.failure(error) }
    }
    public func redo() async {
        guard let redoAction, let name = redoName else { return }
        do {
            try await redoAction(); redoName = nil; undoName = name; error = nil
            #if os(macOS)
            (undoManager ?? NSApplication.shared.keyWindow?.undoManager)?.removeAllActions(withTarget: self)
            #endif
            await changed()
        }
        catch { self.error = "Could not redo. " + LibraryMessages.failure(error) }
    }
    public func run(_ action: @escaping @MainActor () async throws -> Void) {
        Task { do { try await action(); error = nil } catch { self.error = LibraryMessages.failure(error) } }
    }
    public func importOPML(_ xml: String) async {
        guard !busy else { return }
        busy = true; error = nil; importCompleted = 0; importFailed = []; importFailureReasons = [:]
        defer { busy = false }
        do {
            let feeds = try OPML.parse(xml); importTotal = feeds.count
            let known = Set(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.map(\.feedUrl))
            var added = 0
            for feed in feeds {
                if !known.contains(feed) {
                    do { _ = try await source.subscribe(feed); added += 1 }
                    catch { importFailed.append(feed); importFailureReasons[feed] = LibraryMessages.failure(error) }
                }
                importCompleted += 1
            }
            notice = "Imported \(added); already subscribed \(feeds.filter { known.contains($0) }.count); failed \(importFailed.count)."
            if added > 0 { completeStep(1) }
            await changed()
        } catch { self.error = LibraryMessages.failure(error) }
    }
    public func retryImport() async { let feeds = importFailed; await importOPML(OPML.generate(feeds.map { Subscription(id: $0, feedUrl: $0, title: $0, author: nil, description: nil, artwork: nil, subscribedAt: 0, unsubscribedAt: nil, playedThreshold: nil, playbackSettings: .init()) })) }
}

extension LocalDatabase {
    /// Validation and write run without suspension, so two windows cannot create duplicate names.
    public func saveUniqueView(_ view: PodListDomain.View, at: Int64) throws -> PodListDomain.View? {
        let state = try loadState()
        if let problem = ViewEdits.problem(view) { throw SyncResponseFailure(problem) }
        if let problem = ViewNames.problem(view.name, views: state.views, excluding: view.id) { throw SyncResponseFailure(problem) }
        var clean = view; clean.name = view.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let previous = state.views.first { $0.id == view.id }
        try record(.saveView(view: clean), at: at)
        return previous
    }
}
