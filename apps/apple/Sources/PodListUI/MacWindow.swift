#if os(macOS)
import SwiftUI
import PodListDomain

public extension Color {
    static let podListAccent = Color(red: 43 / 255, green: 80 / 255, blue: 200 / 255)
}

public struct PodListWindow: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    @State private var window = WindowModel()
    @State private var playlistPresentation = PlaylistPresentation()
    @FocusState private var searchFocused: Bool
    @State private var showAddPodcasts = false
    @State private var editingView: PodListDomain.View?
    @State private var creatingView = false
    @State private var podcastFeed: String?
    @AppStorage("PodList.appearance") private var appearance = "System"
    @State private var columns = NavigationSplitViewVisibility.all
    @AppStorage("PodList.inspectorVisible") private var inspectorVisible = true
    @Environment(\.scenePhase) private var scenePhase

    public init(app: ApplicationModel) { self.app = app }

    public var body: some SwiftUI.View {
        Group {
            if let library = app.library {
                connected(library)
            } else if app.starting {
                ProgressView("Opening Library…").accessibilityLabel("Opening Library")
            } else {
                WelcomeView(app: app)
            }
        }
        .frame(minWidth: 760, minHeight: 500)
        .tint(.podListAccent)
        .preferredColorScheme(appearance == "System" ? nil : appearance == "Dark" ? .dark : .light)
        .task { await app.start() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { app.requestSync() } else { app.playback?.flush() } }
        .onChange(of: app.origin) { _, _ in window.navigate(to: .subscriptions); playlistPresentation.sheet = nil }
    }

    private func connected(_ library: LibraryModel) -> some SwiftUI.View {
        NavigationSplitView(columnVisibility: $columns) {
            List(selection: Binding(get: { window.destination }, set: { window.navigate(to: $0) })) {
                ForEach(library.sidebar) { section in
                    Section {
                        if section.name == "Views" { Button("New View", systemImage: "plus") { newView() } }
                        if section.name == "Library" { Button("Add podcasts", systemImage: "plus") { showAddPodcasts = true } }
                        if section.items.isEmpty {
                            Text("No \(section.name)").foregroundStyle(.secondary)
                        }
                        ForEach(section.items) { item in
                            HStack(spacing: 8) {
                                Label(item.name, systemImage: symbol(item.destination))
                                    .lineLimit(2)
                                Spacer(minLength: 4)
                                if item.active {
                                    Image(systemName: "speaker.wave.2.fill").font(.caption)
                                        .foregroundStyle(Color.podListAccent).accessibilityLabel("Active Playlist")
                                }
                                Text(item.count, format: .number).foregroundStyle(.secondary).monospacedDigit()
                            }
                            .tag(item.destination)
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel("\(item.name), \(item.count)\(item.active ? ", Active Playlist" : "")")
                        }
                    } header: { Text(section.name) }
                }
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 180, ideal: 225, max: 320)
            .navigationTitle("PodList")
        } detail: {
            VStack(spacing: 0) {
                syncStatus
                if let editing = app.editing { EditingFeedback(editing: editing) }
                if let editor = app.libraryEditing {
                    if editor.showGettingStarted, case .view = window.destination { GettingStartedScreen(editor: editor, add: { showAddPodcasts = true }) }
                    LibraryFeedback(editor: editor)
                    if editor.busy { ProgressView("Importing \(editor.importCompleted) of \(editor.importTotal)") }
                    if !editor.importFailed.isEmpty { Button("Retry failed imports") { Task { await editor.retryImport() } } }
                }
                if let podcastFeed, let editor = app.libraryEditing {
                    HStack { Button("Back to Library") { self.podcastFeed = nil; window.search = "" }; Spacer() }.padding(.horizontal)
                    PodcastPageScreen(feedURL: podcastFeed, app: app, editor: editor, library: library, selection: $window.selection, search: $window.search).id(podcastFeed)
                } else { content(library) }
            }
            .navigationTitle(podcastFeed == nil ? library.title(window.destination) : "Podcast")
            .navigationSubtitle(isPodcastPage ? "Podcast page" : summary(library))
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button("New Playlist", systemImage: "plus") { playlistPresentation.sheet = .newPlaylist }
                        .help("New Playlist (⌘⇧N)")
                    if case let .playlist(id) = window.destination {
                        Button("Playlist Settings", systemImage: "slider.horizontal.3") { playlistPresentation.sheet = .settings(id) }
                    }
                    if let editing = app.editing, !window.selection.isEmpty {
                        EpisodeActionButtons(ids: selectedIDs(library), library: library, editing: editing, presentation: playlistPresentation)
                    }
                }
                ToolbarItem {
                    if podcastFeed == nil, case let .view(id) = window.destination, let view = library.state.views.first(where: { $0.id == id }) {
                        Button("Edit View") { creatingView = false; editingView = view }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button(inspectorVisible ? "Hide Inspector" : "Show Inspector", systemImage: "sidebar.right") {
                        inspectorVisible.toggle()
                    }
                    .help("Show or hide Inspector (⌘⌥I)")
                    .accessibilityLabel(inspectorVisible ? "Hide Inspector" : "Show Inspector")
                }
            }
            .searchable(text: $window.search, placement: .toolbar, prompt: isPodcastPage ? "Search Episodes" : window.destination == .search ? "Search Library" : "Search this list")
            .searchFocused($searchFocused)
            .inspector(isPresented: $inspectorVisible) {
                EpisodeInspector(row: selectedRow(library), library: library, app: app, selectedIDs: selectedIDs(library), playlistPresentation: playlistPresentation)
                    .inspectorColumnWidth(min: 260, ideal: 310, max: 440)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let playback = app.playback, playback.display != nil {
                PlayerBar(controller: playback, library: library,
                          openPlaylist: { window.navigate(to: .playlist(library.state.activePlaylistId)) },
                          openNowPlaying: { window.showNowPlaying = true })
            }
        }
        .modifier(PlaylistSheetHost(presentation: playlistPresentation, app: app, created: { window.navigate(to: .playlist($0)) }))
        .focusedSceneValue(\.podListEpisodes, EpisodeCommandContext(ids: selectedIDs(library), library: library, window: window, presentation: playlistPresentation))
        .focusedSceneValue(\.podListLibraryActions, LibraryWindowActions(add: { showAddPodcasts = true }, newView: { newView() }, search: { podcastFeed = nil; window.navigate(to: .search); searchFocused = true }))
        .sheet(isPresented: $showAddPodcasts) {
            if let editor = app.libraryEditing { AddPodcastsScreen(editor: editor, library: library, open: { podcastFeed = $0 }) }
        }
        .sheet(isPresented: Binding(get: { editingView != nil }, set: { if !$0 { editingView = nil } })) {
            if let view = editingView, let editor = app.libraryEditing {
                ViewEditorScreen(editor: editor, library: library, view: view, creating: creatingView) { id in
                    editingView = nil
                    if let id { window.navigate(to: .view(id)) }
                }
            }
        }
        .onChange(of: window.destination) { _, destination in
            podcastFeed = nil
            if case .view = destination { app.libraryEditing?.completeStep(2) }
            if destination == .search { window.search = app.libraryEditing?.draft("librarySearch") ?? "" }
        }
        .focusedSceneValue(\.podListInspector, $inspectorVisible)
        .focusedSceneValue(\.podListOpenPlaylist, { window.showNowPlaying = false; window.navigate(to: .playlist(library.state.activePlaylistId)) })
        .focusedSceneValue(\.podListNowPlaying, { window.showNowPlaying = true })
        .sheet(isPresented: $window.showNowPlaying) {
            if let controller = app.playback {
                NowPlayingView(controller: controller, library: library) {
                    window.showNowPlaying = false
                    window.navigate(to: .playlist(library.state.activePlaylistId))
                }
            }
        }
        .onChange(of: app.library?.snapshot) { previous, _ in
            if let library = app.library {
                if previous?.state.views.isEmpty != false, library.subscriptions.isEmpty,
                   let first = library.state.views.first, app.libraryEditing?.showGettingStarted == true {
                    window.navigate(to: .view(first.id))
                }
                reconcileSelection(library)
            }
        }
        .onChange(of: window.search) { _, text in
            if window.destination == .search { app.libraryEditing?.setDraft(text, field: "librarySearch") }
            reconcileSelection(library)
        }
        .onChange(of: window.destination) { _, _ in playlistPresentation.playlistTab = .entries }
    }

    @ViewBuilder private func content(_ library: LibraryModel) -> some SwiftUI.View {
        switch window.destination {
        case .subscriptions:
            subscriptions(library)
        case .trash:
            if let editing = app.editing { PlaylistTrashView(library: library, editing: editing, search: window.search) }
        case let .playlist(id):
            if let playlist = library.state.playlists.first(where: { $0.id == id }), let editing = app.editing {
                PlaylistContentView(playlist: playlist, library: library, window: window, editing: editing, presentation: playlistPresentation)
            }
        case let .subscription(id):
            if let sub = library.snapshot.subscriptions.first(where: { $0.id == id }), let editor = app.libraryEditing {
                PodcastPageScreen(feedURL: sub.feedUrl, app: app, editor: editor, library: library, selection: $window.selection, search: $window.search).id(sub.feedUrl)
            }
        case .view:
            episodeTable(library)
        case .search:
            VStack(alignment: .leading) {
                if let editor = app.libraryEditing { SearchViewCreation(editor: editor, library: library, query: window.search, count: window.rows(in: library).count) { id in window.navigate(to: .view(id)) } }
                episodeTable(library)
            }
        case nil:
            ContentUnavailableView("Choose a View, Playlist or Library", systemImage: "sidebar.left")
        }
    }

    private func subscriptions(_ library: LibraryModel) -> some SwiftUI.View {
        let groups = library.subscriptionGroups(search: window.search)
        return Group {
            if groups.isEmpty {
                ContentUnavailableView(window.search.isEmpty ? "No Subscriptions" : "No matching Subscriptions", systemImage: "rectangle.stack",
                    description: Text(window.search.isEmpty ? "Use Add podcasts to search by name or feed address." : "Try another search."))
            } else {
                List {
                    Text("Grouped by Download Rule").font(.subheadline).foregroundStyle(.secondary)
                    ForEach(groups) { group in
                        Section(group.name) {
                            ForEach(group.subscriptions, id: \.id) { subscription in
                                Button {
                                    window.navigate(to: .subscription(subscription.id))
                                } label: {
                                    HStack(spacing: 12) {
                                        ArtworkView(url: subscription.artwork.flatMap { URL(string: $0.url) }, title: subscription.title, size: 44)
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(subscription.title).font(.headline).foregroundStyle(.primary)
                                            let count = library.snapshot.episodes.filter { $0.subscriptionId == subscription.id }.count
                                            Text("\(count) \(count == 1 ? "Episode" : "Episodes")").foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                                    }
                                    .padding(.vertical, 5).contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Open \(subscription.title), Subscription")
                            }
                        }
                    }
                }.listStyle(.inset)
            }
        }
    }

    private func episodeTable(_ library: LibraryModel) -> some SwiftUI.View {
        let rows = window.rows(in: library)
        return VStack(alignment: .leading, spacing: 0) {
            if case let .view(id) = window.destination, let view = library.state.views.first(where: { $0.id == id }) {
                Text(ViewDescription.text(view, library: library)).font(.subheadline).foregroundStyle(.secondary)
                    .padding(.horizontal, 16).padding(.vertical, 10)
            }
            if case let .subscription(id) = window.destination { DownloadRuleEditor(subscriptionID: id, library: library, app: app).padding(12) }
            if rows.isEmpty {
                ContentUnavailableView("No Episodes", systemImage: "list.bullet", description: Text(app.syncing ? "Syncing the Library…" : "No Episodes match this list. Try another View or clear Search."))
            } else {
                Table(rows, selection: $window.selection, sortOrder: $window.sortOrder) {
                    TableColumn("Episode", value: \.title) { row in episodeTitle(row, library: library) }
                    TableColumn("Published", value: \.published) { row in
                        if row.episode != nil { Text(row.publishedDate, format: .dateTime.day().month(.abbreviated).year()) }
                        else { Text("—") }
                    }.width(min: 95, ideal: 110, max: 150)
                    TableColumn("Length", value: \.length) { row in Text(row.durationText).monospacedDigit() }.width(min: 60, ideal: 70, max: 100)
                    TableColumn("State", value: \.stateText).width(min: 80, ideal: 110, max: 150)
                }
                .contextMenu(forSelectionType: String.self) { selection in
                    if let editing = app.editing {
                        EpisodeActionItems(ids: rows.map(\.id).filter { selection.contains($0) }, library: library, editing: editing, presentation: playlistPresentation)
                            .disabled(selection.isEmpty || editing.busy)
                    }
                } primaryAction: { _ in inspectorVisible = true }
                .accessibilityLabel("Episodes, sortable columns")
            }
        }
    }

    private func episodeTitle(_ row: EpisodeRow, library: LibraryModel) -> some SwiftUI.View {
        HStack(spacing: 8) {
            if let ordinal = row.ordinal { Text(ordinal, format: .number).foregroundStyle(.secondary).monospacedDigit() }
            if row.isCursor { Image(systemName: "location.fill").foregroundStyle(Color.podListAccent).accessibilityLabel("Current Entry") }
            VStack(alignment: .leading, spacing: 3) {
                if row.isCursor { Text("Current Entry").font(.caption).foregroundStyle(Color.podListAccent) }
                Text(row.title).lineLimit(2)
                Text(row.podcast).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }.padding(.vertical, 5)
            Spacer(minLength: 4)
            if let editing = app.editing {
                Button("Add", systemImage: "plus") { playlistPresentation.sheet = .add([row.id], false) }
                    .labelStyle(.iconOnly).buttonStyle(.borderless).accessibilityLabel("Add \(row.title) to a Playlist")
                Button("Play Now", systemImage: "play.fill") { Task { await editing.add([row.id], placement: .now) } }
                    .labelStyle(.iconOnly).buttonStyle(.borderless).accessibilityLabel("Play Now: \(row.title)")
            }
        }
        .accessibilityElement(children: .contain)
        .contextMenu {
            if let editing = app.editing {
                EpisodeActionItems(ids: window.selection.contains(row.id) ? selectedIDs(library) : [row.id],
                    library: library, editing: editing, presentation: playlistPresentation)
                    .disabled(editing.busy)
            }
            Button(app.downloadStatuses[row.id]?.phase == .stored ? "Remove download" : "Download") {
                if app.downloadStatuses[row.id]?.phase == .stored { app.removeDownload(row.id) } else { app.download(row.id) }
            }
        }
        .overlay(alignment: .trailing) {
            if app.downloadStatuses[row.id]?.phase == .stored { Image(systemName: "arrow.down.circle.fill").foregroundStyle(.secondary).accessibilityLabel("Downloaded") }
        }
    }

    private var syncStatus: some SwiftUI.View {
        HStack(spacing: 8) {
            if app.syncing {
                ProgressView().controlSize(.mini).accessibilityLabel("Syncing")
                Text("Syncing…")
            } else if let error = app.syncError {
                Image(systemName: "exclamationmark.icloud").accessibilityHidden(true)
                Text(error).lineLimit(2).help(error)
                Button("Try again") { Task { await app.sync() } }.accessibilityLabel("Try sync again")
            } else {
                Image(systemName: "checkmark.icloud").accessibilityHidden(true)
                Text(app.lastSync == nil ? "Local Library" : "Up to date")
            }
            Spacer(minLength: 0)
        }
        .font(.caption).foregroundStyle(.secondary).padding(.horizontal, 14).padding(.vertical, 7)
    }

    private func selectionRows(_ library: LibraryModel) -> [EpisodeRow] {
        if case let .playlist(id) = window.destination, playlistPresentation.playlistTab == .history {
            var seen = Set<String>()
            return (library.state.playlists.first { $0.id == id }?.history.reversed().map(\.episodeId) ?? [])
                .filter { seen.insert($0).inserted }.map { library.row($0) }
        }
        return window.rows(in: library)
    }
    private func reconcileSelection(_ library: LibraryModel) {
        if case let .playlist(id) = window.destination, playlistPresentation.playlistTab == .history,
           library.state.playlists.contains(where: { $0.id == id }) {
            window.selection.formIntersection(Set(selectionRows(library).map(\.id)))
        } else { window.reconcile(in: library) }
    }
    private func selectedIDs(_ library: LibraryModel) -> [String] {
        selectionRows(library).map(\.id).filter { window.selection.contains($0) }
    }
    private var isPodcastPage: Bool {
        if case .subscription = window.destination { return true }
        return podcastFeed != nil
    }
    private func newView(text: String? = nil) {
        guard let editor = app.libraryEditing else { return }
        var id = editor.draft("newViewID")
        if id.isEmpty { id = UUID().uuidString; editor.setDraft(id, field: "newViewID") }
        creatingView = true
        editingView = PodListDomain.View(id: id, name: "", filter: .init(text: text), sort: .publishedDesc, limit: nil)
    }
    private func selectedRow(_ library: LibraryModel) -> EpisodeRow? {
        if isPodcastPage {
            return library.snapshot.episodes.first { window.selection.contains($0.id) }.map { library.row($0.id) }
        }
        return selectionRows(library).first { window.selection.contains($0.id) }
    }
    private func summary(_ library: LibraryModel) -> String {
        switch window.destination {
        case .subscriptions: "\(library.subscriptions.count) Subscriptions"
        case .trash: "\(library.trash.count) Playlists"
        case let .playlist(id):
            "\(window.rows(in: library).count) Entries\(id == library.state.activePlaylistId ? " · Active Playlist" : "")"
        default: "\(window.rows(in: library).count) Episodes\(window.selection.isEmpty ? "" : " · \(window.selection.count) selected")"
        }
    }
    private func symbol(_ destination: Destination) -> String {
        switch destination {
        case .view: "line.3.horizontal.decrease"
        case .playlist: "music.note.list"
        case .subscriptions, .subscription: "rectangle.stack"
        case .search: "magnifyingglass"
        case .trash: "trash"
        }
    }
}

private struct NowPlayingKey: FocusedValueKey { typealias Value = () -> Void }
private struct OpenPlaylistKey: FocusedValueKey { typealias Value = () -> Void }
private struct InspectorKey: FocusedValueKey { typealias Value = Binding<Bool> }
public extension FocusedValues {
    var podListNowPlaying: (() -> Void)? {
        get { self[NowPlayingKey.self] }
        set { self[NowPlayingKey.self] = newValue }
    }
    var podListOpenPlaylist: (() -> Void)? {
        get { self[OpenPlaylistKey.self] }
        set { self[OpenPlaylistKey.self] = newValue }
    }
    var podListInspector: Binding<Bool>? {
        get { self[InspectorKey.self] }
        set { self[InspectorKey.self] = newValue }
    }
}

public struct PodListCommands: Commands {
    @FocusedBinding(\.podListInspector) private var inspectorVisible: Bool?
    public init() {}
    public var body: some Commands {
        CommandGroup(after: .sidebar) {
            Button(inspectorVisible == true ? "Hide Inspector" : "Show Inspector") {
                inspectorVisible?.toggle()
            }
            .keyboardShortcut("i", modifiers: [.command, .option])
            .disabled(inspectorVisible == nil)
        }
    }
}
#endif
