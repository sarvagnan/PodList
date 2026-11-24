#if os(macOS)
import SwiftUI
import PodListDomain

struct SearchViewCreation: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    let window: WindowModel
    let count: Int
    let editorIsCurrent: () -> Bool
    private enum Field: Hashable { case create, name }
    @FocusState private var focus: Field?
    @State private var naming = false
    @State private var name = ""
    @State private var draftRevision = 0
    @State private var saving = false
    @State private var error: String?
    private var query: String { window.search }
    private var nameInput: Binding<String> {
        Binding(get: { name }, set: { value in
            guard value != name else { return }
            name = value
            draftRevision = editor.stageSearchViewDraft(value)
            error = nil
        })
    }
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(CountText.format(count, .result))
                Spacer()
                if !naming {
                    Button("Create View…", action: beginNaming)
                        .disabled(query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .focused($focus, equals: .create)
                }
            }
            if naming {
                HStack {
                    Text("Name").accessibilityHidden(true)
                    TextField("View Name", text: nameInput)
                        .onSubmit(save)
                        .focused($focus, equals: .name)
                        .onAppear { focus = .name }
                        .accessibilityIdentifier("search.view-name")
                    Button("Cancel", action: cancelNaming)
                    Button("Create View") { save() }.disabled(saving)
                }
                if let error { Text(error).foregroundStyle(Color.podListError) }
            }
        }.onChange(of: error) { _, message in editor.edits.announcements.error(message) }
        .onChange(of: naming) { _, naming in
            if !naming { focus = .create }
        }
        .focusedSceneValue(\.podListSearchViewActions, MenuActionContext(actions: [
            .createViewFromSearch: !naming && !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? { beginNaming() } : nil,
            .createView: naming && !saving ? { save() } : nil
        ].compactMapValues { $0 }))
        .focusedSceneValue(\.podListPanelActions, naming ? MenuActionContext(actions: [.cancel: { cancelNaming() }]) : nil)
        .padding().onAppear {
            naming = editor.draft("searchView.open") == "true"
            name = editor.draft("searchView.name")
            draftRevision = editor.searchViewDraftRevision
        }
    }
    private func beginNaming() {
        let draft = editor.draft("searchView.name")
        name = draft.isEmpty ? query : draft
        naming = true
        error = nil
        draftRevision = editor.stageSearchViewDraft(name)
    }
    private func cancelNaming() {
        naming = false
        if draftRevision == editor.searchViewDraftRevision { editor.stageSearchViewDraft(nil) }
    }
    private func save() {
        guard !saving else { return }
        if let problem = ViewNames.problem(name, views: library.state.views) { error = problem; return }
        saving = true
        let origin = window.restorationOrigin
        let revision = editor.searchViewDraftRevision
        let ownsDraft = draftRevision == revision
        let view = PodListDomain.View(id: UUID().uuidString, name: name, filter: .init(text: query), sort: .publishedDesc, limit: nil)
        EditOrigin.start(.library(.search)) {
            defer { saving = false }
            do {
                try await editor.saveView(view)
                guard editorIsCurrent() else { return }
                if window.finishSearchViewCreation(view.id, from: origin, draftUnchanged: revision == editor.searchViewDraftRevision) {
                    if ownsDraft { editor.stageSearchViewDraft(nil) }
                } else {
                    editor.notice = "Created ‘\(view.name.trimmingCharacters(in: .whitespacesAndNewlines))’."
                }
            } catch {
                if naming { self.error = LibraryMessages.failure(error) }
            }
        }
    }
}
#endif
