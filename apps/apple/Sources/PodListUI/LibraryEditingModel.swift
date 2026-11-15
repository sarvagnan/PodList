import Foundation
import Observation
import PodListData
import PodListDomain

public enum LibraryMessages {
    public static func failure(_ error: any Error) -> String {
        libraryFailure(error)
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
    public enum Field: Hashable { case minimumLength, maximumLength, show, published }
    public static func problems(_ view: PodListDomain.View) -> [Field: String] {
        var errors: [Field: String] = [:]
        let f = view.filter
        if let min = f.minDuration, !min.isFinite || min < 0 { errors[.minimumLength] = "Minimum length must be a nonnegative number of minutes." }
        if let max = f.maxDuration, !max.isFinite || max < 0 { errors[.maximumLength] = "Maximum length must be a nonnegative number of minutes." }
        if let min = f.minDuration, let max = f.maxDuration, min > max {
            errors[.minimumLength] = "Minimum length must not exceed Maximum length."
            errors[.maximumLength] = "Maximum length must be at least Minimum length."
        }
        if let limit = view.limit, limit < 1 { errors[.show] = "Show must be a positive whole number." }
        if case let .lastDays(days) = f.published, days < 1 { errors[.published] = "Published days must be positive." }
        if case let .between(from, to) = f.published, let from, let to, from > to { errors[.published] = "From must be before Through." }
        return errors
    }
    public static func problem(_ view: PodListDomain.View) -> String? {
        let errors = problems(view)
        return [.minimumLength, .maximumLength, .show, .published].compactMap { errors[$0] }.first
    }
}

/// A clock-driven two-click control: other interactions explicitly reset it.
public struct UnsubscribeControl: Sendable {
    public private(set) var armedUntil: Date?
    public init() {}
    public func isArmed(at now: Date) -> Bool { armedUntil.map { now < $0 } ?? false }
    public mutating func click(at now: Date) -> Bool {
        if isArmed(at: now) { reset(); return true }
        armedUntil = now.addingTimeInterval(Self.armDuration); return false
    }
    public mutating func reset() { armedUntil = nil }

