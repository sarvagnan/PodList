#if os(macOS)
import SwiftUI
import PodListData
import PodListDomain

struct LibraryFeedback: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    var body: some SwiftUI.View {
        EditingFeedback(editing: editor.edits, additionalError: editor.error,
                        undo: { Task { await editor.undo() } }, redo: { Task { await editor.redo() } })
    }
}

struct AddPodcastsScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    let open: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [DirectoryPodcast] = []
    @State private var selectedFeed: String?
    @State private var loading = false
    @State private var searched = false
    @State private var error: String?
    @State private var subscribing = Set<String>()
    @State private var searchTask: Task<Void, Never>?
    @FocusState private var focused: Bool
    var body: some SwiftUI.View {
        ContentSizedPanel(width: 650) {
            VStack(alignment: .leading, spacing: 14) {
                Text("Add Podcasts").macContentFont(.title2).bold()
                Text("Podcast name or feed address")
                HStack {
                    TextField("Podcast name or feed address", text: $query).textFieldStyle(.roundedBorder).focused($focused)
                        .onSubmit { search() }.onChange(of: query) { _, text in editor.setDraft(text, field: "addPodcasts"); searchTask?.cancel(); loading = false; searched = false; results = []; error = nil }
                    Button("Search") { search() }.keyboardShortcut(.defaultAction).disabled(loading || query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                Text("OPML import is in Settings. Closing Add Podcasts does not stop an import; progress stays in Library.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
                if !searched, !loading {
                    ContentUnavailableView {
                        Label("Find Your Next Podcast", systemImage: "magnifyingglass")
                    } description: {
                        Text("Search for a podcast by name, or paste its RSS feed address, such as https://example.com/podcast.xml.").foregroundStyle(MacReadableSecondaryStyle())
                    }
                }
                if loading { ProgressView("Finding Podcasts…") }
                if let error { FailureFeedback(message: error, announcements: editor.edits.announcements) { search() } }
                if searched && !loading && results.isEmpty && error == nil { Text("No podcasts found. Try a name or a feed address.") }
                if !results.isEmpty {
                    List(results, selection: $selectedFeed) { result in
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
                                Button(subscribing.contains(result.feedUrl) ? "Subscribing…" : "Subscribe") {
                                    subscribe(result)
                                }.disabled(subscribing.contains(result.feedUrl)).accessibilityLabel("Subscribe to \(result.title)")
                            }
                        }.padding(.vertical, 5).tag(result.feedUrl)
                    }
                    .frame(height: min(320, CGFloat(results.count) * 70))
                }
                LibraryFeedback(editor: editor)
                HStack { Spacer(); Button("Done") { dismiss() }.keyboardShortcut(.cancelAction) }
            }.padding(20)
        }
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [.done: { dismiss() }]))
        .focusedSceneValue(\.podListDiscoveryActions, MenuActionContext(actions: [
            .searchPodcasts: !loading && !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? { search() } : nil,
            .retry: error != nil && !loading ? { search() } : nil
        ].compactMapValues { $0 }))
        .focusedSceneValue(\.podListPodcast, discoveryCommands)
        .onAppear { editor.beginAddingPodcasts(); query = editor.draft("addPodcasts"); focused = true }
        .onDisappear { searchTask?.cancel(); editor.endAddingPodcasts() }
    }
    private var discoveryCommands: PodcastCommandContext {
        guard let result = results.first(where: { $0.feedUrl == selectedFeed }) else { return PodcastCommandContext() }
        let subscribed = library.subscriptions.contains { $0.feedUrl == result.feedUrl }
        return PodcastCommandContext(open: { openResult(result) }, subscribed: subscribed,
            subscriptionAction: !subscribed && !subscribing.contains(result.feedUrl) && !editor.busy && !editor.edits.busy ? { subscribe(result) } : nil)
    }
    private func openResult(_ result: DirectoryPodcast) { open(result.feedUrl); dismiss() }
    private func subscribe(_ result: DirectoryPodcast) {
        subscribing.insert(result.feedUrl)
        Task { do { try await editor.subscribe(result.feedUrl) } catch { editor.error = LibraryMessages.failure(error) }; subscribing.remove(result.feedUrl) }
    }
    private func search() {
        searchTask?.cancel()
        loading = true; error = nil; searched = true
        let submitted = query
        searchTask = Task {
            do {
                let found = try await editor.source.search(submitted)
                guard !Task.isCancelled, query == submitted else { return }
                var seen = Set<String>()
                results = found.filter { seen.insert($0.feedUrl).inserted }
            } catch {
                guard !Task.isCancelled, query == submitted else { return }
                self.error = LibraryMessages.failure(error)
            }
            loading = false
        }
    }
}

