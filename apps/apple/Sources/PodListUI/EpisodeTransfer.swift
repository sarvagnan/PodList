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
    var title: String? = nil

    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.episodeID == rhs.episodeID && lhs.feedURL == rhs.feedURL && lhs.guid == rhs.guid
    }
    func hash(into hasher: inout Hasher) {
        hasher.combine(episodeID); hasher.combine(feedURL); hasher.combine(guid)
    }

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

    var dragID: String { episodes.first.flatMap { $0.episodeID ?? $0.guid } ?? "" }

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

    @MainActor static func local(_ id: String, sourcePlaylistID: String? = nil, library: LibraryModel) -> Self {
        let title = library.row(id).title
        return Self(episodes: [DraggedEpisode(episodeID: id, title: title)],
                    sourcePlaylistID: sourcePlaylistID, title: title, shareURL: library.episodeShareURL(id))
    }
}

extension SwiftUI.View {
    /// A drag container supplies one transferable per selected row. Table
    /// cells in different columns share the same drag item ID.
    @ViewBuilder func episodeDragSource(_ id: String?) -> some SwiftUI.View {
        if let id {
            frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
                .draggable(containerItemID: id)
        } else { self }
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

    @MainActor static func add(_ values: [EpisodeTransfer], to playlistID: String, before beforeID: String? = nil,
                               editor: LibraryEditingModel,
                               selected: @escaping @MainActor ([String]) -> Void = { _ in }) async -> Bool {
        guard !editor.busy, !editor.edits.busy, editor.episodeDrop == nil,
              let references = references(values) else { return false }
        let slots = references.map { reference in
            EpisodeDropSlot(reference: reference,
                title: reference.title ?? values.first { $0.episodes.contains(reference) }?.title ?? "Episode")
        }
        let batch = PendingEpisodeDrop(playlistID: playlistID, beforeID: beforeID, slots: slots, selected: selected)
        // Reserve destination rows synchronously, before the first publisher request.
        editor.pendingEpisodeDrops.append(batch)
        return await prepare(batch.id, editor: editor)
    }

    @MainActor private static func prepare(_ batchID: UUID, only slotID: String? = nil, editor: LibraryEditingModel) async -> Bool {
        guard !editor.busy, !editor.edits.busy, editor.episodeDrop == nil,
              let batchIndex = editor.pendingEpisodeDrops.firstIndex(where: { $0.id == batchID }) else { return false }
        let batch = editor.pendingEpisodeDrops[batchIndex]
        let indices = batch.slots.indices.filter { !batch.slots[$0].committed && (slotID == nil || batch.slots[$0].id == slotID) }
        guard !indices.isEmpty else { return false }
        editor.episodeDrop = EpisodeDropProgress(playlistID: batch.playlistID, total: indices.count)
        defer { editor.episodeDrop = nil; refreshFailure(editor) }
        for index in indices {
            editor.pendingEpisodeDrops[batchIndex].slots[index].failure = nil
        }
        refreshFailure(editor)
        var prepared: [Int] = []
        for (completed, index) in indices.enumerated() {
            let slot = editor.pendingEpisodeDrops[batchIndex].slots[index]
            do {
                let id: String
                if let local = slot.resolvedID ?? slot.reference.episodeID { id = local }
                else if let feed = slot.reference.feedURL, let guid = slot.reference.guid {
                    id = try await editor.prepareEpisode(feed, guid: guid)
                } else { throw SyncResponseFailure("Episode unavailable. Try again.") }
                editor.pendingEpisodeDrops[batchIndex].slots[index].resolvedID = id
                prepared.append(index)
            } catch {
                editor.pendingEpisodeDrops[batchIndex].slots[index].failure = LibraryMessages.failure(error)
            }
            editor.episodeDrop?.completed = completed + 1
        }
        let current = editor.pendingEpisodeDrops[batchIndex]
        let insertions = prepared.map { index in
            DroppedEpisodeInsertion(episodeID: current.slots[index].resolvedID!,
                beforeID: current.slots.dropFirst(index + 1).first { $0.resolvedID != nil }?.resolvedID ?? current.beforeID, fallbackBeforeID: current.beforeID)
        }
        // Preparation never writes Entries. The entire committed batch is one Undo step.
        let added: Bool
        if insertions.isEmpty { added = false }
        else { added = await editor.edits.addDropped(insertions, to: batch.playlistID, name: batch.beforeID == nil ? "Play Last" : "Add Dropped Episodes") }
        if added {
            for index in prepared { editor.pendingEpisodeDrops[batchIndex].slots[index].committed = true }
            var seen = Set<String>()
            batch.selected(insertions.map(\.episodeID).filter { seen.insert($0).inserted })
        } else {
            for index in prepared {
                editor.pendingEpisodeDrops[batchIndex].slots[index].failure = editor.edits.error ?? "Could not add to the Playlist. Try again."
            }
        }
        if editor.pendingEpisodeDrops[batchIndex].slots.allSatisfy(\.committed) {
            editor.pendingEpisodeDrops.remove(at: batchIndex)
        }
        return added
    }

    @MainActor static func retry(_ slotID: String, editor: LibraryEditingModel) async {
        guard let batch = editor.pendingEpisodeDrops.first(where: { $0.slots.contains { $0.id == slotID && $0.failure != nil } }) else { return }
        _ = await prepare(batch.id, only: slotID, editor: editor)
    }

    @MainActor static func selectedRetry(selection: Set<String>, playlistID: String,
                                        editor: LibraryEditingModel) -> (@MainActor () async -> Void)? {
        guard !editor.busy, !editor.edits.busy, editor.episodeDrop == nil,
              selection.count == 1, let id = selection.first,
              failedIDs(editor: editor, playlistID: playlistID).contains(id) else { return nil }
        return { await retry(id, editor: editor) }
    }

    @MainActor static func failedIDs(editor: LibraryEditingModel, playlistID: String? = nil) -> [String] {
        editor.pendingEpisodeDrops.filter { playlistID == nil || $0.playlistID == playlistID }
            .flatMap(\.slots).filter { $0.failure != nil && !$0.committed }.map(\.id)
    }

    @MainActor static func remove(_ slotID: String, editor: LibraryEditingModel) {
        guard editor.episodeDrop == nil else { return }
        let failure = editor.pendingEpisodeDrops.flatMap(\.slots).first { $0.id == slotID }?.failure
        editor.edits.dismissDropFailure(matching: failure)
        for index in editor.pendingEpisodeDrops.indices {
            editor.pendingEpisodeDrops[index].slots.removeAll { $0.id == slotID && $0.failure != nil }
        }
        editor.pendingEpisodeDrops.removeAll { $0.slots.allSatisfy(\.committed) }
        refreshFailure(editor)
    }

    @MainActor private static func refreshFailure(_ editor: LibraryEditingModel) {
        let slots = editor.pendingEpisodeDrops.flatMap(\.slots)
        let failed = slots.filter { $0.failure != nil }
        guard !failed.isEmpty else { editor.failedEpisodeDrop = nil; return }
        editor.failedEpisodeDrop = FailedEpisodeDrop(
            message: "Added \(slots.filter(\.committed).count) Episodes; \(failed.count) failed.\n" +
                failed.map { "\($0.title): \($0.failure!)" }.joined(separator: "\n"),
            retry: { [weak editor] in
                guard let editor else { return }
                let ids = editor.pendingEpisodeDrops.filter { $0.slots.contains { $0.failure != nil } }.map(\.id)
                for id in ids { _ = await prepare(id, editor: editor) }
            })
    }

}

struct EpisodeDropSlot: Identifiable {
    var id = "episode-drop/" + UUID().uuidString
    let reference: DraggedEpisode
    let title: String
    var resolvedID: String?
    var committed = false
    var failure: String?
    var accessibleName: String { failure == nil ? "Adding \(title)…" : "Could not add \(title)" }
}

struct PendingEpisodeDrop: Identifiable {
    var id = UUID()
    let playlistID: String
    let beforeID: String?
    var slots: [EpisodeDropSlot]
    let selected: @MainActor ([String]) -> Void
}

/// One projection drives both the native table and the large-text list. A failed
/// slot stays before its next successful sibling, even after partial completion.
struct PlaylistDropRow: Identifiable {
    let id: String
    let entry: EpisodeRow?
    let placeholder: EpisodeDropSlot?

