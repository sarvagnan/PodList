#if os(macOS)
import AppKit
import UniformTypeIdentifiers

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

    // ExtensionFoundation calls this from its XPC queue, not the main thread, so it
    // must not inherit the view controller's main-actor isolation (the 19 Nov VM run
    // trapped in _checkExpectedExecutor here).
    nonisolated override func beginRequest(with context: NSExtensionContext) {
        nonisolated(unsafe) let context = context
        Task { @MainActor in
            super.beginRequest(with: context)
            await self.forwardShare(context)
        }
    }

    private func forwardShare(_ context: NSExtensionContext) async {
        let providers = context.inputItems.compactMap { $0 as? NSExtensionItem }.flatMap { $0.attachments ?? [] }
        let urls = providers.filter { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }
        guard urls.count == 1, let provider = urls.first, let address = await loadURL(from: provider),
              ["http", "https"].contains(address.scheme?.lowercased() ?? ""),
              address.host?.isEmpty == false, address.user == nil, address.password == nil else {
            cancel(context, message: "Share a single HTTP or HTTPS podcast address.")
            return
        }

        var link = URLComponents()
        link.scheme = "podlist"
        link.host = "add-podcast"
        link.queryItems = [URLQueryItem(name: "url", value: address.absoluteString)]
        // Target the containing copy explicitly. Multiple builds can use the same URL scheme.
        let app = Bundle.main.bundleURL
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        do {
            _ = try await NSWorkspace.shared.open([link.url!], withApplicationAt: app, configuration: .init())
            context.completeRequest(returningItems: nil)
        } catch {
            cancel(context, message: "PodList could not open the shared address.")
        }
    }

    private func loadURL(from provider: NSItemProvider) async -> URL? {
        await withCheckedContinuation { continuation in
            _ = provider.loadObject(ofClass: NSURL.self) { object, _ in
                continuation.resume(returning: object as? URL)
            }
        }
    }

    private func cancel(_ context: NSExtensionContext, message: String) {
        context.cancelRequest(withError: NSError(domain: "PodListShare", code: 1,
                                                 userInfo: [NSLocalizedDescriptionKey: message]))
    }
}
#endif
