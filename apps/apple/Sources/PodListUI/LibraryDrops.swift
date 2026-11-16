#if os(macOS)
import SwiftUI
import UniformTypeIdentifiers
import PodListData

enum LibraryDrop: Hashable, Sendable {
    case opml(URL)
    case feed(URL)

    static func classify(_ url: URL) -> Self? {
        if url.isFileURL { return url.pathExtension.lowercased() == "opml" ? .opml(url) : nil }
        guard let web = ShareLinks.web(url.absoluteString), web.user == nil, web.password == nil else { return nil }
        return .feed(web)
    }
    static func decode(_ data: Data, type: UTType) -> Self? {
        if type.conforms(to: .url), let url = URL(dataRepresentation: data, relativeTo: nil) { return classify(url) }
        guard let text = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
              let url = URL(string: text), !url.isFileURL else { return nil }
        return classify(url)
    }
}

/// Refuse our own rich Episode drags here: their public URL fallback must not
/// accidentally open Add podcasts when dragged across the window.
struct LibraryWindowDropTarget: DropDelegate {
    let available: Bool
    let receive: @MainActor (LibraryDropBatch) async -> Void
    static let types: [UTType] = [.fileURL, .url, .utf8PlainText, .plainText]
    func validateDrop(info: DropInfo) -> Bool {
        available && !info.hasItemsConforming(to: [.podListEpisode]) && info.hasItemsConforming(to: Self.types)
    }
    func dropUpdated(info: DropInfo) -> DropProposal? { DropProposal(operation: validateDrop(info: info) ? .copy : .forbidden) }
    func performDrop(info: DropInfo) -> Bool {
        guard validateDrop(info: info) else { return false }
        let providers = info.itemProviders(for: Self.types)
        guard !providers.isEmpty else { return false }
        Task { @MainActor in await receive(await LibraryDropBatch.load(providers)) }
        return true
    }
}

/// Read every provider in transfer order, even if an earlier provider fails.
struct LibraryDropBatch: Sendable {
    var items: [LibraryDrop] = []
    var failures: [String] = []

    @MainActor static func load(_ providers: [NSItemProvider]) async -> Self {
        var batch = Self(), seen = Set<LibraryDrop>()
        for (index, provider) in providers.enumerated() {
            var decoded: LibraryDrop?
            for type in LibraryWindowDropTarget.types where provider.hasItemConformingToTypeIdentifier(type.identifier) {
                let data: Data? = await withCheckedContinuation { continuation in
                    provider.loadDataRepresentation(forTypeIdentifier: type.identifier) { data, _ in continuation.resume(returning: data) }
                }
                if let data, let item = LibraryDrop.decode(data, type: type) { decoded = item; break }
            }
            if let decoded {
                if seen.insert(decoded).inserted { batch.items.append(decoded) }
            } else { batch.failures.append("Item \(index + 1): Could not read a feed address or OPML file. Try dropping it again.") }
        }
        return batch
    }
}

extension LibraryEditingModel {
    /// Only stages the existing preview. Import still requires its Import button.
    public func selectOPMLFile(_ url: URL) async {
        await selectOPMLFiles([url])
    }

    public func selectOPMLFiles(_ urls: [URL]) async {
        await selectLibraryDrops(LibraryDropBatch(items: urls.map(LibraryDrop.opml)))
    }

    func selectLibraryDrops(_ batch: LibraryDropBatch) async {
        guard !busy else { return }
        var feeds: [String] = [], seen = Set<String>(), failures = batch.failures
        for item in batch.items {
            do {
                let incoming: [String]
                switch item {
                case let .feed(url): incoming = [url.absoluteString]
                case let .opml(url): incoming = try OPML.parse(Self.readDroppedOPML(url))
                }
                feeds += incoming.filter { seen.insert($0).inserted }
            } catch {
                let name: String
                switch item { case let .opml(url): name = url.lastPathComponent; case let .feed(url): name = url.absoluteString }
                failures.append("\(name): \(LibraryMessages.failure(error)) Try dropping it again.")
            }
        }
        let name: String
        if batch.items.count == 1, case let .opml(url) = batch.items[0] { name = url.lastPathComponent }
        else { name = "Dropped Podcasts" }
        // Use the same versioned selection and known-subscription accounting as File > Import.
        let problem = failures.isEmpty ? nil : "\(feeds.count) unique feed addresses ready; \(failures.count) dropped items failed.\n" + failures.joined(separator: "\n")
        await selectImportFeeds(feeds, name: name, droppedBatch: true, selectionError: problem)
    }

    private static func readDroppedOPML(_ url: URL) throws -> String {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let file = try FileHandle(forReadingFrom: url)
        defer { try? file.close() }
        let bytes = try file.read(upToCount: 8 * 1024 * 1024 + 1) ?? Data()
        guard bytes.count <= 8 * 1024 * 1024, let text = String(data: bytes, encoding: .utf8) else {
            throw SyncResponseFailure("Choose UTF-8 OPML under 8 MiB")
        }
        return text
    }
}
#endif
