#if os(macOS)
import SwiftUI
import PodListData
import PodListDomain

struct LibraryFeedback: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 6) {
            if let error = editor.error { Text(error).foregroundStyle(.red).textSelection(.enabled) }
            if let notice = editor.notice { Text(notice).foregroundStyle(.secondary) }
            HStack {
                if let name = editor.undoName { Button("Undo \(name)") { Task { await editor.undo() } } }
                if let name = editor.redoName { Button("Redo \(name)") { Task { await editor.redo() } } }
            }
        }.font(.callout).padding(.horizontal)
    }
}

struct AddPodcastsScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    let open: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [DirectoryPodcast] = []
    @State private var loading = false
    @State private var searched = false
    @State private var error: String?
    @State private var subscribing = Set<String>()
    @State private var searchTask: Task<Void, Never>?
    @FocusState private var focused: Bool
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Add podcasts").font(.title2).bold()
            HStack {
                TextField("Podcast name or feed address", text: $query).textFieldStyle(.roundedBorder).focused($focused)
                    .onSubmit { search() }.onChange(of: query) { _, text in editor.setDraft(text, field: "addPodcasts"); searchTask?.cancel(); loading = false; searched = false; results = []; error = nil }
                Button("Search") { search() }.disabled(loading || query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            if loading { ProgressView("Finding podcasts…") }
            if let error { Text(error).foregroundStyle(.red); Button("Try again") { search() } }
            if searched && !loading && results.isEmpty && error == nil { Text("No podcasts found. Try a name or a feed address.") }
            List(results) { result in
                HStack {
                    Button { open(result.feedUrl); dismiss() } label: {
                        HStack {
                            ArtworkView(url: result.artworkUrl.flatMap(URL.init(string:)), title: result.title, size: 48)
                            VStack(alignment: .leading) { Text(result.title); Text(result.author ?? "").foregroundStyle(.secondary) }
                        }
                    }.buttonStyle(.plain).accessibilityLabel("Open Podcast page for \(result.title)")
                    Spacer()
                    if library.subscriptions.contains(where: { $0.feedUrl == result.feedUrl }) { Label("Subscribed", systemImage: "checkmark.circle.fill").foregroundStyle(.green) }
                    else {
                        Button(subscribing.contains(result.feedUrl) ? "Subscribing…" : "Subscribe") {
                            subscribing.insert(result.feedUrl)
                            Task { do { try await editor.subscribe(result.feedUrl) } catch { editor.error = LibraryMessages.failure(error) }; subscribing.remove(result.feedUrl) }
                        }.disabled(subscribing.contains(result.feedUrl)).accessibilityLabel("Subscribe to \(result.title)")
                    }
                }.padding(.vertical, 5)
            }
            LibraryFeedback(editor: editor)
            HStack { Spacer(); Button("Done") { dismiss() }.keyboardShortcut(.cancelAction) }
        }.padding(20).frame(width: 650, height: 550)
        .onAppear { query = editor.draft("addPodcasts"); focused = true }
        .onDisappear { searchTask?.cancel() }
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
    @State private var feed: ParsedFeed?
    @Binding var search: String
    @State private var loading = false
    @State private var error: String?
    @State private var control = UnsubscribeControl()
    @State private var subscriptionBusy = false
    @State private var descriptionExpanded = false
    @State private var settings = false
    @State private var subscribedBounds = CGRect.zero
    @State private var bringing = Set<String>()
    private var subscription: Subscription? { library.snapshot.subscriptions.first { $0.feedUrl == feedURL } }
    private var subscribed: Bool { subscription?.unsubscribedAt == nil && subscription != nil }
    private var title: String { feed?.title ?? subscription?.title ?? "Podcast" }
    private struct PageEpisode: Identifiable {
        let guid: String; let title: String; let description: String; let published: Int64; let duration: Double?; let localID: String?
        var id: String { localID ?? guid }
    }
    private var episodes: [PageEpisode] {
        let local = library.snapshot.episodes.filter { $0.subscriptionId == subscription?.id }.map {
            PageEpisode(guid: $0.guid, title: $0.title, description: $0.description, published: $0.published, duration: $0.duration, localID: $0.id)
        }
        let remote = (feed?.episodes ?? []).map { episode in
            PageEpisode(guid: episode.guid, title: episode.title, description: episode.description, published: episode.published, duration: episode.duration, localID: local.first { $0.guid == episode.guid }?.localID)
        }
        let guids = Set(remote.map(\.guid))
        return (remote + local.filter { !guids.contains($0.guid) }).filter { e in
            Mentions.words(search).allSatisfy { word in [e.title, e.description].contains { Mentions.fold($0).contains(word) } }
        }.sorted { $0.published > $1.published }
    }
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 16) {
                ArtworkView(url: (feed?.artworkUrl ?? subscription?.artwork?.url).flatMap(URL.init(string:)), title: title, size: 96)
                VStack(alignment: .leading, spacing: 6) {
                    Text(title).font(.title2).bold()
                    Text(feed?.author ?? subscription?.author ?? "").foregroundStyle(.secondary)
                    Text(Presentation.plainShowNotes(feed?.description ?? subscription?.description ?? "")).lineLimit(descriptionExpanded ? nil : 5).textSelection(.enabled)
                    Button(descriptionExpanded ? "Show less" : "Show description") { control.reset(); descriptionExpanded.toggle() }.buttonStyle(.link)
                    HStack {
                        TimelineView(.periodic(from: .now, by: 0.25)) { context in
                            Button {
                                if subscribed, let subscription {
                                    guard control.click(at: Date()) else { return }
                                    subscriptionBusy = true
                                    Task { do { try await editor.unsubscribe(subscription) } catch { editor.error = LibraryMessages.failure(error) }; subscriptionBusy = false }
                                } else {
                                    subscriptionBusy = true
                                    Task { do { try await editor.subscribe(feedURL) } catch { editor.error = LibraryMessages.failure(error) }; subscriptionBusy = false }
                                }
                            } label: {
                                Label(subscribed ? (control.isArmed(at: context.date) ? "Unsubscribe" : "Subscribed") : "Subscribe", systemImage: subscribed ? "checkmark.circle.fill" : "plus.circle")
                            }.tint(subscribed ? .green : .podListAccent).disabled(subscriptionBusy)
                                .onGeometryChange(for: CGRect.self) { $0.frame(in: .named("podcastPage")) } action: { subscribedBounds = $0 }
                                .accessibilityHint(subscribed ? "Click twice within four seconds to Unsubscribe" : "Add this podcast to your Library")
                        }
                        if subscribed { Button("Subscription settings", systemImage: "gearshape") { control.reset(); settings = true }.labelStyle(.iconOnly) }
                    }
                }
            }
            TextField("Search Episodes", text: $search).textFieldStyle(.roundedBorder).onChange(of: search) { _, text in control.reset(); editor.setDraft(text, field: "podcast.\(feedURL).search") }
            if loading { ProgressView("Reading Episodes…") }
            if let error { Text(error).foregroundStyle(.red); Button("Try again") { control.reset(); load() } }
            Text("\(episodes.count) Episodes").foregroundStyle(.secondary)
            List(episodes, selection: selection) { episode in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(episode.title)
                        Text("\(Date(timeIntervalSince1970: Double(episode.published) / 1000).formatted(date: .abbreviated, time: .omitted)) · \(episode.duration.map(Presentation.time) ?? "Unknown length")").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Add", systemImage: "plus") { bring(episode, play: false) }.labelStyle(.iconOnly).accessibilityLabel("Add \(episode.title) to Active Playlist")
                    Button("Play", systemImage: "play.fill") { bring(episode, play: true) }.labelStyle(.iconOnly).accessibilityLabel("Play \(episode.title) now")
                }.disabled(bringing.contains(episode.guid)).padding(.vertical, 4).tag(episode.id)
                .contextMenu {
                    Button("Play Now") { bring(episode, play: true) }
                    Button("Add to Active Playlist") { bring(episode, play: false) }
                }
            }.simultaneousGesture(DragGesture().onChanged { _ in control.reset() })
            LibraryFeedback(editor: editor)
        }.padding(18)
        .coordinateSpace(name: "podcastPage")
        .simultaneousGesture(SpatialTapGesture().onEnded { if !subscribedBounds.contains($0.location) { control.reset() } })
        .task(id: feedURL) { control.reset(); search = editor.draft("podcast.\(feedURL).search"); await read() }
        .onDisappear { control.reset() }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.willResignActiveNotification)) { _ in control.reset() }
        .sheet(isPresented: $settings) {
            if let subscription { SubscriptionSettingsScreen(subscription: subscription, library: library, app: app, editor: editor) }
        }
    }
    private func load() { Task { await read() } }
    private func read() async {
        loading = true; error = nil
        do { feed = try await editor.source.readPodcast(feedURL) }
        catch { self.error = LibraryMessages.failure(error) }
        loading = false
    }
    private func bring(_ episode: PageEpisode, play: Bool) {
        control.reset(); bringing.insert(episode.guid)
        Task {
            do {
                if let local = library.snapshot.episodes.first(where: { $0.subscriptionId == subscription?.id && $0.guid == episode.guid }) {
                    if play { app.playback?.playNow(local.id) }
                    else { try await editor.edit(.addEntry(playlistId: library.state.activePlaylistId, episodeId: local.id, placement: .last)) }
                    editor.completeStep(4)
                } else { try await editor.bring(feedURL, guid: episode.guid, play: play, app: app) }
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
        VStack(alignment: .leading) {
            Text("\(subscription.title) settings").font(.title2)
            Form {
                Section("On this Device") { DownloadRuleEditor(subscriptionID: subscription.id, library: library, app: app) }
                Section("Played") {
                    Picker("Played threshold", selection: $threshold) {
                        Text("Default (30 seconds)").tag(nil as Double?)
                        ForEach([0.0, 10, 30, 60, 120, 300], id: \.self) { Text("\(Int($0)) seconds").tag(Optional($0)) }
                        if let threshold, ![0.0, 10, 30, 60, 120, 300].contains(threshold) { Text("\(threshold) seconds").tag(Optional(threshold)) }
                    }
                    Button("Mark all Played") { editor.run { try await editor.edit(.markSubscriptionPlayed(subscriptionId: subscription.id)) } }
                }
                Section("Playback Settings overrides") {
                    Text("Default inherits the global Playback Settings.").foregroundStyle(.secondary)
                    overrideNumber("Speed", path: \.speed, choices: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3])
                    overrideNumber("Skip intro (seconds)", path: \.skipIntro, choices: [0, 15, 30, 45, 60, 90, 120])
                    overrideNumber("Skip outro (seconds)", path: \.skipOutro, choices: [0, 15, 30, 45, 60, 90, 120])
                    Picker("Volume boost", selection: $overrides.volumeBoost) {
                        Text("Default").tag(nil as Bool?); Text("On").tag(Optional(true)); Text("Off").tag(Optional(false))
                    }
                }
            }.formStyle(.grouped)
            LibraryFeedback(editor: editor)
            HStack { Spacer(); Button("Done") { dismiss() }.keyboardShortcut(.defaultAction) }
        }.padding(20).frame(width: 600, height: 600)
        .onChange(of: overrides) { _, _ in save() }.onChange(of: threshold) { _, _ in save() }
    }
    private func overrideNumber(_ name: String, path: WritableKeyPath<PlaybackSettingsOverride, Double?>, choices: [Double]) -> some SwiftUI.View {
        Picker(name, selection: Binding(get: { overrides[keyPath: path] }, set: { overrides[keyPath: path] = $0 })) {
            Text("Default").tag(nil as Double?)
            ForEach(choices, id: \.self) { Text(String($0)).tag(Optional($0)) }
            if let current = overrides[keyPath: path], !choices.contains(current) { Text(String(current)).tag(Optional(current)) }
        }
    }
    private func save() { let value = overrides, played = threshold; editor.run { try await editor.edit(.setSubscriptionOverrides(subscriptionId: subscription.id, playbackSettings: value, playedThreshold: played)) } }
}
#endif
