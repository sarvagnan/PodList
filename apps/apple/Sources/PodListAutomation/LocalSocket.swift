import Foundation
import Darwin

public enum LocalSocket {
    public static func defaultURL() throws -> URL {
        try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("PodList/Automation/mcp.sock")
    }
    static func address(_ url: URL) throws -> sockaddr_un {
        let bytes = Array(url.path.utf8) + [0]
        var address = sockaddr_un()
        guard bytes.count <= MemoryLayout.size(ofValue: address.sun_path) else { throw AutomationFailure("The MCP socket path is too long.") }
        address.sun_family = sa_family_t(AF_UNIX)
        address.sun_len = UInt8(MemoryLayout<sockaddr_un>.size)
        withUnsafeMutableBytes(of: &address.sun_path) { $0.copyBytes(from: bytes) }
        return address
    }
    static func withAddress<T>(_ address: inout sockaddr_un, _ body: (UnsafePointer<sockaddr>, socklen_t) -> T) -> T {
        withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { body($0, socklen_t(MemoryLayout<sockaddr_un>.size)) }
        }
    }
    static func noSIGPIPE(_ fd: Int32) {
        var yes: Int32 = 1
        _ = setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &yes, socklen_t(MemoryLayout<Int32>.size))
    }
    public static func connect(to url: URL) throws -> Int32 {
        var address = try address(url)
        let fd = socket(AF_UNIX, SOCK_STREAM, 0)
        guard fd >= 0 else { throw AutomationFailure("Could not create the MCP socket.") }
        noSIGPIPE(fd)
        _ = fcntl(fd, F_SETFD, FD_CLOEXEC)
        guard withAddress(&address, { Darwin.connect(fd, $0, $1) }) == 0 else {
            close(fd)
            throw AutomationFailure("Could not connect to PodList. Open the PodList Mac app, then retry. Socket: \(url.path)")
        }
        var uid: uid_t = 0, gid: gid_t = 0
        guard getpeereid(fd, &uid, &gid) == 0, uid == geteuid() else {
            close(fd); throw AutomationFailure("The MCP socket does not belong to this user.")
        }
        return fd
    }
    public static func write(_ data: Data, to fd: Int32) throws {
        try data.withUnsafeBytes { bytes in
            var sent = 0
            while sent < bytes.count {
                let n = Darwin.write(fd, bytes.baseAddress!.advanced(by: sent), bytes.count - sent)
                if n < 0 && errno == EINTR { continue }
                guard n > 0 else { throw AutomationFailure("The MCP connection closed.") }
                sent += n
            }
        }
    }
}

