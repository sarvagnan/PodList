#if os(macOS)
import SwiftUI
import PodListData
import PodListDomain

/// Shared eligibility and execution for the Inspector, context menus and menu bar.
/// A mixed selection applies the command only to its eligible Episodes.
enum EpisodeDownloadAction: CaseIterable {
    case download, cancel, retry, remove
    var title: String {
        switch self {
        case .download: "Download"
        case .cancel: "Cancel Download"
        case .retry: "Retry Download"
        case .remove: "Remove Download"
        }
    }
    func accepts(_ phase: DownloadPhase?) -> Bool {
        switch self {
        case .download: phase == nil
        case .cancel: phase == .queued || phase == .transferring || phase == .failed
        case .retry: phase == .failed
        case .remove: phase == .stored
        }
    }
    static func primary(for phase: DownloadPhase?) -> Self {
        switch phase {
        case .queued, .transferring: .cancel
        case .stored: .remove
        case .failed: .retry
        case nil: .download
        }
    }
    func targets(in ids: [String], phase: (String) -> DownloadPhase?) -> [String] {
        var seen = Set<String>()
        return ids.filter { seen.insert($0).inserted && accepts(phase($0)) }
    }
    static func available(in ids: [String], phase: (String) -> DownloadPhase?) -> [Self] {
        allCases.filter { !$0.targets(in: ids, phase: phase).isEmpty }
    }
    @MainActor func perform(_ ids: [String], app: ApplicationModel) {
        for id in targets(in: ids, phase: { app.downloadStatuses[$0]?.phase }) {
            switch self {
            case .download, .retry: app.download(id)
            case .cancel, .remove: app.removeDownload(id)
            }
        }
    }
}

struct EpisodeDownloadItems: SwiftUI.View {
    let ids: [String]
    @Bindable var app: ApplicationModel
    var keyboardShortcuts = false
    var body: some SwiftUI.View {
        ForEach(keyboardShortcuts ? EpisodeDownloadAction.allCases
                : EpisodeDownloadAction.available(in: ids, phase: { app.downloadStatuses[$0]?.phase }), id: \.self) { action in
            Button(action.title) { action.perform(ids, app: app) }
                .keyboardShortcut(action == .download && keyboardShortcuts ? PodListShortcut.download.shortcut : nil)
                .disabled(action.targets(in: ids, phase: { app.downloadStatuses[$0]?.phase }).isEmpty)
        }
    }
}

struct DownloadStatusText: SwiftUI.View {
    let id: String
    @Bindable var app: ApplicationModel
    var body: some SwiftUI.View {
        switch app.downloadStatuses[id]?.phase {
        case .stored: Text("Downloaded on this Device").foregroundStyle(MacReadableSecondaryStyle())
        case .queued: Text("Download queued").foregroundStyle(MacReadableSecondaryStyle())
        case .transferring: Text("Downloading on this Device").foregroundStyle(MacReadableSecondaryStyle())
        case .failed:
            FailureFeedback(message: FailureOperation.download.message) { app.download(id) }
        case nil: Text("Not downloaded on this Device").foregroundStyle(MacReadableSecondaryStyle())
        }
        if let error = app.downloadError { FailureFeedback(message: error) { app.retryDownloadFailure() } }
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
            EpisodeDownloadAction.primary(for: phase).perform([id], app: app)
        } label: {
            ZStack {
                if working {
                    ProgressView(value: app.downloadStatuses[id]?.progress.fraction).progressViewStyle(.circular).controlSize(.small)
                    Image(systemName: "xmark").font(.system(size: 8))
                } else { Image(systemName: phase == .stored ? "arrow.down.circle.fill" : phase == .failed ? "arrow.clockwise.circle" : "arrow.down.circle") }
            }.frame(width: 28, height: 28)
        }.buttonStyle(.borderless).help(label).accessibilityLabel(label)
            .contextMenu {
                EpisodeDownloadItems(ids: [id], app: app)
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
            Picker("Download Rule on This Device", selection: $mode) {
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
        }.macContentFont(.subheadline)
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
        PodListSheet(title: "Download Rules for \(CountText.format(ids.count, .subscription))", width: 520,
                     actionTitle: "Apply", actionEnabled: !saving && !ids.isEmpty,
                     cancelEnabled: !saving, cancel: { dismiss() }, action: apply) {
            Text("Apply one rule to all selected Subscriptions on this Device.").foregroundStyle(MacReadableSecondaryStyle())
            DownloadRuleFields(mode: $mode, cap: $cap).disabled(saving)
        } status: {
            if let editing = app.editing { EditingFeedback(editing: editing, retry: apply) }
        }
        .interactiveDismissDisabled(saving)
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .cancel: saving ? nil : { dismiss() }, .apply: saving ? nil : { apply() }
        ].compactMapValues { $0 }))
    }
    private func apply() {
        guard !saving else { return }
        saving = true
        Task { if await app.setDownloadRules(subscriptions: ids, mode: mode, cap: cap) { dismiss() }; saving = false }
    }
}
#endif
