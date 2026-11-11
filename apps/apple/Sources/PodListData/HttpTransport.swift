import Foundation

public struct ServerAddress: Sendable, Equatable {
    public let origin: URL
    public init(_ input: String, allowInsecureLocalhost: Bool = false) throws {
        guard var parts = URLComponents(string: input.trimmingCharacters(in: .whitespacesAndNewlines)),
              let host = parts.host, !host.isEmpty, parts.user == nil, parts.password == nil,
              parts.query == nil, parts.fragment == nil, parts.path.isEmpty || parts.path == "/",
              parts.port == nil || (1...65535).contains(parts.port!),
              parts.scheme?.lowercased() == "https" || (allowInsecureLocalhost && parts.scheme?.lowercased() == "http" && ["localhost", "127.0.0.1", "[::1]"].contains(host.lowercased()))
        else { throw SyncResponseFailure("Invalid server origin") }
        parts.scheme = parts.scheme?.lowercased(); parts.host = host.lowercased(); parts.path = ""
        guard let url = parts.url else { throw SyncResponseFailure("Invalid server origin") }
        origin = url
    }
}
public struct HttpFailure: Error, Sendable { public let status: Int }
private final class NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

public struct HttpTransport: SyncTransport {
    private let address: ServerAddress
    private let session: URLSession
    public init(address: ServerAddress) {
        self.address = address
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        session = URLSession(configuration: configuration, delegate: NoRedirects(), delegateQueue: nil)
    }
    public func request(method: String, path: String, body: String?) async throws -> String {
        guard path.hasPrefix("/api/"), let url = URL(string: address.origin.absoluteString + path),
              url.host == address.origin.host, url.scheme == address.origin.scheme, url.port == address.origin.port
        else { throw SyncResponseFailure("Invalid API path") }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = ["/api/subscriptions/import", "/api/subscriptions/bring-over"].contains(path) ? 120 : (["/api/subscriptions", "/api/podcasts/read", "/api/podcasts/episodes"].contains(path) ? 30 : 2)
        request.setValue("PodList Apple", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = Data(body.utf8)
            request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SyncResponseFailure() }
        guard (200...299).contains(http.statusCode) else { throw HttpFailure(status: http.statusCode) }
        guard let text = String(data: data, encoding: .utf8) else { throw SyncResponseFailure("Response is not UTF-8") }
        return text
    }
}
