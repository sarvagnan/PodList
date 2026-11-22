import Foundation
import Network
import Observation
import PodListAutomation
import PodListData
import PodListDomain

@MainActor
public protocol ConnectionStore: AnyObject {
    var currentOrigin: String? { get set }
    func databaseID(for origin: String) -> String
}

@MainActor
public final class UserDefaultsConnectionStore: ConnectionStore {
    private let defaults: UserDefaults
    public init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    public var currentOrigin: String? {
        get { defaults.string(forKey: "PodList.serverOrigin") }
        set { defaults.set(newValue, forKey: "PodList.serverOrigin") }
    }
    public func databaseID(for origin: String) -> String {
        var ids = defaults.dictionary(forKey: "PodList.serverDatabases") as? [String: String] ?? [:]
        if let id = ids[origin] { return id }
        let id = UUID().uuidString
        ids[origin] = id; defaults.set(ids, forKey: "PodList.serverDatabases")
        return id
    }
}

public enum ConnectionValidation {
    public static func address(_ input: String) throws -> ServerAddress {
        // Local HTTP is for the repository's demo server. Other servers require HTTPS.
        try ServerAddress(input, allowInsecureLocalhost: true)
    }
    public static func message(for error: any Error) -> String {
        LibraryMessages.log(error, operation: "Open or sync Library")
        if let failure = error as? SyncCompatibilityFailure { return failure.message }
        if let failure = error as? HttpFailure { return "The server returned HTTP \(failure.status). Try again." }
        if error is SyncResponseFailure { return "The server response could not be read. Check the server address and try again. If it keeps failing, check for updates." }
        if error is DecodingError { return "The server returned an unreadable response. Check the address and try again." }
        if let failure = error as? URLError {
            switch failure.code {
            case .secureConnectionFailed, .serverCertificateUntrusted, .serverCertificateHasBadDate:
                return "A secure connection could not be established. Check the server’s certificate."
            default: return "Could not reach the server. Check the address and your connection, then try again."
            }
        }
        return "Could not open or sync the local Library. Try again. If it keeps failing, reopen PodList."
    }
}

enum FeedRefreshTarget: Equatable {
    case all, subscription(String)
}

struct FeedRefreshIssue {
    let target: FeedRefreshTarget
    let message: String
}

/// One app-wide session, with independent per-server databases and stable Device identities.
@MainActor @Observable
public final class ApplicationModel {
    #if os(macOS)
    @ObservationIgnored let nowPlayingNavigation = NowPlayingLibraryNavigation()
    #endif
    @ObservationIgnored public lazy var actions = AutomationActions(app: self)
    @ObservationIgnored public lazy var automation = AutomationSettings { [weak self] name, arguments in
        guard let self else { throw AutomationFailure("PodList is not running.") }
        return try await self.actions.perform(name, arguments: arguments)
    }
    @ObservationIgnored public let donations: ActionDonations
    public var serverInput = ""
    public private(set) var origin: String?
    public private(set) var connecting = false
    public private(set) var starting = true
    public private(set) var connectionError: String? { didSet { announcements.error(connectionError) } }
    private var compatibilityFailure: SyncCompatibilityFailure?
    public private(set) var syncError: String? { didSet { announcements.error(syncError) } }
    public private(set) var syncing = false
    private(set) var refreshingFeeds: FeedRefreshTarget?
    private(set) var feedRefreshIssue: FeedRefreshIssue? { didSet { announcements.error(feedRefreshIssue?.message) } }
    @ObservationIgnored public var libraryChanged: (@MainActor (LibraryModel?, String?) -> Void)?
    public private(set) var library: LibraryModel? {
        didSet { libraryChanged?(library, origin) }
    }
    public private(set) var libraryEditing: LibraryEditingModel?
    public var isStandalone: Bool { library != nil && origin == nil }
    public private(set) var bringOverPreview: BringOverPreview?
    public private(set) var bringOverJob: BringOverJob?
    public private(set) var bringOverError: String? { didSet { announcements.error(bringOverError) } }
    public private(set) var bringOverAvailable = false
    @ObservationIgnored private var bringOver: BringOver?
    @ObservationIgnored private var bringOverSnapshot: BringOverSnapshot?
    public private(set) var lastSync: Date?
    public private(set) var editing: PlaylistEditingModel?
    public private(set) var playback: PlaybackController?
    public private(set) var downloadStatuses: [String: DownloadStatus] = [:]
    public private(set) var downloadError: String? { didSet { announcements.error(downloadError) } }
    @ObservationIgnored var announcements = FeedbackAnnouncements()
    private enum DownloadRetry { case rules, request(String), remove(String) }
    @ObservationIgnored private var downloadRetry: DownloadRetry?
    public func retryDownloadFailure() {
        announcements.error(nil)
        switch downloadRetry {
        case .rules: scheduleRules()
        case let .request(id): download(id)
        case let .remove(id): removeDownload(id)
        case nil: break
        }
    }
    @ObservationIgnored private var downloads: DownloadStore?
    @ObservationIgnored private var cleanupTask: Task<Void, Never>?
    @ObservationIgnored private var ruleTask: Task<Void, Never>?

