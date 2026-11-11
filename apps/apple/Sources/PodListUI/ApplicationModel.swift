import Foundation
import Network
import Observation
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
        if let failure = error as? HttpFailure { return "The server returned HTTP \(failure.status). Try again." }
        if let failure = error as? SyncResponseFailure { return failure.reason + ". Check the server address and try again." }
        if error is DecodingError { return "The server returned an unreadable response. Check the address and try again." }
        if let failure = error as? URLError {
            switch failure.code {
            case .secureConnectionFailed, .serverCertificateUntrusted, .serverCertificateHasBadDate:
                return "A secure connection could not be established. Check the server’s certificate."
            default: return "Could not reach the server. Check the address and your connection, then try again."
            }
        }
        return "Could not open or sync the local Library: \(error)"
    }
}

/// One app-wide session, with independent per-server databases and stable Device identities.
@MainActor @Observable
public final class ApplicationModel {
    @ObservationIgnored public lazy var actions = AutomationActions(app: self)
    public var serverInput = ""
    public private(set) var origin: String?
    public private(set) var connecting = false
    public private(set) var starting = true
    public private(set) var connectionError: String?
    public private(set) var syncError: String?
    public private(set) var syncing = false
    public private(set) var library: LibraryModel?
    public private(set) var libraryEditing: LibraryEditingModel?
    public var isStandalone: Bool { library != nil && origin == nil }
    public private(set) var lastSync: Date?
    public private(set) var editing: PlaylistEditingModel?
    public private(set) var playback: PlaybackController?
    public private(set) var downloadStatuses: [String: DownloadStatus] = [:]
    public private(set) var downloadError: String?
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
    @ObservationIgnored private var periodicTask: Task<Void, Never>?
    @ObservationIgnored private var triggerTask: Task<Void, Never>?
    @ObservationIgnored private var monitor: NWPathMonitor?
    @ObservationIgnored private let automaticSync: Bool

    public init(store: any ConnectionStore = UserDefaultsConnectionStore(),
                automaticSync: Bool = true,
                databaseFactory: @escaping @Sendable (String) throws -> LocalDatabase = ApplicationModel.openDatabase,
                transportFactory: @escaping @Sendable (ServerAddress) -> any SyncTransport = { HttpTransport(address: $0) }) {
        self.store = store; self.databaseFactory = databaseFactory; self.transportFactory = transportFactory
        self.automaticSync = automaticSync
    }