struct PodcastPageScreen: SwiftUI.View {
    let feedURL: String
    @Bindable var app: ApplicationModel
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    var selection: Binding<Set<String>> = .constant([])
    @Binding var search: String
    @Binding var savedSort: [WindowSort]
    @Binding var scrollAnchor: RowAnchor?
    let openEpisode: () -> Void
    let displayed: ([String]) -> Void
    private var sortOrder: [KeyPathComparator<PageEpisode>] {
        get { savedSort.map { sort in
            switch sort.column {
            case .title: KeyPathComparator(\.title, order: sort.order)
            case .published: KeyPathComparator(\.published, order: sort.order)
            case .length: KeyPathComparator(\.length, order: sort.order)
            case .state: KeyPathComparator(\.stateText, order: sort.order)
            }
        } }
        nonmutating set { savedSort = newValue.compactMap { comparator in
            let column: WindowSort.Column
            switch comparator.keyPath {
            case \PageEpisode.title: column = .title
            case \PageEpisode.published: column = .published
            case \PageEpisode.length: column = .length
            case \PageEpisode.stateText: column = .state
            default: return nil
            }
            return WindowSort(column: column, reversed: comparator.order == .reverse)
        } }
    }
    @Environment(\.macTextScale) private var textScale
    @State private var feed: ParsedFeed?
    @State private var loading = true
    @State private var error: String?
    @State private var control = UnsubscribeControl()
    @State private var subscriptionBusy = false
    @State private var descriptionExpanded = false
    @State private var settings = false
    @State private var downloadRules = false
    @State private var subscribedBounds = CGRect.zero
    @State private var bringing = Set<String>()
    @State private var addPresentation = PlaylistPresentation()
    private func podcastEpisodeTitle(_ episode: PageEpisode) -> some SwiftUI.View {
        HStack {
            Text(episode.title).lineLimit(textScale > 1 ? nil : 2).fixedSize(horizontal: false, vertical: true)
            Spacer()
            Button { bring(episode, play: false) } label: {
                MacIconLabel(title: "Add to a Playlist", systemImage: "text.badge.plus")
            }
                .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Add \(episode.title) to a Playlist")
                .help("Add \(episode.title) to a Playlist")
            Button { bring(episode, play: true) } label: {
                MacIconLabel(title: "Play", systemImage: "play.fill")
            }
                .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowAccentStyle()).accessibilityLabel("Play \(episode.title) now")
                .help("Play \(episode.title) now")
        }.disabled(bringing.contains(episode.guid)).padding(.vertical, 4)
    }
    private var subscription: Subscription? { library.snapshot.subscriptions.first { $0.feedUrl == feedURL } }
    private var subscribed: Bool { subscription?.unsubscribedAt == nil && subscription != nil }
    private var title: String { feed?.title ?? subscription?.title ?? "Podcast" }
    private struct PageEpisode: Identifiable {
        let guid: String; let title: String; let description: String; let published: Int64; let duration: Double?; let localID: String?
        let stateText: String
        var id: String { localID ?? guid }
        var length: Double { duration ?? .infinity }
    }
    private var episodes: [PageEpisode] {
        let local = library.snapshot.episodes.filter { $0.subscriptionId == subscription?.id }.map {
            PageEpisode(guid: $0.guid, title: $0.title, description: $0.description, published: $0.published, duration: $0.duration, localID: $0.id, stateText: library.row($0.id).stateText)
        }
        let remote = (feed?.episodes ?? []).map { episode in
            PageEpisode(guid: episode.guid, title: episode.title, description: episode.description, published: episode.published, duration: episode.duration, localID: local.first { $0.guid == episode.guid }?.localID, stateText: local.first { $0.guid == episode.guid }?.stateText ?? "Unplayed")
        }
        let guids = Set(remote.map(\.guid))
        return (remote + local.filter { !guids.contains($0.guid) }).filter { e in
            Mentions.words(search).allSatisfy { word in [e.title, e.description].contains { Mentions.fold($0).contains(word) } }
        }.sorted(using: sortOrder)
    }
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 16) {
                ArtworkView(url: (feed?.artworkUrl ?? subscription?.artwork?.url).flatMap(URL.init(string:)), title: title, size: 96)
                VStack(alignment: .leading, spacing: 6) {
                    Text(title).macContentFont(.title2).bold()
                    Text(feed?.author ?? subscription?.author ?? "").foregroundStyle(MacReadableSecondaryStyle())
                    Text(Presentation.plainShowNotes(feed?.description ?? subscription?.description ?? "")).lineLimit(descriptionExpanded ? nil : 5).textSelection(.enabled)
                    Button(descriptionExpanded ? "Show Less" : "Show Description", action: toggleDescription).buttonStyle(.link)
                    HStack {
                        TimelineView(.periodic(from: .now, by: 0.25)) { context in
                            Button {
                                if subscribed, !control.click(at: Date()) { return }
                                changeSubscription()
                            } label: {
                                Label(subscribed ? (control.isArmed(at: context.date) ? "Unsubscribe" : "Subscribed") : "Subscribe", systemImage: subscribed ? (control.isArmed(at: context.date) ? "minus.circle.fill" : "checkmark.circle.fill") : "plus.circle")
                                    .foregroundStyle(subscribed ? (control.isArmed(at: context.date) ? Color.podListError : Color.primary) : Color.podListAccent)
                            }.tint(subscribed ? nil : .podListAccent).disabled(subscriptionBusy)
                                .onGeometryChange(for: CGRect.self) { $0.frame(in: .named("podcastPage")) } action: { subscribedBounds = $0 }
                                .accessibilityHint(subscribed ? "Click twice within four seconds to Unsubscribe" : "Add this podcast to your Library")
                        }
                        if let url = ShareLinks.podcast(page: feed?.link ?? subscription.flatMap { library.snapshot.podcastLinks[$0.id] }, feed: feedURL) {
                            ShareLink(item: url) { Label("Share Podcast", systemImage: "square.and.arrow.up") }
                            Button("Copy Feed Address") { if let feed = ShareLinks.web(feedURL) { ShareLinks.copy(feed) } }
                        }
                        if subscribed { Button("Subscription Settings…", systemImage: "gearshape", action: openSettings).labelStyle(.iconOnly) }
                    }
                }
            }
            if subscribed, let subscription {
                DownloadRuleEditor(subscriptionID: subscription.id, library: library, app: app)
            }
            if loading { ProgressView("Reading Episodes…") }
            if let error { FailureFeedback(message: error, announcements: editor.edits.announcements) { control.reset(); load() } }
            Text(CountText.format(episodes.count, .episode)).foregroundStyle(MacReadableSecondaryStyle())
            if episodes.isEmpty, !loading, error == nil {
                ContentUnavailableView {
                    Label(search.isEmpty ? "No Episodes Yet" : "No Matching Episodes", systemImage: "list.bullet")
                } description: { Text(search.isEmpty ? "The publisher has no Episodes available yet. Try again later." : "Try another Search.").foregroundStyle(MacReadableSecondaryStyle()) }
                actions: {
                    if search.isEmpty { Button("Refresh Episodes") { load() } }
                    else { Button("Clear Search") { search = "" } }
                }
            } else {
                Group {
                    if textScale > 1 {
                        List(selection: selection) {
                            Section {
                                ForEach(episodes) { episode in
                                    MacReadingRow(isSelected: selection.wrappedValue.contains(episode.id)) { podcastEpisodeTitle(episode) } metadata: {
                                        "Published \(Date(timeIntervalSince1970: Double(episode.published) / 1000).formatted(date: .abbreviated, time: .omitted)) · Length \(episode.duration.map(Presentation.time) ?? "—") · \(episode.stateText)"
                                    }.tag(episode.id).draggable(dragPayload(episode))
                                }
                            } header: { MacReadingSortControl(sort: $savedSort) }
                        }
                    } else {
                        Table(of: PageEpisode.self, selection: selection, sortOrder: Binding(get: { sortOrder }, set: { sortOrder = $0 })) {
                            TableColumn("Episode", value: \.title) { episode in
                                podcastEpisodeTitle(episode)
                            }.width(min: 240, ideal: 420)
                            TableColumn("Published", value: \.published) { episode in
                                Text(Date(timeIntervalSince1970: Double(episode.published) / 1000), format: .dateTime.day().month(.abbreviated).year())
                            }.width(min: 95, ideal: 110, max: 150)
                            TableColumn("Length", value: \.length) { episode in Text(episode.duration.map(Presentation.time) ?? "—").monospacedDigit() }
                                .width(min: 60, ideal: 70, max: 100)
                            TableColumn("State", value: \.stateText).width(min: 80, ideal: 110, max: 150)
                        } rows: {
                            ForEach(episodes) { episode in TableRow(episode).draggable(dragPayload(episode)) }
                        }
                        .tableStyle(.inset)
                    }
                }
                .restoringRows((textScale > 1 ? [nil] : []) + episodes.map { Optional($0.id) }, anchor: $scrollAnchor)
                .alternatingRowBackgrounds(.disabled)
                .contextMenu(forSelectionType: String.self) { ids in
                    let chosen = episodes.filter { ids.contains($0.id) }
                    if let editing = app.editing, !chosen.isEmpty, chosen.allSatisfy({ $0.localID != nil }) {
                        EpisodeActionItems(ids: chosen.compactMap(\.localID), library: library, editing: editing, presentation: addPresentation, app: app)
                            .disabled(editing.busy)
                    } else if let first = chosen.first {
                        Button("Play Now") { bring(first, play: true) }
                        Button("Add to a Playlist…") { bring(first, play: false) }
                    }
                } primaryAction: { ids in
                    selection.wrappedValue = ids
                    if let episode = episodes.first(where: { ids.contains($0.id) }) { inspect(episode) }
                }
                .onKeyPress(.space) {
                    guard let episode = episodes.first(where: { selection.wrappedValue.contains($0.id) }) else { return .ignored }
                    bring(episode, play: true); return .handled
                }
                .simultaneousGesture(DragGesture().onChanged { _ in control.reset() })
                .accessibilityLabel(textScale > 1 ? "Podcast Episodes, use Sort by and Descending to change order" : "Podcast Episodes, sortable columns")
            }
        }.padding(18)
        .focusedSceneValue(\.podListRecoveryActions, MenuActionContext(actions: error != nil && !loading ? [.retry: { control.reset(); load() }] : [:]))
        .focusedSceneValue(\.podListSort, $savedSort)
        .focusedSceneValue(\.podListPodcast, podcastCommands)
        .focusedSceneValue(\.podListRemoteEpisode, remoteEpisodeActions)
        .focusedSceneValue(\.podListEpisodeDetails, selectedEpisode.map { episode in { inspect(episode) } })
        .focusedSceneValue(\.podListPlaySelection, selectedEpisode.map { episode in { bring(episode, play: true) } })
        .modifier(PlaylistSheetHost(presentation: addPresentation, app: app, created: { _ in }))
        .coordinateSpace(name: "podcastPage")
        .simultaneousGesture(SpatialTapGesture().onEnded { if !subscribedBounds.contains($0.location) { control.reset() } })
        .task(id: feedURL) { control.reset(); await read() }
        .onChange(of: search) { _, text in control.reset(); editor.setDraft(text, field: "podcast.\(feedURL).search") }
        .onChange(of: episodes.map(\.id), initial: true) { _, ids in
            if !loading {
                selection.wrappedValue.formIntersection(Set(ids))
                scrollAnchor = scrollAnchor?.reconciled(with: ids)
            }; displayed(ids)
        }
        .onChange(of: loading) { _, loading in
            if !loading {
                selection.wrappedValue.formIntersection(Set(episodes.map(\.id)))
                scrollAnchor = scrollAnchor?.reconciled(with: episodes.map(\.id))
            }
        }
        .onDisappear { control.reset() }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.willResignActiveNotification)) { _ in control.reset() }
        .sheet(isPresented: $downloadRules) {
            if let subscription { BulkDownloadRuleSheet(ids: [subscription.id], app: app) }
        }
        .sheet(isPresented: $settings) {
            if let subscription { SubscriptionSettingsScreen(subscription: subscription, library: library, app: app, editor: editor) }
        }
    }
    private func dragPayload(_ episode: PageEpisode) -> EpisodeTransfer {
        let chosen = selection.wrappedValue.contains(episode.id) ? episodes.filter { selection.wrappedValue.contains($0.id) } : [episode]
        let references = chosen.map { item in
            item.localID.map { DraggedEpisode(episodeID: $0) } ?? DraggedEpisode(episodeID: nil, feedURL: feedURL, guid: item.guid)
        }
        let published = feed?.episodes.first { $0.guid == episode.guid }
        let url = episode.localID.flatMap { library.episodeShareURL($0) } ?? ShareLinks.episode(page: published?.link, enclosure: published?.audioUrl)
        return EpisodeTransfer(episodes: references, sourcePlaylistID: nil, title: episode.title, shareURL: url)
    }
    private var remoteEpisodeActions: EpisodeMenuOverrides? {
        guard let episode = selectedEpisode, episodes.contains(where: { selection.wrappedValue.contains($0.id) && $0.localID == nil }),
              !bringing.contains(episode.guid), !editor.busy, !editor.edits.busy else { return nil }
        return EpisodeMenuOverrides(play: { bring(episode, play: true) }, add: { bring(episode, play: false) })
    }
    private var podcastCommands: PodcastCommandContext {
        let available = !subscriptionBusy && !editor.busy && !editor.edits.busy
        var commands = PodcastCommandContext()
        commands.subscribed = subscribed
        if available { commands.subscriptionAction = { changeSubscription() } }
        if subscribed && available {
            commands.settings = { openSettings() }
            commands.downloadRules = { control.reset(); downloadRules = true }
            commands.markAllPlayed = SubscriptionPlayedAction.action(subscription, editor: editor)
        }
        commands.shareURL = ShareLinks.podcast(page: feed?.link ?? subscription.flatMap { library.snapshot.podcastLinks[$0.id] }, feed: feedURL)
        commands.feedURL = ShareLinks.web(feedURL)
        commands.refresh = loading ? nil : { load() }
        commands.descriptionExpanded = descriptionExpanded
        commands.toggleDescription = { toggleDescription() }
        return commands
    }
    private func toggleDescription() { control.reset(); descriptionExpanded.toggle() }
    private func openSettings() { control.reset(); settings = true }
    private func changeSubscription() {
        guard !subscriptionBusy, !editor.busy, !editor.edits.busy else { return }
        control.reset(); subscriptionBusy = true
        Task {
            do {
                if subscribed, let subscription { try await editor.unsubscribe(subscription) }
                else { try await editor.subscribe(feedURL) }
            } catch { editor.error = LibraryMessages.failure(error) }
            subscriptionBusy = false
        }
    }
    private var selectedEpisode: PageEpisode? { episodes.first { selection.wrappedValue.contains($0.id) } }
    private func load() { Task { await read() } }
    private func read() async {
        loading = true; error = nil
        do { feed = try await editor.source.readPodcast(feedURL); await app.reloadLocal() }
        catch { self.error = LibraryMessages.failure(error) }
        loading = false
    }
    private func inspect(_ episode: PageEpisode) {
        control.reset()
        Task {
            do {
                let id: String
                if let local = episode.localID { id = local }
                else { id = try await editor.prepareEpisode(feedURL, guid: episode.guid) }
                selection.wrappedValue = [id]; openEpisode()
            } catch { editor.error = LibraryMessages.failure(error) }
        }
    }
    private func bring(_ episode: PageEpisode, play: Bool) {
        control.reset(); bringing.insert(episode.guid)
        Task {
            do {
                let id: String
                if let local = library.snapshot.episodes.first(where: { $0.subscriptionId == subscription?.id && $0.guid == episode.guid }) { id = local.id }
                else { id = try await editor.prepareEpisode(feedURL, guid: episode.guid) }
                if play { _ = await app.editing?.add([id], placement: .now) }
                else { addPresentation.sheet = .add([id], false) }
            } catch { editor.error = LibraryMessages.failure(error) }
            bringing.remove(episode.guid)
        }
    }
}

