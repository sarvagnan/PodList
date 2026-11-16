import Foundation
import Observation
import PodListDomain

/// Settings owns its drafts and feedback even when the Library window is closed.
@MainActor @Observable
final class GeneralSettingsEdits {
    var playback: PlaybackSettings
    var trashDays: Int64
    private(set) var failures: [String: String] = [:]
    @ObservationIgnored private var pending: Task<Void, Never>?
    @ObservationIgnored private let drafts: PlaylistDrafts
    private var savedPlayback: PlaybackSettings
    private var savedTrashDays: Int64
    private var pendingCount = 0

    init(playback: PlaybackSettings, trashDays: Int64, drafts: PlaylistDrafts) {
        self.playback = playback; self.trashDays = trashDays
        savedPlayback = playback; savedTrashDays = trashDays; self.drafts = drafts
        for field in [GeneralSettingsDraft.playbackField, GeneralSettingsDraft.trashField] {
            guard let draft = drafts.generalSettings(field) else { continue }
            switch draft.change {
            case let .setPlaybackSettings(value): self.playback = value
            case let .setTrashDays(value): self.trashDays = value
            default: continue
            }
            for setting in draft.settings { failures[setting] = draft.recoveryMessage(for: setting) }
        }
    }

    func save(_ change: Change, setting: String, using editor: PlaylistEditingModel) {
        let original: Change
        if case .setPlaybackSettings = change { original = .setPlaybackSettings(settings: savedPlayback) }
        else { original = .setTrashDays(days: savedTrashDays) }
        var attempt = GeneralSettingsDraft(original: original, change: change, setting: setting)
        if let previous = drafts.generalSettings(attempt.field) {
            attempt = GeneralSettingsDraft(original: previous.original, change: change, setting: setting)
            attempt.settings = Array(Set(previous.settings + [setting])).sorted()
            attempt.failures = previous.failures
        }
        // Journal synchronously, including writes still waiting in our local queue.
        drafts.stage(attempt)
        let previous = pending
        pendingCount += 1
        pending = Task {
            await previous?.value
            defer { pendingCount -= 1 }
            let succeeded = await editor.edit([change], name: setting, reload: true)
            if succeeded {
                switch change {
                case let .setPlaybackSettings(value): savedPlayback = value
                case let .setTrashDays(value): savedTrashDays = value
                default: break
                }
            }
            guard drafts.generalSettings(attempt.field)?.id == attempt.id else { return }
            if succeeded {
                drafts.remove(attempt.field)
                failures[setting] = nil
                // Each playback change writes the complete draft, including any
                // previously failed playback fields.
                if case .setPlaybackSettings = change {
                    for field in ["Speed", "Skip Intro", "Skip Outro", "Volume Boost"] { failures[field] = nil }
                }
            } else {
                for setting in attempt.settings {
                    let message = "Could not save \(setting). \(editor.error ?? "Another Library edit is in progress.") Your draft is kept. Retry to save it."
                    attempt.failures[setting] = message
                    failures[setting] = message
                }
                drafts.stage(attempt)
            }
        }
    }

    func reconcile(playback: PlaybackSettings, trashDays: Int64) {
        guard pendingCount == 0 else { return }
        savedPlayback = playback; savedTrashDays = trashDays
        if drafts.generalSettings(GeneralSettingsDraft.playbackField) == nil { self.playback = playback }
        if drafts.generalSettings(GeneralSettingsDraft.trashField) == nil { self.trashDays = trashDays }
    }

    func waitForPendingEdits() async { await pending?.value }
}
