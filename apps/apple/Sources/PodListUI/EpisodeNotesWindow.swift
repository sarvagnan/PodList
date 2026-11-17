#if os(macOS)
import SwiftUI

/// A bounded reading measure without widening every Library window's Inspector.
public struct EpisodeNotesWindow: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    private let episodeID: String?
    @Environment(\.dismiss) private var dismiss
    public init(app: ApplicationModel, episodeID: String?) { self.app = app; self.episodeID = episodeID }
    public var body: some SwiftUI.View {
        Group {
            if let id = episodeID, let library = app.library,
               library.libraryEpisodes.contains(where: { $0.id == id }) {
                let row = library.row(id)
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text(row.title).macContentFont(.title2).bold()
                        Text(row.podcast).macContentFont(.headline).foregroundStyle(MacReadableSecondaryStyle())
                        let notes = Presentation.plainShowNotes(row.episode?.description ?? "")
                        Text(notes.isEmpty ? "No show notes" : notes)
                    }.textSelection(.enabled).frame(maxWidth: 560, alignment: .leading).padding(32)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                .navigationTitle(row.title)
                .task(id: id) { await app.resolveEpisodeDetails(id) }
            } else {
                PodListEmptyState("Episode Unavailable", systemImage: "doc.text", description: "This Episode is no longer in this Library.")
            }
        }.macContentFont(.body).frame(minWidth: 480, minHeight: 360)
            .closesOnEscape { dismiss() }
    }
}
#endif