struct SubscriptionSettingsScreen: SwiftUI.View {
    let subscription: Subscription
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    @Bindable var editor: LibraryEditingModel
    @Environment(\.dismiss) private var dismiss
    @State private var overrides: PlaybackSettingsOverride
    @State private var threshold: Double?
    init(subscription: Subscription, library: LibraryModel, app: ApplicationModel, editor: LibraryEditingModel) {
        self.subscription = subscription; self.library = library; self.app = app; self.editor = editor
        _overrides = State(initialValue: subscription.playbackSettings); _threshold = State(initialValue: subscription.playedThreshold)
    }
    var body: some SwiftUI.View {
        ContentSizedPanel(width: 600) {
            VStack(alignment: .leading) {
                Text("\(subscription.title) Settings").macContentFont(.title2).bold().accessibilityAddTraits(.isHeader)
                Form {
                    Section("On This Device") { DownloadRuleEditor(subscriptionID: subscription.id, library: library, app: app) }
                    Section("Played") {
                        Picker("Played Threshold", selection: $threshold) {
                            Text("Default (30 seconds)").tag(nil as Double?)
                            ForEach([0.0, 10, 30, 60, 120, 300], id: \.self) { Text(CountText.format(Int($0), .second)).tag(Optional($0)) }
                            if let threshold, ![0.0, 10, 30, 60, 120, 300].contains(threshold) { Text(CountText.seconds(threshold)).tag(Optional(threshold)) }
                        }
                        Button("Mark All Played") { SubscriptionPlayedAction.action(subscription, editor: editor)?() }
                            .disabled(SubscriptionPlayedAction.action(subscription, editor: editor) == nil)
                    }
                    Section("Playback Settings Overrides") {
                        Text("Default inherits the global Playback Settings.").foregroundStyle(MacReadableSecondaryStyle())
                        overrideNumber("Speed", path: \.speed, choices: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3])
                        overrideNumber("Skip Intro (seconds)", path: \.skipIntro, choices: [0, 15, 30, 45, 60, 90, 120])
                        overrideNumber("Skip Outro (seconds)", path: \.skipOutro, choices: [0, 15, 30, 45, 60, 90, 120])
                        Picker("Volume Boost", selection: $overrides.volumeBoost) {
                            Text("Default").tag(nil as Bool?); Text("On").tag(Optional(true)); Text("Off").tag(Optional(false))
                        }
                    }
                }.formStyle(.columns)
                LibraryFeedback(editor: editor)
                HStack { Spacer(); Button("Done") { dismiss() }.macDefaultAction() }
            }.padding(20)
        }
        .onExitCommand { dismiss() }
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [.done: { dismiss() }]))
        .focusedSceneValue(\.podListPodcast, PodcastCommandContext(subscribed: true, markAllPlayed: SubscriptionPlayedAction.action(subscription, editor: editor)))
        .onChange(of: overrides) { _, _ in save() }.onChange(of: threshold) { _, _ in save() }
    }
    private func overrideNumber(_ name: String, path: WritableKeyPath<PlaybackSettingsOverride, Double?>, choices: [Double]) -> some SwiftUI.View {
        Picker(name, selection: Binding(get: { overrides[keyPath: path] }, set: { overrides[keyPath: path] = $0 })) {
            Text("Default").tag(nil as Double?)
            ForEach(choices, id: \.self) { Text($0.formatted()).tag(Optional($0)) }
            if let current = overrides[keyPath: path], !choices.contains(current) { Text(current.formatted()).tag(Optional(current)) }
        }
    }
    private func save() { let value = overrides, played = threshold; editor.run { try await editor.edit(.setSubscriptionOverrides(subscriptionId: subscription.id, playbackSettings: value, playedThreshold: played)) } }
}
#endif
