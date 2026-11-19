#if os(macOS)
import AppKit
import OSLog
import UniformTypeIdentifiers

private let shareLogger = Logger(subsystem: "app.podlist", category: "share")

@objc(PodListShareViewController)
final class ShareViewController: NSViewController {
    override func loadView() {
        let label = NSTextField(labelWithString: "Opening PodList…")
        label.alignment = .center
        let size = NSSize(width: 240, height: 64)
        view = NSView(frame: NSRect(origin: .zero, size: size))
        preferredContentSize = size
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    // ExtensionFoundation calls this from its XPC queue. Hand the context to the
    // main actor before accessing it or the view controller.
    nonisolated override func beginRequest(with context: NSExtensionContext) {
        shareLogger.notice("Received Share request")
        nonisolated(unsafe) let context = context
        Task { @MainActor in
            shareLogger.notice("Share request reached the main actor")
            super.beginRequest(with: context)
            await self.forwardShare(context)
        }
    }

    private func forwardShare(_ context: NSExtensionContext) async {
        let items = context.inputItems
        let providers = items.compactMap { $0 as? NSExtensionItem }.flatMap { $0.attachments ?? [] }
        let itemTypes = items.map { String(describing: type(of: $0)) }.joined(separator: ", ")
        let attachmentTypes = providers.map { $0.registeredTypeIdentifiers.joined(separator: ", ") }.joined(separator: " | ")
        shareLogger.notice("Share input types: [\(itemTypes, privacy: .public)]. Attachment types: [\(attachmentTypes, privacy: .public)]")
        guard let address = await loadAddress(from: providers) else {
            cancel(context, message: "Share a single HTTP or HTTPS podcast address.")
            return
        }
        shareLogger.notice("Loaded shared URL: \(address.absoluteString, privacy: .private)")

        var link = URLComponents()
        link.scheme = "podlist"
        link.host = "add-podcast"
        link.queryItems = [URLQueryItem(name: "url", value: address.absoluteString)]
        // Target the containing copy explicitly. Multiple builds can use the same URL scheme.
        let app = Bundle.main.bundleURL
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let handoff = link.url!
        shareLogger.notice("Calling NSWorkspace.open for \(app.lastPathComponent, privacy: .public): \(handoff.absoluteString, privacy: .private)")
        do {
            let opened = try await NSWorkspace.shared.open([handoff], withApplicationAt: app, configuration: .init())
            shareLogger.notice("NSWorkspace accepted Share handoff for \(opened.bundleIdentifier ?? "unknown", privacy: .public), PID \(opened.processIdentifier). Completing request.")
            context.completeRequest(returningItems: nil)
        } catch {
            let error = error as NSError
            shareLogger.error("NSWorkspace Share handoff failed: \(error.domain, privacy: .public) code \(error.code). \(error.localizedDescription, privacy: .private)")
            cancel(context, message: "PodList could not open the shared address.")
        }
    }

    private func loadAddress(from providers: [NSItemProvider]) async -> URL? {
        // Prefer an explicit web URL. A share can also include its title as text.
        // Some text providers respond only to their exact encoding's identifier.
        let groups: [[UTType]] = [[.url], [.utf8PlainText, .utf16PlainText, .utf16ExternalPlainText, .plainText]]
        for representations in groups {
            var addresses: Set<URL> = []
            for provider in providers {
                for type in representations where provider.hasItemConformingToTypeIdentifier(type.identifier) {
                    guard let address = await loadAddress(from: provider, representation: type) else { continue }
                    addresses.insert(address)
                    break
                }
                if addresses.count > 1 {
                    shareLogger.error("Share contains multiple distinct URLs")
                    return nil
                }
            }
            if let address = addresses.first { return address }
        }
        return nil
    }

    private func loadAddress(from provider: NSItemProvider, representation: UTType) async -> URL? {
        let identifier = representation.identifier
        shareLogger.notice("Loading Share representation \(identifier, privacy: .public)")
        return await withCheckedContinuation { continuation in
            // Safari's legacy item provider can vend an object for a UTI even if
            // it does not offer an NSURL object representation.
            provider.loadItem(forTypeIdentifier: identifier, options: nil) { @Sendable item, error in
                if let error {
                    let error = error as NSError
                    shareLogger.error("Loading \(identifier, privacy: .public) failed: \(error.domain, privacy: .public) code \(error.code). \(error.localizedDescription, privacy: .private)")
                }
                let itemType = item.map { String(describing: type(of: $0)) } ?? "nil"
                let address = Self.webAddress(from: item, representation: representation)
                shareLogger.notice("Share representation \(identifier, privacy: .public) returned \(itemType, privacy: .public); valid URL: \(address != nil)")
                continuation.resume(returning: address)
            }
        }
    }

    private nonisolated static func webAddress(from item: (any NSSecureCoding)?, representation: UTType) -> URL? {
        let text: String
        switch item {
        case let url as URL: text = url.absoluteString
        case let string as String: text = string
        case let data as Data:
            let encoding: String.Encoding = [.utf16PlainText, .utf16ExternalPlainText].contains(representation) ? .utf16 : .utf8
            guard let string = String(data: data, encoding: encoding) else { return nil }
            text = string
        default: return nil
        }
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.contains(where: \.isWhitespace), let url = URL(string: value),
              ["http", "https"].contains(url.scheme?.lowercased() ?? ""),
              url.host?.isEmpty == false, url.user == nil, url.password == nil else { return nil }
        return url
    }

    private func cancel(_ context: NSExtensionContext, message: String) {
        shareLogger.error("Cancelling Share request: \(message, privacy: .public)")
        context.cancelRequest(withError: NSError(domain: "PodListShare", code: 1,
                                                 userInfo: [NSLocalizedDescriptionKey: message]))
    }
}
#endif
