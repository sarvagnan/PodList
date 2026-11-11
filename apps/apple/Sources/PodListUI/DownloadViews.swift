#if os(macOS)
import SwiftUI
import PodListData
import PodListDomain

struct DownloadActions: SwiftUI.View {
    let id: String
    @Bindable var app: ApplicationModel
    var body: some SwiftUI.View {
        VStack(alignment: .leading, spacing: 8) {
            switch app.downloadStatuses[id]?.phase {
            case .stored:
                Label("Downloaded on this Device", systemImage: "arrow.down.circle.fill")
                Button("Remove download") { app.removeDownload(id) }
            case .transferring, .queued:
                let status = app.downloadStatuses[id]
                ProgressView(value: status?.progress.fraction)
                Text(status?.phase == .queued ? "Queued" : "Downloading \(ByteCountFormatter.string(fromByteCount: status?.received ?? 0, countStyle: .file))")
                Button("Cancel download") { app.removeDownload(id) }
            case .failed:
                Label("Download failed", systemImage: "exclamationmark.circle")
                if let error = app.downloadStatuses[id]?.error { Text(error).font(.caption).foregroundStyle(.secondary) }
                Button("Retry download") { app.download(id) }
                Button("Cancel download") { app.removeDownload(id) }
            case nil:
                Text("Not downloaded on this Device").foregroundStyle(.secondary)
                Button("Download", systemImage: "arrow.down.circle") { app.download(id) }
            }
            if let error = app.downloadError { Text(error).foregroundStyle(.red) }
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
        HStack {
            Picker("Download Rule on this Device", selection: Binding(get: { rule?.mode ?? .never }, set: {
                app.setDownloadRule(subscription: subscriptionID, mode: $0, cap: rule?.keepAtMost)
            })) {
                Text("Stream").tag(DownloadMode.never)
                Text("When Episodes become an Entry").tag(DownloadMode.onEntry)
                Text("As Episodes are published").tag(DownloadMode.allNew)
            }.frame(maxWidth: 450)
            if rule?.mode == .allNew {
                Picker("Keep", selection: Binding<Int64>(get: { rule?.keepAtMost ?? -1 }, set: {
                    app.setDownloadRule(subscription: subscriptionID, mode: .allNew, cap: $0 < 0 ? nil : $0)
                })) {
                    Text("All").tag(Int64(-1))
                    ForEach([1, 5, 10, 20, 50, 100] as [Int64], id: \.self) { Text("\($0) newest").tag($0) }
                    if let cap = rule?.keepAtMost, cap > 0, ![1, 5, 10, 20, 50, 100].contains(cap) { Text("\(cap) newest").tag(cap) }
                }.frame(maxWidth: 190)
            }
        }.font(.subheadline)
    }
}
#endif
