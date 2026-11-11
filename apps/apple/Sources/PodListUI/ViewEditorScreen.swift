#if os(macOS)
import SwiftUI
import PodListDomain

struct ViewEditorScreen: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    let initial: PodListDomain.View
    let creating: Bool
    let finished: (String?) -> Void
    @State private var draft: PodListDomain.View
    @State private var renaming = false
    @State private var rename = ""
    @State private var problem: String?
    @State private var from = Date()
    @State private var to = Date()
    @State private var saving = false
    @State private var applying = 0
    @State private var pending: Task<Void, Never>?
    init(editor: LibraryEditingModel, library: LibraryModel, view: PodListDomain.View, creating: Bool, finished: @escaping (String?) -> Void) {
        self.editor = editor; self.library = library; initial = view; self.creating = creating; self.finished = finished
        let restored = editor.draft("view.\(view.id)").data(using: .utf8).flatMap { try? JSONDecoder().decode(PodListDomain.View.self, from: $0) }
        let initial = restored ?? view
        _draft = State(initialValue: initial)
        if case let .between(start, end) = initial.filter.published {
            if let start { _from = State(initialValue: Date(timeIntervalSince1970: Double(start) / 1000)) }
            if let end { _to = State(initialValue: Date(timeIntervalSince1970: Double(end) / 1000)) }
        }
    }
    private var count: Int { library.viewEpisodes(draft).count }
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(creating ? "New View" : "Edit View").font(.title2).bold()
                Spacer()
                Text("\(count) matching Episodes").monospacedDigit().accessibilityLabel("\(count) matching Episodes")
            }
            Form {
                Section {
                    if creating { TextField("Name", text: value(\.name)) }
                    else if renaming {
                        TextField("View name", text: $rename).onChange(of: rename) { _, text in editor.setDraft(text, field: "rename.\(draft.id)") }
                        HStack {
                            Button("Cancel") { renaming = false; editor.setDraft("", field: "rename.\(draft.id)") }
                            Button("Save") { saveRename() }.disabled(saving)
                        }
                    } else {
                        LabeledContent("Name", value: draft.name)
                        Button("Rename…") { rename = editor.draft("rename.\(draft.id)"); if rename.isEmpty { rename = draft.name }; renaming = true }
                    }
                }
                Section("All conditions must match") {
                    Picker("Published", selection: Binding(get: { publishedMode }, set: { mode in
                        update { $0.filter.published = mode == "days" ? .lastDays(days: 7) : mode == "between" ? publishedDates : nil }
                    })) {
                        Text("Any").tag("any"); Text("In the last days").tag("days"); Text("Between dates").tag("between")
                    }
                    if publishedMode == "days" {
                        Stepper("Last \(lastDays) days", value: Binding(get: { lastDays }, set: { days in update { $0.filter.published = .lastDays(days: days) } }), in: 1...3650)
                    }
                    if publishedMode == "between" {
                        DatePicker("From", selection: $from, displayedComponents: .date).onChange(of: from) { _, _ in updateDates() }
                        DatePicker("Through", selection: $to, displayedComponents: .date).onChange(of: to) { _, _ in updateDates() }
                    }
                    Picker("Podcasts", selection: Binding(get: { draft.filter.podcasts?.mode.rawValue ?? "any" }, set: { mode in update { $0.filter.podcasts = PodcastMode(rawValue: mode).map { PodcastFilter(mode: $0, subscriptionIds: draft.filter.podcasts?.subscriptionIds ?? []) } } })) {
                        Text("Any").tag("any"); Text("Include selected").tag("include"); Text("Exclude selected").tag("exclude")
                    }
                    if draft.filter.podcasts != nil {
                        ForEach(library.snapshot.subscriptions, id: \.id) { sub in
                            Toggle(sub.title, isOn: Binding(get: { draft.filter.podcasts?.subscriptionIds.contains(sub.id) == true }, set: { included in update { view in
                                view.filter.podcasts?.subscriptionIds.removeAll { $0 == sub.id }
                                if included { view.filter.podcasts?.subscriptionIds.append(sub.id) }
                            } }))
                        }
                    }
                    TextField("Mentions", text: Binding(get: { draft.filter.text ?? "" }, set: { text in update { $0.filter.text = text.isEmpty ? nil : text } }))
                    Picker("Played", selection: Binding(get: { draft.filter.played?.rawValue ?? "any" }, set: { text in update { $0.filter.played = PlayedFilter(rawValue: text) } })) {
                        Text("Any").tag("any"); Text("Unplayed").tag("unplayed"); Text("In progress").tag("inProgress"); Text("Played").tag("played")
                    }
                    Picker("Starred", selection: Binding(get: { draft.filter.starred.map { $0 ? "yes" : "no" } ?? "any" }, set: { text in update { $0.filter.starred = text == "any" ? nil : text == "yes" } })) {
                        Text("Any").tag("any"); Text("Starred").tag("yes"); Text("Not Starred").tag("no")
                    }
                    Picker("In a Playlist", selection: Binding(get: { draft.filter.notInAnyPlaylist == true }, set: { flag in update { $0.filter.notInAnyPlaylist = flag ? true : nil } })) {
                        Text("Any").tag(false); Text("Not in any Playlist").tag(true)
                    }
                    optionalNumber("Minimum length (minutes)", seconds: true, path: \.filter.minDuration)
                    optionalNumber("Maximum length (minutes)", seconds: true, path: \.filter.maxDuration)
                }
                Section {
                    Picker("Sort", selection: value(\.sort)) {
                        Text("Newest first").tag(ViewSort.publishedDesc); Text("Oldest first").tag(ViewSort.publishedAsc)
                        Text("Shortest first").tag(ViewSort.durationAsc); Text("Longest first").tag(ViewSort.durationDesc)
                    }
                    TextField("Show (blank for all)", text: Binding(get: { let raw = editor.draft("limit.\(draft.id)"); return raw.isEmpty ? draft.limit.map(String.init) ?? "" : raw }, set: { text in
                        editor.setDraft(text, field: "limit.\(draft.id)")
                        if text.isEmpty { update { $0.limit = nil } }
                        else if let limit = Int64(text), limit > 0 { update { $0.limit = limit } }
                        else { problem = "Show must be a positive whole number." }
                    }))
                }
            }.formStyle(.grouped)
            if let problem { Text(problem).foregroundStyle(.red) }
            if let error = editor.error { Text(error).foregroundStyle(.red) }
            HStack {
                if !creating { Button("Delete View", role: .destructive) { editor.run { try await editor.deleteView(draft); finished(nil) } } }
                if editor.undoName != nil { Button("Undo edit") { Task { await editor.undo(); if let restored = try? await editor.savedView(draft.id) { draft = restored; reconcileDraft() } } } }
                Spacer()
                Button("Done") { finish() }.keyboardShortcut(.defaultAction).disabled(saving || renaming)
            }
        }.padding(20).frame(width: 600, height: 730)
        .onAppear {
            problem = rawNumberProblem ?? ViewEdits.problem(draft)
            rename = editor.draft("rename.\(draft.id)"); renaming = !rename.isEmpty
        }
        .onChange(of: library.state.views) { _, views in
            if !creating, let current = views.first(where: { $0.id == draft.id }), applying == 0, current != draft { draft = current; reconcileDraft() }
        }
    }
    private var publishedMode: String {
        switch draft.filter.published { case .lastDays: "days"; case .between: "between"; case nil: "any" }
    }
    private var lastDays: Int64 { if case let .lastDays(days) = draft.filter.published { days } else { 7 } }
    private func millis(_ date: Date) -> Int64 { Int64(date.timeIntervalSince1970 * 1000) }
    private var publishedDates: PublishedFilter {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: from)
        let end = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: to))!
        return .between(from: millis(start), to: millis(end) - 1)
    }
    private func updateDates() { update { $0.filter.published = publishedDates } }
    private func value<T>(_ path: WritableKeyPath<PodListDomain.View, T>) -> Binding<T> { Binding(get: { draft[keyPath: path] }, set: { value in update { $0[keyPath: path] = value } }) }
    private func optionalNumber(_ label: String, seconds: Bool, path: WritableKeyPath<PodListDomain.View, Double?>) -> some SwiftUI.View {
        TextField(label, text: Binding(get: { let raw = editor.draft("\(draft.id).\(label)"); return raw.isEmpty ? draft[keyPath: path].map { String($0 / (seconds ? 60 : 1)) } ?? "" : raw }, set: { text in
            editor.setDraft(text, field: "\(draft.id).\(label)")
            if text.isEmpty { update { $0[keyPath: path] = nil } }
            else if let n = Double(text), n.isFinite, n >= 0 { update { $0[keyPath: path] = n * (seconds ? 60 : 1) } }
            else { problem = "Enter a nonnegative number of minutes." }
        }))
    }
    private func update(_ mutation: (inout PodListDomain.View) -> Void) {
        mutation(&draft)
        editor.setDraft(String(decoding: (try? JSONEncoder().encode(draft)) ?? Data(), as: UTF8.self), field: "view.\(draft.id)")
        problem = ViewEdits.problem(draft)
        guard problem == nil, rawNumberProblem == nil else { return }
        if !creating { enqueue(draft) }
    }
    private func enqueue(_ view: PodListDomain.View) {
        let previous = pending
        applying += 1
        pending = Task {
            await previous?.value
            do { try await editor.saveView(view) } catch { editor.error = LibraryMessages.failure(error) }
            applying -= 1
        }
    }
    private func reconcileDraft() {
        editor.setDraft(String(decoding: (try? JSONEncoder().encode(draft)) ?? Data(), as: UTF8.self), field: "view.\(draft.id)")
        for label in ["Minimum length (minutes)", "Maximum length (minutes)"] { editor.setDraft("", field: "\(draft.id).\(label)") }
        editor.setDraft("", field: "limit.\(draft.id)")
        problem = ViewEdits.problem(draft)
    }
    private func saveRename() {
        if let error = ViewNames.problem(rename, views: library.state.views, excluding: draft.id) { problem = error; return }
        saving = true
        Task {
            await pending?.value
            var next = draft; next.name = rename
            do { try await editor.saveView(next); draft = next; renaming = false; editor.setDraft("", field: "rename.\(draft.id)"); problem = nil }
            catch { problem = LibraryMessages.failure(error) }
            saving = false
        }
    }
    private var rawNumberProblem: String? {
        for label in ["Minimum length (minutes)", "Maximum length (minutes)"] {
            let raw = editor.draft("\(draft.id).\(label)")
            if !raw.isEmpty, Double(raw).map({ $0.isFinite && $0 >= 0 }) != true { return "Enter a nonnegative number of minutes." }
        }
        let limit = editor.draft("limit.\(draft.id)")
        if !limit.isEmpty, Int64(limit).map({ $0 > 0 }) != true { return "Show must be a positive whole number." }
        return nil
    }
    private func finish() {
        problem = rawNumberProblem ?? ViewEdits.problem(draft)
        guard problem == nil else { return }
        saving = true
        Task {
            await pending?.value
            do {
                if creating { try await editor.saveView(draft) }
                editor.setDraft("", field: "view.\(draft.id)")
                for label in ["Minimum length (minutes)", "Maximum length (minutes)"] { editor.setDraft("", field: "\(draft.id).\(label)") }
                editor.setDraft("", field: "limit.\(draft.id)")
                if creating { editor.setDraft("", field: "newViewID") }
                finished(draft.id)
            } catch { problem = LibraryMessages.failure(error) }
            saving = false
        }
    }
}
#endif
