#if os(macOS)
import SwiftUI

struct OPMLImportContent: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let choose: () -> Void
    var inSheet = false
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Closing Add Podcasts or this window does not stop the import. Progress stays in Library. Keep PodList running. Unfinished imports resume on next launch.").macContentFont(.callout).fixedSize(horizontal: false, vertical: true)
            if !editor.importName.isEmpty { Text(editor.importName).bold() }
            if editor.importReady {
                Text("\(CountText.format(editor.importTotal, .podcast)); \(editor.importExisting) already in the Library.")
                HStack {
                    Button("Import") { editor.startImport() }.keyboardShortcut(inSheet ? .defaultAction : nil).disabled(editor.importTotal == 0)
                    Button("Choose a Different File…", action: choose)
                    Button("Cancel") { editor.cancelImportSelection(); editor.importPresented = false }
                }
            } else if !editor.busy { Button("Choose a File…", action: choose) }
            if editor.busy { ProgressView("Importing \(editor.importCompleted) of \(editor.importTotal)") }
            if !editor.importFeeds.isEmpty {
                ScrollView {
                    VStack(alignment: .leading) {
                        ForEach(editor.importFeeds, id: \.self) { feed in
                            Text("\(feed): \(editor.importResults[feed] ?? "Waiting")\(editor.importFailureReasons[feed].map { ": " + $0 } ?? "")").textSelection(.enabled)
                        }
                    }
                }.frame(height: min(220, CGFloat(editor.importFeeds.count) * 44))
            }
            if let error = editor.error { Text(error).foregroundStyle(Color.podListError) }
            if !editor.importFailed.isEmpty { Button("Retry Failed Imports") { Task { await editor.retryImport() } }.disabled(editor.busy) }
        }
    }
}
#endif
