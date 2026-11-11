import Foundation
import Testing
import PodListDomain
@testable import PodListData

private actor FakeAudioTransport: AudioDownloadTransport {
    var requests: [URL] = []
    var fail = Set<String>()
    var incomplete = Set<String>()
    func recover() async {}
    func configure(fail: Set<String> = [], incomplete: Set<String> = []) { self.fail = fail; self.incomplete = incomplete }
    func fetch(_ url: URL, progress: @escaping @Sendable (Int64, Int64) -> Void) async throws -> AudioTransfer {
        requests.append(url)
        if fail.contains(url.host ?? "") { throw URLError(.cannotConnectToHost) }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".part")
        try Data(repeating: 42, count: 32).write(to: file)
        progress(32, 32)
        return AudioTransfer(file: file, expectedBytes: incomplete.contains(url.host ?? "") ? 64 : 32)
    }
}
private func temporaryAudioDirectory() -> URL { FileManager.default.temporaryDirectory.appendingPathComponent("PodListAudioTests-" + UUID().uuidString) }
@Test func downloadFallsBackForIncompleteFilesAndRestoresManualOwnership() async throws {
    let directory = temporaryAudioDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let transport = FakeAudioTransport()
    await transport.configure(incomplete: ["host"])
    let store = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await store.start()
    let sources = [URL(string: "https://host/audio")!, URL(string: "https://server/proxy")!]
    try await store.request("../episode", sources: sources, manual: false)
    await store.settle()
    #expect(await transport.requests == sources)
    #expect(await store.statuses()["../episode"]?.phase == .stored)
    #expect(await store.statuses()["../episode"]?.received == 32)
    let file = try #require(await store.stored("../episode"))
    #expect(file.deletingLastPathComponent().path == directory.path)
    #expect(file.lastPathComponent.count == 70)
    try await store.request("../episode", sources: sources, manual: true)
    let reopened = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await reopened.start()
    #expect(await reopened.statuses()["../episode"]?.manual == true)
    #expect(await reopened.stored("../episode") == file)
    try await reopened.remove("../episode")
    #expect(await reopened.stored("../episode") == nil && !FileManager.default.fileExists(atPath: file.path))
}
@Test func failedDownloadRequiresExplicitRetryAndMissingCompleteFileIsReconciled() async throws {
    let directory = temporaryAudioDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let transport = FakeAudioTransport()
    await transport.configure(fail: ["host"])
    let store = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await store.start()
    try await store.request("e", sources: [URL(string: "https://host/audio")!])
    await store.settle()
    #expect(await store.statuses()["e"]?.phase == .failed)
    #expect(await store.stored("e") == nil)
    let reopened = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await reopened.start()
    #expect(await reopened.statuses()["e"]?.phase == .failed)
    #expect(await transport.requests.count == 1)
    await transport.configure()
    try await reopened.request("e", sources: [URL(string: "https://host/audio")!])
    await reopened.settle()
    let file = try #require(await reopened.stored("e"))
    try FileManager.default.removeItem(at: file)
    let missing = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await missing.start()
    #expect(await missing.statuses()["e"] == nil)
}
private actor HeldAudioTransport: AudioDownloadTransport {
    var continuations: [CheckedContinuation<Void, Never>] = []
    var waiters: [(Int, CheckedContinuation<Void, Never>)] = []
    var requests = 0
    var active = 0
    var maximum = 0
    func recover() async {}
    func fetch(_ url: URL, progress: @escaping @Sendable (Int64, Int64) -> Void) async throws -> AudioTransfer {
        requests += 1; active += 1; maximum = max(maximum, active)
        await withCheckedContinuation { continuation in
            continuations.append(continuation)
            for waiter in waiters where requests >= waiter.0 { waiter.1.resume() }
            waiters.removeAll { requests >= $0.0 }
        }
        active -= 1
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".part")
        try Data([1]).write(to: file)
        return AudioTransfer(file: file, expectedBytes: 1)
    }
    func waitForRequests(_ count: Int) async {
        if requests >= count { return }
        await withCheckedContinuation { waiters.append((count, $0)) }
    }
    func release() { let all = continuations; continuations = []; all.forEach { $0.resume() } }
}
@Test(.timeLimit(.minutes(1))) func downloadsLimitConcurrencyAndCancellationRejectsLateCompletion() async throws {
    let directory = temporaryAudioDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let transport = HeldAudioTransport()
    let store = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await store.start()
    for id in ["a", "b", "c"] { try await store.request(id, sources: [URL(string: "https://host/\(id)")!]) }
    await transport.waitForRequests(2)
    #expect(await transport.maximum == 2)
    try await store.remove("a")
    await transport.release()
    await transport.waitForRequests(3)
    await transport.release()
    await store.settle()
    #expect(await store.statuses()["a"] == nil)
    #expect(await store.stored("a") == nil)
    #expect(await store.statuses()["b"]?.phase == .stored)
    #expect(await store.statuses()["c"]?.phase == .stored)
}
@Test func audioFilesNeverExposeIncompleteTransfer() throws {
    let directory = temporaryAudioDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let files = try AudioFiles(directory: directory)
    let partial = directory.appendingPathComponent("transfer.part")
    try Data([1, 2]).write(to: partial)
    #expect(throws: (any Error).self) { try files.commit(partial, id: "e", expected: 3) }
    #expect(files.stored("e", bytes: 2) == nil)
    #expect(try files.commit(partial, id: "e", expected: 2) == 2)
    #expect(files.stored("e", bytes: 3) == nil)
    #expect(files.stored("e", bytes: 2) != nil)
}

@Test func downloadRulesExecuteLibraryChangesAndPreserveManualDownloads() async throws {
    let directory = temporaryAudioDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let transport = FakeAudioTransport()
    let store = try DownloadStore(directory: directory, identifier: UUID().uuidString, transport: transport)
    try await store.start()
    let episode = Episode(id: "e", subscriptionId: "s", guid: "e", title: "Episode", description: "", published: 150, duration: 100,
        audioUrl: "https://host/audio", artwork: nil, chapters: [], audioUpdatedAt: nil)
    var state = State.initial()
    state.downloadRules = [.init(subscriptionId: "s", deviceId: "mac", mode: .allNew, keepAtMost: 1, since: 100)]
    let origin = URL(string: "https://server")!
    try await store.apply(snapshot: .init(state: state, subscriptions: [], episodes: []), deviceID: "mac", origin: origin, now: 200)
    #expect(await transport.requests.isEmpty)
    // No State change: receiving an Episode alone is sufficient to plan its download.
    try await store.apply(snapshot: .init(state: state, subscriptions: [], episodes: [episode]), deviceID: "mac", origin: origin, now: 200)
    await store.settle()
    #expect(await store.stored("e") != nil)
    try await store.request("manual", sources: [URL(string: "https://host/manual")!], manual: true)
    await store.settle()
    state.downloadRules = []
    try await store.apply(snapshot: .init(state: state, subscriptions: [], episodes: [episode]), deviceID: "mac", origin: origin, now: 300)
    #expect(await store.stored("e") == nil)
    #expect(await store.stored("manual") != nil)
}
