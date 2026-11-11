#if os(macOS)
import SwiftUI
import PodListDomain

struct SearchViewCreation: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let library: LibraryModel
    let query: String
    let count: Int
    let created: (String) -> Void
    @State private var naming = false
    @State private var name = ""
    @State private var saving = false
    @State private var error: String?
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(count) results")
                Spacer()
                if !naming { Button("Create View…") { name = editor.draft("searchView.name"); if name.isEmpty { name = query }; naming = true; editor.setDraft("true", field: "searchView.open") }.disabled(query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }
            }
            if naming {
                HStack {
                    TextField("View name", text: $name).onChange(of: name) { _, text in editor.setDraft(text, field: "searchView.name"); error = nil }.onSubmit { save() }
                    Button("Cancel") { naming = false; editor.setDraft("", field: "searchView.open"); editor.setDraft("", field: "searchView.name") }
                    Button("Create View") { save() }.disabled(saving)
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
        }.padding().onAppear { naming = editor.draft("searchView.open") == "true"; name = editor.draft("searchView.name") }
    }
    private func save() {
        guard !saving else { return }
        if let problem = ViewNames.problem(name, views: library.state.views) { error = problem; return }
        saving = true
        let view = PodListDomain.View(id: UUID().uuidString, name: name, filter: .init(text: query), sort: .publishedDesc, limit: nil)
        Task {
            do {
                try await editor.saveView(view)
                editor.setDraft("", field: "searchView.open"); editor.setDraft("", field: "searchView.name")
                created(view.id)
            } catch { self.error = LibraryMessages.failure(error) }
            saving = false
        }
    }
}
#endif