    @ObservationIgnored private let store: any ConnectionStore
    @ObservationIgnored private let databaseFactory: @Sendable (String) throws -> LocalDatabase
    @ObservationIgnored private let transportFactory: @Sendable (ServerAddress) -> any SyncTransport
    @ObservationIgnored private var database: LocalDatabase?
    @ObservationIgnored private var client: SyncClient?
    @ObservationIgnored private var deviceID = ""
    @ObservationIgnored private var generation = UUID()
    @ObservationIgnored private var started = false
    @ObservationIgnored private var syncTask: Task<Void, Never>?
    @ObservationIgnored private var syncSchedule = SyncSchedule()
    @ObservationIgnored private var monitor: NWPathMonitor?
    @ObservationIgnored private let automaticSync: Bool

    public init(store: any ConnectionStore = UserDefaultsConnectionStore(),
                automaticSync: Bool = true,
                databaseFactory: @escaping @Sendable (String) throws -> LocalDatabase = ApplicationModel.openDatabase,
                transportFactory: @escaping @Sendable (ServerAddress) -> any SyncTransport = { HttpTransport(address: $0) },
                donations: ActionDonations = ActionDonations()) {
        self.store = store; self.databaseFactory = databaseFactory; self.transportFactory = transportFactory
        self.automaticSync = automaticSync
        self.donations = donations
    }

    nonisolated public static func openDatabase(_ id: String) throws -> LocalDatabase {
        let directory = try ApplicationStorage.directory()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return try LocalDatabase(path: directory.appendingPathComponent(id + ".sqlite").path, standalone: id == "standalone")
    }

    public func start() async {
        guard !started else { return }
        started = true
        defer { starting = false }
        guard let saved = store.currentOrigin else { return }
        if saved == "standalone" { await startStandalone(); return }
        serverInput = saved
        let token = generation
        do {
            let address = try ConnectionValidation.address(saved)
            let db = try databaseFactory(store.databaseID(for: saved))
            try await install(db: db, address: address, token: token)
        } catch {
            guard generation == token else { return }
            connectionError = ConnectionValidation.message(for: error)
            return
        }
        starting = false
        await sync()
        await offerBringOver(showPreview: false)
    }

    public func startStandalone() async {
        guard !connecting, library == nil else { return }
        connecting = true; connectionError = nil
        let token = generation
        defer { if generation == token { connecting = false } }
        do {
            let db = try databaseFactory("standalone")
            try await install(db: db, address: nil, token: token)
            guard generation == token else { return }
            store.currentOrigin = "standalone"
            try await libraryEditing?.initialize()
            libraryEditing?.resumeImport()
            if automaticSync { requestSync() }
        } catch {
            guard generation == token else { return }
            connectionError = ConnectionValidation.message(for: error)
        }
    }

