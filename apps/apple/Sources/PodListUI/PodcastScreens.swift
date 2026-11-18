#if os(macOS)
import SwiftUI
import PodListData
import PodListDomain

struct LibraryFeedback: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    var surface: EditingFeedbackSurface = .secondary
    var sync: ApplicationModel? = nil
    var reservesSpace = true
    var restored: (@MainActor ([RestoredEntries]) -> Void)? = nil
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 8) {
            EditingFeedback(editing: editor.edits, surface: surface, sync: sync, additionalError: editor.error, additionalStatus: dropStatus,
                            undo: { Task { await editor.undo(restored: restored) } }, redo: { Task { await editor.redo(restored: restored) } },
                            reservesSpace: reservesSpace)
            if let sync, sync.feedRefreshIssue != nil {
                FeedRefreshFeedback(app: sync).macContentFont(.caption).padding(.horizontal, 14).padding(.bottom, 6)
            }
        }
    }
    private var dropStatus: String? {
        if let drop = editor.episodeDrop { return "Adding Episodes… \(drop.completed) of \(drop.total) prepared" }
        if editor.failedEpisodeDrop != nil { return "Some Episodes could not be added. Use Episode › Retry Failed Episode Drop, or open the destination Playlist." }
        return nil
    }
}

struct FeedRefreshFeedback: SwiftUI.View {
    let app: ApplicationModel
    var body: some SwiftUI.View {
        if let progress = app.feedRefreshProgress {
            HStack(spacing: 8) {
                ProgressView().controlSize(.mini).accessibilityHidden(true)
                Text(progress)
            }.help(Presentation.tooltip(progress)).foregroundStyle(MacReadableSecondaryStyle())
        } else if let issue = app.feedRefreshIssue {
            let retry = app.feedRefreshAction(issue.target)
            FailureFeedback(message: issue.message, indexedElsewhere: true) { retry?() }
                .disabled(retry == nil)
        }
    }
}