    nonisolated public static func openDatabase(_ id: String) throws -> LocalDatabase {
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("PodList", isDirectory: true)
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
            if automaticSync { requestSync() }
        } catch {
            guard generation == token else { return }
            connectionError = LibraryMessages.failure(error)
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
                await playback?.shutdown(); await downloads?.suspend()
                periodicTask?.cancel(); triggerTask?.cancel(); monitor?.cancel(); ruleTask?.cancel()
                downloads = nil; downloadStatuses = [:]
            }
            try await install(db: db, address: address, token: token, checkedClient: client)
            guard generation == token else { return }
            store.currentOrigin = address.origin.absoluteString
            await sync()
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
        origin = address?.origin.absoluteString
        let source = PodcastLibrary(database: db, transport: address.map { transportFactory($0) })
        libraryEditing = LibraryEditingModel(database: db, source: source, scope: address?.origin.absoluteString ?? "standalone") { [weak self] in
            guard let self, self.generation == token else { return }
            await self.reloadLocal(); self.playback?.refresh(); self.requestSync()
        }
        library = LibraryModel(snapshot: snapshot, deviceID: device.id)
        libraryEditing?.reconcile(snapshot)
        await cleanupTask?.value
        guard generation == token else { return }
        if automaticSync {
            let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            let databaseKey = address.map { store.databaseID(for: $0.origin.absoluteString) } ?? "standalone"
            let directory = base.appendingPathComponent("PodList/Audio/" + databaseKey, isDirectory: true)
            let downloads = try DownloadStore(directory: directory, identifier: "app.podlist.audio." + databaseKey) { [weak self] statuses in
                Task { @MainActor in
                    guard let self, self.generation == token else { return }
                    guard self.downloadStatuses != statuses else { return }
                    self.downloadStatuses = statuses
                    self.scheduleRules()
                }
            }
            self.downloads = downloads
            try await downloads.start()
        }
        guard generation == token else { return }
        playback = PlaybackController(database: db, origin: address?.origin, downloads: downloads, systemIntegration: automaticSync) { [weak self] in
            guard let self, self.generation == token else { return }
            await self.reloadLocal(); self.requestSync()
        }
        editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: address?.origin.absoluteString ?? "standalone"),
            player: { [weak self] in self?.generation == token ? self?.playback : nil },
            changed: { [weak self] in
                guard let self, self.generation == token else { return }
                await self.reloadLocal(); self.requestSync()
            })
        playback?.refresh()
        scheduleRules()
        startAutomaticSync(token: token)
    }

    public func sync() async {
        guard !syncing else { return }
        if isStandalone, let libraryEditing {
            let token = generation
            syncing = true
            var failure: String?
            do { try await libraryEditing.source.refresh() }
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
        var failure: String?
        do { try await client.sync() }
        catch { failure = ConnectionValidation.message(for: error) }
        // Read even on failure: either independent pull may already have committed.
        do {
            let snapshot = try await database.readLibrary()
            guard generation == token else { return }
            library = LibraryModel(snapshot: snapshot, deviceID: deviceID)
            libraryEditing?.reconcile(snapshot)
            playback?.refresh(); scheduleRules()
        } catch { failure = ConnectionValidation.message(for: error) }
        guard generation == token else { return }
        syncing = false; syncError = failure
        if failure == nil { lastSync = Date(); try? await libraryEditing?.initialize() }
    }

    public func requestSync() {
        guard library != nil else { return }
        triggerTask?.cancel()
        triggerTask = Task { [weak self] in
            do { try await Task.sleep(for: .seconds(2)) } catch { return }
            await self?.sync()
        }
    }

    private func startAutomaticSync(token: UUID) {
        guard automaticSync else { return }
        periodicTask?.cancel()
        periodicTask = Task { [weak self] in
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(60)) } catch { return }
                guard let self, self.generation == token else { return }
                do { try await Task.sleep(for: .seconds(2)) } catch { return }
                await self.sync()
            }
        }
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
        guard let database else { return }
        do { try await database.record(change, at: Int64(Date().timeIntervalSince1970 * 1000)); await reloadLocal(); playback?.refresh(); requestSync() }
        catch { syncError = ConnectionValidation.message(for: error) }
    }
    public func setDownloadRule(subscription: String, mode: DownloadMode, cap: Int64?) {
        Task { await record(.setDownloadRule(rule: DownloadRule(subscriptionId: subscription, deviceId: deviceID, mode: mode, keepAtMost: cap))) }
    }
    private func scheduleRules() {
        guard let downloads, let library else { return }
        let origin = origin.flatMap(URL.init(string:))
        ruleTask?.cancel()
        ruleTask = Task { [weak self] in
            do {
                try await Task.sleep(for: .seconds(1))
                try await downloads.apply(snapshot: library.snapshot, deviceID: library.deviceID, origin: origin, now: Int64(Date().timeIntervalSince1970 * 1000))
            } catch is CancellationError {} catch { self?.downloadError = String(describing: error) }
        }
    }
    public func download(_ id: String) {
        guard let downloads else { return }
        let origin = origin.flatMap(URL.init(string:))
        let episode = library?.snapshot.episodes.first { $0.id == id }
        Task { [weak self] in
            do {
                try await downloads.request(id, sources: PlaybackPolicy.sources(stored: nil, host: episode.flatMap { URL(string: $0.audioUrl) }, proxy: origin.map { AudioSource.proxy($0, episodeID: id) }))
                self?.downloadError = nil
            } catch { self?.downloadError = String(describing: error) }
        }
    }
    public func removeDownload(_ id: String) {
        guard let downloads else { return }
        Task { [weak self] in do { try await downloads.remove(id) } catch { self?.downloadError = String(describing: error) } }
    }
    public func shutdownPlayback() async { await playback?.shutdown() }
    public func disconnect() {
        libraryEditing?.endSession()
        let oldPlayback = playback, oldDownloads = downloads
        cleanupTask = Task { await oldPlayback?.shutdown(); await oldDownloads?.suspend() }
        editing = nil; playback = nil; downloads = nil; downloadStatuses = [:]; ruleTask?.cancel()
        generation = UUID()
        periodicTask?.cancel(); triggerTask?.cancel(); monitor?.cancel()
        periodicTask = nil; triggerTask = nil; monitor = nil
        store.currentOrigin = nil
        database = nil; client = nil; library = nil; libraryEditing = nil; origin = nil
        connecting = false; syncing = false; connectionError = nil; syncError = nil; lastSync = nil
    }
}