    /// Four seconds. UI-test tours (disposable app.podlist.uitour.* builds only) can hold the
    /// armed state longer, because a slow VM can take that long just to screenshot it.
    static let armDuration: TimeInterval = {
        #if DEBUG
        if Bundle.main.bundleIdentifier?.hasPrefix("app.podlist.uitour.") == true {
            let seconds = UserDefaults.standard.double(forKey: "PodList.uiTestUnsubscribeArmSeconds")
            if seconds > 0 { return seconds }
        }
        #endif
        return 4
    }()
}

@MainActor @Observable
public final class LibraryEditingModel {
    public let source: PodcastLibrary
    public let scope: String
    public var error: String? { didSet { edits.announcements.error(error) } }
    public var notice: String? {
        get { edits.status }
        set { edits.showNotice(newValue) }
    }
    public var busy = false
    var groupsDroppedImport = false
    #if os(macOS)
    var episodeDrop: EpisodeDropProgress?
    var failedEpisodeDrop: FailedEpisodeDrop?
    let podcastDiscovery = PodcastDiscoveryModel()
    #endif
    public var importName = ""
    public var importFeeds: [String] = []
    public var importExisting = 0
    public var importReady = false
    public var importPresented = false
    public var importResults: [String: String] = [:]
    @ObservationIgnored private var importSelectionVersion = 0
    @ObservationIgnored private var importTask: Task<Void, Never>?
    public var importCompleted = 0
    public var importTotal = 0
    public var importFailed: [String] = []
    public var importFailureReasons: [String: String] = [:]
    // A stored true means Settings reopened it; the default follows the loaded Library.
    private var gettingStartedEnabled: Bool
    private var gettingStartedReopened: Bool
    private var automaticIntroduction = false
    private var hasSubscriptions = false
    private var addFlows = 0
    public var showGettingStarted: Bool {
        get { gettingStartedEnabled && (gettingStartedReopened || automaticIntroduction) }
        set {
            gettingStartedEnabled = newValue; gettingStartedReopened = newValue
            defaults.set(newValue, forKey: key("gettingStarted"))
        }
    }
    public func showsGettingStarted(on destination: Destination?, in library: LibraryModel) -> Bool {
        guard let first = library.state.views.first else { return false }
        return showGettingStarted && destination == .view(first.id)
    }
    public func beginAddingPodcasts() { addFlows += 1 }
    public func endAddingPodcasts() {
        addFlows = max(0, addFlows - 1)
        if addFlows == 0 && hasSubscriptions { automaticIntroduction = false }
    }
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
        let remembered = defaults.object(forKey: "PodList.\(scope).gettingStarted") as? Bool
        gettingStartedEnabled = remembered ?? true
        gettingStartedReopened = remembered == true
    }
    private func key(_ suffix: String) -> String { "PodList.\(scope).\(suffix)" }
    public func draft(_ field: String) -> String { defaults.string(forKey: key("draft." + field)) ?? "" }
    public func endSession() { edits.endSession() }
    public func hasDraft(_ field: String) -> Bool { defaults.object(forKey: key("draft." + field)) != nil }
    public func clearDraft(_ field: String) { defaults.removeObject(forKey: key("draft." + field)) }
    public func setDraft(_ value: String, field: String) { defaults.set(value, forKey: key("draft." + field)) }
    public func reconcile(_ snapshot: LibrarySnapshot) {
        // A partial server read says nothing about emptiness. Keep the previous decision.
        guard snapshot.isReady else { return }
        hasSubscriptions = snapshot.subscriptions.contains(where: { $0.unsubscribedAt == nil })
        automaticIntroduction = !hasSubscriptions || (addFlows > 0 && automaticIntroduction)
    }
    public func initialize() async throws {
        // Only seed after the database is read, once per Library; an empty sync is not first run.
        guard try await db.getMeta("macGettingStartedSeeded") == nil else { return }
        let snapshot = try await db.readLibrary()
        guard snapshot.isReady else { return }
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
    public func saveView(_ view: PodListDomain.View, sessionID: UUID? = nil) async throws {
        try await edits.performExternal {
            let previous = try await self.db.saveUniqueView(view, at: Self.now)
            let clean = PodListDomain.View(id: view.id, name: view.name.trimmingCharacters(in: .whitespacesAndNewlines), filter: view.filter, sort: view.sort, limit: view.limit)
            let db = self.db
            return NamedEdit(name: "View edit", changes: [], reload: false, action: {
                if let previous { _ = try await db.saveUniqueView(previous, at: Self.now) }
                else { try await db.record(.deleteView(viewId: clean.id), at: Self.now) }
            }, inverseAction: { _ = try await db.saveUniqueView(clean, at: Self.now) }, sessionID: sessionID)
        }
        await changed()
    }
    /// The sheet waits for its queued live writes before cancelling. A failed restore keeps
    /// both the sheet and its drafts available for retry.
    public func cancelViewEdits(initial: PodListDomain.View, creating: Bool, sessionID: UUID) async throws {
        if !creating, edits.history.contains(where: { $0.sessionID == sessionID }) {
            try await edits.performExternal(recordHistory: false) {
                _ = try await self.db.saveUniqueView(initial, at: Self.now)
                return NamedEdit(name: "Cancel View edits", changes: [], reload: false)
            }
            await changed()
        }
        edits.discardViewSession(sessionID)
        clearViewDrafts(initial.id, creating: creating)
        error = nil
    }
    public func clearViewDrafts(_ id: String, creating: Bool) {
        for field in ["view.\(id)", "rename.\(id)", "limit.\(id)", "\(id).Minimum length (minutes)", "\(id).Maximum length (minutes)"] {
            clearDraft(field)
        }
        if creating { clearDraft("newViewID") }
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
            return NamedEdit(name: "Subscribe", changes: [], reload: true,
                action: { try await source.unsubscribe(sub.id) }, inverseAction: { _ = try await source.subscribe(feed) }, message: "Subscribed to \(sub.title)")
        }
        await changed()
    }
    public func unsubscribe(_ sub: Subscription) async throws {
        try await edits.performExternal {
            try await self.source.unsubscribe(sub.id)
            let source = self.source
            return NamedEdit(name: "Unsubscribe", changes: [], reload: true,
                action: { _ = try await source.subscribe(sub.feedUrl) }, inverseAction: { try await source.unsubscribe(sub.id) }, message: "Unsubscribed from \(sub.title)")
        }
        await changed()
    }
    public func prepareEpisode(_ feed: String, guid: String) async throws -> String {
        let id = try await source.bringEpisode(feed, guid: guid)
        await changed()
        return id
    }
    public func bring(_ feed: String, guid: String, play: Bool, app: ApplicationModel) async throws {
        let id = try await prepareEpisode(feed, guid: guid)
        _ = await edits.add([id], placement: play ? .now : .last)
    }
    public func undo() async { await edits.reverse(); error = edits.error; await changed() }
    public func redo() async { await edits.reverse(redo: true); error = edits.error; await changed() }
    public func run(_ action: @escaping @MainActor () async throws -> Void) {
        Task { do { try await action(); error = nil } catch { self.error = LibraryMessages.failure(error) } }
    }
    public func selectOPML(_ xml: String, name: String) async {
        guard !busy else { return }
        do { await selectImportFeeds(try OPML.parse(xml), name: name) }
        catch {
            cancelImportSelection(); importName = name; importPresented = true
            self.error = LibraryMessages.failure(error)
        }
    }
    func selectImportFeeds(_ feeds: [String], name: String, droppedBatch: Bool = false, selectionError: String? = nil) async {
        guard !busy else { return }
        cancelImportSelection(); importName = name; importPresented = true; error = selectionError
        groupsDroppedImport = droppedBatch
        let version = importSelectionVersion
        do {
            let known = Set(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.map(\.feedUrl))
            guard version == importSelectionVersion, !busy else { return }
            importFeeds = feeds; importTotal = feeds.count
            importExisting = feeds.filter { known.contains($0) }.count; importReady = !feeds.isEmpty
        } catch { if version == importSelectionVersion { self.error = LibraryMessages.failure(error) } }
    }
    public func cancelImportSelection() {
        guard !busy else { return }
        groupsDroppedImport = false
        importSelectionVersion += 1
        importReady = false; importName = ""; importFeeds = []; importResults = [:]
        importTotal = 0; importCompleted = 0; importFailed = []; importFailureReasons = [:]
    }
    private struct ImportJournal: Codable {
        let name: String
        let feeds: [String]
        let results: [String: String]
        let failures: [String: String]
        var droppedBatch: Bool? = nil
    }
    private func saveImport() {
        if let data = try? JSONEncoder().encode(ImportJournal(name: importName, feeds: importFeeds, results: importResults, failures: importFailureReasons, droppedBatch: groupsDroppedImport)) {
            defaults.set(data, forKey: key("opmlImport"))
        }
    }
    public func resumeImport() {
        guard !busy, importTask == nil, let data = defaults.data(forKey: key("opmlImport")),
              let job = try? JSONDecoder().decode(ImportJournal.self, from: data) else { return }
        groupsDroppedImport = job.droppedBatch == true
        importName = job.name; importFeeds = job.feeds; importResults = job.results
        importFailureReasons = job.failures; importFailed = job.feeds.filter { job.failures[$0] != nil }
        importTotal = job.feeds.count; importCompleted = job.results.count
        startImport(resuming: true)
    }
    public func startImport(resuming: Bool = false) {
        guard !busy, importTask == nil, resuming || importReady else { return }
        // This unstructured task belongs to the editor, not the sheet's lifetime.
        importReady = false; busy = true; saveImport()
        importTask = Task { await performImport(); importTask = nil }
    }
    public func importSelected() async {
        guard !busy, importReady else { return }
        busy = true; importReady = false
        await performImport()
    }
    private func performImport() async {
        error = nil; saveImport()
        defer { busy = false }
        do {
            if groupsDroppedImport {
                let group = DroppedSubscriptionEdit(), source = source
                // Serialize the whole batch with other edits. The successful subset
                // becomes one history step, including when some feeds fail.
                try await edits.performExternal {
                    try await self.performImportFeeds(group: group)
                    let subscriptions = group.subscriptions
                    guard !subscriptions.isEmpty else { return nil }
                    return NamedEdit(name: "Import Podcasts", changes: [], reload: true,
                        action: { for sub in subscriptions.reversed() { try await source.unsubscribe(sub.id) } },
                        inverseAction: { for sub in subscriptions { _ = try await source.subscribe(sub.feedUrl) } }, message: self.notice)
                }
            } else { try await performImportFeeds(group: nil) }
        } catch { self.error = LibraryMessages.failure(error) }
    }
    private func performImportFeeds(group: DroppedSubscriptionEdit?) async throws {
        var known = Set(try await db.readLibrary().subscriptions.filter { $0.unsubscribedAt == nil }.map(\.feedUrl))
        for feed in importFeeds where importResults[feed] == nil {
            if known.contains(feed) { importResults[feed] = "Already in the Library" }
            else {
                do { try await subscribeImportedFeed(feed, group: group); known.insert(feed); importResults[feed] = "Added" }
                catch {
                    importResults[feed] = "Failed"; importFailed.append(feed)
                    importFailureReasons[feed] = LibraryMessages.failure(error)
                }
            }
            importCompleted = importResults.count; saveImport()
        }
        notice = "Imported \(importResults.values.filter { $0 == "Added" }.count); already in the Library \(importResults.values.filter { $0 == "Already in the Library" }.count); failed \(importFailed.count)."
        defaults.removeObject(forKey: key("opmlImport"))
        await changed()
    }
    private func subscribeImportedFeed(_ feed: String, group: DroppedSubscriptionEdit?) async throws {
        guard let group else { try await subscribe(feed); return }
        group.subscriptions.append(try await source.subscribe(feed))
        await changed()
    }
    public func retryImport() async {
        guard !busy else { return }
        for feed in importFailed { importResults.removeValue(forKey: feed) }
        importFailed = []; importFailureReasons = [:]; importReady = true
        importCompleted = importResults.count
        await importSelected()
    }

}

extension LocalDatabase {
    /// Validation and write run without suspension, so two windows cannot create duplicate names.
    public func saveUniqueView(_ view: PodListDomain.View, at: Int64) throws -> PodListDomain.View? {
        let state = try loadState()
        if let problem = ViewEdits.problem(view) { throw FormFailure(message: problem) }
        if let problem = ViewNames.problem(view.name, views: state.views, excluding: view.id) { throw FormFailure(message: problem) }
        var clean = view; clean.name = view.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let previous = state.views.first { $0.id == view.id }
        try record(.saveView(view: clean), at: at)
        return previous
    }
}

/// Collect the successful subset while the shared edit serializer is held.
/// Existing subscriptions are skipped and never included in the inverse.
@MainActor private final class DroppedSubscriptionEdit {
    var subscriptions: [Subscription] = []
}