/// POSIX descriptors and listener state belong to `queue`; workers own accepted descriptors.
/// No blocking socket IO runs on the main actor or Swift's cooperative executor.
public final class LocalMCPServer: @unchecked Sendable {
    private let queue = DispatchQueue(label: "app.podlist.mcp.listener")
    private var source: DispatchSourceRead?
    private var clients: Set<Int32> = []
    private var lockFD: Int32 = -1
    private let url: URL
    private let makeHandler: @Sendable () -> MCPHandler
    public init(url: URL, makeHandler: @escaping @Sendable () -> MCPHandler) {
        self.url = url; self.makeHandler = makeHandler
    }
    public func start() throws {
        try queue.sync {
            guard source == nil else { return }
            let directory = url.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                                     attributes: [.posixPermissions: 0o700])
            var info = stat()
            guard lstat(directory.path, &info) == 0, info.st_mode & S_IFMT == S_IFDIR, info.st_uid == geteuid(),
                  chmod(directory.path, 0o700) == 0 else { throw AutomationFailure("The MCP directory must be owned by this user.") }
            let lock = open(directory.appendingPathComponent("server.lock").path, O_CREAT | O_RDWR | O_NOFOLLOW | O_CLOEXEC, 0o600)
            guard lock >= 0 else { throw AutomationFailure("Could not lock the MCP directory.") }
            guard flock(lock, LOCK_EX | LOCK_NB) == 0 else { close(lock); throw AutomationFailure("Another PodList app is already serving MCP.") }
            let fd = socket(AF_UNIX, SOCK_STREAM, 0)
            guard fd >= 0 else { close(lock); throw AutomationFailure("Could not create the MCP listener.") }
            var bound = false
            do {
                if lstat(url.path, &info) == 0 {
                    guard info.st_mode & S_IFMT == S_IFSOCK, info.st_uid == geteuid() else { throw AutomationFailure("An unexpected file occupies the MCP socket path.") }
                    guard unlink(url.path) == 0 else { throw AutomationFailure("Could not remove the old MCP socket.") }
                }
                var address = try LocalSocket.address(url)
                guard LocalSocket.withAddress(&address, { bind(fd, $0, $1) }) == 0 else { throw AutomationFailure("Could not bind the MCP socket: \(String(cString: strerror(errno))).") }
                bound = true
                guard chmod(url.path, 0o600) == 0, listen(fd, 8) == 0, fcntl(fd, F_SETFL, O_NONBLOCK) == 0,
                      fcntl(fd, F_SETFD, FD_CLOEXEC) == 0 else {
                    throw AutomationFailure("Could not secure or listen on the MCP socket.")
                }
                lockFD = lock
                let source = DispatchSource.makeReadSource(fileDescriptor: fd, queue: queue)
                source.setEventHandler { [weak self] in self?.acceptClients(fd) }
                source.setCancelHandler { close(fd) }
                self.source = source
                source.resume()
            } catch {
                close(fd); close(lock)
                if bound { unlink(url.path) }
                throw error
            }
        }
    }
    public func stop() {
        queue.sync {
            guard let source else { return }
            self.source = nil; source.cancel()
            for fd in clients { _ = shutdown(fd, SHUT_RDWR) }
            unlink(url.path)
            close(lockFD); lockFD = -1
        }
    }
    private func acceptClients(_ listener: Int32) {
        while true {
            let fd = accept(listener, nil, nil)
            if fd < 0 { return }
            var uid: uid_t = 0, gid: gid_t = 0
            guard clients.count < 8, getpeereid(fd, &uid, &gid) == 0, uid == geteuid() else { close(fd); continue }
            _ = fcntl(fd, F_SETFL, 0)
            _ = fcntl(fd, F_SETFD, FD_CLOEXEC)
            LocalSocket.noSIGPIPE(fd)
            var timeout = timeval(tv_sec: 300, tv_usec: 0)
            _ = setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
            clients.insert(fd)
            let handler = makeHandler()
            DispatchQueue.global(qos: .utility).async { [self] in
                serve(fd, handler: handler)
                queue.sync { _ = clients.remove(fd); close(fd) }
            }
        }
    }
    private func serve(_ fd: Int32, handler: MCPHandler) {
        var buffer = Data(), bytes = [UInt8](repeating: 0, count: 8192)
        while true {
            let n = Darwin.read(fd, &bytes, bytes.count)
            if n < 0 && errno == EINTR { continue }
            guard n > 0 else { return }
            buffer.append(contentsOf: bytes.prefix(n))
            while let newline = buffer.firstIndex(of: 10) {
                let line = Data(buffer[..<newline]); buffer.removeSubrange(...newline)
                guard line.count <= 1_048_576 else { return }
                let reply = SocketReply()
                Task { reply.finish(await handler.handle(line)) }
                reply.done.wait()
                if let data = reply.value, (try? LocalSocket.write(data + Data([10]), to: fd)) == nil { return }
            }
            if buffer.count > 1_048_576 { return }
        }
    }
}

/// The semaphore publishes the reply before the IO worker reads it.
private final class SocketReply: @unchecked Sendable {
    let done = DispatchSemaphore(value: 0)
    private(set) var value: Data?
    func finish(_ value: Data?) { self.value = value; done.signal() }
}