    public func connect() async {
        guard !connecting, origin == nil else { return }
        connecting = true; connectionError = nil
        var token = generation
        defer { if generation == token { connecting = false } }
        do {
            let address: ServerAddress
            do { address = try ConnectionValidation.address(serverInput) }
            catch { connectionError = "Enter an HTTPS server address, or http://127.0.0.1:PORT for the local demo. Use only the address, without a path or sign-in details."; return }
            let db = try databaseFactory(store.databaseID(for: address.origin.absoluteString))
            let client = SyncClient(db: db, transport: transportFactory(address))
            _ = try await client.health()
            guard generation == token else { return }
            if library != nil {
                generation = UUID(); token = generation
                libraryEditing?.endSession(); syncing = false; syncError = nil; lastSync = nil
                refreshingFeeds = nil; feedRefreshIssue = nil
                await playback?.shutdown(); await downloads?.suspend()
                if let database {
                    bringOverSnapshot = try await database.bringOverSnapshot(downloads: downloads?.bringOverDownloads() ?? [])
                }
                syncTask?.cancel(); monitor?.cancel(); ruleTask?.cancel()
                downloads = nil; downloadStatuses = [:]
            }
            try await install(db: db, address: address, token: token, checkedClient: client)
            guard generation == token else { return }
            store.currentOrigin = address.origin.absoluteString
            await sync()
            await offerBringOver(showPreview: true)
        } catch {
            guard generation == token else { return }
            connectionError = ConnectionValidation.message(for: error)
        }
    }

