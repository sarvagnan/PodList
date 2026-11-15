import AppIntents
import PodListUI

@MainActor
enum IntentDonations {
    static func donate(_ action: ActionDonation, app: ApplicationModel) {
        guard let library = app.library else { return }
        func episodes(_ ids: [String]) -> [EpisodeEntity] {
            ids.map { id in
                let row = library.row(id)
                return EpisodeEntity(id: id, title: row.title, podcast: row.podcast)
            }
        }
        func playlist(_ id: String) -> PlaylistEntity? {
            library.state.playlists.first { $0.id == id }.map { PlaylistEntity(id: $0.id, name: $0.name) }
        }
        func submit(_ intent: some AppIntent) {
            // Suggestions are best effort and never affect the user's successful action.
            Task { _ = try? await intent.donate() }
        }
        switch action {
        case .play:
            submit(PlayIntent())
        case let .playEpisode(id, target):
            guard let target = playlist(target) else { return }
            let intent = PlayEpisodeIntent()
            intent.episode = episodes([id])[0]; intent.playlist = target
            submit(intent)
        case let .playInPlaylist(id, target):
            guard let target = playlist(target) else { return }
            let intent = PlayInPlaylistIntent()
            intent.episode = episodes([id])[0]; intent.playlist = target
            submit(intent)
        case let .add(ids, target, placement):
            guard let target = playlist(target) else { return }
            let intent = AddEpisodesIntent()
            intent.episodes = episodes(ids); intent.playlist = target
            intent.placement = placement == .next ? .next : .last
            submit(intent)
        case let .star(ids, starred):
            let intent = MarkEpisodesIntent()
            intent.episodes = episodes(ids); intent.mark = starred ? .star : .unstar
            submit(intent)
        case let .markPlayed(ids, played):
            let intent = MarkEpisodesIntent()
            intent.episodes = episodes(ids); intent.mark = played ? .played : .unplayed
            submit(intent)
        }
    }
}