    static func rows(_ entries: [EpisodeRow], batches: [PendingEpisodeDrop], playlistID: String) -> [Self] {
        var rows = entries.map { Self(id: $0.id, entry: $0, placeholder: nil) }
        for batch in batches where batch.playlistID == playlistID {
            for (index, slot) in batch.slots.enumerated().reversed() {
                if let resolved = slot.resolvedID ?? slot.reference.episodeID, rows.contains(where: { $0.entry?.id == resolved }) { continue }
                guard !slot.committed else { continue }
                let next = batch.slots.dropFirst(index + 1).compactMap { sibling in
                    rows.first { $0.id == sibling.id || (sibling.resolvedID != nil && $0.entry?.id == sibling.resolvedID) }?.id
                }.first
                let anchor = next ?? batch.beforeID
                let boundary = rows.firstIndex { $0.id == anchor } ?? rows.count
                rows.insert(Self(id: slot.id, entry: nil, placeholder: slot), at: boundary)
            }
        }
        return rows
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
    @Environment(\.libraryEditOrigin) private var origin
    let destination: Destination
    let app: ApplicationModel
    let window: WindowModel
    var allowsReorder = false
    @State private var optionCopy = false
    @ViewBuilder func body(content: Content) -> some SwiftUI.View {
        if case let .playlist(id) = destination, let editor = app.libraryEditing {
            content.dropDestination(for: EpisodeTransfer.self, isEnabled: !editor.busy && !editor.edits.busy && editor.episodeDrop == nil) { values, _ in
                if optionCopy, values.allSatisfy({ $0.sourcePlaylistID == id }),
                   let references = EpisodeDrop.references(values), let library = app.library {
                    window.didDrop(references.compactMap(\.episodeID), into: id, in: library)
                    return
                }
                EditOrigin.start(origin) {
                    _ = await EpisodeDrop.add(values, to: id, editor: editor) { ids in
                        guard app.libraryEditing === editor, let library = app.library else { return }
                        window.didDrop(ids, into: id, in: library)
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
