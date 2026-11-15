import Foundation
import Testing
import PodListDomain
import PodListData
@testable import PodListUI

@Test(arguments: ["en_US", "de_DE", "fr_FR", "hi_IN"])
func numberDraftsFormatAndParseInTheirLocale(_ identifier: String) throws {
    let locale = Locale(identifier: identifier)
    for value in [0, 1.5, 1200.25, 1.0 / 3] {
        let formatted = FormNumbers.string(value, locale: locale)
        let parsed = try #require(FormNumbers.nonnegative(formatted, locale: locale))
        #expect(abs(value - parsed) < 0.000_000_000_001)
    }
    #expect(FormNumbers.nonnegative("  " + FormNumbers.string(1.5, locale: locale) + "  ", locale: locale) == 1.5)
}

@Test func commaDecimalMinutesAreConvertedToSeconds() {
    let locale = Locale(identifier: "de_DE")
    #expect(FormNumbers.nonnegative("1,5", locale: locale) == 1.5)
    #expect(FormNumbers.seconds(fromMinutes: "1,5", locale: locale) == 90)
    #expect(FormNumbers.string(1.5, locale: locale) == "1,5")
    #expect(FormNumbers.nonnegative("1.5", locale: locale) == nil)
}

@Test(arguments: ["", " ", "-", "-1", "NaN", "∞", "1.5 minutes", "1.2.3", "1,5"])
func invalidNumberDraftsAreNotSilentlyCoerced(_ raw: String) {
    #expect(FormNumbers.nonnegative(raw, locale: Locale(identifier: "en_US")) == nil)
}

@Test func optionalMinuteValidationNamesTheOffendingField() {
    let locale = Locale(identifier: "en_US")
    #expect(FormNumbers.minutesProblem("", label: "Minimum length", locale: locale) == nil)
    #expect(FormNumbers.minutesProblem(" ", label: "Maximum length", locale: locale) == nil)
    #expect(FormNumbers.minutesProblem("0", label: "Minimum length", locale: locale) == nil)
    #expect(FormNumbers.minutesProblem("-1", label: "Minimum length", locale: locale) == "Minimum length must be a nonnegative number of minutes.")
    #expect(FormNumbers.minutesProblem("draft", label: "Maximum length", locale: locale) == "Maximum length must be a nonnegative number of minutes.")
}

@Test func viewValidationAssociatesErrorsWithTheirFieldsAndClearsCorrectedErrors() {
    var view = PodListDomain.View(id: "test", name: "Test", filter: .init(minDuration: 120, maxDuration: 60), sort: .publishedDesc, limit: 0)
    var errors = ViewEdits.problems(view)
    #expect(errors[.minimumLength]?.contains("Minimum length") == true)
    #expect(errors[.maximumLength]?.contains("Maximum length") == true)
    #expect(errors[.show] == "Show must be a positive whole number.")
    view.filter.maxDuration = 180; view.limit = 10
    #expect(ViewEdits.problems(view).isEmpty)
    view.filter.minDuration = -.infinity; view.filter.maxDuration = .nan
    errors = ViewEdits.problems(view)
    #expect(errors[.minimumLength] != nil && errors[.maximumLength] != nil)
    view.filter.minDuration = nil; view.filter.maxDuration = nil
    view.filter.published = .between(from: 20, to: 10)
    #expect(ViewEdits.problems(view)[.published] == "From must be before Through.")
}

@MainActor @Test func settingsFailuresNameTheSettingKeepDraftsAndCanBeRetried() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let edits = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let draft = GeneralSettingsEdits(playback: .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false), trashDays: 30)
    draft.playback.speed = -1
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Speed", using: edits)
    await draft.waitForPendingEdits()
    #expect(draft.playback.speed == -1)
    #expect(draft.failures["Speed"]?.contains("Could not save Speed.") == true)
    #expect(draft.failures["Speed"]?.contains("Your draft is kept.") == true)
    #expect(try await db.loadState().playbackSettings.speed == 1)
    draft.reconcile(playback: try await db.loadState().playbackSettings, trashDays: 30)
    #expect(draft.playback.speed == -1 && draft.failures["Speed"] != nil)

    draft.playback.speed = 1.5
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Speed", using: edits)
    await draft.waitForPendingEdits()
    #expect(draft.failures.isEmpty)
    #expect(try await db.loadState().playbackSettings.speed == 1.5)

    draft.trashDays = -1
    draft.save(.setTrashDays(days: draft.trashDays), setting: "Keep Playlists in Trash", using: edits)
    await draft.waitForPendingEdits()
    #expect(draft.trashDays == -1)
    #expect(draft.failures["Keep Playlists in Trash"]?.contains("Could not save Keep Playlists in Trash.") == true)
    draft.reconcile(playback: draft.playback, trashDays: 30)
    #expect(draft.trashDays == -1)
    draft.trashDays = 7
    draft.save(.setTrashDays(days: draft.trashDays), setting: "Keep Playlists in Trash", using: edits)
    await draft.waitForPendingEdits()
    #expect(draft.failures.isEmpty)
    #expect(try await db.loadState().trashDays == 7)
    draft.reconcile(playback: .init(speed: 2, skipIntro: 5, skipOutro: 10, volumeBoost: true), trashDays: 14)
    #expect(draft.playback.speed == 2 && draft.trashDays == 14)
}

@MainActor @Test func rapidSettingsEditsAreSavedInOrder() async throws {
    let db = try LocalDatabase(path: ":memory:", standalone: true)
    try await db.ensureState()
    let edits = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: UUID().uuidString))
    let draft = GeneralSettingsEdits(playback: .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false), trashDays: 30)
    draft.playback.skipIntro = 1.5
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Skip intro", using: edits)
    draft.playback.skipOutro = 2.5
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Skip outro", using: edits)
    draft.save(.setTrashDays(days: 7), setting: "Keep Playlists in Trash", using: edits)
    draft.reconcile(playback: .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false), trashDays: 30)
    #expect(draft.playback.skipIntro == 1.5 && draft.playback.skipOutro == 2.5)
    await draft.waitForPendingEdits()
    let saved = try await db.loadState()
    #expect(saved.playbackSettings.skipIntro == 1.5 && saved.playbackSettings.skipOutro == 2.5)
    #expect(saved.trashDays == 7 && draft.failures.isEmpty)
}
