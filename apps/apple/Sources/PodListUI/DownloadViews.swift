#if os(macOS)
import SwiftUI
import PodListData
import PodListDomain

struct DownloadStatusText: SwiftUI.View {
    let id: String
    @Bindable var app: ApplicationModel
    var body: some SwiftUI.View {
        switch app.downloadStatuses[id]?.phase {
        case .stored: Text("Downloaded on this Device").foregroundStyle(.secondary)
        case .queued: Text("Download queued").foregroundStyle(.secondary)
        case .transferring: Text("Downloading on this Device").foregroundStyle(.secondary)
        case .failed: Text(app.downloadStatuses[id]?.error ?? "Download failed").foregroundStyle(.red)
        case nil: Text("Not downloaded on this Device").foregroundStyle(.secondary)
        }
        if let error = app.downloadError { Text(error).foregroundStyle(.red) }
    }
}
struct DownloadIcon: SwiftUI.View {
    let id: String
    @Bindable var app: ApplicationModel
    private var phase: DownloadPhase? { app.downloadStatuses[id]?.phase }
    private var working: Bool { phase == .transferring || phase == .queued }
    private var label: String {
        working ? (phase == .queued ? "Cancel download, queued" : "Cancel download, downloading") : phase == .stored ? "Remove download, downloaded on this Device" : phase == .failed ? "Retry download, failed" : "Download, not downloaded"
    }
    var body: some SwiftUI.View {
        Button {
            if working || phase == .stored { app.removeDownload(id) } else { app.download(id) }
        } label: {
            ZStack {
                if working {
                    ProgressView(value: app.downloadStatuses[id]?.progress.fraction).progressViewStyle(.circular).controlSize(.small)
                    Image(systemName: "xmark").font(.system(size: 8))
                } else { Image(systemName: phase == .stored ? "arrow.down.circle.fill" : phase == .failed ? "arrow.clockwise.circle" : "arrow.down.circle") }
            }.frame(width: 28, height: 28)
        }.buttonStyle(.borderless).help(label).accessibilityLabel(label)
            .contextMenu {
                if working || phase == .failed { Button("Cancel download") { app.removeDownload(id) } }
                if phase == .failed { Button("Retry download") { app.download(id) } }
                if phase == .stored { Button("Remove download") { app.removeDownload(id) } }
            }
    }
}
struct DownloadRuleEditor: SwiftUI.View {
    let subscriptionID: String
    let library: LibraryModel
    @Bindable var app: ApplicationModel
    private var rule: DownloadRule? {
        library.state.downloadRules.first { $0.subscriptionId == subscriptionID && $0.deviceId == library.deviceID }
    }
    var body: some SwiftUI.View {
        DownloadRuleFields(mode: Binding(get: { rule?.mode ?? .never }, set: {
            app.setDownloadRule(subscription: subscriptionID, mode: $0, cap: rule?.keepAtMost)
        }), cap: Binding(get: { rule?.keepAtMost }, set: {
            app.setDownloadRule(subscription: subscriptionID, mode: rule?.mode ?? .allNew, cap: $0)
        }))
    }
}
struct DownloadRuleFields: SwiftUI.View {
    @Binding var mode: DownloadMode
    @Binding var cap: Int64?
    var body: some SwiftUI.View {
        VStack(alignment: .leading) {
            Picker("Download Rule on this Device", selection: $mode) {
                Text("Stream").tag(DownloadMode.never)
                Text("When Episodes become an Entry").tag(DownloadMode.onEntry)
                Text("As Episodes are published").tag(DownloadMode.allNew)
            }
            if mode == .allNew {
                Picker("Keep", selection: $cap) {
                    Text("All").tag(nil as Int64?)
                    ForEach([1, 5, 10, 20, 50, 100] as [Int64], id: \.self) { Text("\($0) newest").tag(Optional($0)) }
                    if let cap, cap > 0, ![1, 5, 10, 20, 50, 100].contains(cap) { Text("\(cap) newest").tag(Optional(cap)) }
                }
            }
        }.font(.subheadline)
    }
}
struct BulkDownloadRuleSheet: SwiftUI.View {
    let ids: [String]
    let app: ApplicationModel
    @State private var mode: DownloadMode = .never
    @State private var cap: Int64?
    @State private var saving = false
    @Environment(\.dismiss) private var dismiss
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Download Rules for \(ids.count) Subscriptions").font(.title2)
            Text("Apply one rule to all selected Subscriptions on this Device.").foregroundStyle(.secondary)
            DownloadRuleFields(mode: $mode, cap: $cap)
            if let editing = app.editing { EditingFeedback(editing: editing) }
            HStack {
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Spacer()
                Button("Apply") {
                    saving = true
                    Task { if await app.setDownloadRules(subscriptions: ids, mode: mode, cap: cap) { dismiss() }; saving = false }
                }.keyboardShortcut(.defaultAction)
            }
        }.padding(24).frame(width: 520).disabled(saving)
    }
}
#endif