/// The parent offers a detail viewport, never the table's AppKit ideal height.
/// Keep metadata bounded and give only the Episode list the remaining space.
struct PodcastPageLayout<Header: SwiftUI.View, Episodes: SwiftUI.View>: SwiftUI.View {
    @ViewBuilder let header: (CGFloat) -> Header
    @ViewBuilder let episodes: () -> Episodes
    var body: some SwiftUI.View {
        GeometryReader { viewport in
            VStack(alignment: .leading, spacing: 12) {
                header(max(48, (viewport.size.height - 36) * 0.25))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 18)
                GeometryReader { table in
                    episodes().frame(width: table.size.width, height: table.size.height)
                }
            }
            .padding(.vertical, 18)
            .frame(width: viewport.size.width, height: viewport.size.height, alignment: .topLeading)
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
    @State private var descriptionTruncated = false
    @State private var settings = false
    @State private var downloadRules = false
    @FocusState private var unsubscribeFocused: Bool
    @State private var bringing = Set<String>()
    @State private var addPresentation = PlaylistPresentation()
    private func podcastEpisodeTitle(_ episode: PageEpisode) -> some SwiftUI.View {
        HStack {
            Text(episode.title).lineLimit(textScale > 1 ? nil : 2).fixedSize(horizontal: false, vertical: true)
            Spacer()
            Button { bring(episode, play: false) } label: {
                MacIconLabel(title: "Add to a Playlist", systemImage: "text.line.last.and.arrowtriangle.forward")
            }
                .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowActionStyle()).accessibilityLabel("Add \(episode.title) to a Playlist")
                .help("Add to a Playlist")
            Button { bring(episode, play: true) } label: {
                MacIconLabel(title: "Play", systemImage: "play.fill")
            }
                .labelStyle(.iconOnly).buttonStyle(.borderless).foregroundStyle(MacRowActionStyle()).accessibilityLabel("Play \(episode.title) now")
                .help("Play now")
        }.macRowActions(isSelected: selection.wrappedValue.contains(episode.id)).disabled(bringing.contains(episode.guid)).padding(.vertical, 4)
    }
    private var subscription: Subscription? { library.snapshot.subscriptions.first { $0.feedUrl == feedURL } }
    private var subscribed: Bool { subscription?.unsubscribedAt == nil && subscription != nil }
    private var catalogueSubscription: Subscription? { subscribed ? subscription : nil }
    private var title: String { catalogueSubscription?.title ?? feed?.title ?? subscription?.title ?? "Podcast" }
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
        // A subscribed page may still have its earlier publisher preview open
        // when a refresh commits newer Episode metadata to the catalogue.
        let preferred = subscribed ? local : remote
        let fallback = subscribed ? remote : local
        let guids = Set(preferred.map(\.guid))
        return (preferred + fallback.filter { !guids.contains($0.guid) }).filter { e in
            Mentions.words(search).allSatisfy { word in [e.title, e.description].contains { Mentions.fold($0).contains(word) } }
        }.sorted(using: sortOrder)
    }
    var body: some SwiftUI.View {
        PodcastPageLayout { descriptionHeight in
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 16) {
                    ArtworkView(url: (catalogueSubscription?.artwork?.url ?? feed?.artworkUrl ?? subscription?.artwork?.url).flatMap(URL.init(string:)), title: title, size: 96)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(title).macContentFont(.title2).bold().lineLimit(2)
                        Text(catalogueSubscription?.author ?? feed?.author ?? subscription?.author ?? "").foregroundStyle(MacReadableSecondaryStyle()).lineLimit(1)
                        PodcastDescription(text: Presentation.plainShowNotes(catalogueSubscription?.description ?? feed?.description ?? subscription?.description ?? ""),
                            expanded: $descriptionExpanded, truncated: $descriptionTruncated, maximumHeight: descriptionHeight, toggle: toggleDescription)
                        HStack {
                            Button {
                                if subscribed, !control.click() { return }
                                changeSubscription()
                            } label: {
                                SubscriptionButtonLabel(subscribed: subscribed, armed: control.isArmed)
                                    .foregroundStyle(control.isArmed ? Color.podListError : Color.primary)
                            }.disabled(subscriptionBusy)
                                .focused($unsubscribeFocused)
                                .onHover { if !$0 { control.reset() } }
                                .onChange(of: unsubscribeFocused) { _, focused in if !focused { control.reset() } }
                                .background(UnsubscribeInteractionGuard(armed: control.isArmed, focused: unsubscribeFocused) { control.reset() })
                                .accessibilityHint(subscribed ? "Click twice to Unsubscribe. Moving away cancels." : "Add this podcast to your Library")
                            if let url = ShareLinks.podcast(page: feed?.link ?? subscription.flatMap { library.snapshot.podcastLinks[$0.id] }, feed: feedURL) {
                                ShareLink(item: url) { Label("Share Podcast", systemImage: "square.and.arrow.up") }
                                Button("Copy Feed Address") { if let feed = ShareLinks.web(feedURL) { ShareLinks.copy(feed) } }
                            }
                            if subscribed { Button("Subscription Settings…", systemImage: "gearshape", action: openSettings).labelStyle(.iconOnly).help("Subscription settings") }
                            let refresh = refreshPodcast
                            Button(PodcastCommandContext.refreshTitle, systemImage: "arrow.clockwise") { refresh?() }
                                .labelStyle(.iconOnly).help(PodcastCommandContext.refreshTitle).disabled(refresh == nil)
                        }
                    }
                }
                if subscribed, let subscription {
                    DownloadRuleEditor(subscriptionID: subscription.id, library: library, app: app)
                }
                if loading { ProgressView("Reading Episodes…") }
                if let error {
                    FailureFeedback(message: error, announcements: editor.edits.announcements, retryTitle: "Retry Reading Episodes") { load() }
                        .disabled(loading || !app.canRefreshFeeds)
                }
                Text(CountText.format(episodes.count, .episode)).foregroundStyle(MacReadableSecondaryStyle())
                    .accessibilityIdentifier("podcast.episodeCount")
            }
        } episodes: {
            if episodes.isEmpty, !loading, error == nil {
                PodListEmptyState(search.isEmpty ? "No Episodes Yet" : "No Matching Episodes", systemImage: "list.bullet",
                                  description: search.isEmpty ? "The publisher has no Episodes available yet. Try again later." : "Try another Search.") {
                    if !search.isEmpty { Button("Clear Search") { search = "" } }
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
                        GeometryReader { geometry in
                            let layout = EpisodeTableLayout(width: geometry.size.width)
                            Table(of: PageEpisode.self, selection: selection, sortOrder: Binding(get: { sortOrder }, set: { sortOrder = $0 })) {
                                TableColumn("Episode", value: \.title) { episode in
                                    podcastEpisodeTitle(episode)
                                }.width(min: EpisodeTableLayout.minimumTitleWidth)
                                if layout.showsDateOrPosition {
                                    TableColumn("Published", value: \.published) { episode in
                                        Text(Date(timeIntervalSince1970: Double(episode.published) / 1000), format: .dateTime.day().month(.abbreviated).year())
                                    }.width(min: 95, ideal: 110, max: 150)
                                }
                                if layout.showsLength {
                                    TableColumn("Length", value: \.length) { episode in Text(episode.duration.map(Presentation.time) ?? "—").monospacedDigit() }
                                        .width(min: 60, ideal: 70, max: 100)
                                }
                                if layout.showsState {
                                    TableColumn("State", value: \.stateText) { episode in
                                        Text(episode.stateText).fixedSize(horizontal: false, vertical: true)
                                    }.width(min: 140, ideal: 150, max: 200)
                                }
                            } rows: {
                                ForEach(episodes) { episode in TableRow(episode).draggable(dragPayload(episode)) }
                            }
                            .tableStyle(.inset)
                            // Recreate native auto-sized columns after the description changes
                            // the viewport; AppKit otherwise retains scrollbar-compressed widths.
                            .id(descriptionExpanded)
                        }
                    }
                }
                .typeSelectingRows(episodes.map { TypeSelectionRow(id: $0.id, title: $0.title) },
                    physicalIDs: (textScale > 1 ? [nil] : []) + episodes.map { Optional($0.id) },
                    selection: selection, anchor: $scrollAnchor)
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
                .simultaneousGesture(DragGesture().onChanged { _ in control.reset() })
                .accessibilityLabel(textScale > 1 ? "Podcast Episodes, use Sort by and Descending to change order" : "Podcast Episodes, sortable columns")
            }
        }
        .focusedSceneValue(\.podListSort, $savedSort)
        .focusedSceneValue(\.podListPodcast, podcastCommands)
        .focusedSceneValue(\.podListRemoteEpisode, remoteEpisodeActions)
        .focusedSceneValue(\.podListEpisodeDetails, selectedEpisode.map { episode in { inspect(episode) } })
        .modifier(PlaylistSheetHost(presentation: addPresentation, app: app, created: { _ in }))
        .coordinateSpace(name: "podcastPage")
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
            item.localID.map { DraggedEpisode(episodeID: $0, title: item.title) } ?? DraggedEpisode(episodeID: nil, feedURL: feedURL, guid: item.guid, title: item.title)
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
        commands.refresh = refreshPodcast
        commands.descriptionExpanded = descriptionExpanded
        commands.toggleDescription = descriptionTruncated ? { toggleDescription() } : nil
        return commands
    }
    private var refreshPodcast: (() -> Void)? {
        guard !loading, !subscriptionBusy, app.canRefreshFeeds else { return nil }
        if subscribed, let subscription {
            guard let refresh = app.feedRefreshAction(.subscription(subscription.id)) else { return nil }
            return { control.reset(); refresh() }
        }
        return { load() }
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
    private func load() {
        guard !loading, app.canRefreshFeeds else { return }
        control.reset(); loading = true
        Task { await read() }
    }
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

/// Measure both layouts at the actual reading width and font. Expanded prose has
/// no line cap; only the prose scrolls, leaving page actions and counts visible.
struct PodcastDescription: SwiftUI.View {
    let text: String
    @Binding var expanded: Bool
    @Binding var truncated: Bool
    var maximumHeight: CGFloat = 140
    let toggle: () -> Void
    @State private var fullHeight: CGFloat = 0
    @State private var collapsedHeight: CGFloat = 0
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 6) {
            ScrollView {
                Text(text).lineLimit(expanded ? nil : 3).textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("podcast.description")
                    .background(alignment: .topLeading) {
                        Text(text).lineLimit(nil).fixedSize(horizontal: false, vertical: true)
                            .hidden().accessibilityHidden(true)
                            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { fullHeight = $0; updateTruncation() }
                        Text(text).lineLimit(3).fixedSize(horizontal: false, vertical: true)
                            .hidden().accessibilityHidden(true)
                            .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { collapsedHeight = $0; updateTruncation() }
                    }
            }
            .frame(height: min(expanded ? fullHeight : collapsedHeight, maximumHeight))
            .scrollBounceBehavior(.basedOnSize)
            .accessibilityLabel("Podcast Description")
            if truncated {
                Button(expanded ? "Show Less" : "Show Description", action: toggle).buttonStyle(MacReadableAccentButtonStyle())
            }
        }
    }
    private func updateTruncation() { truncated = fullHeight > collapsedHeight + 0.5 }
}

