import Foundation

public struct AudioTransfer: Sendable {
    public let file: URL
    public let expectedBytes: Int64
    public init(file: URL, expectedBytes: Int64) { self.file = file; self.expectedBytes = expectedBytes }
}
public protocol AudioDownloadTransport: Sendable {
    func recover() async
    func shutdown() async
    func fetch(_ url: URL, progress: @escaping @Sendable (Int64, Int64) -> Void) async throws -> AudioTransfer
}

public extension AudioDownloadTransport { func shutdown() async {} }

/// Delegate-based downloads support background URLSession (completion-handler tasks do not).
/// Durable requests are owned by DownloadStore. On restart, obsolete daemon tasks are cancelled
/// before those requests are retried; no orphan completion can commit an incomplete download.
public final class URLSessionAudioTransport: NSObject, AudioDownloadTransport, URLSessionDownloadDelegate, @unchecked Sendable {
    private struct Pending {
        let continuation: CheckedContinuation<AudioTransfer, any Error>
        let progress: @Sendable (Int64, Int64) -> Void
        let task: URLSessionDownloadTask
    }
    private let lock = NSLock()
    private var pending: [UUID: Pending] = [:]
    private var cancelled: Set<UUID> = []
    private var session: URLSession!
    private let temporaryDirectory: URL

    public init(identifier: String, directory: URL, background: Bool = Bundle.main.bundleIdentifier != nil) {
        temporaryDirectory = directory
        super.init()
        let config = background ? URLSessionConfiguration.background(withIdentifier: identifier) : .default
        config.httpCookieStorage = nil; config.urlCredentialStorage = nil
        config.httpMaximumConnectionsPerHost = 2
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 24 * 60 * 60
        config.httpAdditionalHeaders = ["User-Agent": "PodList Apple"]
        session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }
    public func shutdown() async { session.invalidateAndCancel() }
    public func recover() async {
        let tasks = await session.allTasks
        tasks.forEach { $0.cancel() }
    }
    public func fetch(_ url: URL, progress: @escaping @Sendable (Int64, Int64) -> Void) async throws -> AudioTransfer {
        let id = UUID()
        return try await withTaskCancellationHandler {
            try Task.checkCancellation()
            return try await withCheckedThrowingContinuation { continuation in
                let task = session.downloadTask(with: url)
                task.taskDescription = id.uuidString
                lock.lock()
                if cancelled.remove(id) != nil {
                    lock.unlock(); continuation.resume(throwing: CancellationError()); return
                }
                pending[id] = Pending(continuation: continuation, progress: progress, task: task)
                lock.unlock()
                task.resume()
            }
        } onCancel: { self.cancel(id) }
    }
    private func cancel(_ id: UUID) {
        lock.lock()
        let request = pending.removeValue(forKey: id)
        if request == nil { cancelled.insert(id) }
        lock.unlock()
        request?.task.cancel(); request?.continuation.resume(throwing: CancellationError())
    }
    private func take(_ task: URLSessionTask) -> Pending? {
        guard let id = task.taskDescription.flatMap(UUID.init(uuidString:)) else { return nil }
        lock.lock(); defer { lock.unlock() }
        return pending.removeValue(forKey: id)
    }
    public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64,
                           totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        guard let id = downloadTask.taskDescription.flatMap(UUID.init(uuidString:)) else { return }
        lock.lock(); let report = pending[id]?.progress; lock.unlock()
        report?(totalBytesWritten, totalBytesExpectedToWrite)
    }
    public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let request = take(downloadTask) else { return }
        do {
            guard let response = downloadTask.response as? HTTPURLResponse, (200...299).contains(response.statusCode) else {
                throw HttpFailure(status: (downloadTask.response as? HTTPURLResponse)?.statusCode ?? 0)
            }
            let file = temporaryDirectory.appendingPathComponent(UUID().uuidString + ".part")
            try FileManager.default.moveItem(at: location, to: file)
            request.continuation.resume(returning: AudioTransfer(file: file, expectedBytes: response.expectedContentLength))
        } catch { request.continuation.resume(throwing: error) }
    }
    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        if let request = take(task) { request.continuation.resume(throwing: error ?? SyncResponseFailure("Incomplete download")) }
    }
}
