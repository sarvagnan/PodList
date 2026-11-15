#if os(macOS)
import SwiftUI
import Observation
import PodListData

/// Retained by the Library editor across closing and reopening the discovery window.
@MainActor @Observable
final class PodcastDiscoveryModel {
    var query = ""
    var results: [DirectoryPodcast] = []
    var selectedFeed: String?
    var loading = false
    var searched = false
    var error: String?
    var subscribing = Set<String>()
    var searchTask: Task<Void, Never>?
    var initialized = false

    func restoreDraft(from editor: LibraryEditingModel) {
        guard !initialized else { return }
        query = editor.draft("addPodcasts"); initialized = true
    }
}

public struct AddPodcastsWindow: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    @Environment(\.openWindow) private var openWindow
    @Environment(\.dismissWindow) private var dismissWindow
    public init(app: ApplicationModel) { self.app = app }
    public var body: some SwiftUI.View {
        Group {
            if let editor = app.libraryEditing, let library = app.library {
                AddPodcastsScreen(editor: editor, library: library, state: editor.podcastDiscovery, open: { feed in
                    if !app.nowPlayingNavigation.perform(.podcast(feed)) { openWindow(id: "library") }
                }, close: { dismissWindow(id: "add-podcasts") })
                .id(editor.scope)
            } else { PodListEmptyState("Open a Library", systemImage: "books.vertical", description: "Open a Library to find and subscribe to Podcasts.") }
        }
        .frame(minWidth: 560, minHeight: 440)
    }
}

struct AddPodcastsScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    @Bindable var state: PodcastDiscoveryModel
    let open: (String) -> Void
    let close: () -> Void
    @FocusState private var focused: Bool
    var body: some SwiftUI.View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Podcast name or feed address")
                    HStack {
                        TextField("Podcast name or feed address", text: $state.query).textFieldStyle(.roundedBorder).focused($focused)
                            .accessibilityIdentifier("addPodcasts.query")
                            .onSubmit { search() }.onChange(of: state.query) { _, text in editor.setDraft(text, field: "addPodcasts"); state.searchTask?.cancel(); state.loading = false; state.searched = false; state.results = []; state.error = nil }
                        Button("Search") { search() }.keyboardShortcut(.defaultAction).disabled(state.loading || state.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    Text("Choose File › Import OPML… in the Library window, or import in Settings › General › Library. Closing Add Podcasts does not stop an import; progress stays in Library.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                    if !state.searched, !state.loading {
                        PodListEmptyState("Find Your Next Podcast", systemImage: "magnifyingglass",
                                          description: "Search for a podcast by name, or paste its RSS feed address, such as https://example.com/podcast.xml.")
                    }
                    if state.loading { ProgressView("Finding Podcasts…") }
                    if let error = state.error { FailureFeedback(message: error, announcements: editor.edits.announcements, indexedElsewhere: true) { search() } }
                    if state.searched && !state.loading && state.results.isEmpty && state.error == nil { Text("No podcasts found. Try a name or a feed address.") }
                    if !state.results.isEmpty {
                        List(state.results, selection: $state.selectedFeed) { result in
                            HStack {
                                Button { openResult(result) } label: {
                                    HStack {
                                        ArtworkView(url: result.artworkUrl.flatMap(URL.init(string:)), title: result.title, size: 48)
                                        VStack(alignment: .leading) { Text(result.title); Text(result.author ?? "").foregroundStyle(MacReadableSecondaryStyle()) }
                                    }
                                }.buttonStyle(.plain).accessibilityLabel("Open Podcast page for \(result.title)")
                                Spacer()
                                if library.subscriptions.contains(where: { $0.feedUrl == result.feedUrl }) { Label("Subscribed", systemImage: "checkmark.circle.fill").foregroundStyle(.primary) }
                                else {
                                    Button(state.subscribing.contains(result.feedUrl) ? "Subscribing…" : "Subscribe") {
                                        subscribe(result)
                                    }.disabled(state.subscribing.contains(result.feedUrl)).accessibilityLabel("Subscribe to \(result.title)")
                                }
                            }.padding(.vertical, 5).tag(result.feedUrl)
                        }
                        .frame(height: min(320, CGFloat(state.results.count) * 70))
                    }
                }.padding(24).frame(maxWidth: .infinity, alignment: .leading)
            }
            LibraryFeedback(editor: editor)
            PodListSheetFooter(actionTitle: "Close", defaultShortcut: false, cancelTitle: nil, cancel: close, action: close)
        }
        .macContentFont(.body)
        // Let the window's initial focus evaluation choose the input after it becomes key.
        .defaultFocus($focused, true, priority: .userInitiated)
        .onExitCommand { close() }
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [.done: { close() }]))
        .focusedSceneValue(\.podListDiscoveryActions, MenuActionContext(actions: [
            .searchPodcasts: !state.loading && !state.query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? { search() } : nil
        ].compactMapValues { $0 }))
        .focusedSceneValue(\.podListPodcast, discoveryCommands)
        .onAppear {
            editor.beginAddingPodcasts(); state.restoreDraft(from: editor)
            // defaultFocus alone loses to the window's own key-view loop when it is
            // opened by openWindow; claim the field once the window is on screen.
            Task { @MainActor in focused = true }
        }
        .onDisappear { editor.endAddingPodcasts() }
    }
    private var discoveryCommands: PodcastCommandContext {
        guard let result = state.results.first(where: { $0.feedUrl == state.selectedFeed }) else { return PodcastCommandContext() }
        let subscribed = library.subscriptions.contains { $0.feedUrl == result.feedUrl }
        return PodcastCommandContext(open: { openResult(result) }, subscribed: subscribed,
            subscriptionAction: !subscribed && !state.subscribing.contains(result.feedUrl) && !editor.busy && !editor.edits.busy ? { subscribe(result) } : nil)
    }
    private func openResult(_ result: DirectoryPodcast) { open(result.feedUrl) }
    private func subscribe(_ result: DirectoryPodcast) {
        state.subscribing.insert(result.feedUrl)
        Task { do { try await editor.subscribe(result.feedUrl) } catch { editor.error = LibraryMessages.failure(error) }; state.subscribing.remove(result.feedUrl) }
    }
    private func search() {
        state.searchTask?.cancel()
        state.loading = true; state.error = nil; state.searched = true
        let submitted = state.query
        state.searchTask = Task {
            do {
                let found = try await editor.source.search(submitted)
                guard !Task.isCancelled, state.query == submitted else { return }
                var seen = Set<String>()
                state.results = found.filter { seen.insert($0.feedUrl).inserted }
            } catch {
                guard !Task.isCancelled, state.query == submitted else { return }
                state.error = LibraryMessages.failure(error)
            }
            state.loading = false
        }
    }
}

#endif
