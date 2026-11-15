#if os(macOS)
import SwiftUI
import AppKit
import UniformTypeIdentifiers
import PodListDomain
import PodListData

extension UTType {
    static let podListEpisode = UTType(exportedAs: "app.podlist.episode", conformingTo: .data)
}

/// Feed/GUID identifies an Episode on a publisher page before it has been brought
/// into the Library. Entries always carry their stable local Episode ID.
struct DraggedEpisode: Codable, Equatable, Hashable, Sendable {
    var episodeID: String?
    var feedURL: String? = nil
    var guid: String? = nil

    var isValid: Bool {
        if let episodeID { return !episodeID.isEmpty }
        return feedURL.flatMap(ShareLinks.web) != nil && guid?.isEmpty == false
    }
}

struct EpisodeTransfer: Codable, Equatable, Sendable, Transferable {
    let episodes: [DraggedEpisode]
    let sourcePlaylistID: String?
    let title: String
    let shareURL: URL?

    var isValid: Bool {
        !episodes.isEmpty && episodes.allSatisfy(\.isValid) &&
        (sourcePlaylistID.map { !$0.isEmpty && episodes.allSatisfy { $0.episodeID != nil } } ?? true)
    }
    func encoded() throws -> Data { try JSONEncoder().encode(self) }
    static func decoded(_ data: Data) throws -> Self {
        let value = try JSONDecoder().decode(Self.self, from: data)
        guard value.isValid else { throw SyncResponseFailure("Invalid Episode drag") }
        return value
    }
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(contentType: .podListEpisode, exporting: { try $0.encoded() }, importing: { try decoded($0) })
        DataRepresentation(exportedContentType: .url) { value in
            guard let url = value.shareURL else { throw SyncResponseFailure("No Episode share URL") }
            return url.dataRepresentation
        }.exportingCondition { $0.shareURL != nil }
        ProxyRepresentation(exporting: \.title)
    }

    /// Include the ordered selection in the private representation, preserving
    /// multi-row moves even when the system asks only the dragged row for data.
    @MainActor static func local(_ id: String, selection: [String], sourcePlaylistID: String? = nil, library: LibraryModel) -> Self {
        Self(episodes: (selection.contains(id) ? selection : [id]).map { DraggedEpisode(episodeID: $0) },
             sourcePlaylistID: sourcePlaylistID, title: library.row(id).title, shareURL: library.episodeShareURL(id))
    }
}

/// Source identity lasts only for the native drag session, including drags between windows.
@MainActor enum PlaylistDragSession {
    static var sourceID: String?
    static func operation(source: String?, destination: String, option: Bool, reorder: Bool) -> DropOperation {
        reorder && source == destination && !option ? .move : .copy
    }
}

enum EpisodeDrop {
    static func references(_ values: [EpisodeTransfer]) -> [DraggedEpisode]? {
        guard !values.isEmpty, values.allSatisfy(\.isValid) else { return nil }
        var seen = Set<DraggedEpisode>()
        return values.flatMap(\.episodes).filter { seen.insert($0).inserted }
    }

    static func reorderIDs(_ values: [EpisodeTransfer], in playlist: Playlist) -> Set<String>? {
        guard values.allSatisfy({ $0.sourcePlaylistID == playlist.id }), let references = references(values) else { return nil }
        let ids = references.compactMap(\.episodeID)
        guard ids.count == references.count, ids.allSatisfy({ id in playlist.entries.contains { $0.episodeId == id } }) else { return nil }
        return Set(ids)
    }

    @MainActor static func add(_ values: [EpisodeTransfer], to playlistID: String, editor: LibraryEditingModel,
                               selected: @escaping @MainActor ([String]) -> Void = { _ in }) async -> Bool {
        guard !editor.busy, !editor.edits.busy, editor.episodeDrop == nil, let references = references(values) else { return false }
        editor.episodeDrop = EpisodeDropProgress(playlistID: playlistID, total: references.count)
        editor.failedEpisodeDrop = nil
        defer { editor.episodeDrop = nil }
        var ids: [String] = [], failed: [DraggedEpisode] = [], failures: [String] = []
        for (index, reference) in references.enumerated() {
            do {
                if let id = reference.episodeID { ids.append(id) }
                else if let feed = reference.feedURL, let guid = reference.guid {
                    ids.append(try await editor.prepareEpisode(feed, guid: guid))
                }
            } catch {
                failed.append(reference)
                failures.append("Episode \(index + 1) (\(reference.feedURL ?? reference.episodeID ?? "unknown")): \(LibraryMessages.failure(error))")
            }
            editor.episodeDrop?.completed = index + 1
        }
        var seen = Set<String>()
        ids = ids.filter { seen.insert($0).inserted }
        // All resolved Episodes form one named, reversible Play Last edit.
        var added = false
        if !ids.isEmpty { added = await editor.edits.add(ids, to: playlistID, placement: .last) != nil }
        if added { selected(ids) }
        else if !ids.isEmpty {
            failed += ids.map { DraggedEpisode(episodeID: $0) }
            failures.append(editor.edits.error ?? "Could not add Episodes to the Playlist. Try again.")
        }
        if !failed.isEmpty {
            let retry = EpisodeTransfer(episodes: failed, sourcePlaylistID: nil, title: "Retry dropped Episodes", shareURL: nil)
            editor.failedEpisodeDrop = FailedEpisodeDrop(
                message: "Added \(added ? ids.count : 0) Episodes; \(failed.count) failed.\n" + failures.joined(separator: "\n"),
                retry: { [weak editor] in
                    guard let editor else { return }
                    _ = await add([retry], to: playlistID, editor: editor, selected: selected)
                })
        }
        return added
    }
}

struct EpisodeDropProgress {
    let playlistID: String
    let total: Int
    var completed = 0
}

struct FailedEpisodeDrop {
    let message: String
    let retry: @MainActor () async -> Void
}

struct PlaylistEpisodeDropTarget: ViewModifier {
    let destination: Destination
    let editor: LibraryEditingModel?
    let window: WindowModel
    var showingEntries = true
    var allowsReorder = false
    @State private var optionCopy = false
    @ViewBuilder func body(content: Content) -> some SwiftUI.View {
        if case let .playlist(id) = destination, let editor {
            content.dropDestination(for: EpisodeTransfer.self, isEnabled: !editor.busy && !editor.edits.busy && editor.episodeDrop == nil) { values, _ in
                if optionCopy, values.allSatisfy({ $0.sourcePlaylistID == id }),
                   let references = EpisodeDrop.references(values) {
                    window.didDrop(references.compactMap(\.episodeID), into: id)
                    return
                }
                Task {
                    await EpisodeDrop.add(values, to: id, editor: editor) { ids in
                        window.didDrop(ids, into: id, reveal: showingEntries)
                    }
                }
            }
            .onDropSessionUpdated { session in
                // Keep the last drag modifier through asynchronous payload decoding.
                if session.phase == .entering || session.phase == .active {
                    optionCopy = NSEvent.modifierFlags.contains(.option)
                }
            }
            // A Playlist-to-Playlist transfer copies Episode references, not Position,
            // History, cursor or Timeline. There is no cross-Playlist Entry move.
            .dropConfiguration { _ in
                DropConfiguration(operation: PlaylistDragSession.operation(source: PlaylistDragSession.sourceID, destination: id,
                    option: NSEvent.modifierFlags.contains(.option), reorder: allowsReorder))
            }
        } else { content }
    }
}
#endif