struct SubscriptionSettingsScreen: SwiftUI.View {
    let subscription: Subscription
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    @Bindable var editor: LibraryEditingModel
    @Environment(\.dismiss) private var dismiss
    @State private var draft: SubscriptionSettingsDraft
    @State private var saving = false
    init(subscription: Subscription, library: LibraryModel, app: ApplicationModel, editor: LibraryEditingModel) {
        self.subscription = subscription; self.library = library; self.app = app; self.editor = editor
        let rule = library.state.downloadRules.first { $0.subscriptionId == subscription.id && $0.deviceId == library.deviceID }
        _draft = State(initialValue: editor.edits.drafts.subscriptionSettings(subscription, rule: rule, deviceID: library.deviceID))
    }
    var body: some SwiftUI.View {
        PodListSheet(title: "\(subscription.title) Settings", width: 600, actionTitle: "Save",
                     actionEnabled: !saving && !editor.edits.busy, cancelEnabled: !saving,
                     cancel: cancel, action: save) {
            settingsFields
        } status: {
            EditingFeedback(editing: editor.edits, retry: save)
        }
        .interactiveDismissDisabled(saving)
        .onExitCommand { if !saving { cancel() } }
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .cancel: saving ? nil : cancel, .save: !saving && !editor.edits.busy ? save : nil
        ].compactMapValues { $0 }))
        .focusedSceneValue(\.podListPodcast, PodcastCommandContext(subscribed: true,
            markAllPlayed: markAllPlayed))
    }
    private var settingsFields: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) {
            PodListSheetSectionHeading("On This Device")
            DownloadRuleFields(mode: value(\.mode), cap: value(\.cap))
            PodListSheetSectionHeading("Played")
            VStack(alignment: .leading, spacing: 12) {
                PodListSheetField("Played Threshold") {
                    Picker("Played Threshold", selection: value(\.threshold)) {
                        Text("Default (30 seconds)").tag(nil as Double?)
                        ForEach([0.0, 10, 30, 60, 120, 300], id: \.self) { Text(CountText.format(Int($0), .second)).tag(Optional($0)) }
                        if let threshold = draft.threshold, ![0.0, 10, 30, 60, 120, 300].contains(threshold) { Text(CountText.seconds(threshold)).tag(Optional(threshold)) }
                    }.labelsHidden().frame(maxWidth: .infinity)
                }
                Button("Mark All Played") { markAllPlayed?() }.disabled(markAllPlayed == nil)
                Text("Mark All Played takes effect immediately and can be undone.")
                    .macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle()).fixedSize(horizontal: false, vertical: true)
            }
            PodListSheetSectionHeading("Playback Settings Overrides")
            VStack(alignment: .leading, spacing: 12) {
                Text("Default inherits the global Playback Settings.").foregroundStyle(MacReadableSecondaryStyle()).fixedSize(horizontal: false, vertical: true)
                overrideNumber("Speed", path: \.speed, choices: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3])
                overrideNumber("Skip Intro", path: \.skipIntro, choices: [0, 15, 30, 45, 60, 90, 120], seconds: true)
                overrideNumber("Skip Outro", path: \.skipOutro, choices: [0, 15, 30, 45, 60, 90, 120], seconds: true)
                PodListSheetField("Volume Boost") {
                    Picker("Volume Boost", selection: value(\.overrides.volumeBoost)) {
                        Text("Default").tag(nil as Bool?); Text("On").tag(Optional(true)); Text("Off").tag(Optional(false))
                    }.labelsHidden().frame(maxWidth: .infinity)
                }
            }
        }.disabled(saving)
    }
    private func overrideNumber(_ name: String, path: WritableKeyPath<PlaybackSettingsOverride, Double?>, choices: [Double], seconds: Bool = false) -> some SwiftUI.View {
        let overrides: WritableKeyPath<SubscriptionSettingsDraft, PlaybackSettingsOverride> = \.overrides
        return PodListSheetField(name) {
            Picker(name, selection: value(overrides.appending(path: path))) {
                Text("Default").tag(nil as Double?)
                ForEach(choices, id: \.self) { Text(seconds ? CountText.seconds($0) : $0.formatted()).tag(Optional($0)) }
                if let current = draft.overrides[keyPath: path], !choices.contains(current) { Text(seconds ? CountText.seconds(current) : current.formatted()).tag(Optional(current)) }
            }.labelsHidden().frame(maxWidth: .infinity)
        }
    }
    private func value<T>(_ path: WritableKeyPath<SubscriptionSettingsDraft, T>) -> Binding<T> {
        Binding(get: { draft[keyPath: path] }, set: { value in
            var updated = draft; updated[keyPath: path] = value
            editor.edits.drafts.stage(updated); draft = updated
        })
    }
    private var markAllPlayed: (() -> Void)? {
        saving ? nil : SubscriptionPlayedAction.action(subscription, editor: editor)
    }
    private func cancel() { editor.edits.drafts.remove(draft.field); dismiss() }
    private func save() {
        guard !saving, !editor.edits.busy else { return }
        let changes = draft.changes
        saving = true
        Task {
            let saved = changes.isEmpty ? true : await editor.edits.edit(changes, name: "Subscription Settings", reload: true)
            if saved { editor.edits.drafts.remove(draft.field); dismiss() }
            saving = false
        }
    }
}

/// Reserve the widest native label at the current font size, including its icon.
/// Arming and disarming must not move the neighbouring actions.
struct SubscriptionButtonLabel: SwiftUI.View {
    let subscribed: Bool
    let armed: Bool
    var body: some SwiftUI.View {
        ZStack {
            Label("Subscribed", systemImage: "checkmark.circle.fill").hidden().accessibilityHidden(true)
            Label("Unsubscribe", systemImage: "minus.circle.fill").hidden().accessibilityHidden(true)
            Label("Subscribe", systemImage: "plus.circle").hidden().accessibilityHidden(true)
            Label(subscribed ? (armed ? "Unsubscribe" : "Subscribed") : "Subscribe",
                  systemImage: subscribed ? (armed ? "minus.circle.fill" : "checkmark.circle.fill") : "plus.circle")
        }.fixedSize()
    }
}
#endif
