import AppIntents
import CoreSpotlight
import Foundation
import OSLog
import PodListUI

extension EpisodeEntity: IndexedEntity {}
extension PlaylistEntity: IndexedEntity {}

/// Serial writes prevent a slow old snapshot from repopulating a replaced Library.
/// The development policy is checked before even obtaining a writable system index.
@MainActor
final class SpotlightIndex {
    private let enabled = ActionDonations.spotlightIsEnabled(bundleIdentifier: Bundle.main.bundleIdentifier)
    private var pending: (LibraryModel?, String?)?
    private var worker: Task<Void, Never>?
    private var scope: String?
    private var initialized = false
    private var applied: [String: SpotlightRecord] = [:]
    private let domain = "app.podlist.library"
    private let logger = Logger(subsystem: "app.podlist", category: "Spotlight")

    func update(_ library: LibraryModel?, origin: String?) {
        guard enabled else { return }
        pending = (library, origin)
        guard worker == nil else { return }
        worker = Task { [weak self] in
            guard let self else { return }
            while let next = pending {
                pending = nil
                do { try await apply(next.0, origin: next.1) }
                catch {
                    let failure = error as NSError
                    logger.error("Library index update failed (\(failure.domain, privacy: .public) \(failure.code)): \(failure.localizedDescription, privacy: .public)")
                }
            }
            worker = nil
        }
    }

    private func apply(_ library: LibraryModel?, origin: String?) async throws {
        let index = CSSearchableIndex.default()
        let nextScope = library == nil ? nil : origin ?? "standalone"
        if !initialized || nextScope != scope || library == nil {
            try await index.deleteSearchableItems(withDomainIdentifiers: [domain])
            applied = [:]; scope = nextScope; initialized = true
        }
        // Partial sync pages must not be mistaken for removals.
        guard let library, library.snapshot.isReady else { return }
        let records = SpotlightRecord.library(library)
        let desired = Dictionary(uniqueKeysWithValues: records.map { ($0.id, $0) })
        let removed = applied.keys.filter { desired[$0] == nil }
        if !removed.isEmpty { try await index.deleteSearchableItems(withIdentifiers: removed) }
        let changed = records.filter { applied[$0.id] != $0 }
        if !changed.isEmpty {
            try await index.indexSearchableItems(changed.map { item($0, library: library) })
            logger.info("Core Spotlight journaled \(changed.count) Library items")
        }
        applied = desired
    }

    private func item(_ record: SpotlightRecord, library: LibraryModel) -> CSSearchableItem {
        let attributes = CSSearchableItemAttributeSet(contentType: .content)
        switch record.link {
        case let .episode(id): attributes.associateAppEntity(EpisodeEntity(id: id, title: record.title, podcast: record.podcast ?? ""))
        case let .playlist(id): attributes.associateAppEntity(PlaylistEntity(id: id, name: record.title))
        case let .podcast(feed):
            if let subscription = library.subscriptions.first(where: { $0.feedUrl == feed }) {
                attributes.associateAppEntity(SubscriptionEntity(id: subscription.id, title: record.title, feed: feed))
            }
        default: break
        }
        attributes.title = record.title
        attributes.contentDescription = "PodList \(record.link.kindName)" + (record.podcast.map { " · \($0)" } ?? "")
        attributes.album = record.podcast
        attributes.contentCreationDate = record.published
        attributes.keywords = record.keywords
        // The unique identifier carries the app link; contentURL is for file URLs.
        let item = CSSearchableItem(uniqueIdentifier: record.id, domainIdentifier: domain, attributeSet: attributes)
        item.expirationDate = .distantFuture
        return item
    }
}
