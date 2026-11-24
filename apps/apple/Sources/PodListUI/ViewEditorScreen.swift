#if os(macOS)
import SwiftUI
import PodListDomain

struct ViewEditorScreen: SwiftUI.View {
    @Environment(\.libraryEditOrigin) private var origin
    @Bindable var editor: LibraryEditingModel
    let app: ApplicationModel
    let initialLibrary: LibraryModel
    let creating: Bool
    let windowID: String
    let focusName: Bool
    let finished: (String?) -> Void
    @State private var session: ViewEditorDraft
    @FocusState private var nameFocused: Bool
    @State private var problem: String?
    @State private var nameValidation = FormValidationVisibility()
    @Environment(\.locale) private var locale
    @State private var saving = false

    init(editor: LibraryEditingModel, app: ApplicationModel, library: LibraryModel, draft: ViewEditorDraft, creating: Bool,
         windowID: String, focusName: Bool, finished: @escaping (String?) -> Void) {
        self.editor = editor
        self.app = app
        initialLibrary = library
        self.creating = creating
        self.windowID = windowID
        self.focusName = focusName
        self.finished = finished
        _session = State(initialValue: draft)
    }

    private var library: LibraryModel {
        app.libraryEditing === editor ? app.library ?? initialLibrary : initialLibrary
    }
    private var draft: PodListDomain.View { session.value }
    private var current: PodListDomain.View? { library.state.views.first { $0.id == draft.id } }
    private var count: Int { library.viewEpisodes(draft).count }
    var body: some SwiftUI.View {
        PodListSheet(title: creating ? "New View" : "Edit View", width: 600,
                     actionTitle: creating ? "Create View" : "Save", actionEnabled: canFinish, floating: true,
                     cancelEnabled: !saving,
                     cancel: cancel, action: finish) {
            Text(CountText.format(count, .matchingEpisode)).monospacedDigit()
            Form {
                Section {
                    LabeledContent("Name") {
                        TextField("View Name", text: Binding(get: { draft.name }, set: { text in
                            nameValidation.edited(from: draft.name, to: text)
                            update(.name) { $0.name = text }
                        })).labelsHidden().focused($nameFocused).onSubmit { finish() }
                    }
                    validation(creating ? nameValidation.message(nameProblem) : nameProblem)
                }
                Section {
                    PodListSheetField("Published") {
                        Picker("", selection: Binding(get: { publishedMode }, set: { mode in
                            guard mode != publishedMode else { return }
                            session.clearNumber(.published)
                            update(.published) {
                                $0.filter.published = mode == "days" ? .lastDays(days: 7)
                                    : mode == "between" ? publishedDates(from: .now, through: .now) : nil
                            }
                        })) {
                            Text("Any").tag("any"); Text("In the Last Days").tag("days"); Text("Between Dates").tag("between")
                        }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if publishedMode == "days" {
                        PodListSheetField("Last Days") {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    TextField("Last Days", text: Binding(get: { daysDraft }, set: setDaysDraft))
                                        .labelsHidden().textFieldStyle(.roundedBorder).frame(width: 88)
                                    Text("days")
                                    Stepper("Last Days", value: Binding(get: { lastDays }, set: { days in
                                        setDaysDraft(days.formatted(.number.locale(locale).grouping(.never)))
                                    }), in: 1...3650).labelsHidden()
                                }
                                validation(fieldProblems[.published])
                            }
                        }
                    }
                    if publishedMode == "between" {
                        DatePicker("From", selection: Binding(get: { date(isStart: true) }, set: { date in
                            update(.published) { $0.filter.published = publishedDates(from: date, through: self.date(isStart: false)) }
                        }), displayedComponents: .date)
                        DatePicker("Through", selection: Binding(get: { date(isStart: false) }, set: { date in
                            update(.published) { $0.filter.published = publishedDates(from: self.date(isStart: true), through: date) }
                        }), displayedComponents: .date)
                    }
                    if publishedMode != "days" { validation(fieldProblems[.published]) }
                    PodListSheetField("Podcasts") {
                        Picker("", selection: Binding(get: { draft.filter.podcasts?.mode.rawValue ?? "any" }, set: { mode in update(.podcasts) { $0.filter.podcasts = PodcastMode(rawValue: mode).map { PodcastFilter(mode: $0, subscriptionIds: draft.filter.podcasts?.subscriptionIds ?? []) } } })) {
                            Text("Any").tag("any"); Text("Include Selected").tag("include"); Text("Exclude Selected").tag("exclude")
                        }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if draft.filter.podcasts != nil {
                        ForEach(library.snapshot.subscriptions, id: \.id) { sub in
                            Toggle(sub.title, isOn: Binding(get: { draft.filter.podcasts?.subscriptionIds.contains(sub.id) == true }, set: { included in update(.podcasts) { view in
                                view.filter.podcasts?.subscriptionIds.removeAll { $0 == sub.id }
                                if included { view.filter.podcasts?.subscriptionIds.append(sub.id) }
                            } }))
                        }
                    }
                    PodListSheetField("Mentions (optional)") {
                        TextField("Mentions", text: Binding(get: { draft.filter.text ?? "" }, set: { text in update(.mentions) { $0.filter.text = text.isEmpty ? nil : text } }), prompt: Text("Any"))
                            .labelsHidden().textFieldStyle(.roundedBorder)
                    }
                    PodListSheetField("Played") {
                        Picker("", selection: Binding(get: { draft.filter.played?.rawValue ?? "any" }, set: { text in update(.played) { $0.filter.played = PlayedFilter(rawValue: text) } })) {
                            Text("Any").tag("any"); Text("Unplayed").tag("unplayed"); Text("In Progress").tag("inProgress"); Text("Played").tag("played")
                        }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    }
                    PodListSheetField("Starred") {
                        Picker("", selection: Binding(get: { draft.filter.starred.map { $0 ? "yes" : "no" } ?? "any" }, set: { text in update(.starred) { $0.filter.starred = text == "any" ? nil : text == "yes" } })) {
                            Text("Any").tag("any"); Text("Starred").tag("yes"); Text("Not Starred").tag("no")
                        }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    }
                    PodListSheetField("In a Playlist") {
                        Picker("", selection: Binding(get: { draft.filter.notInAnyPlaylist == true }, set: { flag in update(.playlist) { $0.filter.notInAnyPlaylist = flag ? true : nil } })) {
                            Text("Any").tag(false); Text("Not in Any Playlist").tag(true)
                        }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    }
                    optionalNumber("Minimum Length", field: .minimumLength, path: \.filter.minDuration)
                    optionalNumber("Maximum Length", field: .maximumLength, path: \.filter.maxDuration)
                } header: {
                    PodListSheetSectionHeading("All conditions must match")
                }
                Section {
                    PodListSheetField("Sort") {
                        Picker("", selection: Binding(get: { draft.sort }, set: { sort in update(.sort) { $0.sort = sort } })) {
                            Text("Newest First").tag(ViewSort.publishedDesc); Text("Oldest First").tag(ViewSort.publishedAsc)
                            Text("Shortest First").tag(ViewSort.durationAsc); Text("Longest First").tag(ViewSort.durationDesc)
                        }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    }
                    LabeledContent("Episodes to Show (optional)") {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                TextField("Episodes to Show", text: Binding(get: { limitDraft }, set: { text in
                                    setNumber(text, replacing: limitDraft, field: .limit)
                                }), prompt: Text("All")).labelsHidden()
                                    .textFieldStyle(.roundedBorder).frame(width: 88)
                                Text("Episodes").foregroundStyle(.primary)
                            }
                            validation(fieldProblems[.show])
                        }
                    }
                }
            }.formStyle(PodListSheetFormStyle()).disabled(saving)
        } status: {
            EditingFeedback(editing: editor.edits, additionalError: problem ?? editor.error,
                            undo: { Task { await editor.undo() } }, redo: { Task { await editor.redo() } })
        } secondary: {
            if !creating { Button("Delete View", role: .destructive, action: deleteView).disabled(saving) }
        }
        .interactiveDismissDisabled(saving)
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .createView: creating && canFinish ? { finish() } : nil,
            .cancel: saving ? nil : { cancel() },
            .save: !creating && canFinish ? { finish() } : nil
        ].compactMapValues { $0 }))
        .focusedSceneValue(\.podListViewEditorActions, ViewEditorCommandContext(
            rename: !creating && !saving ? { nameFocused = true } : nil,
            delete: !creating && !saving ? { deleteView() } : nil))
        .onChange(of: creating ? nameValidation.message(nameProblem) : nameProblem) { _, message in
            editor.edits.announcements.error(message)
        }
        .onChange(of: fieldProblems) { _, problems in
            editor.edits.announcements.error(problems.isEmpty ? nil : problems.values.sorted().joined(separator: " "))
        }
        .onAppear { if focusName || session.touched.contains(.name) { nameFocused = true } }
        .onChange(of: current, initial: true) { _, current in
            if !creating, let current { session.receive(current) }
        }
    }
    private func deleteView() {
        guard let current else { return }
        editor.run {
            try await editor.deleteView(current)
            editor.discardViewDraft(draft.id, in: windowID, creating: creating)
            finished(nil)
        }
    }
    private var publishedMode: String {
        switch draft.filter.published { case .lastDays: "days"; case .between: "between"; case nil: "any" }
    }
    private var daysDraft: String {
        session.numbers[.published] ?? lastDays.formatted(.number.locale(locale).grouping(.never))
    }
    private var limitDraft: String {
        session.numbers[.limit] ?? draft.limit?.formatted(.number.locale(locale).grouping(.never)) ?? ""
    }
    private func setDaysDraft(_ text: String) {
        setNumber(text, replacing: daysDraft, field: .published)
    }
    private func setNumber(_ text: String, replacing displayed: String, field: ViewEditorDraft.Field) {
        guard !saving, text != displayed else { return }
        session.setNumber(text, for: field, locale: locale)
        stageDraft()
    }
    private var lastDays: Int64 { if case let .lastDays(days) = draft.filter.published { days } else { 7 } }
    private func date(isStart: Bool) -> Date {
        if case let .between(from, through) = draft.filter.published, let value = isStart ? from : through {
            return Date(timeIntervalSince1970: Double(value) / 1000)
        }
        return .now
    }
    private func publishedDates(from: Date, through: Date) -> PublishedFilter {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: from)
        let end = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: through))!
        return .between(from: Int64(start.timeIntervalSince1970 * 1000), to: Int64(end.timeIntervalSince1970 * 1000) - 1)
    }
    private func numberDraft(_ field: ViewEditorDraft.Field, path: KeyPath<PodListDomain.View, Double?>) -> String {
        session.numbers[field] ?? draft[keyPath: path].map { FormNumbers.string($0 / 60, locale: locale) } ?? ""
    }
    private func optionalNumber(_ label: String, field: ViewEditorDraft.Field,
                                path: WritableKeyPath<PodListDomain.View, Double?>) -> some SwiftUI.View {
        LabeledContent("\(label) (optional)") {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    TextField(label, text: Binding(get: { numberDraft(field, path: path) }, set: { text in
                        setNumber(text, replacing: numberDraft(field, path: path), field: field)
                    }), prompt: Text("No limit")).labelsHidden()
                        .textFieldStyle(.roundedBorder).frame(width: 88)
                    Text("min").foregroundStyle(.primary)
                }
                validation(field == .minimumLength ? fieldProblems[.minimumLength] : fieldProblems[.maximumLength])
            }
        }
    }
    @ViewBuilder private func validation(_ message: String?) -> some SwiftUI.View {
        if let message { Text(message).macContentFont(.caption).foregroundStyle(Color.podListError).fixedSize(horizontal: false, vertical: true) }
    }
    private var nameProblem: String? { ViewNames.problem(draft.name, views: library.state.views, excluding: draft.id) }
    private var fieldProblems: [ViewEdits.Field: String] {
        var errors = ViewEdits.problems(draft)
        if let text = session.numbers[.minimumLength],
           let message = FormNumbers.minutesProblem(text, label: "Minimum length", locale: locale) { errors[.minimumLength] = message }
        if let text = session.numbers[.maximumLength],
           let message = FormNumbers.minutesProblem(text, label: "Maximum length", locale: locale) { errors[.maximumLength] = message }
        if publishedMode == "days", let message = FormNumbers.lastDaysProblem(daysDraft, locale: locale) { errors[.published] = message }
        if let text = session.numbers[.limit], let message = FormNumbers.countProblem(text, locale: locale) { errors[.show] = message }
        return errors
    }
    private func update(_ field: ViewEditorDraft.Field, _ mutation: (inout PodListDomain.View) -> Void) {
        guard !saving else { return }
        session.edit(field, mutation)
        stageDraft()
    }
    private func stageDraft() {
        editor.stageViewDraft(session, in: windowID)
        problem = nil
    }
    private var canFinish: Bool { !saving && fieldProblems.isEmpty && nameProblem == nil }
    private func finish() {
        nameValidation.submitted()
        guard canFinish else { return }
        problem = nil
        saving = true
        let draftToSave = session
        EditOrigin.start(origin) {
            defer { saving = false }
            do {
                try await editor.saveViewDraft(draftToSave, creating: creating)
                editor.discardViewDraft(draft.id, in: windowID, creating: creating)
                finished(draft.id)
            } catch { problem = LibraryMessages.failure(error) }
        }
    }
    private func cancel() {
        saving = true
        editor.discardViewDraft(draft.id, in: windowID, creating: creating)
        finished(nil)
    }
}
#endif
