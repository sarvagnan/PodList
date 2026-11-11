#if os(macOS)
import SwiftUI

struct OPMLImportContent: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let choose: () -> Void
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Closing Add podcasts or this window does not stop the import. Progress stays in Library. Keep PodList running. Unfinished imports resume on next launch.").font(.callout)
            if !editor.importName.isEmpty { Text(editor.importName).bold() }
            if editor.importReady {
                Text("\(editor.importTotal) podcasts; \(editor.importExisting) already in the Library.")
                HStack {
                    Button("Import") { editor.startImport() }.disabled(editor.importTotal == 0)
                    Button("Choose a different file…", action: choose)
                    Button("Cancel") { editor.cancelImportSelection(); editor.importPresented = false }
                }
            } else if !editor.busy { Button("Choose a file…", action: choose) }
            if editor.busy { ProgressView("Importing \(editor.importCompleted) of \(editor.importTotal)") }
            ScrollView {
                VStack(alignment: .leading) {
                    ForEach(editor.importFeeds, id: \.self) { feed in
                        Text("\(feed): \(editor.importResults[feed] ?? "Waiting")\(editor.importFailureReasons[feed].map { ": " + $0 } ?? "")").textSelection(.enabled)
                    }
                }
            }.frame(maxHeight: 220)
            if let error = editor.error { Text(error).foregroundStyle(.red) }
            if !editor.importFailed.isEmpty { Button("Retry failed imports") { Task { await editor.retryImport() } }.disabled(editor.busy) }
        }
    }
}
#endif
