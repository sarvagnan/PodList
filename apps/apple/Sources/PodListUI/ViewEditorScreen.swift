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
    @State private var renameProblem: String?
    @State private var nameValidation = FormValidationVisibility()
    @Environment(\.locale) private var locale
    @State private var from = Date()
    @State private var to = Date()
    @State private var saving = false
    @State private var applying = 0
    @State private var unappliedDraft = false
    @State private var pending: Task<Void, Never>?
    @State private var sessionID = UUID()
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
        ContentSizedPanel(width: 600) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(creating ? "New View" : "Edit View").macContentFont(.title2).bold()
                    Spacer()
                    Text(CountText.format(count, .matchingEpisode)).monospacedDigit()
                }
                Form {
                    Section {
                        if creating {
                            TextField("Name", text: Binding(get: { draft.name }, set: { text in
                                nameValidation.edited(from: draft.name, to: text)
                                update { $0.name = text }
                            }))
                            validation(nameValidation.message(nameProblem))
                        }
                        else if renaming {
                            TextField("View name", text: $rename).onChange(of: rename) { _, text in editor.setDraft(text, field: "rename.\(draft.id)"); renameProblem = ViewNames.problem(text, views: library.state.views, excluding: draft.id) }
                            validation(renameProblem)
                            HStack {
                                Button("Cancel", action: cancelRename)
                                Button("Save") { saveRename() }.keyboardShortcut(.defaultAction).disabled(saving || !fieldProblems.isEmpty)
                            }
                        } else {
                            LabeledContent("Name", value: draft.name)
                            Button("Rename…") { if ViewRenameAction.prepare(draft, editor: editor) { rename = editor.draft("rename.\(draft.id)"); renaming = true } }
                        }
                    }
                    Section("All Conditions Must Match") {
                        Picker("Published", selection: Binding(get: { publishedMode }, set: { mode in
                            update { $0.filter.published = mode == "days" ? .lastDays(days: 7) : mode == "between" ? publishedDates : nil }
                        })) {
                            Text("Any").tag("any"); Text("In the Last Days").tag("days"); Text("Between Dates").tag("between")
                        }
                        if publishedMode == "days" {
                            Stepper("Last \(CountText.format(lastDays, .day))", value: Binding(get: { lastDays }, set: { days in update { $0.filter.published = .lastDays(days: days) } }), in: 1...3650)
                        }
                        if publishedMode == "between" {
                            DatePicker("From", selection: $from, displayedComponents: .date).onChange(of: from) { _, _ in updateDates() }
                            DatePicker("Through", selection: $to, displayedComponents: .date).onChange(of: to) { _, _ in updateDates() }
                        }
                        validation(fieldProblems[.published])
                        Picker("Podcasts", selection: Binding(get: { draft.filter.podcasts?.mode.rawValue ?? "any" }, set: { mode in update { $0.filter.podcasts = PodcastMode(rawValue: mode).map { PodcastFilter(mode: $0, subscriptionIds: draft.filter.podcasts?.subscriptionIds ?? []) } } })) {
                            Text("Any").tag("any"); Text("Include Selected").tag("include"); Text("Exclude Selected").tag("exclude")
                        }
                        if draft.filter.podcasts != nil {
                            ForEach(library.snapshot.subscriptions, id: \.id) { sub in
                                Toggle(sub.title, isOn: Binding(get: { draft.filter.podcasts?.subscriptionIds.contains(sub.id) == true }, set: { included in update { view in
                                    view.filter.podcasts?.subscriptionIds.removeAll { $0 == sub.id }
                                    if included { view.filter.podcasts?.subscriptionIds.append(sub.id) }
                                } }))
                            }
                        }
                        TextField("Mentions (Optional)", text: Binding(get: { draft.filter.text ?? "" }, set: { text in update { $0.filter.text = text.isEmpty ? nil : text } }), prompt: Text("Any"))
                            .textFieldStyle(.roundedBorder).accessibilityLabel("Mentions")
                        Picker("Played", selection: Binding(get: { draft.filter.played?.rawValue ?? "any" }, set: { text in update { $0.filter.played = PlayedFilter(rawValue: text) } })) {
                            Text("Any").tag("any"); Text("Unplayed").tag("unplayed"); Text("In Progress").tag("inProgress"); Text("Played").tag("played")
                        }
                        Picker("Starred", selection: Binding(get: { draft.filter.starred.map { $0 ? "yes" : "no" } ?? "any" }, set: { text in update { $0.filter.starred = text == "any" ? nil : text == "yes" } })) {
                            Text("Any").tag("any"); Text("Starred").tag("yes"); Text("Not Starred").tag("no")
                        }
                        Picker("In a Playlist", selection: Binding(get: { draft.filter.notInAnyPlaylist == true }, set: { flag in update { $0.filter.notInAnyPlaylist = flag ? true : nil } })) {
                            Text("Any").tag(false); Text("Not in Any Playlist").tag(true)
                        }
                        optionalNumber("Minimum length", field: .minimumLength, path: \.filter.minDuration)
                        optionalNumber("Maximum length", field: .maximumLength, path: \.filter.maxDuration)
                    }
                    Section {
                        Picker("Sort", selection: value(\.sort)) {
                            Text("Newest First").tag(ViewSort.publishedDesc); Text("Oldest First").tag(ViewSort.publishedAsc)
                            Text("Shortest First").tag(ViewSort.durationAsc); Text("Longest First").tag(ViewSort.durationDesc)
                        }
                        TextField("Show (Optional)", text: Binding(get: { let raw = editor.draft("limit.\(draft.id)"); return editor.hasDraft("limit.\(draft.id)") ? raw : draft.limit.map(String.init) ?? "" }, set: { text in
                            editor.setDraft(text, field: "limit.\(draft.id)")
                            if text.isEmpty { update { $0.limit = nil } }
                            else if let limit = Int64(text), limit > 0 { update { $0.limit = limit } }
                        }), prompt: Text("All")).textFieldStyle(.roundedBorder).accessibilityLabel("Show")
                        validation(fieldProblems[.show])
                    }
                }.formStyle(.columns).disabled(saving)
            }.padding(20)
        } footer: {
            VStack(spacing: 0) {
                EditingFeedback(editing: editor.edits, additionalError: problem ?? editor.error,
                                undo: { Task { await editor.undo(); if let restored = try? await editor.savedView(draft.id) { draft = restored; reconcileDraft() } } },
                                redo: { Task { await editor.redo(); if let restored = try? await editor.savedView(draft.id) { draft = restored; reconcileDraft() } } })
                HStack {
                    if !creating { Button("Delete View", role: .destructive, action: deleteView) }
                    Spacer()
                    Button("Cancel") { cancel() }.keyboardShortcut(.cancelAction).disabled(saving)
                    Button("Done") { finish() }.keyboardShortcut(renaming ? nil : .defaultAction).buttonStyle(MacDefaultButtonStyle()).disabled(saving || renaming)
                }.disabled(saving).padding(20).macGlassSurface().padding([.horizontal, .bottom], 12)
            }
        }
        .interactiveDismissDisabled(saving)
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .done: !saving && !renaming ? { finish() } : nil,
            .cancel: saving ? nil : { cancel() },
            .save: renaming && !saving && fieldProblems.isEmpty ? { saveRename() } : nil,
            .cancelRename: renaming && !saving ? { cancelRename() } : nil
        ].compactMapValues { $0 }))
        .focusedSceneValue(\.podListViewEditorActions, ViewEditorCommandContext(
            rename: !creating && !saving && !renaming ? { if ViewRenameAction.prepare(draft, editor: editor) { rename = editor.draft("rename.\(draft.id)"); renaming = true } } : nil,
            delete: !creating && !saving ? { deleteView() } : nil))
        .onChange(of: creating ? nameValidation.message(nameProblem) : (renaming ? renameProblem : nil)) { _, message in
            editor.edits.announcements.error(message)
        }
        .onChange(of: fieldProblems) { _, problems in
            editor.edits.announcements.error(problems.isEmpty ? nil : problems.values.sorted().joined(separator: " "))
        }
        .onAppear {
            rename = editor.draft("rename.\(draft.id)"); renaming = !rename.isEmpty
        }
        .onChange(of: library.state.views) { _, views in
            if !creating, let current = views.first(where: { $0.id == draft.id }), applying == 0, !unappliedDraft, fieldProblems.isEmpty, current != draft { draft = current; reconcileDraft() }
        }
    }
    private func cancelRename() { renaming = false; editor.setDraft("", field: "rename.\(draft.id)") }
    private func deleteView() { editor.run { try await editor.deleteView(draft); finished(nil) } }
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
    private func numberDraft(_ label: String, path: KeyPath<PodListDomain.View, Double?>) -> String {
        let key = "\(draft.id).\(label) (minutes)"
        return editor.hasDraft(key) ? editor.draft(key) : draft[keyPath: path].map { FormNumbers.string($0 / 60, locale: locale) } ?? ""
    }
    private func optionalNumber(_ label: String, field: ViewEdits.Field, path: WritableKeyPath<PodListDomain.View, Double?>) -> some SwiftUI.View {
        LabeledContent("\(label) (Optional)") {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    TextField(label, text: Binding(get: { numberDraft(label, path: path) }, set: { text in
                        editor.setDraft(text, field: "\(draft.id).\(label) (minutes)")
                        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { update { $0[keyPath: path] = nil } }
                        else if let seconds = FormNumbers.seconds(fromMinutes: text, locale: locale) { update { $0[keyPath: path] = seconds } }
                    }), prompt: Text("No limit")).labelsHidden().accessibilityLabel(label)
                        .textFieldStyle(.roundedBorder).frame(width: 88)
                    Text("min").foregroundStyle(.primary)
                }
                validation(fieldProblems[field])
            }
        }
    }
    @ViewBuilder private func validation(_ message: String?) -> some SwiftUI.View {
        if let message { Text(message).macContentFont(.caption).foregroundStyle(Color.podListError).fixedSize(horizontal: false, vertical: true) }
    }
    private var nameProblem: String? { creating ? ViewNames.problem(draft.name, views: library.state.views, excluding: draft.id) : nil }
    private var fieldProblems: [ViewEdits.Field: String] {
        var errors = ViewEdits.problems(draft)
        for (label, field, path) in [("Minimum length", ViewEdits.Field.minimumLength, \PodListDomain.View.filter.minDuration), ("Maximum length", .maximumLength, \PodListDomain.View.filter.maxDuration)] {
            if let message = FormNumbers.minutesProblem(numberDraft(label, path: path), label: label, locale: locale) { errors[field] = message }
        }
        let limit = editor.draft("limit.\(draft.id)")
        if !limit.isEmpty, Int64(limit).map({ $0 > 0 }) != true { errors[.show] = "Show must be a positive whole number." }
        return errors
    }
    private func update(_ mutation: (inout PodListDomain.View) -> Void) {
        var next = draft
        mutation(&next)
        // Text fields commit their unchanged value when editing ends (Escape, Done, focus
        // moving); that isn't an edit and mustn't record one.
        guard next != draft || unappliedDraft else { return }
        draft = next
        unappliedDraft = true
        editor.setDraft(String(decoding: (try? JSONEncoder().encode(draft)) ?? Data(), as: UTF8.self), field: "view.\(draft.id)")
        problem = nil
        guard fieldProblems.isEmpty, nameProblem == nil else { return }
        if !creating { unappliedDraft = false; enqueue(draft) }
    }
    private func enqueue(_ view: PodListDomain.View) {
        let previous = pending
        applying += 1
        pending = Task {
            await previous?.value
            do { try await editor.saveView(view, sessionID: sessionID) } catch { editor.error = LibraryMessages.failure(error) }
            applying -= 1
        }
    }
    private func reconcileDraft() {
        editor.setDraft(String(decoding: (try? JSONEncoder().encode(draft)) ?? Data(), as: UTF8.self), field: "view.\(draft.id)")
        for label in ["Minimum length (minutes)", "Maximum length (minutes)"] { editor.clearDraft("\(draft.id).\(label)") }
        editor.clearDraft("limit.\(draft.id)")
        problem = nil
        unappliedDraft = false
    }
    private func saveRename() {
        guard fieldProblems.isEmpty else { return }
        if let error = ViewNames.problem(rename, views: library.state.views, excluding: draft.id) { renameProblem = error; return }
        saving = true
        Task {
            await pending?.value
            var next = draft; next.name = rename
            do { try await editor.saveView(next, sessionID: sessionID); draft = next; renaming = false; editor.setDraft("", field: "rename.\(draft.id)"); problem = nil }
            catch { problem = LibraryMessages.failure(error) }
            saving = false
        }
    }
    private func finish() {
        nameValidation.submitted()
        guard fieldProblems.isEmpty, nameProblem == nil else { return }
        problem = nil
        saving = true
        Task {
            await pending?.value
            do {
                let saved = try await editor.savedView(draft.id)
                if creating || saved != draft { try await editor.saveView(draft, sessionID: sessionID) }
                editor.clearViewDrafts(draft.id, creating: creating)
                finished(draft.id)
            } catch { problem = LibraryMessages.failure(error) }
            saving = false
        }
    }
    private func cancel() {
        saving = true
        Task {
            await pending?.value
            do {
                try await editor.cancelViewEdits(initial: initial, creating: creating, sessionID: sessionID)
                finished(nil)
            } catch { problem = LibraryMessages.failure(error) }
            saving = false
        }
    }
}
#endif
