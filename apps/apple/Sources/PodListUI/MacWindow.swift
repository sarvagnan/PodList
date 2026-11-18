#if os(macOS)
import SwiftUI
import PodListDomain

public struct PodListWindow: SwiftUI.View {
    @Bindable private var app: ApplicationModel
    @State private var window = WindowModel()
    @State private var linkError: String?
    @State private var playlistPresentation = PlaylistPresentation()
    @FocusState private var searchFocused: Bool
    @FocusState private var viewsFocused: Bool
    @State private var editingView: PodListDomain.View?
    @State private var creatingView = false
    @State private var showBulkRules = false
    @State private var showSubscriptionSettings = false
    @State private var podcastPreviews: [String: PodcastEpisodePreview] = [:]
    @State private var podcastEpisodeIDs: [String] = []
    @State private var playbackBarHeight: CGFloat = 0
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
        .alert("Cannot Open PodList Link", isPresented: Binding(get: { linkError != nil }, set: { if !$0 { linkError = nil } })) {
            Button("OK", role: .cancel) { linkError = nil }
        } message: { Text(linkError ?? "") }
        .task { await app.start() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { app.requestSync() } else { app.playback?.flush() } }
        .onChange(of: app.library?.snapshot, initial: true) { _, _ in
            if !contextLoaded, let library = app.library { restoreContext(in: library) }
        }
        .onChange(of: app.origin) { _, _ in
            guard contextLoaded, contextLibraryID != (app.origin ?? "standalone") else { return }
            contextLoaded = false
            window.clearListMemory(); playlistPresentation.sheet = nil
            if let library = app.library { restoreContext(in: library) }
        }
    }

    private func openLink(_ link: PodListLink) {
        guard let library = app.library else { return }
        guard window.open(link, in: library) else {
            linkError = "This \(link.kindName) is no longer in this Library. It may have been removed or belong to another Library."
            return
        }
        if case .episode = link { showEpisodeInspector() }
        if case .playlist = link { window.showPlaylistTab(.entries) }
    }

    private var podcastFeed: String? { window.podcastFeed }

    private func showEpisodeInspector() {
        if !inspectorVisible { inspectorVisible = true }
    }

    private var isPlaylist: Bool {
        if case .playlist = window.destination { return !isPodcastPage }; return false
    }

    private func connected(_ library: LibraryModel) -> some SwiftUI.View {
        let showsEpisodeInspector = window.supportsEpisodeInspector
        let playbackInset = app.playback?.hasDisplay == true ? playbackBarHeight : 0
        let rows = window.rows(in: library)
        let selection = window.selection
        let selectedRows = selection.isEmpty ? [] : selectionRows(library, rows: rows).filter { selection.contains($0.id) }
        let selectedIDs = selectedRows.map(\.id)
        return NavigationSplitView(columnVisibility: $columns) {
            List(selection: Binding(get: { podcastFeed == nil ? window.sidebarSelection : .subscriptions }, set: {
                if $0 == nil, window.destination == .views { return }
                window.navigate(to: $0)
            })) {
                ForEach(library.sidebar) { section in
                    Section {
                        if section.name == "Views" {
                            Button("New View…", systemImage: "plus") { newView() }.buttonStyle(.plain).selectionDisabled()
                        }
                        if section.name == "Playlists" { Button("New Playlist…", systemImage: "plus") { playlistPresentation.sheet = .newPlaylist }.buttonStyle(.plain).selectionDisabled() }
                        if section.name == "Library" { Button("Add Podcasts…", systemImage: "plus") { openWindow(id: "add-podcasts") }.buttonStyle(.plain).selectionDisabled() }
                        if section.items.isEmpty {
                            Text("No \(section.name)").foregroundStyle(MacReadableSecondaryStyle())
                        }
                        ForEach(section.items) { item in
                            HStack(spacing: 8) {
                                Label { Text(item.name) } icon: {
                                    Image(systemName: symbol(item.destination)).foregroundStyle(MacRowAccentStyle())
                                }
                                    .lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 4)
                                if item.active {
                                    Image(systemName: "speaker.wave.2.fill")
                                        .foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Active Playlist").help("Active Playlist")
                                }
                                if item.destination != .search {
                                    Text(item.count, format: .number).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.sidebarSelection == item.destination)).monospacedDigit()
                                }
                            }
                            .contentShape(Rectangle())
                            .tag(item.destination)
                            .simultaneousGesture(TapGesture().onEnded {
                                // The parent is already selected on a Podcast page; a click
                                // must still open the Subscriptions list.
                                if item.destination == .subscriptions, isPodcastPage {
                                    window.navigate(to: .subscriptions)
                                }
                            })
                            .contextMenu { sidebarActions(item.destination, library: library) }
                            .modifier(PlaylistEpisodeDropTarget(destination: item.destination, editor: app.libraryEditing, window: window, showingEntries: window.playlistTab == .entries))
                            .accessibilityElement(children: .combine)
                            .accessibilityIdentifier("sidebar.\(item.name)")
                            .accessibilityLabel("\(item.name)\(item.destination == .search ? "" : ", \(item.count)")\(item.active ? ", Active Playlist" : "")\(item.clearOnPlayed.map { $0 ? ", Clear on Played on" : ", Clear on Played off" } ?? "")")
                        }
                    } header: { MacSidebarSectionHeader(section.name) }
                }
            }
            // Sidebar metrics belong to macOS; app Text Size scales content only.
            .environment(\.macTextScale, 1)
            .listStyle(.sidebar)
            .playbackBarScrollClearance()
            // Observe AppKit's divider from the background, without wrapping the column
            // root or feeding live measurements into its ideal width.
            .background(MacSidebarWidth { window.paneWidths.sidebar = $0 })
            .navigationSplitViewColumnWidth(min: 180, ideal: window.initialPaneWidths.sidebar, max: 320)
            .navigationTitle("PodList")
        } detail: {
            VStack(spacing: 0) {
                if let editor = app.libraryEditing {
                    LibraryFeedback(editor: editor, surface: .library, sync: app, reservesSpace: true, restored: { entries in
                        if app.libraryEditing === editor { window.revealRestoredEntries(entries) }
                    })
                        .id(window.destination).id(podcastFeed)
                    if editor.busy { VStack {
                        OPMLImportProgress(editor: editor)
                        Text("Closing the import window does not stop the import. Unfinished imports resume on next launch unless you cancel.").macContentFont(.caption)
                        Button("Show Import Results") { editor.importPresented = true }
                    } }
                    if editor.importPaused && !editor.busy {
                        Button("Show Cancelled Import Results") { editor.importPresented = true }
                    }
                    if !editor.importFailed.isEmpty { Button("Retry Failed Imports") { Task { await editor.retryImport() } } }
                } else if let editing = app.editing {
                    EditingFeedback(editing: editing, surface: .library, sync: app, reservesSpace: true).id(window.destination).id(podcastFeed)
                } else {
                    LibrarySyncStatus(app: app).macContentFont(.caption).padding(.horizontal, 14).frame(height: 32)
                }
                // Lists and AppKit tables must fit the space left by window feedback.
                GeometryReader { viewport in
                    VStack(spacing: 0) {
                        if !isPodcastPage, let editor = app.libraryEditing, editor.showsGettingStarted(on: window.destination, in: library) {
                            GettingStartedScreen(editor: editor, add: { openWindow(id: "add-podcasts") },
                                                 maxInlineHeight: max(64, (viewport.size.height - playbackInset) * 0.65))
                        }
                        GeometryReader { contentViewport in
                            Group {
                                if let podcastFeed, let editor = app.libraryEditing {
                                    podcastPage(feed: podcastFeed, editor: editor, library: library)
                                } else { content(library, rows: rows) }
                            }
                            .id(window.destination).id(podcastFeed)
                            .frame(width: contentViewport.size.width, height: contentViewport.size.height)
                        }
                    }
                    .frame(width: viewport.size.width, height: viewport.size.height)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .macContentFont(.body)
            .navigationTitle(podcastFeed == nil ? library.title(window.destination) : "Podcast")
            .navigationSubtitle(Self.subtitle(summary: isPodcastPage ? "" : summary(library, rowCount: rows.count), playbackError: app.playback?.error))
            .toolbar {
                ToolbarItem(placement: .navigation) {
                    if isPodcastPage {
                        Button("Back to Library", systemImage: "chevron.left", action: backToLibrary)
                            .help("Back to Library (⌘[)")
                            .accessibilityLabel("Back to Library")
                    }
                }
                if let editing = app.editing, showsEpisodeInspector {
                    // Retain disabled selection controls to keep the three groups,
                    // Inspector and Search in the same positions as selection changes.
                    EpisodeActionButtons(ids: selectedIDs, library: library, editing: editing, presentation: playlistPresentation, app: app,
                        playlist: toolbarPlaylist(library), editView: toolbarView(library).map { view in { editView(view) } })
                }
                ToolbarSpacer(.fixed, placement: .primaryAction)
                ToolbarItem(placement: .primaryAction) {
                    if showsEpisodeInspector {
                        Button(inspectorVisible ? "Hide Inspector" : "Show Inspector", systemImage: "sidebar.right") {
                            inspectorVisible.toggle()
                        }
                        .help("Show or hide Inspector (⌥⌘I)")
                        .accessibilityLabel(inspectorVisible ? "Hide Inspector" : "Show Inspector")
                        .accessibilityIdentifier("library.inspector")
                    }
                }
            }
            .searchable(text: $window.search, placement: .toolbar, prompt: isPodcastPage ? "Search Episodes" : window.destination == .search ? "Search Library" : "Search this list")
            .searchFocused($searchFocused)
            .inspector(isPresented: window.inspectorPresentation($inspectorVisible)) {
                let row = isPodcastPage
                    ? library.snapshot.episodes.first { selection.contains($0.id) }.map { library.row($0.id) }
                    : selectedRows.first
                // Publisher rows not yet imported still count toward the selection summary.
                let inspectorIDs = selectedIDs + selection.subtracting(Set(selectedIDs)).sorted()
                let preview = isPodcastPage && selection.count == 1 ? selection.first.flatMap { podcastPreviews[$0] } : nil
                EpisodeInspector(row: row, library: library, app: app, playlistPresentation: playlistPresentation,
                                 selectedIDs: inspectorIDs, podcastPreview: preview)
                    #if DEBUG
                    .tourResponse(row != nil && inspectorIDs.count == 1 && tourIsNewThisWeek(library) ? .inspector : nil)
                    #endif
                    .inspectorColumnWidth(min: 260, ideal: window.initialPaneWidths.inspector, max: 440)
                    .onGeometryChange(for: Double.self) { $0.size.width } action: { width in
                        if (260...440).contains(width) { window.paneWidths.inspector = width }
                    }
            }
        }
        .focusedSceneValue(\.podListSidebar, LibrarySidebarContext(visible: columns != .detailOnly) {
            columns = columns == .detailOnly ? .all : .detailOnly
        })
        .modifier(PlaybackSeekHost(app: app))
        .overlay(alignment: .bottom) {
            if let playback = app.playback, playback.hasDisplay {
                PlayerBar(controller: playback, library: library,
                          openPlaylist: { window.navigate(to: .playlist(library.state.activePlaylistId)) },
                          openNowPlaying: { openWindow(id: "now-playing") }, announcements: app.announcements)
                    .environment(\.podListRecoveryIndexed, true)
                    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { playbackBarHeight = $0 }
            }
        }
        .environment(\.libraryPlaybackBarInset, playbackInset)
        .onDrop(of: LibraryWindowDropTarget.types, delegate: LibraryWindowDropTarget(available: app.libraryEditing != nil && app.libraryEditing?.busy == false) { batch in
            await app.libraryEditing?.selectLibraryDrops(batch)
        })
        .modifier(PlaylistSheetHost(presentation: playlistPresentation, app: app, created: { window.navigate(to: .playlist($0)) }))
        .focusedSceneValue(\.podListWindowActions, windowMenuActions)
        .focusedSceneValue(\.podListEpisodes, EpisodeCommandContext(ids: selectedIDs, library: library, window: window, presentation: playlistPresentation, showDetails: showEpisodeInspector))
        .focusedSceneValue(\.podListLibraryActions, LibraryWindowActions(add: { openWindow(id: "add-podcasts") }, newView: { newView() }, search: { window.navigate(to: .search); searchFocused = true }, editView: { editCurrentView(library) }, openInNewWindow: newWindowAction, renameView: renameViewAction(library), selectedViewID: selectedView(library)?.id, deleteView: deleteViewAction(library)))
        .sheet(isPresented: Binding(get: { app.libraryEditing?.importPresented == true }, set: { app.libraryEditing?.importPresented = $0 })) {
            if let editor = app.libraryEditing {
                PodListSheet(title: editor.groupsDroppedImport ? "Import Podcasts" : "Import OPML", width: 600, actionTitle: editor.importReady ? "Import" : "Close",
                             actionEnabled: !editor.importReady || editor.importTotal > 0,
                             cancelTitle: editor.importReady ? "Cancel" : nil,
                             cancel: { editor.cancelImportSelection(); editor.importPresented = false },
                             action: { if editor.importReady { editor.startImport() } else { editor.importPresented = false } }) {
                    OPMLImportContent(editor: editor, choose: { LibraryFileActions.importOPML(app) }, inSheet: true)
                } status: {
                    LibraryFeedback(editor: editor)
                } secondary: {
                    if editor.importReady { Button("Choose a Different File…") { LibraryFileActions.importOPML(app) } }
                }
                .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [.done: { editor.importPresented = false }]))
                .onExitCommand { editor.importPresented = false }
            }
        }
        .sheet(isPresented: Binding(get: { editingView != nil }, set: { if !$0 { editingView = nil } })) {
            if let view = editingView, let editor = app.libraryEditing {
                ViewEditorScreen(editor: editor, library: library, view: view, creating: creatingView) { id in
                    editingView = nil
                    if let id { window.navigate(to: .view(id)) }
                }
            }
        }
        .focusedSceneValue(\.podListInspector, showsEpisodeInspector ? $inspectorVisible : nil)
        .background(NowPlayingLibraryHost(navigation: app.nowPlayingNavigation, model: window, presentation: playlistPresentation, openPodcast: window.beginPodcastPage, openLink: openLink))
        .background(LibraryPlaybackSpaceHost(toggle: .init(controller: app.playback, library: library)))
        .focusedSceneValue(\.podListOpenPlaylist, { window.navigate(to: .playlist(library.state.activePlaylistId)) })
        .focusedSceneValue(\.podListNowPlaying, { openWindow(id: "now-playing") })
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
        .onChange(of: window.listID) { _, _ in reconcileSelection(library) }
        .onChange(of: currentContext) { _, context in
            if contextLoaded, context.libraryID == contextLibraryID { savedContext = context.encoded }
        }
    }

    private func backToLibrary() {
        window.backFromPodcast()
        if let library = app.library { reconcileSelection(library) }
    }
    private var windowMenuActions: MenuActionContext {
        var actions: [MenuAction: () -> Void] = [:]
        if !window.search.isEmpty { actions[.clearSearch] = { window.search = "" } }
        if isPodcastPage { actions[.backToLibrary] = { backToLibrary() } }
        if !app.syncing { actions[.refresh] = { Task { await app.sync(forceRefresh: true) } } }
        if let editor = app.libraryEditing {
            if editor.busy || !editor.importFeeds.isEmpty || editor.importReady { actions[.showImport] = { editor.importPresented = true } }
            if !editor.busy && !editor.importFailed.isEmpty { actions[.retryImport] = { Task { await editor.retryImport() } } }
        }
        return MenuActionContext(actions: actions)
    }

    @ViewBuilder private func content(_ library: LibraryModel, rows: [EpisodeRow]) -> some SwiftUI.View {
        switch window.destination {
        case .views:
            if library.state.views.isEmpty {
                PodListEmptyState("No Views", systemImage: "line.3.horizontal.decrease",
                                  description: "Create a View to find Episodes.") { Button("New View") { newView() } }
            } else {
                let ids = window.listBinding(\.selection)
                let selection = Binding<String?>(get: {
                    ids.wrappedValue.count == 1 ? ids.wrappedValue.first : nil
                }, set: { ids.wrappedValue = $0.map { [$0] } ?? [] })
                List(library.state.views, id: \.id, selection: selection) { view in
                    HStack(spacing: 10) {
                        Label(view.name, systemImage: "line.3.horizontal.decrease")
                        Spacer()
                        Text(CountText.format(library.viewEpisodes(view).count, .episode)).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.selection.contains(view.id)))
                    }.frame(minHeight: 44).padding(.vertical, 4)
                        .accessibilityElement(children: .combine)
                        .tag(view.id)
                }
                .playbackBarScrollClearance()
                .accessibilityIdentifier("views.list")
                .focused($viewsFocused)
                .onAppear { viewsFocused = true }
                .contextMenu(forSelectionType: String.self) { ids in
                    if let id = ids.first {
                        Button("Open") { window.navigate(to: .view(id)) }
                        sidebarActions(.view(id), library: library)
                    }
                } primaryAction: { ids in
                    if let id = ids.first { window.navigate(to: .view(id)) }
                }
                .typeSelectingRows(library.state.views.map { TypeSelectionRow(id: $0.id, title: $0.name) },
                    selection: selection, anchor: window.listBinding(\.scrollAnchor))
            }
        case .subscriptions:
            subscriptions(library)
        case .trash:
            if let editing = app.editing {
                PlaylistTrashView(library: library, editing: editing, search: window.search,
                                  selectedIDs: window.listBinding(\.selection), scrollAnchor: window.listBinding(\.scrollAnchor))
            }
        case let .playlist(id):
            if let playlist = library.state.playlists.first(where: { $0.id == id }), let editing = app.editing {
                PlaylistContentView(playlist: playlist, library: library, rows: rows, window: window, app: app, editing: editing, presentation: playlistPresentation, openEpisode: showEpisodeInspector)
            }
        case let .subscription(id):
            if let sub = library.snapshot.subscriptions.first(where: { $0.id == id }), let editor = app.libraryEditing {
                podcastPage(feed: sub.feedUrl, editor: editor, library: library)
            }
        case .view:
            episodeTable(library, rows: rows)
        case .search:
            VStack(alignment: .leading) {
                if let editor = app.libraryEditing { SearchViewCreation(editor: editor, library: library, query: window.search, count: rows.count) { id in window.navigate(to: .view(id)) } }
                episodeTable(library, rows: rows)
            }
        case nil:
            PodListEmptyState("Choose a View, Playlist or Library", systemImage: "sidebar.left")
        }
    }

    private func podcastPage(feed: String, editor: LibraryEditingModel, library: LibraryModel) -> some SwiftUI.View {
        let list = window.listID
        return PodcastPageScreen(feedURL: feed, app: app, editor: editor, library: library,
            selection: window.listBinding(\.selection), search: window.listBinding(\.search),
            savedSort: window.listBinding(\.podcastSort), scrollAnchor: window.listBinding(\.scrollAnchor),
            selectEpisodes: { ids, visibleIDs in
                window.selectEpisodes(ids, in: list, episodeIDs: visibleIDs, openInspector: showEpisodeInspector)
            }, displayed: { ids, previews in
                guard window.listID == list else { return }
                podcastEpisodeIDs = ids
                podcastPreviews = previews
            }).id(feed)
    }

    private func subscriptions(_ library: LibraryModel) -> some SwiftUI.View {
        let groups = library.subscriptionGroups(search: window.search)
        let selection = window.listBinding(\.subscriptionSelection)
        let selected = selection.wrappedValue.intersection(Set(groups.flatMap { $0.subscriptions.map(\.id) }))
        return Group {
            if groups.isEmpty {
                PodListEmptyState(window.search.isEmpty ? "No Subscriptions" : "No Matching Subscriptions", systemImage: "rectangle.stack",
                                  description: window.search.isEmpty ? "Add podcasts to see them here." : "Search by name or feed address, or clear Search.") {
                    Button("Add Podcasts…") { openWindow(id: "add-podcasts") }
                    if !window.search.isEmpty { Button("Clear Search") { window.search = "" } }
                }
            } else {
                VStack(alignment: .leading) {
                    HStack {
                        Text("Grouped by Download Rule").foregroundStyle(MacReadableSecondaryStyle())
                        Spacer()
                        Button(selected.isEmpty ? "Edit Download Rules…" : "Edit Download Rules for \(CountText.format(selected.count, .subscription))…") { showBulkRules = true }
                            .disabled(selected.isEmpty)
                    }.padding(.horizontal)
                    List(selection: selection) {
                        ForEach(groups) { group in
                            Section {
                                ForEach(group.subscriptions, id: \.id) { subscription in
                                    HStack(spacing: 12) {
                                        ArtworkView(url: subscription.artwork.flatMap { URL(string: $0.url) }, title: subscription.title, size: 44)
                                        Text(subscription.title).macContentFont(.headline).fixedSize(horizontal: false, vertical: true)
                                        Spacer()
                                        Button { window.navigate(to: .subscription(subscription.id)) } label: {
                                            MacIconLabel(title: "Open", systemImage: "chevron.right")
                                        }
                                            .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle())
                                            .help("Open podcast page").accessibilityLabel("Open \(subscription.title), Subscription")
                                    }.padding(.vertical, 5).contentShape(Rectangle()).tag(subscription.id)
                                }
                            } header: { Text(group.name).foregroundStyle(MacReadableSecondaryStyle()) }
                        }
                    }.listStyle(.inset)
                    .playbackBarScrollClearance()
                    .typeSelectingRows(groups.flatMap { $0.subscriptions.map { TypeSelectionRow(id: $0.id, title: $0.title) } },
                        physicalIDs: groups.flatMap { [nil] + $0.subscriptions.map { Optional($0.id) } },
                        selection: selection, anchor: window.listBinding(\.scrollAnchor))
                    .accessibilityIdentifier("subscriptions.list")
                    .contextMenu(forSelectionType: String.self) { ids in
                        subscriptionActions(library, ids: ids)
                    } primaryAction: { ids in
                        if let id = ids.first { window.navigate(to: .subscription(id)) }
                    }
                }
                .sheet(isPresented: $showBulkRules) {
                    BulkDownloadRuleSheet(ids: groups.flatMap { $0.subscriptions.map(\.id) }.filter { selected.contains($0) }, app: app)
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
            Button("Copy PodList Link") { ShareLinks.copy(PodListLink.playlist(id).url) }
            Button("Open in New Window") { openDestinationInNewWindow(destination) }
            if let playlist = library.state.playlists.first(where: { $0.id == id }), let editing = app.editing {
                Button("Play") { Task { await editing.playFromHere(playlistID: id, episodeID: playlist.cursor ?? playlist.entries.first?.episodeId) } }
                    .disabled(editing.busy)
                Button("Playlist Settings…") { playlistPresentation.sheet = .settings(id) }
                if !playlist.isDefault {
                    Button("Rename…") {
                        if PlaylistRenameAction.prepare(playlist, editing: editing) { playlistPresentation.sheet = .settings(id) }
                    }.disabled(editing.busy)
                }
                Toggle("Clear on Played", isOn: Binding(get: {
                    app.library?.state.playlists.first { $0.id == id }?.clearOnPlayed ?? playlist.clearOnPlayed
                }, set: { value in
                    Task { await editing.edit([.setClearOnPlayed(playlistId: id, clearOnPlayed: value)], name: "Clear on Played") }
                })).disabled(editing.busy)
                if !playlist.isDefault {
                    Divider()
                    Button("Delete Playlist", role: .destructive) { Task { await editing.delete(playlist) } }
                        .disabled(editing.busy)
                }
            }
        case let .view(id):
            Button("Copy PodList Link") { ShareLinks.copy(PodListLink.view(id).url) }
            Button("Open in New Window") { openDestinationInNewWindow(destination) }
            if let view = library.state.views.first(where: { $0.id == id }), let editor = app.libraryEditing {
                Button("Edit View…") { editView(view) }.disabled(editor.busy || app.editing?.busy == true)
                Button("Rename…") {
                    renameView(view)
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
        let commands = subscriptionCommands(library, selection: ids)
        if let open = commands.open { Button("Open", action: open) }
        if let unsubscribe = commands.subscriptionAction { Button("Unsubscribe", action: unsubscribe) }
        if let settings = commands.settings { Button("Subscription Settings…", action: settings) }
        if let downloadRules = commands.downloadRules { Button("Edit Download Rules…", action: downloadRules) }
        if commands.feedURL != nil || commands.shareURL != nil { Divider() }
        if let url = commands.feedURL {
            Button("Copy PodList Link") { ShareLinks.copy(PodListLink.podcast(url.absoluteString).url) }
        }
        if let url = commands.feedURL { Button("Copy Feed Address") { ShareLinks.copy(url) } }
        if let url = commands.shareURL { ShareLink(item: url) { Text("Share Podcast…") } }
    }

    private func selectedSubscription(_ library: LibraryModel, selection: Set<String>? = nil) -> Subscription? {
        let visible = Set(library.subscriptionGroups(search: window.search).flatMap { $0.subscriptions.map(\.id) })
        let ids = (selection ?? window.subscriptionSelection).intersection(visible)
        guard ids.count == 1 else { return nil }
        return library.subscriptions.first { ids.contains($0.id) }
    }
    private func subscriptionCommands(_ library: LibraryModel, selection: Set<String>? = nil) -> PodcastCommandContext {
        let subscription = selectedSubscription(library, selection: selection)
        let visible = Set(library.subscriptionGroups(search: window.search).flatMap { $0.subscriptions.map(\.id) })
        let ids = (selection ?? window.subscriptionSelection).intersection(visible)
        let hasSelection = !ids.isEmpty
        let available = app.libraryEditing != nil && app.libraryEditing?.busy == false && app.editing?.busy == false
        return PodcastCommandContext(
            open: subscription.map { sub in { window.navigate(to: .subscription(sub.id)) } },
            subscribed: subscription != nil,
            subscriptionAction: subscription != nil && available ? {
                guard let subscription, let editor = app.libraryEditing else { return }
                editor.run { try await editor.unsubscribe(subscription) }
            } : nil,
            settings: subscription != nil && available ? { window.subscriptionSelection = ids; showSubscriptionSettings = true } : nil,
            downloadRules: hasSelection && available ? { window.subscriptionSelection = ids; showBulkRules = true } : nil,
            markAllPlayed: app.libraryEditing.flatMap { SubscriptionPlayedAction.action(subscription, editor: $0) },
            shareURL: subscription.flatMap { ShareLinks.podcast(page: library.snapshot.podcastLinks[$0.id], feed: $0.feedUrl) },
            feedURL: subscription.flatMap { ShareLinks.web($0.feedUrl) })
    }

    private func episodeTable(_ library: LibraryModel, rows: [EpisodeRow]) -> some SwiftUI.View {
        let ids = rows.map(\.id)
        let selection = window.episodeSelection(episodeIDs: ids, openInspector: showEpisodeInspector)
        let activate: (Set<String>) -> Void = { selected in
            EpisodeRowActivation(orderedIDs: ids, selection: selected)?.start(using: app.editing)
        }
        return VStack(alignment: .leading, spacing: 0) {
            if case let .view(id) = window.destination, let view = library.state.views.first(where: { $0.id == id }) {
                Text(ViewDescription.text(view, library: library)).macContentFont(.subheadline).foregroundStyle(MacReadableSecondaryStyle())
                    .padding(.horizontal, 16).padding(.vertical, 10)
            }
            if case let .subscription(id) = window.destination { DownloadRuleEditor(subscriptionID: id, library: library, app: app).padding(12) }
            if rows.isEmpty {
                switch library.emptyEpisodes(syncing: app.syncing) {
                case .loading: ProgressView("Loading Episodes…").frame(maxWidth: .infinity, maxHeight: .infinity)
                case .noSubscriptions:
                    PodListEmptyState("No Subscriptions", systemImage: "rectangle.stack",
                                      description: "Add podcasts to find Episodes.") { Button("Add Podcasts…") { openWindow(id: "add-podcasts") } }
                case .noMatches:
                    PodListEmptyState("No Matching Episodes", systemImage: "magnifyingglass",
                                      description: "Change this View or Search to find Episodes.") {
                        if case .view = window.destination { Button("Edit View…") { editCurrentView(library) } }
                        if !window.search.isEmpty { Button("Clear Search") { window.search = "" } }
                    }
                }
            } else {
                Group {
                    if textScale > 1 {
                        List(selection: selection) {
                            Section {
                                ForEach(rows) { row in
                                    MacReadingRow(isSelected: window.selection.contains(row.id)) { episodeTitle(row, rows: rows, library: library) } metadata: {
                                        "Published \(row.episode == nil ? "—" : row.publishedDate.formatted(date: .abbreviated, time: .omitted)) · Length \(row.durationText) · \(row.stateText)"
                                    }.tag(row.id).draggable(episodeDragPayload(row.id, rows: rows, library: library))
                                }
                            } header: { MacReadingSortControl(sort: Binding(get: { window.sortOrder.compactMap(WindowSort.init) }, set: { window.sortOrder = $0.map(\.comparator) })) }
                        }
                        .playbackBarScrollClearance()
                    } else {
                        GeometryReader { geometry in
                            let layout = EpisodeTableLayout(width: geometry.size.width)
                            Table(of: EpisodeRow.self, selection: selection, sortOrder: window.listBinding(\.sortOrder)) {
                                TableColumn("Episode", value: \.title) { row in episodeTitle(row, rows: rows, library: library) }.width(min: EpisodeTableLayout.minimumTitleWidth)
                                if layout.showsDateOrPosition {
                                    TableColumn("Published", value: \.published) { row in
                                        if row.episode != nil { Text(row.publishedDate, format: .dateTime.day().month(.abbreviated).year()) }
                                        else { Text("—") }
                                    }.width(min: 95, ideal: 110, max: 150)
                                }
                                if layout.showsLength {
                                    TableColumn("Length", value: \.length) { row in Text(row.durationText).monospacedDigit() }.width(min: 60, ideal: 70, max: 100)
                                }
                                if layout.showsState {
                                    TableColumn("State", value: \.stateText) { row in
                                        Text(row.stateText).fixedSize(horizontal: false, vertical: true)
                                    }.width(min: 140, ideal: 150, max: 200)
                                }
                            } rows: {
                                ForEach(rows) { row in
                                    TableRow(row).draggable(episodeDragPayload(row.id, rows: rows, library: library))
                                }
                            }
                            .tableStyle(.inset)
                            .playbackBarScrollClearance()
                        }
                    }
                }
                .typeSelectingRows(rows.map { TypeSelectionRow(id: $0.id, title: $0.title) },
                    physicalIDs: (textScale > 1 ? [nil] : []) + rows.map { Optional($0.id) },
                    selection: selection, anchor: window.listBinding(\.scrollAnchor),
                    reselect: { selection.wrappedValue = [$0] }, activate: activate)
                .alternatingRowBackgrounds(.disabled)
                .contextMenu(forSelectionType: String.self) { selection in
                    if let editing = app.editing {
                        EpisodeActionItems(ids: rows.map(\.id).filter { selection.contains($0) }, library: library, editing: editing, presentation: playlistPresentation, app: app)
                            .disabled(selection.isEmpty || editing.busy)
                    }
                } primaryAction: { activate($0) }
                .onCopyCommand(perform: window.selection.isEmpty ? nil : {
                    EpisodeCopyContent.providers(ids: rows.map(\.id).filter { window.selection.contains($0) }, library: library)
                })
                .accessibilityLabel(textScale > 1 ? "Episodes, use Sort by and Descending to change order" : "Episodes, sortable columns")
                #if DEBUG
                .tourResponse(tourListResult(library, count: rows.count))
                #endif
            }
        }
        .focusedSceneValue(\.podListSort, Binding(get: { window.sortOrder.compactMap(WindowSort.init) }, set: { window.sortOrder = $0.map(\.comparator) }))
    }

    #if DEBUG
    private func tourIsNewThisWeek(_ library: LibraryModel) -> Bool {
        if case .view = window.destination, !isPodcastPage { return library.title(window.destination) == "New this week" }
        return false
    }

    private func tourListResult(_ library: LibraryModel, count: Int) -> TourResponseTiming.Step? {
        guard tourIsNewThisWeek(library) else { return nil }
        if window.search.isEmpty { return .sidebar }
        return window.search == "rice" && count == 1 ? .filter : nil
    }
    #endif

    private func episodeDragPayload(_ id: String, rows: [EpisodeRow], library: LibraryModel) -> EpisodeTransfer {
        EpisodeTransfer.local(id, selection: rows.map(\.id).filter { window.selection.contains($0) }, library: library)
    }

    private func episodeTitle(_ row: EpisodeRow, rows: [EpisodeRow], library: LibraryModel) -> some SwiftUI.View {
        HStack(spacing: 8) {
            if let ordinal = row.ordinal { Text(ordinal, format: .number).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.selection.contains(row.id))).monospacedDigit() }
            if row.isCursor { Image(systemName: "play.circle.fill").foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Current Entry") }
            VStack(alignment: .leading, spacing: 3) {
                if row.isCursor { Text("Current Entry").macContentFont(.caption).foregroundStyle(MacRowAccentStyle()) }
                Text(row.title).lineLimit(textScale > 1 ? nil : 2).fixedSize(horizontal: false, vertical: true)
                Text(row.podcast).macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle(isSelected: window.selection.contains(row.id))).lineLimit(textScale > 1 ? nil : 1)
            }.padding(.vertical, 5)
            Spacer(minLength: 4)
            // A status mark beside the row actions, never drawn over them.
            if app.downloadStatuses[row.id]?.phase == .stored {
                Image(systemName: "arrow.down.circle.fill").foregroundStyle(.primary).accessibilityLabel("Downloaded")
            }
            if let editing = app.editing {
                Button { playlistPresentation.sheet = .add([row.id], false) } label: {
                    MacIconLabel(title: "Add to a Playlist", systemImage: "text.line.last.and.arrowtriangle.forward")
                }
                    .buttonStyle(.borderless).foregroundStyle(MacRowActionStyle()).accessibilityLabel("Add \(row.title) to a Playlist")
                    .help("Add to a Playlist")
                Button { Task { await editing.add([row.id], placement: .now) } } label: {
                    MacIconLabel(title: "Play Now", systemImage: "play.fill")
                }
                    .buttonStyle(.borderless).foregroundStyle(MacRowActionStyle()).accessibilityLabel("Play Now: \(row.title)")
                    .help("Play now")
            }
        }
        .macRowActions(isSelected: window.selection.contains(row.id))
        .accessibilityElement(children: .contain)
        .contextMenu {
            if let editing = app.editing {
                let selection = window.selection
                let ids = selection.contains(row.id) ? selectionRows(library, rows: rows).filter { selection.contains($0.id) }.map(\.id) : [row.id]
                EpisodeActionItems(ids: ids,
                    library: library, editing: editing, presentation: playlistPresentation, app: app)
                    .disabled(editing.busy)
            }

        }
    }

    private func selectionRows(_ library: LibraryModel, rows: [EpisodeRow]) -> [EpisodeRow] {
        if isPodcastPage {
            return podcastEpisodeIDs.filter { id in library.snapshot.episodes.contains { $0.id == id } }.map { library.row($0) }
        }
        if case let .playlist(id) = window.destination, window.playlistTab == .history {
            var seen = Set<String>()
            return (library.state.playlists.first { $0.id == id }?.history.reversed().map(\.episodeId) ?? [])
                .filter { seen.insert($0).inserted }.map { library.row($0) }
        }
        return rows
    }
    private func reconcileSelection(_ library: LibraryModel) {
        let context = currentContext.reconciled(in: library)
        guard context != currentContext else { return }
        window.restore(context)
    }

    private var currentContext: WindowContext {
        window.context(libraryID: app.origin ?? "standalone", columns: .init(columns))
    }

    private func restoreContext(in library: LibraryModel) {
        let saved = WindowContext.decode(savedContext)
        let libraryID = app.origin ?? "standalone"
        restoredContext = saved?.libraryID == libraryID || initialDestination != nil
        let context = (saved.flatMap { $0.libraryID == libraryID ? $0 : nil } ?? WindowContext(libraryID: libraryID, destination: initialDestination ?? .subscriptions))
            .reconciled(in: library)
        window.restore(context)
        columns = context.columns.visibility
        contextLibraryID = libraryID
        contextLoaded = true
        savedContext = context.encoded
    }

    private var isPodcastPage: Bool { window.isPodcastPage }
    private func editCurrentView(_ library: LibraryModel) {
        guard let view = selectedView(library) else { return }
        editView(view)
    }
    private func selectedView(_ library: LibraryModel) -> PodListDomain.View? {
        guard !isPodcastPage else { return nil }
        return ViewSelectionAction.view(in: library, destination: window.destination, selection: window.selection)
    }
    private func deleteViewAction(_ library: LibraryModel) -> (() -> Void)? {
        guard let view = selectedView(library), let editor = app.libraryEditing,
              !editor.busy, app.editing?.busy == false else { return nil }
        return { editor.run { try await editor.deleteView(view) } }
    }
    private func renameViewAction(_ library: LibraryModel) -> (() -> Void)? {
        guard let view = selectedView(library),
              app.libraryEditing != nil, app.libraryEditing?.busy == false, app.editing?.busy == false else { return nil }
        return { renameView(view) }
    }
    private func renameView(_ view: PodListDomain.View) {
        guard let editor = app.libraryEditing, app.editing?.busy == false,
              ViewRenameAction.prepare(view, editor: editor) else { return }
        editView(view)
    }
    private func editView(_ view: PodListDomain.View) {
        creatingView = false; editingView = view
    }
    private func newView(text: String? = nil) {
        guard let editor = app.libraryEditing else { return }
        var id = editor.draft("newViewID")
        if id.isEmpty { id = UUID().uuidString; editor.setDraft(id, field: "newViewID") }
        creatingView = true
        editingView = PodListDomain.View(id: id, name: "", filter: .init(text: text), sort: .publishedDesc, limit: nil)
    }
    private func toolbarPlaylist(_ library: LibraryModel) -> Playlist? {
        guard !isPodcastPage, case let .playlist(id) = window.destination else { return nil }
        return library.state.playlists.first { $0.id == id }
    }
    private func toolbarView(_ library: LibraryModel) -> PodListDomain.View? {
        guard !isPodcastPage, case let .view(id) = window.destination else { return nil }
        return library.state.views.first { $0.id == id }
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
    // Keep failures visible near the title even when the bottom player is off-screen.
    static func subtitle(summary: String, playbackError: String?) -> String {
        playbackError == nil ? summary : "Playback stopped"
    }

    private func summary(_ library: LibraryModel, rowCount: Int) -> String {
        switch window.destination {
        case .views: CountText.format(library.state.views.count, .view)
        case .subscriptions: CountText.format(library.subscriptions.count, .subscription)
        case .trash: CountText.format(library.trash.count, .playlist)
        case let .playlist(id):
            CountText.format(rowCount, .entry) + (id == library.state.activePlaylistId ? " · Active Playlist" : "") +
                (library.state.playlists.first { $0.id == id }.map { !$0.entries.isEmpty && PlaylistRules.hasNoCurrentEntry($0) } == true ? " · No current Entry; past end" : "")
        default: CountText.format(rowCount, .episode) + (window.selection.isEmpty ? "" : " · \(window.selection.count) selected")
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

extension WindowModel {
    var supportsEpisodeInspector: Bool {
        if isPodcastPage { return true }
        switch destination {
        case .view, .search, .playlist: return true
        default: return false
        }
    }

    func inspectorPresentation(_ preference: Binding<Bool>) -> Binding<Bool> {
        let list = listID
        return Binding(get: { self.supportsEpisodeInspector && preference.wrappedValue }, set: { presented in
            // SwiftUI can write back a dismissal as an outgoing destination loses its pane.
            guard self.listID == list, self.supportsEpisodeInspector else { return }
            preference.wrappedValue = presented
        })
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
