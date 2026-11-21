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
        case .stored: Text("Downloaded on this Mac").foregroundStyle(MacReadableSecondaryStyle())
        case .queued: Text("Download queued").foregroundStyle(MacReadableSecondaryStyle())
        case .transferring: Text("Downloading on this Mac").foregroundStyle(MacReadableSecondaryStyle())
        case .failed:
            FailureFeedback(message: FailureOperation.download.message, indexedElsewhere: true) { app.download(id) }
        case nil: Text("Not downloaded on this Mac").foregroundStyle(MacReadableSecondaryStyle())
        }
        if let error = app.downloadError {
            FailureFeedback(message: error, retryTitle: "Retry Download") { app.retryDownloadFailure() }
                .environment(\.podListRecoveryIndexed, false)
        }
    }
}
struct DownloadIcon: SwiftUI.View {
    let id: String
    @Bindable var app: ApplicationModel
    private var phase: DownloadPhase? { app.downloadStatuses[id]?.phase }
    private var working: Bool { phase == .transferring || phase == .queued }
    private var label: String {
        working ? (phase == .queued ? "Cancel download, queued" : "Cancel download, downloading") : phase == .stored ? "Remove download, downloaded on this Mac" : phase == .failed ? "Retry download, failed" : "Download, not downloaded"
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
            }.frame(width: 28, height: 28).contentShape(Rectangle())
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
    var compact = false
    private var rule: DownloadRule? {
        library.state.downloadRules.first { $0.subscriptionId == subscriptionID && $0.deviceId == library.deviceID }
    }
    var body: some SwiftUI.View {
        DownloadRuleFields(mode: Binding(get: { rule?.mode ?? .never }, set: {
            app.setDownloadRule(subscription: subscriptionID, mode: $0, cap: rule?.keepAtMost)
        }), cap: Binding(get: { rule?.keepAtMost }, set: {
            app.setDownloadRule(subscription: subscriptionID, mode: rule?.mode ?? .allNew, cap: $0)
        }), compact: compact)
    }
}
struct DownloadRuleFields: SwiftUI.View {
    @Binding var mode: DownloadMode
    @Binding var cap: Int64?
    var compact = false
    var body: some SwiftUI.View {
        VStack(alignment: .leading) {
            field(compact ? "Download Rule" : "Download Rule on This Mac") {
                Picker(compact ? "Download Rule on This Mac" : "", selection: $mode) {
                    Text("Stream").tag(DownloadMode.never)
                    Text("When Episodes become an Entry").tag(DownloadMode.onEntry)
                    Text("As Episodes are published").tag(DownloadMode.allNew)
                }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("downloadRule.mode")
            }
            if mode == .allNew {
                field("Keep") {
                    Picker(compact ? "Keep" : "", selection: $cap) {
                        Text("All").tag(nil as Int64?)
                        ForEach([1, 5, 10, 20, 50, 100] as [Int64], id: \.self) { Text("\($0) newest").tag(Optional($0)) }
                        if let cap, cap > 0, ![1, 5, 10, 20, 50, 100].contains(cap) { Text("\(cap) newest").tag(Optional(cap)) }
                    }.labelsHidden().frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }.macContentFont(.body)
    }

    @ViewBuilder private func field<Content: SwiftUI.View>(_ label: String,
                                                          @ViewBuilder content: @escaping () -> Content) -> some SwiftUI.View {
        if compact {
            HStack(spacing: 8) {
                Text(label).lineLimit(1).accessibilityHidden(true)
                content()
            }
        } else {
            PodListSheetField(label, content: content)
        }
    }
}
struct BulkDownloadRuleSheet: SwiftUI.View {
    let ids: [String]
    let app: ApplicationModel
    var body: some SwiftUI.View {
        if let editing = app.editing, let library = app.library {
            BulkDownloadRuleEditor(ids: ids, library: library, editing: editing)
        }
    }
}

private struct BulkDownloadRuleEditor: SwiftUI.View {
    @Environment(\.libraryEditOrigin) private var origin
    let editing: PlaylistEditingModel
    @State private var draft: BulkDownloadRulesDraft
    @State private var saving = false
    @Environment(\.dismiss) private var dismiss
    init(ids: [String], library: LibraryModel, editing: PlaylistEditingModel) {
        self.editing = editing
        _draft = State(initialValue: editing.drafts.bulkDownloadRules(ids: ids, deviceID: library.deviceID,
                                                                    rules: library.state.downloadRules))
    }
    var body: some SwiftUI.View {
        PodListSheet(title: "Download Rules for \(CountText.format(draft.subscriptionIDs.count, .subscription))", width: 520,
                     actionTitle: "Apply", actionEnabled: !saving && !draft.subscriptionIDs.isEmpty,
                     cancelEnabled: !saving, cancel: cancel, action: apply) {
            Text("Apply one rule to all selected Subscriptions on this Mac.").macContentFont(.caption).foregroundStyle(MacReadableSecondaryStyle())
            DownloadRuleFields(mode: Binding(get: { draft.mode }, set: { draft.mode = $0; editing.drafts.stage(draft) }),
                               cap: Binding(get: { draft.cap }, set: { draft.cap = $0; editing.drafts.stage(draft) })).disabled(saving)
        } status: {
            if let failure = draft.failure { FailureFeedback(message: failure, retryTitle: "Retry Saving Download Rules", retry: apply).disabled(saving) }
        }
        .interactiveDismissDisabled(saving)
        .focusedSceneValue(\.podListPanelActions, MenuActionContext(actions: [
            .cancel: saving ? nil : { cancel() }, .apply: saving ? nil : { apply() }
        ].compactMapValues { $0 }))
    }
    private func cancel() { editing.drafts.remove(draft.field); dismiss() }
    private func apply() {
        guard !saving else { return }
        saving = true
        EditOrigin.start(origin) {
            if await draft.apply(using: editing) { dismiss() }
            else {
                draft = editing.drafts.bulkDownloadRules(ids: draft.subscriptionIDs, deviceID: draft.deviceID, rules: draft.originalRules)
            }
            saving = false
        }
    }
}
#endif