    private func install(db: LocalDatabase, address: ServerAddress?, token: UUID, checkedClient: SyncClient? = nil) async throws {
        try await db.ensureState()
        let device = try await db.installation()
        let snapshot = try await db.readLibrary()
        guard generation == token else { return }
        database = db; deviceID = device.id
        client = address.map { checkedClient ?? SyncClient(db: db, transport: transportFactory($0)) }
        await client?.observeLibraryPages { [weak self] in
            guard let self else { return }
            await self.libraryPageCommitted(token: token)
        }
        origin = address?.origin.absoluteString
        let source = PodcastLibrary(database: db, transport: address.map { transportFactory($0) })
        library = LibraryModel(snapshot: snapshot, deviceID: device.id)
        await cleanupTask?.value
        guard generation == token else { return }
        if automaticSync {
            let databaseKey = address.map { store.databaseID(for: $0.origin.absoluteString) } ?? "standalone"
            let directory = try Self.audioDirectory(databaseKey)
            let downloads = try DownloadStore(directory: directory, identifier: "app.podlist.audio." + databaseKey) { [weak self] statuses in
                Task { @MainActor in
                    guard let self, self.generation == token else { return }
                    guard self.downloadStatuses != statuses else { return }
                    self.receiveDownloadStatuses(statuses)
                    self.scheduleRules()
                }
            }
            self.downloads = downloads
            try await downloads.start()
        }
        guard generation == token else { return }
        if let address, let client {
            bringOverJob = try await db.bringOverJob()
            bringOver = BringOver(destination: db, transport: transportFactory(address), sync: client,
                sourceFiles: automaticSync ? try AudioFiles(directory: Self.audioDirectory("standalone")) : nil,
                destinationDownloads: downloads)
        }
        playback = PlaybackController(database: db, origin: address?.origin, downloads: downloads, systemIntegration: automaticSync, donate: { [weak self] action in
            guard let self, self.generation == token else { return }; self.donations.record(action)
        }) { [weak self] in
            guard let self, self.generation == token else { return }
            await self.reloadLocal(); self.requestSync()
        }
        editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: address?.origin.absoluteString ?? "standalone"),
            player: { [weak self] in self?.generation == token ? self?.playback : nil },
            checkPurgeSupport: { [client = self.client] in try await client?.requirePurgePlaylistSupport() },
            donate: { [weak self] action in
                guard let self, self.generation == token else { return }; self.donations.record(action)
            }, changed: { [weak self] in
                guard let self, self.generation == token else { return }
                await self.reloadLocal(); self.playback?.refresh(); self.requestSync()
            })
        if let editing { announcements = editing.announcements }
        libraryEditing = LibraryEditingModel(database: db, source: source, scope: address?.origin.absoluteString ?? "standalone", edits: editing) { [weak self] in
            guard let self, self.generation == token else { return }
            await self.reloadLocal(); self.playback?.refresh(); self.requestSync()
        }
        libraryEditing?.reconcile(snapshot)
        playback?.refresh()
        scheduleRules()
        startAutomaticSync(token: token)
    }

    public func sync(forceRefresh: Bool = false) async {
        guard !syncing, refreshingFeeds == nil, library != nil else { return }
        await runSyncPass { await syncLibrary(forceRefresh: forceRefresh) }
    }

    var canRefreshFeeds: Bool { libraryEditing != nil && !connecting && !syncing && refreshingFeeds == nil }

    var feedRefreshProgress: String? {
        switch refreshingFeeds {
        case .all: "Refreshing All Feeds…"
        case let .subscription(id): "Refreshing \(refreshPodcastTitle(id) ?? "Podcast")…"
        case nil: nil
        }
    }

    private func refreshPodcastTitle(_ id: String) -> String? {
        library?.snapshot.subscriptions.first { $0.id == id }?.title
    }

    func feedRefreshAction(_ target: FeedRefreshTarget) -> (() -> Void)? {
        guard canRefresh(target) else { return nil }
        let token = generation
        return { [weak self] in
            Task {
                guard let self, self.generation == token else { return }
                await self.refreshFeeds(target)
            }
        }
    }

    private func canRefresh(_ target: FeedRefreshTarget) -> Bool {
        guard canRefreshFeeds else { return false }
        if case let .subscription(id) = target {
            return library?.subscriptions.contains { $0.id == id } == true
        }
        return true
    }

    func refreshFeeds(_ target: FeedRefreshTarget) async {
        guard canRefresh(target), let source = libraryEditing?.source else { return }
        let token = generation
        let standalone = isStandalone
        let podcastTitle = if case let .subscription(id) = target { refreshPodcastTitle(id) } else { nil as String? }
        refreshingFeeds = target
        feedRefreshIssue = nil
        announcements.status(feedRefreshProgress)
        await runSyncPass {
            var message: String?
            var requestCompleted = false
            do {
                switch target {
                case .all:
                    let summary = try await source.refreshAllFeeds()
                    if summary.failed > 0 {
                        let feeds = summary.checked == 1 ? "feed" : "feeds"
                        message = "Could not refresh \(summary.failed) of \(summary.checked) \(feeds). Try again."
                    }
                case let .subscription(id):
                    try await source.refreshSubscription(id)
                }
                requestCompleted = true
            } catch is CancellationError {
                // A cancelled pass has no refresh result to report.
            } catch {
                message = LibraryMessages.feedRefreshFailure(error, podcastTitle: podcastTitle)
            }
            guard generation == token else { return }
            if standalone {
                if target == .all { syncError = nil }
                await reloadLocal()
                guard generation == token else { return }
                playback?.refresh()
                if target == .all && requestCompleted && message == nil && syncError == nil { lastSync = Date() }
            } else if requestCompleted {
                await syncLibrary(forceRefresh: true)
                guard generation == token else { return }
            }
            refreshingFeeds = nil
            if let message { feedRefreshIssue = FeedRefreshIssue(target: target, message: message) }
            else if requestCompleted && syncError == nil {
                announcements.status(target == .all ? "Feeds refreshed." : "Podcast refreshed.")
            }
        }
    }

    private func runSyncPass(_ operation: () async -> Void) async {
        let scheduleToken = generation
        syncTask?.cancel(); syncSchedule.begin()
        defer {
            if generation == scheduleToken, automaticSync {
                scheduleSync(after: syncSchedule.finish(), token: scheduleToken)
            }
        }
        await operation()
    }

    private func syncLibrary(forceRefresh: Bool) async {
        if isStandalone, let libraryEditing {
            let token = generation
            syncing = true
            var failure: String?
            do { try await libraryEditing.source.refresh(respectBackoff: !forceRefresh) }
            catch { failure = LibraryMessages.failure(error) }
            guard generation == token else { return }
            await reloadLocal()
            guard generation == token else { return }
            syncError = failure; syncing = false
            if failure == nil { lastSync = Date() }
            return
        }
        guard let client, let database else { return }
        let token = generation
        syncing = true
        if forceRefresh {
            compatibilityFailure = nil
            await client.retry()
            guard generation == token else { return }
        }
        var failure: String?
        do {
            if let compatibilityFailure { throw compatibilityFailure }
            if let bringOver, let job = try await database.bringOverJob(), !job.complete {
                let result = try await bringOver.resume()
                guard generation == token else { return }
                bringOverJob = result
                bringOverError = LibraryMessages.bringOverIssues(result.issues)
            } else { try await client.sync() }
        } catch {
            if generation == token, let compatibility = error as? SyncCompatibilityFailure { compatibilityFailure = compatibility }
            failure = ConnectionValidation.message(for: error)
            if generation == token, let job = try? await database.bringOverJob(), !job.complete {
                bringOverJob = job; bringOverError = LibraryMessages.failure(error, operation: .bringOver)
            }
        }
        // Read even on failure: either independent pull may already have committed.
        do {
            let snapshot = try await database.readLibrary()
            guard generation == token else { return }
            library = LibraryModel(snapshot: snapshot, deviceID: deviceID)
            libraryEditing?.reconcile(snapshot)
            playback?.refresh(); scheduleRules()
        } catch { failure = ConnectionValidation.message(for: error) }
        guard generation == token else { return }
        syncing = false; syncError = compatibilityFailure?.message ?? failure
        if failure == nil { lastSync = Date(); try? await libraryEditing?.initialize(); libraryEditing?.resumeImport() }
    }

    nonisolated private static func audioDirectory(_ key: String) throws -> URL {
        try ApplicationStorage.directory().appendingPathComponent("Audio/" + key, isDirectory: true)
    }

    /// Not now writes no transfer checkpoint; Settings can offer the retained Library again.
    public func declineBringOver() { bringOverPreview = nil; bringOverSnapshot = nil }
    public func offerBringOver(showPreview: Bool = true) async {
        guard origin != nil, let database, !syncing else { return }
        let token = generation
        do {
            if let job = try await database.bringOverJob() {
                guard token == generation else { return }
                bringOverJob = job; bringOverAvailable = false; return
            }
            let snapshot: BringOverSnapshot
            if let saved = bringOverSnapshot { snapshot = saved }
            else {
                let source = try databaseFactory("standalone")
                try await source.ensureState()
                let audio = automaticSync ? try DownloadStore(directory: Self.audioDirectory("standalone"), identifier: "app.podlist.audio.standalone") : nil
                snapshot = try await source.bringOverSnapshot(downloads: audio?.bringOverDownloads() ?? [])
            }
            let preview = BringOverPreview(source: snapshot, destination: try await database.readLibrary())
            guard token == generation else { return }
            bringOverAvailable = snapshot.worthMoving
            if showPreview && snapshot.worthMoving {
                guard syncError == nil else { throw SyncResponseFailure("Sync the server Library before previewing bring-over") }
                bringOverError = nil; bringOverSnapshot = snapshot; bringOverPreview = preview
            }
        } catch {
            guard token == generation else { return }
            bringOverError = LibraryMessages.failure(error, operation: .bringOver)
        }
    }
    public func acceptBringOver() async {
        guard let database, let snapshot = bringOverSnapshot, bringOverPreview != nil, !syncing else { return }
        let token = generation
        do {
            try await database.beginBringOver(snapshot)
            guard token == generation else { return }
            bringOverJob = try await database.bringOverJob()
            bringOverPreview = nil; bringOverSnapshot = nil; bringOverAvailable = false
            await sync()
        } catch {
            guard token == generation else { return }
            bringOverError = LibraryMessages.failure(error, operation: .bringOver)
        }
    }

    public func requestSync() {
        guard library != nil, automaticSync else { return }
        if syncSchedule.trigger() { scheduleSync(after: SyncSchedule.settle, token: generation) }
    }

    private func scheduleSync(after delay: Duration, token: UUID) {
        syncTask?.cancel()
        syncTask = Task { [weak self] in
            do { try await Task.sleep(for: delay) } catch { return }
            guard let self, self.generation == token else { return }
            // Release the timer before sync, so a pass never cancels its own network work.
            self.syncTask = nil
            if self.syncSchedule.phase == .waiting {
                self.syncSchedule.timeoutReached()
                self.scheduleSync(after: SyncSchedule.settle, token: token)
            } else { await self.sync() }
        }
    }

    private func libraryPageCommitted(token: UUID) async {
        guard generation == token else { return }
        await reloadLocal()
        guard generation == token else { return }
        playback?.refresh()
    }

    private func startAutomaticSync(token: UUID) {
        guard automaticSync else { return }
        syncSchedule = SyncSchedule()
        scheduleSync(after: SyncSchedule.timeout, token: token)
        monitor?.cancel()
        let monitor = NWPathMonitor()
        monitor.pathUpdateHandler = { [weak self] path in
            guard path.status == .satisfied else { return }
            Task { @MainActor [weak self] in
                guard let self, self.generation == token else { return }
                self.requestSync()
            }
        }
        monitor.start(queue: DispatchQueue(label: "app.podlist.network"))
        self.monitor = monitor
    }

    public func reloadLocal() async {
        guard let database else { return }
        let token = generation
        do {
            let snapshot = try await database.readLibrary()
            guard generation == token else { return }
            library = LibraryModel(snapshot: snapshot, deviceID: deviceID)
            libraryEditing?.reconcile(snapshot)
            scheduleRules()
        } catch { syncError = ConnectionValidation.message(for: error) }
    }
    public func record(_ change: Change) async {
        let name: String = switch change {
        case .setPlaybackSettings: "Playback Settings"
        case .setTrashDays: "Trash Retention"
        default: "Library Change"
        }
        _ = await editing?.edit([change], name: name, reload: true)
    }
    public func resolveEpisodeDetails(_ id: String) async {
        guard let database, let library, let episode = library.row(id).episode else { return }
        let token = generation
        var readPublisherMetadata = false
        if library.snapshot.episodeLinks[id] == nil, let sub = library.snapshot.subscriptions.first(where: { $0.id == episode.subscriptionId }) {
            readPublisherMetadata = (try? await libraryEditing?.source.readPodcast(sub.feedUrl)) != nil
        }
        let chapters = try? await ChapterResolver.resolve(episodeID: id, origin: origin.flatMap(URL.init(string:)), database: database)
        guard token == generation else { return }
        // The resolver also caches the fetch date. That alone does not change the Library UI.
        guard readPublisherMetadata || chapters.map({ $0 != episode.chapters }) == true else { return }
        await reloadLocal(); playback?.refresh()
    }
    public func setDownloadRule(subscription: String, mode: DownloadMode, cap: Int64?) {
        Task { _ = await setDownloadRules(subscriptions: [subscription], mode: mode, cap: cap) }
    }
    public func setDownloadRules(subscriptions: [String], mode: DownloadMode, cap: Int64?) async -> Bool {
        guard let editing else { return false }
        var seen = Set<String>()
        let changes = subscriptions.filter { seen.insert($0).inserted }.map {
            Change.setDownloadRule(rule: DownloadRule(subscriptionId: $0, deviceId: deviceID, mode: mode, keepAtMost: cap))
        }
        return await editing.edit(changes, name: "Download Rules")
    }
    private func scheduleRules() {
        guard let downloads, let library else { return }
        let origin = origin.flatMap(URL.init(string:))
        ruleTask?.cancel()
        ruleTask = Task { [weak self] in
            do {
                try await Task.sleep(for: .seconds(1))
                try await downloads.apply(snapshot: library.snapshot, deviceID: library.deviceID, origin: origin, now: Int64(Date().timeIntervalSince1970 * 1000))
                if case .rules? = self?.downloadRetry { self?.downloadError = nil; self?.downloadRetry = nil }
            } catch is CancellationError {} catch {
                self?.downloadRetry = .rules
                self?.downloadError = LibraryMessages.failure(error, operation: .downloadRules)
            }
        }
    }
    /// Only transitions from a running download are completion announcements;
    /// loading stored downloads at launch must stay silent.
    func receiveDownloadStatuses(_ statuses: [String: DownloadStatus]) {
        for id in statuses.keys.sorted() {
            guard let next = statuses[id], let previous = downloadStatuses[id] else { continue }
            let completed = next.phase == .stored && previous.phase != .stored
            let failed = next.phase == .failed && (previous.phase != .failed || previous.error == nil)
            guard completed || failed else { continue }
            let title = library?.snapshot.episodes.first(where: { $0.id == id })?.title ?? "Episode"
            if completed {
                editing?.showNotice("Downloaded \(title) on this Mac.")
            } else {
                // A failed retry is a new event even when the server repeats its error.
                announcements.error(nil)
                announcements.error("Could not download \(title). Check your connection and retry.")
            }
        }
        downloadStatuses = statuses.mapValues { status in
            var safe = status
            if status.phase == .failed {
                if let details = status.error { LibraryMessages.logDetails(details, operation: "Download Episode") }
                safe.error = FailureOperation.download.message
            }
            return safe
        }
    }

    public func download(_ ids: [String]) {
        var seen = Set<String>()
        for id in ids where seen.insert(id).inserted { download(id) }
    }
    public func download(_ id: String) {
        guard let downloads else { return }
        let origin = origin.flatMap(URL.init(string:))
        let episode = library?.snapshot.episodes.first { $0.id == id }
        Task { [weak self] in
            do {
                try await downloads.request(id, sources: PlaybackPolicy.sources(stored: nil, host: episode.flatMap { URL(string: $0.audioUrl) }, proxy: origin.map { AudioSource.proxy($0, episodeID: id) }))
                self?.downloadError = nil; self?.downloadRetry = nil
            } catch {
                self?.downloadRetry = .request(id)
                self?.downloadError = LibraryMessages.failure(error, operation: .download)
            }
        }
    }
    public func removeDownload(_ id: String) {
        guard let downloads else { return }
        Task { [weak self] in
            do { try await downloads.remove(id); self?.downloadError = nil; self?.downloadRetry = nil }
            catch {
                self?.downloadRetry = .remove(id)
                self?.downloadError = LibraryMessages.failure(error, operation: .removeDownload)
            }
        }
    }
    public func shutdownPlayback() async { await playback?.shutdown() }
    public func disconnect() {
        libraryEditing?.endSession()
        let oldPlayback = playback, oldDownloads = downloads, oldBringOver = bringOver
        cleanupTask = Task { await oldBringOver?.suspend(); await oldPlayback?.shutdown(); await oldDownloads?.suspend() }
        editing = nil; playback = nil; downloads = nil; downloadStatuses = [:]; downloadError = nil; downloadRetry = nil; ruleTask?.cancel()
        generation = UUID()
        syncTask?.cancel(); monitor?.cancel()
        syncTask = nil; syncSchedule = SyncSchedule(); monitor = nil
        store.currentOrigin = nil
        database = nil; client = nil; library = nil; libraryEditing = nil; origin = nil
        bringOver = nil; bringOverSnapshot = nil; bringOverPreview = nil; bringOverJob = nil; bringOverError = nil; bringOverAvailable = false
        connecting = false; syncing = false; connectionError = nil; syncError = nil; compatibilityFailure = nil; lastSync = nil
        refreshingFeeds = nil; feedRefreshIssue = nil
    }
}
