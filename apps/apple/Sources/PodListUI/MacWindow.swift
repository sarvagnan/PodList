#if os(macOS)
import SwiftUI
import PodListDomain

public struct PodListWindow: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    @State private var window = WindowModel()
    @State private var playlistPresentation = PlaylistPresentation()
    @FocusState private var searchFocused: Bool
    @State private var showAddPodcasts = false
    @State private var editingView: PodListDomain.View?
    @State private var creatingView = false
    @State private var subscriptionSelection = Set<String>()
    @State private var showBulkRules = false
    @State private var showSubscriptionSettings = false
    @State private var podcastFeed: String?
    @State private var podcastEpisodeIDs: [String] = []
    @State private var columns = NavigationSplitViewVisibility.all
    @SceneStorage("PodList.windowContext.v1") private var savedContext: Data?
    @State private var contextLoaded = false
    @State private var contextLibraryID: String?
    @State private var restoredContext = false
    @AppStorage("PodList.inspectorVisible") private var inspectorVisible = true
    @Environment(\.macTextScale) private var textScale
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openWindow) private var openWindow
    private let initialDestination: Destination?

    public init(app: ApplicationModel, initialDestination: Destination? = nil) {
        self.app = app; self.initialDestination = initialDestination
    }

    public var body: some SwiftUI.View {
        Group {
            if let library = app.library, contextLoaded {
                connected(library)
            } else if app.starting || app.library != nil {
                ProgressView("Opening Library…").accessibilityLabel("Opening Library")
            } else {
                WelcomeView(app: app)
            }
        }
        .frame(minWidth: 760, minHeight: 500)
        .tint(.podListAccent)
        .task { await app.start() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { app.requestSync() } else { app.playback?.flush() } }
        .onChange(of: app.library?.snapshot, initial: true) { _, _ in
            if !contextLoaded, let library = app.library { restoreContext(in: library) }
        }
        .onChange(of: app.origin) { _, _ in
            guard contextLoaded, contextLibraryID != (app.origin ?? "standalone") else { return }
            contextLoaded = false
            window.navigate(to: .subscriptions); playlistPresentation.sheet = nil; subscriptionSelection = []
            if let library = app.library { restoreContext(in: library) }
        }
    }

    private func connected(_ library: LibraryModel) -> some SwiftUI.View {
        NavigationSplitView(columnVisibility: $columns) {
            List(selection: Binding(get: { podcastFeed == nil ? window.sidebarSelection : .subscriptions }, set: {
                podcastFeed = nil
                window.navigate(to: $0)
            })) {
                ForEach(library.sidebar) { section in
                    Section {
                        if section.name == "Views" {
                            Label("All Views", systemImage: "line.3.horizontal.decrease").tag(Destination.views)
                            Button("New View…", systemImage: "plus") { newView() }.buttonStyle(.plain).selectionDisabled()
                        }
                        if section.name == "Playlists" { Button("New Playlist…", systemImage: "plus") { playlistPresentation.sheet = .newPlaylist }.buttonStyle(.plain).selectionDisabled() }
                        if section.name == "Library" { Button("Add Podcasts…", systemImage: "plus") { showAddPodcasts = true }.buttonStyle(.plain).selectionDisabled() }
                        if section.items.isEmpty {
                            Text("No \(section.name)").foregroundStyle(.secondary)
                        }
                        ForEach(section.items) { item in
                            HStack(spacing: 8) {
                                Label { Text(item.name) } icon: {
                                    Image(systemName: symbol(item.destination)).foregroundStyle(MacRowAccentStyle())
                                }
                                    .lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 4)
                                if item.active {
                                    Image(systemName: "speaker.wave.2.fill").macContentFont(.caption)
                                        .foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Active Playlist")
                                }
                                if let clear = item.clearOnPlayed {
                                    Image(systemName: clear ? "eraser.fill" : "eraser")
                                        .foregroundStyle(.secondary)
                                        .help(clear ? "Clear on Played on" : "Clear on Played off")
                                        .accessibilityLabel(clear ? "Clear on Played on" : "Clear on Played off")
                                }
                                Text(item.count, format: .number).foregroundStyle(.secondary).monospacedDigit()
                            }
                            .contentShape(Rectangle())
                            .tag(item.destination)
                            .simultaneousGesture(TapGesture().onEnded {
                                // The parent is already selected on a Podcast page; a click
                                // must still open the Subscriptions list.
                                if item.destination == .subscriptions, isPodcastPage {
                                    podcastFeed = nil
                                    window.navigate(to: .subscriptions)
                                }
                            })
                            .contextMenu { sidebarActions(item.destination, library: library) }
                            .modifier(PlaylistEpisodeDropTarget(destination: item.destination, editor: app.libraryEditing))
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel("\(item.name), \(item.count)\(item.active ? ", Active Playlist" : "")\(item.clearOnPlayed.map { $0 ? ", Clear on Played on" : ", Clear on Played off" } ?? "")")
                        }
                    } header: { Text(section.name) }
                }
            }
            .macContentFont(.body)
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 180, ideal: 225, max: 320)
            .navigationTitle("PodList")
        } detail: {
            VStack(spacing: 0) {
                syncStatus
                if let editor = app.libraryEditing {
                    if !isPodcastPage, editor.showsGettingStarted(on: window.destination, in: library) { GettingStartedScreen(editor: editor, add: { showAddPodcasts = true }) }
                    LibraryFeedback(editor: editor)
                    if editor.busy { VStack {
                        ProgressView("Importing \(editor.importCompleted) of \(editor.importTotal)")
                        Text("Closing Add Podcasts does not stop the import. Keep PodList running. Unfinished imports resume on next launch.").macContentFont(.caption)
                        Button("Show Import Results") { editor.importPresented = true }
                    } }
                    if !editor.importFailed.isEmpty { Button("Retry Failed Imports") { Task { await editor.retryImport() } } }
                } else if let editing = app.editing { EditingFeedback(editing: editing) }
                if let podcastFeed, let editor = app.libraryEditing {
                    HStack { Button("Back to Library") { self.podcastFeed = nil; window.search = "" }; Spacer() }.padding(.horizontal)
                    PodcastPageScreen(feedURL: podcastFeed, app: app, editor: editor, library: library, selection: $window.selection, search: $window.search, savedSort: $window.podcastSort, openEpisode: { inspectorVisible = true }, displayed: { podcastEpisodeIDs = $0 }).id(podcastFeed)
                } else { content(library) }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .macContentFont(.body)
            .navigationTitle(podcastFeed == nil ? library.title(window.destination) : "Podcast")
            .navigationSubtitle(isPodcastPage ? "Podcast page" : summary(library))
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    if !isPodcastPage {
                        switch window.destination {
                        case let .playlist(id):
                            Button("New Playlist…", systemImage: "plus") { playlistPresentation.sheet = .newPlaylist }
                                .help("New Playlist (⇧⌘N)")
                            Button("Playlist Settings…", systemImage: "slider.horizontal.3") { playlistPresentation.sheet = .settings(id) }
                        case .view, .views:
                            Button("New View…", systemImage: "plus") { newView() }
                            if case let .view(id) = window.destination, let view = library.state.views.first(where: { $0.id == id }) {
                                Button("Edit View…", systemImage: "slider.horizontal.3") { editView(view) }
                            }
                        default: EmptyView()
                        }
                    }
                    if showsEpisodeInspector {
                        Button(inspectorVisible ? "Hide Inspector" : "Show Inspector", systemImage: "sidebar.right") {
                            inspectorVisible.toggle()
                        }
                        .help("Show or Hide Inspector (⌥⌘I)")
                        .accessibilityLabel(inspectorVisible ? "Hide Inspector" : "Show Inspector")
                    }
                }
                if let editing = app.editing, !selectedIDs(library).isEmpty {
                    EpisodeActionButtons(ids: selectedIDs(library), library: library, editing: editing, presentation: playlistPresentation, app: app)
                }
            }
            .searchable(text: $window.search, placement: .toolbar, prompt: isPodcastPage ? "Search Episodes" : window.destination == .search ? "Search Library" : "Search this list")
            .searchFocused($searchFocused)
            .inspector(isPresented: Binding(get: { showsEpisodeInspector && inspectorVisible }, set: { inspectorVisible = $0 })) {
                EpisodeInspector(row: selectedRow(library), library: library, app: app, playlistPresentation: playlistPresentation)
                    .inspectorColumnWidth(min: 260, ideal: 310, max: 440)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let playback = app.playback, playback.hasDisplay {
                PlayerBar(controller: playback, library: library,
                          openPlaylist: { window.navigate(to: .playlist(library.state.activePlaylistId)) },
                          openNowPlaying: { window.showNowPlaying = true })
                    .environment(\.macTextScale, 1)
            }
        }
        .onDrop(of: LibraryWindowDropTarget.types, delegate: LibraryWindowDropTarget(available: app.libraryEditing != nil && app.libraryEditing?.busy == false) { drop in
            guard let editor = app.libraryEditing else { return }
            switch drop {
            case let .opml(url): Task { await editor.selectOPMLFile(url) }
            case let .feed(url):
                editor.setDraft(url.absoluteString, field: "addPodcasts")
                showAddPodcasts = true
            }
        })
        .modifier(PlaylistSheetHost(presentation: playlistPresentation, app: app, created: { window.navigate(to: .playlist($0)) }))
        .focusedSceneValue(\.podListEpisodes, EpisodeCommandContext(ids: selectedIDs(library), library: library, window: window, presentation: playlistPresentation, playSelection: { await playSelection(library) }, showDetails: { inspectorVisible = true }))
        .focusedSceneValue(\.podListLibraryActions, LibraryWindowActions(add: { showAddPodcasts = true }, newView: { newView() }, search: { podcastFeed = nil; window.navigate(to: .search); searchFocused = true }, editView: { editCurrentView(library) }, openInNewWindow: newWindowAction))
        .sheet(isPresented: Binding(get: { app.libraryEditing?.importPresented == true }, set: { app.libraryEditing?.importPresented = $0 })) {
            if let editor = app.libraryEditing { ContentSizedPanel(width: 600) { VStack(alignment: .leading) {
                Text("Import OPML").macContentFont(.title2).bold()
                OPMLImportContent(editor: editor, choose: { LibraryFileActions.importOPML(app) })
                Button("Done") { editor.importPresented = false }.keyboardShortcut(.cancelAction)
            }.padding(24) } }
        }
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
        .onChange(of: window.destination) { _, _ in
            podcastFeed = nil
        }
        .focusedSceneValue(\.podListInspector, showsEpisodeInspector ? $inspectorVisible : nil)
        .focusedSceneValue(\.podListOpenPlaylist, { window.showNowPlaying = false; window.navigate(to: .playlist(library.state.activePlaylistId)) })
        .focusedSceneValue(\.podListNowPlaying, { window.showNowPlaying = true })
        .sheet(isPresented: $window.showNowPlaying) {
            if let controller = app.playback {
                NowPlayingView(controller: controller, library: library, app: app) {
                    window.openNowPlayingEntries(library.state.activePlaylistId)
                }
            }
        }
        .onChange(of: app.library?.snapshot) { previous, _ in
            if let library = app.library {
                if !restoredContext, library.snapshot.isReady, previous?.state.views.isEmpty != false, library.subscriptions.isEmpty,
                   let first = library.state.views.first, app.libraryEditing?.showGettingStarted == true {
                    window.navigate(to: .view(first.id))
                }
                reconcileSelection(library)
            }
        }
        .onChange(of: window.search) { _, text in
            if !isPodcastPage, window.destination == .search { app.libraryEditing?.setDraft(text, field: "librarySearch") }
            reconcileSelection(library)
        }
        .onChange(of: app.playback?.userPlaybackRevision) { _, _ in window.didStartPlayback() }
        .onChange(of: window.destination) { _, _ in playlistPresentation.playlistTab = .entries }
        .onChange(of: currentContext) { _, context in
            if contextLoaded, context.libraryID == contextLibraryID { savedContext = context.encoded }
        }
    }

    @ViewBuilder private func content(_ library: LibraryModel) -> some SwiftUI.View {
        switch window.destination {
        case .views:
            if library.state.views.isEmpty {
                ContentUnavailableView {
                    Label("No Views", systemImage: "line.3.horizontal.decrease")
                } description: { Text("Create a View to find Episodes.") }
                actions: { Button("New View") { newView() } }
            } else {
                List(library.state.views, id: \.id) { view in
                    Button { window.navigate(to: .view(view.id)) } label: {
                        HStack { Text(view.name); Spacer(); Text(CountText.format(library.viewEpisodes(view).count, .episode)).foregroundStyle(.secondary) }
                    }.buttonStyle(.plain)
                    .contextMenu { sidebarActions(.view(view.id), library: library) }
                }
            }
        case .subscriptions:
            subscriptions(library)
        case .trash:
            if let editing = app.editing { PlaylistTrashView(library: library, editing: editing, search: window.search) }
        case let .playlist(id):
            if let playlist = library.state.playlists.first(where: { $0.id == id }), let editing = app.editing {
                PlaylistContentView(playlist: playlist, library: library, window: window, app: app, editing: editing, presentation: playlistPresentation, openEpisode: { inspectorVisible = true })
            }
        case let .subscription(id):
            if let sub = library.snapshot.subscriptions.first(where: { $0.id == id }), let editor = app.libraryEditing {
                PodcastPageScreen(feedURL: sub.feedUrl, app: app, editor: editor, library: library, selection: $window.selection, search: $window.search, savedSort: $window.podcastSort, openEpisode: { inspectorVisible = true }, displayed: { podcastEpisodeIDs = $0 }).id(sub.feedUrl)
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
                ContentUnavailableView {
                    Label(window.search.isEmpty ? "No Subscriptions" : "No Matching Subscriptions", systemImage: "rectangle.stack")
                } description: { Text("Search by name or feed address, or clear Search.") }
                actions: {
                    Button("Add Podcasts") { showAddPodcasts = true }
                    if !window.search.isEmpty { Button("Clear Search") { window.search = "" } }
                }
            } else {
                VStack(alignment: .leading) {
                    HStack {
                        Text("Grouped by Download Rule").foregroundStyle(.secondary)
                        Spacer()
                        Button(subscriptionSelection.isEmpty ? "Edit Download Rules…" : "Edit Download Rules for \(CountText.format(subscriptionSelection.count, .subscription))…") { showBulkRules = true }
                            .disabled(subscriptionSelection.isEmpty)
                    }.padding(.horizontal)
                    List(selection: $subscriptionSelection) {
                        ForEach(groups) { group in
                            Section(group.name) {
                                ForEach(group.subscriptions, id: \.id) { subscription in
                                    HStack(spacing: 12) {
                                        ArtworkView(url: subscription.artwork.flatMap { URL(string: $0.url) }, title: subscription.title, size: 44)
                                        Text(subscription.title).macContentFont(.headline).fixedSize(horizontal: false, vertical: true)
                                        Spacer()
                                        Button { window.navigate(to: .subscription(subscription.id)) } label: {
                                            MacIconLabel(title: "Open", systemImage: "chevron.right")
                                        }
                                            .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle())
                                            .help("Open \(subscription.title)").accessibilityLabel("Open \(subscription.title), Subscription")
                                    }.padding(.vertical, 5).contentShape(Rectangle()).tag(subscription.id)
                                }
                            }
                        }
                    }.listStyle(.inset)
                    .contextMenu(forSelectionType: String.self) { ids in
                        subscriptionActions(library, ids: ids)
                    } primaryAction: { ids in
                        if let id = ids.first { window.navigate(to: .subscription(id)) }
                    }
                }
                .sheet(isPresented: $showBulkRules) {
                    BulkDownloadRuleSheet(ids: library.subscriptions.map(\.id).filter { subscriptionSelection.contains($0) }, app: app)
                }
            }
        }
        .focusedSceneValue(\.podListPodcast, subscriptionCommands(library))
        .sheet(isPresented: $showSubscriptionSettings) {
            if let subscription = selectedSubscription(library), let editor = app.libraryEditing {
                SubscriptionSettingsScreen(subscription: subscription, library: library, app: app, editor: editor)
            }
        }
    }

    @ViewBuilder private func sidebarActions(_ destination: Destination, library: LibraryModel) -> some SwiftUI.View {
        switch destination {
        case let .playlist(id):
            Button("Open in New Window") { openDestinationInNewWindow(destination) }
            if let playlist = library.state.playlists.first(where: { $0.id == id }), let editing = app.editing {
                Button("Play") { Task { await editing.playFromHere(playlistID: id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId) } }
                    .disabled(editing.busy)
                Button("Playlist Settings…") { playlistPresentation.sheet = .settings(id) }
                Button("Rename…") {
                    if editing.drafts["rename/\(id)"].isEmpty { editing.drafts["rename/\(id)"] = playlist.name }
                    editing.drafts["rename-open/\(id)"] = "true"
                    playlistPresentation.sheet = .settings(id)
                }.disabled(playlist.isDefault || editing.busy)
                Toggle("Clear on Played", isOn: Binding(get: {
                    app.library?.state.playlists.first { $0.id == id }?.clearOnPlayed ?? playlist.clearOnPlayed
                }, set: { value in
                    Task { await editing.edit([.setClearOnPlayed(playlistId: id, clearOnPlayed: value)], name: "Clear on Played") }
                })).disabled(editing.busy)
                Divider()
                Button("Delete Playlist", role: .destructive) { Task { await editing.delete(playlist) } }
                    .disabled(playlist.isDefault || editing.busy)
            }
        case let .view(id):
            Button("Open in New Window") { openDestinationInNewWindow(destination) }
            if let view = library.state.views.first(where: { $0.id == id }), let editor = app.libraryEditing {
                Button("Edit View…") { editView(view) }.disabled(editor.busy || app.editing?.busy == true)
                Button("Rename…") {
                    if editor.draft("rename.\(id)").isEmpty { editor.setDraft(view.name, field: "rename.\(id)") }
                    editView(view)
                }.disabled(editor.busy || app.editing?.busy == true)
                Divider()
                Button("Delete View", role: .destructive) {
                    editor.run { try await editor.deleteView(view) }
                }.disabled(editor.busy || app.editing?.busy == true)
            }
        default: EmptyView()
        }
    }

    @ViewBuilder private func subscriptionActions(_ library: LibraryModel, ids: Set<String>) -> some SwiftUI.View {
        let subscription = selectedSubscription(library, selection: ids)
        let commands = subscriptionCommands(library, selection: ids)
        Button("Open") {
            if let subscription { window.navigate(to: .subscription(subscription.id)) }
        }.disabled(subscription == nil)
        Button("Unsubscribe") { commands.subscriptionAction?() }.disabled(commands.subscriptionAction == nil)
        Button("Subscription Settings…") { commands.settings?() }.disabled(commands.settings == nil)
        Button("Edit Download Rules…") { commands.downloadRules?() }.disabled(commands.downloadRules == nil)
        Divider()
        Button("Copy Feed Address") { if let url = commands.feedURL { ShareLinks.copy(url) } }.disabled(commands.feedURL == nil)
        ShareLink(items: commands.shareURL.map { [$0] } ?? []) { Text("Share Podcast…") }.disabled(commands.shareURL == nil)
    }

    private func selectedSubscription(_ library: LibraryModel, selection: Set<String>? = nil) -> Subscription? {
        let visible = Set(library.subscriptionGroups(search: window.search).flatMap { $0.subscriptions.map(\.id) })
        let ids = (selection ?? subscriptionSelection).intersection(visible)
        guard ids.count == 1 else { return nil }
        return library.subscriptions.first { ids.contains($0.id) }
    }
    private func subscriptionCommands(_ library: LibraryModel, selection: Set<String>? = nil) -> PodcastCommandContext {
        let subscription = selectedSubscription(library, selection: selection)
        let visible = Set(library.subscriptionGroups(search: window.search).flatMap { $0.subscriptions.map(\.id) })
        let ids = (selection ?? subscriptionSelection).intersection(visible)
        let hasSelection = !ids.isEmpty
        let available = app.libraryEditing != nil && app.libraryEditing?.busy == false && app.editing?.busy == false
        return PodcastCommandContext(
            subscribed: subscription != nil,
            subscriptionAction: subscription != nil && available ? {
                guard let subscription, let editor = app.libraryEditing else { return }
                editor.run { try await editor.unsubscribe(subscription) }
            } : nil,
            settings: subscription != nil && available ? { subscriptionSelection = ids; showSubscriptionSettings = true } : nil,
            downloadRules: hasSelection && available ? { subscriptionSelection = ids; showBulkRules = true } : nil,
            shareURL: subscription.flatMap { ShareLinks.podcast(page: library.snapshot.podcastLinks[$0.id], feed: $0.feedUrl) },
            feedURL: subscription.flatMap { ShareLinks.web($0.feedUrl) })
    }

    private func episodeTable(_ library: LibraryModel) -> some SwiftUI.View {
        let rows = window.rows(in: library)
        return VStack(alignment: .leading, spacing: 0) {
            if case let .view(id) = window.destination, let view = library.state.views.first(where: { $0.id == id }) {
                Text(ViewDescription.text(view, library: library)).macContentFont(.subheadline).foregroundStyle(.secondary)
                    .padding(.horizontal, 16).padding(.vertical, 10)
            }
            if case let .subscription(id) = window.destination { DownloadRuleEditor(subscriptionID: id, library: library, app: app).padding(12) }
            if rows.isEmpty {
                switch library.emptyEpisodes(syncing: app.syncing) {
                case .loading: ProgressView("Loading Episodes…").frame(maxWidth: .infinity, maxHeight: .infinity)
                case .noSubscriptions:
                    ContentUnavailableView {
                        Label("No Subscriptions", systemImage: "rectangle.stack")
                    } description: { Text("Add podcasts to find Episodes.") }
                    actions: { Button("Add Podcasts") { showAddPodcasts = true } }
                case .noMatches:
                    ContentUnavailableView {
                        Label("No Matching Episodes", systemImage: "magnifyingglass")
                    } description: { Text("Change this View or Search to find Episodes.") }
                    actions: {
                        if case .view = window.destination { Button("Edit View…") { editCurrentView(library) } }
                        if !window.search.isEmpty { Button("Clear Search") { window.search = "" } }
                    }
                }
            } else {
                Group {
                    if textScale > 1 {
                        List(selection: $window.selection) {
                            Section {
                                ForEach(rows) { row in
                                    MacReadingRow { episodeTitle(row, library: library) } metadata: {
                                        "Published \(row.episode == nil ? "—" : row.publishedDate.formatted(date: .abbreviated, time: .omitted)) · Length \(row.durationText) · \(row.stateText)"
                                    }.tag(row.id).draggable(episodeDragPayload(row.id, rows: rows, library: library))
                                }
                            } header: { MacReadingSortControl(sort: Binding(get: { window.sortOrder.compactMap(WindowSort.init) }, set: { window.sortOrder = $0.map(\.comparator) })) }
                        }
                    } else {
                        Table(of: EpisodeRow.self, selection: $window.selection, sortOrder: $window.sortOrder) {
                            TableColumn("Episode", value: \.title) { row in episodeTitle(row, library: library) }
                            TableColumn("Published", value: \.published) { row in
                                if row.episode != nil { Text(row.publishedDate, format: .dateTime.day().month(.abbreviated).year()) }
                                else { Text("—") }
                            }.width(min: 95, ideal: 110, max: 150)
                            TableColumn("Length", value: \.length) { row in Text(row.durationText).monospacedDigit() }.width(min: 60, ideal: 70, max: 100)
                            TableColumn("State", value: \.stateText).width(min: 80, ideal: 110, max: 150)
                        } rows: {
                            ForEach(rows) { row in
                                TableRow(row).draggable(episodeDragPayload(row.id, rows: rows, library: library))
                            }
                        }
                        .tableStyle(.inset)
                    }
                }
                .alternatingRowBackgrounds(.disabled)
                .contextMenu(forSelectionType: String.self) { selection in
                    if let editing = app.editing {
                        EpisodeActionItems(ids: rows.map(\.id).filter { selection.contains($0) }, library: library, editing: editing, presentation: playlistPresentation, app: app)
                            .disabled(selection.isEmpty || editing.busy)
                    }
                } primaryAction: { _ in inspectorVisible = true }
                .onCopyCommand(perform: window.selection.isEmpty ? nil : {
                    EpisodeCopyContent.providers(ids: rows.map(\.id).filter { window.selection.contains($0) }, library: library)
                })
                .accessibilityLabel(textScale > 1 ? "Episodes, use Sort by and Descending to change order" : "Episodes, sortable columns")
            }
        }
    }

    private func episodeDragPayload(_ id: String, rows: [EpisodeRow], library: LibraryModel) -> EpisodeTransfer {
        EpisodeTransfer.local(id, selection: rows.map(\.id).filter { window.selection.contains($0) }, library: library)
    }

    private func episodeTitle(_ row: EpisodeRow, library: LibraryModel) -> some SwiftUI.View {
        HStack(spacing: 8) {
            if let ordinal = row.ordinal { Text(ordinal, format: .number).foregroundStyle(.secondary).monospacedDigit() }
            if row.isCursor { Image(systemName: "play.circle.fill").foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Current Entry") }
            VStack(alignment: .leading, spacing: 3) {
                if row.isCursor { Text("Current Entry").macContentFont(.caption).foregroundStyle(MacRowAccentStyle()) }
                Text(row.title).lineLimit(textScale > 1 ? nil : 2).fixedSize(horizontal: false, vertical: true)
                Text(row.podcast).macContentFont(.caption).foregroundStyle(.secondary).lineLimit(textScale > 1 ? nil : 1)
            }.padding(.vertical, 5)
            Spacer(minLength: 4)
            // A status mark beside the row actions, never drawn over them.
            if app.downloadStatuses[row.id]?.phase == .stored {
                Image(systemName: "arrow.down.circle.fill").foregroundStyle(.secondary).accessibilityLabel("Downloaded")
            }
            if let editing = app.editing {
                Button { playlistPresentation.sheet = .add([row.id], false) } label: {
                    MacIconLabel(title: "Add to a Playlist", systemImage: "text.badge.plus")
                }
                    .buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Add \(row.title) to a Playlist")
                    .help("Add \(row.title) to a Playlist")
                Button { Task { await editing.add([row.id], placement: .now) } } label: {
                    MacIconLabel(title: "Play Now", systemImage: "play.fill")
                }
                    .buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Play Now: \(row.title)")
                    .help("Play Now: \(row.title)")
            }
        }
        .accessibilityElement(children: .contain)
        .contextMenu {
            if let editing = app.editing {
                EpisodeActionItems(ids: window.selection.contains(row.id) ? selectedIDs(library) : [row.id],
                    library: library, editing: editing, presentation: playlistPresentation, app: app)
                    .disabled(editing.busy)
            }

        }
    }

    private var syncStatus: some SwiftUI.View {
        HStack(spacing: 8) {
            if app.syncing {
                ProgressView().controlSize(.mini).accessibilityLabel("Syncing")
                Text("Syncing…")
            } else if let error = app.syncError {
                Image(systemName: "exclamationmark.icloud").accessibilityHidden(true)
                FailureFeedback(message: error) { Task { await app.sync(forceRefresh: true) } }
            } else {
                Image(systemName: "checkmark.icloud").accessibilityHidden(true)
                Text(app.lastSync == nil ? "Local Library" : "Up to date")
            }
            Spacer(minLength: 0)
        }
        .macContentFont(.caption).foregroundStyle(.secondary).padding(.horizontal, 14).padding(.vertical, 7)
    }

    private func selectionRows(_ library: LibraryModel) -> [EpisodeRow] {
        if isPodcastPage {
            return podcastEpisodeIDs.filter { id in library.snapshot.episodes.contains { $0.id == id } }.map { library.row($0) }
        }
        if case let .playlist(id) = window.destination, playlistPresentation.playlistTab == .history {
            var seen = Set<String>()
            return (library.state.playlists.first { $0.id == id }?.history.reversed().map(\.episodeId) ?? [])
                .filter { seen.insert($0).inserted }.map { library.row($0) }
        }
        return window.rows(in: library)
    }
    private func reconcileSelection(_ library: LibraryModel) {
        let context = currentContext.reconciled(in: library)
        guard context != currentContext else { return }
        window.restore(context)
        playlistPresentation.playlistTab = context.playlistTab
        podcastFeed = context.podcastFeed
        subscriptionSelection = context.subscriptionSelection
    }

    private var currentContext: WindowContext {
        window.context(libraryID: app.origin ?? "standalone", playlistTab: playlistPresentation.playlistTab,
                       columns: .init(columns), podcastFeed: podcastFeed, subscriptionSelection: subscriptionSelection)
    }

    private func restoreContext(in library: LibraryModel) {
        let saved = WindowContext.decode(savedContext)
        let libraryID = app.origin ?? "standalone"
        restoredContext = saved?.libraryID == libraryID || initialDestination != nil
        let context = (saved.flatMap { $0.libraryID == libraryID ? $0 : nil } ?? WindowContext(libraryID: libraryID, destination: initialDestination ?? .subscriptions))
            .reconciled(in: library)
        window.restore(context)
        playlistPresentation.playlistTab = context.playlistTab
        columns = context.columns.visibility
        podcastFeed = context.podcastFeed
        subscriptionSelection = context.subscriptionSelection
        contextLibraryID = libraryID
        contextLoaded = true
        savedContext = context.encoded
    }

    private func selectedIDs(_ library: LibraryModel) -> [String] {
        selectionRows(library).map(\.id).filter { window.selection.contains($0) }
    }
    private var isPodcastPage: Bool {
        if case .subscription = window.destination { return true }
        return podcastFeed != nil
    }
    private func editCurrentView(_ library: LibraryModel) {
        guard case let .view(id) = window.destination,
              let view = library.state.views.first(where: { $0.id == id }) else { return }
        editView(view)
    }
    private func editView(_ view: PodListDomain.View) {
        creatingView = false; editingView = view
    }
    private func playSelection(_ library: LibraryModel) async {
        guard let id = selectedIDs(library).first, let editing = app.editing else { app.playback?.toggle(); return }
        if case let .playlist(playlistID) = window.destination {
            await editing.playFromHere(playlistID: playlistID, episodeID: id)
        } else { await editing.add([id], placement: .now) }
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
    private var showsEpisodeInspector: Bool {
        if isPodcastPage { return true }
        switch window.destination {
        case .view, .search: return true
        case .playlist: return playlistPresentation.playlistTab != .timeline
        default: return false
        }
    }
    private var newWindowAction: (() -> Void)? {
        guard !isPodcastPage, let destination = window.destination else { return nil }
        switch destination {
        case .playlist, .view: return { openDestinationInNewWindow(destination) }
        default: return nil
        }
    }
    private func openDestinationInNewWindow(_ destination: Destination) {
        openWindow(id: "library", value: LibraryWindowTarget(destination: destination))
    }
    private func summary(_ library: LibraryModel) -> String {
        switch window.destination {
        case .views: CountText.format(library.state.views.count, .view)
        case .subscriptions: CountText.format(library.subscriptions.count, .subscription)
        case .trash: CountText.format(library.trash.count, .playlist)
        case let .playlist(id):
            CountText.format(window.rows(in: library).count, .entry) + (id == library.state.activePlaylistId ? " · Active Playlist" : "")
        default: CountText.format(window.rows(in: library).count, .episode) + (window.selection.isEmpty ? "" : " · \(window.selection.count) selected")
        }
    }
    private func symbol(_ destination: Destination) -> String {
        switch destination {
        case .view, .views: "line.3.horizontal.decrease"
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
private extension WindowContext.Columns {
    init(_ visibility: NavigationSplitViewVisibility) {
        switch visibility {
        case .all: self = .all
        case .doubleColumn: self = .doubleColumn
        case .detailOnly: self = .detailOnly
        default: self = .automatic
        }
    }
    var visibility: NavigationSplitViewVisibility {
        switch self {
        case .automatic: .automatic
        case .all: .all
        case .doubleColumn: .doubleColumn
        case .detailOnly: .detailOnly
        }
    }
}
#endif
