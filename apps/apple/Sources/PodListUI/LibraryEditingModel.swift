import Foundation
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
    public let edits: PlaylistEditingModel
    public var undoName: String? { edits.history.undo?.name }
    public var redoName: String? { edits.history.redo?.name }
    @ObservationIgnored private let db: LocalDatabase
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let changed: @MainActor @Sendable () async -> Void

    public init(database: LocalDatabase, source: PodcastLibrary, scope: String, defaults: UserDefaults = .standard, edits: PlaylistEditingModel? = nil,
                changed: @escaping @MainActor @Sendable () async -> Void = {}) {
        self.edits = edits ?? PlaylistEditingModel(database: database, drafts: PlaylistDrafts(scope: scope, defaults: defaults), changed: changed)
        db = database; self.source = source; self.scope = scope; self.defaults = defaults; self.changed = changed
        showGettingStarted = defaults.object(forKey: "PodList.\(scope).gettingStarted") as? Bool ?? true
        steps = defaults.integer(forKey: "PodList.\(scope).steps")
    }
    private func key(_ suffix: String) -> String { "PodList.\(scope).\(suffix)" }
    public func draft(_ field: String) -> String { defaults.string(forKey: key("draft." + field)) ?? "" }
    public func endSession() { edits.endSession() }
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
        let name: String
        switch change {
        case .setSubscriptionOverrides: name = "Subscription Settings"
        case .markSubscriptionPlayed: name = "Mark Subscription Played"
        default: name = "Library edit"
        }
        if case let .markSubscriptionPlayed(id) = change {
            let episodes = try await db.readLibrary().episodes.filter { $0.subscriptionId == id }.map(\.id)
            guard await edits.markPlayed(episodes, played: true) else { throw SyncResponseFailure(edits.error ?? "Could not mark Episodes Played") }
        } else {
            guard await edits.edit([change], name: name, reload: true) else { throw SyncResponseFailure(edits.error ?? "Could not save edit") }
        }
    }
    public func savedView(_ id: String) async throws -> PodListDomain.View? { try await db.loadState().views.first { $0.id == id } }
    public func saveView(_ view: PodListDomain.View) async throws {
        try await edits.performExternal {
            let previous = try await self.db.saveUniqueView(view, at: Self.now)
            let clean = PodListDomain.View(id: view.id, name: view.name.trimmingCharacters(in: .whitespacesAndNewlines), filter: view.filter, sort: view.sort, limit: view.limit)
            let db = self.db
            return NamedEdit(name: "View edit", changes: [], reload: false, action: {
                if let previous { _ = try await db.saveUniqueView(previous, at: Self.now) }
                else { try await db.record(.deleteView(viewId: clean.id), at: Self.now) }
            }, inverseAction: { _ = try await db.saveUniqueView(clean, at: Self.now) })
        }
        completeStep(2); await changed()
    }
    public func deleteView(_ view: PodListDomain.View) async throws {
        try await edits.performExternal {
            try await self.db.record(.deleteView(viewId: view.id), at: Self.now)
            let db = self.db
            return NamedEdit(name: "Delete View", changes: [], reload: false,
                action: { _ = try await db.saveUniqueView(view, at: Self.now) },
                inverseAction: { try await db.record(.deleteView(viewId: view.id), at: Self.now) })
        }
        notice = "View \(view.name) deleted"; await changed()
    }
    public func subscribe(_ feed: String) async throws {
        try await edits.performExternal {
            let sub = try await self.source.subscribe(feed), source = self.source
            self.notice = "Subscribed to \(sub.title)"
            return NamedEdit(name: "Subscribe", changes: [], reload: true,
                action: { try await source.unsubscribe(sub.id) }, inverseAction: { _ = try await source.subscribe(feed) })
        }
        completeStep(1); await changed()
    }
    public func unsubscribe(_ sub: Subscription) async throws {
        try await edits.performExternal {
            try await self.source.unsubscribe(sub.id)
            let source = self.source
            return NamedEdit(name: "Unsubscribe", changes: [], reload: true,
                action: { _ = try await source.subscribe(sub.feedUrl) }, inverseAction: { try await source.unsubscribe(sub.id) })
        }
        notice = "Unsubscribed from \(sub.title)"; await changed()
    }
    public func prepareEpisode(_ feed: String, guid: String) async throws -> String {
        let id = try await source.bringEpisode(feed, guid: guid)
        await changed()
        return id
    }
    public func bring(_ feed: String, guid: String, play: Bool, app: ApplicationModel) async throws {
        let id = try await prepareEpisode(feed, guid: guid)
        _ = await edits.add([id], placement: play ? .now : .last)
        completeStep(4)
    }
    public func undo() async { await edits.reverse(); error = edits.error; await changed() }
    public func redo() async { await edits.reverse(redo: true); error = edits.error; await changed() }
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
