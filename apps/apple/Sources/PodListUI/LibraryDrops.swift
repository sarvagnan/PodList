#if os(macOS)
import SwiftUI
import UniformTypeIdentifiers
import PodListData

enum LibraryDrop: Equatable, Sendable {
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
    let receive: @MainActor (LibraryDrop) -> Void
    static let types: [UTType] = [.fileURL, .url, .utf8PlainText, .plainText]
    func validateDrop(info: DropInfo) -> Bool {
        available && !info.hasItemsConforming(to: [.podListEpisode]) && info.hasItemsConforming(to: Self.types)
    }
    func dropUpdated(info: DropInfo) -> DropProposal? { DropProposal(operation: validateDrop(info: info) ? .copy : .forbidden) }
    func performDrop(info: DropInfo) -> Bool {
        guard validateDrop(info: info) else { return false }
        let providers = info.itemProviders(for: Self.types)
        guard let provider = providers.first,
              let type = Self.types.first(where: { provider.hasItemConformingToTypeIdentifier($0.identifier) }) else { return false }
        provider.loadDataRepresentation(forTypeIdentifier: type.identifier) { data, _ in
            guard let data, let drop = LibraryDrop.decode(data, type: type) else { return }
            Task { @MainActor in receive(drop) }
        }
        return true
    }
}

extension LibraryEditingModel {
    /// Only stages the existing preview. Import still requires its Import button.
    public func selectOPMLFile(_ url: URL) async {
        guard !busy else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let file = try FileHandle(forReadingFrom: url)
            defer { try? file.close() }
            let bytes = try file.read(upToCount: 8 * 1024 * 1024 + 1) ?? Data()
            guard bytes.count <= 8 * 1024 * 1024, let text = String(data: bytes, encoding: .utf8) else {
                throw SyncResponseFailure("Choose UTF-8 OPML under 8 MiB")
            }
            await selectOPML(text, name: url.lastPathComponent)
        } catch {
            cancelImportSelection(); importName = url.lastPathComponent; importPresented = true
            self.error = "Could not read this OPML file. " + LibraryMessages.failure(error)
        }
    }
}
#endif
