#if os(macOS)
import SwiftUI

struct OPMLImportContent: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    let choose: () -> Void
    var inSheet = false
    var showsFileChooser = true
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Closing this window does not stop the import. Progress stays in Library. Keep PodList running. Unfinished imports resume on next launch unless you cancel.").macContentFont(.callout).fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 480, alignment: .leading)
            if !editor.importName.isEmpty { Text(editor.importName).bold() }
            if editor.importPaused && !editor.busy {
                Text(editor.cancelledImportSummary).fixedSize(horizontal: false, vertical: true)
            }
            if editor.importReady {
                if !editor.importPaused {
                    Text("\(CountText.format(editor.importTotal, .podcast)); \(editor.importExisting) already in the Library.")
                }
                if !inSheet { HStack {
                    Button("Import") { editor.startImport() }.keyboardShortcut(inSheet ? .defaultAction : nil).disabled(editor.importTotal == 0)
                    if showsFileChooser { Button("Choose a Different File…", action: choose) }
                    Button("Cancel", action: cancelImport)
                } }
            } else if !editor.busy && showsFileChooser { Button("Choose a File…", action: choose) }
            if editor.busy { OPMLImportProgress(editor: editor) }
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
        .focusedSceneValue(\.podListImportActions, MenuActionContext(actions: [
            .importSelection: editor.importReady && editor.importTotal > 0 ? { editor.startImport() } : nil,
            .chooseFile: editor.importReady || !editor.busy ? choose : nil,
            .cancelImport: editor.busy && !editor.importCancellationRequested ? { editor.cancelImport() } : nil,
            .retryImport: !editor.importFailed.isEmpty && !editor.busy ? { Task { await editor.retryImport() } } : nil
        ].compactMapValues { $0 }))
    }
    private func cancelImport() { editor.cancelImportSelection(); editor.importPresented = false }
}

/// Identical count progress and cancellation policy in the sheet and Library.
struct OPMLImportProgress: SwiftUI.View {
    @Bindable var editor: LibraryEditingModel
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 8) {
            ProgressView(value: Double(editor.importCompleted), total: Double(max(1, editor.importTotal))) {
                Text("Importing \(editor.importCompleted) of \(editor.importTotal)")
            }.progressViewStyle(.linear)
            Text("Cancel finishes the current podcast and keeps completed imports. Choose Import later to continue the remainder.")
                .macContentFont(.caption).fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 480, alignment: .leading)
            Button(editor.importCancellationRequested ? "Cancelling after Current Podcast…" : "Cancel Import") { editor.cancelImport() }
                .disabled(editor.importCancellationRequested)
        }
        .focusedSceneValue(\.podListImportActions, MenuActionContext(actions: [
            .cancelImport: editor.importCancellationRequested ? nil : { editor.cancelImport() }
        ].compactMapValues { $0 }))
    }
}
#endif
