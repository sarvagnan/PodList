import Foundation
import Testing
import PodListDomain
import PodListData
@testable import PodListUI

@MainActor @Test func failedGeneralSettingsRestoreAfterRelaunchAndRetry() async throws {
    let suite = UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let db = try await fixtureDatabase()
    let state = try await db.loadState()
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "library", defaults: defaults))
    var release: CheckedContinuation<Void, Never>?
    let otherEdit = Task {
        try await editing.performExternal {
            await withCheckedContinuation { release = $0 }
            return nil
        }
    }
    while release == nil { await Task.yield() }
    #expect(editing.busy)
    let draft = GeneralSettingsEdits(playback: state.playbackSettings, trashDays: 30, drafts: editing.drafts)
    draft.playback = .init(speed: 1.75, skipIntro: 30, skipOutro: 15, volumeBoost: true)
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Speed", using: editing)
    draft.playback.skipIntro = 45
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Skip Intro", using: editing)
    draft.trashDays = 7
    draft.save(.setTrashDays(days: draft.trashDays), setting: "Keep Playlists in Trash", using: editing)
    // The journal exists before either asynchronous save has even run.
    let pending = GeneralSettingsEdits(playback: state.playbackSettings, trashDays: 30,
                                     drafts: PlaylistDrafts(scope: "library", defaults: defaults))
    #expect(pending.playback == draft.playback && pending.trashDays == 7)
    #expect(pending.failures["Speed"]?.contains("Retry") == true)
    #expect(PlaylistDrafts(scope: "other-library", defaults: defaults).generalSettings(GeneralSettingsDraft.playbackField) == nil)
    await draft.waitForPendingEdits()
    #expect(draft.failures["Speed"] != nil)
    #expect(draft.failures["Keep Playlists in Trash"] != nil)
    release?.resume()
    _ = try await otherEdit.value
    let saved = try await db.loadState()
    let retryEditor = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "library", defaults: try #require(UserDefaults(suiteName: suite))))
    let relaunched = GeneralSettingsEdits(playback: saved.playbackSettings, trashDays: 30, drafts: retryEditor.drafts)
    #expect(relaunched.playback == draft.playback && relaunched.trashDays == 7)
    #expect(relaunched.failures["Speed"]?.contains("Retry") == true)
    #expect(relaunched.failures["Skip Intro"]?.contains("Could not save Skip Intro.") == true)
    relaunched.reconcile(playback: saved.playbackSettings, trashDays: 30)
    #expect(relaunched.playback.speed == 1.75)
    relaunched.save(.setPlaybackSettings(settings: relaunched.playback), setting: "Speed", using: retryEditor)
    relaunched.save(.setTrashDays(days: relaunched.trashDays), setting: "Keep Playlists in Trash", using: retryEditor)
    await relaunched.waitForPendingEdits()
    #expect(try await db.loadState().playbackSettings == draft.playback)
    #expect(try await db.loadState().trashDays == 7)
    #expect(relaunched.failures.isEmpty)
    #expect(PlaylistDrafts(scope: "library", defaults: defaults)[GeneralSettingsDraft.playbackField].isEmpty)
    #expect(PlaylistDrafts(scope: "library", defaults: defaults)[GeneralSettingsDraft.trashField].isEmpty)
}

@MainActor @Test func earlierSettingsSuccessCannotClearANewerPendingChoice() async throws {
    let suite = UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let db = try await fixtureDatabase()
    let state = try await db.loadState()
    var releases: [CheckedContinuation<Void, Never>] = []
    let editing = PlaylistEditingModel(database: db, drafts: PlaylistDrafts(scope: "library", defaults: defaults), changed: {
        await withCheckedContinuation { releases.append($0) }
    })
    let draft = GeneralSettingsEdits(playback: state.playbackSettings, trashDays: 30, drafts: editing.drafts)
    draft.playback.speed = 1.5
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Speed", using: editing)
    draft.playback.speed = 2
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Speed", using: editing)
    while releases.isEmpty { await Task.yield() }
    releases[0].resume()
    while releases.count < 2 { await Task.yield() }
    let journal = PlaylistDrafts(scope: "library", defaults: defaults).generalSettings(GeneralSettingsDraft.playbackField)
    #expect(journal?.change == .setPlaybackSettings(settings: draft.playback))
    #expect(journal?.original == .setPlaybackSettings(settings: state.playbackSettings))
    releases[1].resume()
    await draft.waitForPendingEdits()
    #expect(try await db.loadState().playbackSettings.speed == 2)
    #expect(PlaylistDrafts(scope: "library", defaults: defaults)[GeneralSettingsDraft.playbackField].isEmpty)
}

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

@Test(arguments: ["en_US", "de_DE", "fr_FR", "hi_IN"])
func episodeCountDraftsAcceptOnlyPositiveWholeNumbers(_ identifier: String) {
    let locale = Locale(identifier: identifier)
    for value in [Int64(1), 1200, Int64.max] {
        let formatted = value.formatted(.number.locale(locale).grouping(.never))
        #expect(FormNumbers.positiveCount(formatted, locale: locale) == value)
        #expect(FormNumbers.countProblem(formatted, locale: locale) == nil)
    }
    for raw in ["0", "-1", "1.5", "1,5", "1 Episode", "9223372036854775808"] {
        #expect(FormNumbers.positiveCount(raw, locale: locale) == nil)
        #expect(FormNumbers.countProblem(raw, locale: locale) == "Episodes to show must be a positive whole number.")
    }
    for raw in ["", "  "] { #expect(FormNumbers.countProblem(raw, locale: locale) == nil) }
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
    #expect(errors[.show] == "Episodes to show must be a positive whole number.")
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
    let draft = GeneralSettingsEdits(playback: .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false), trashDays: 30, drafts: edits.drafts)
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
    let draft = GeneralSettingsEdits(playback: .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false), trashDays: 30, drafts: edits.drafts)
    draft.playback.skipIntro = 1.5
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Skip Intro", using: edits)
    draft.playback.skipOutro = 2.5
    draft.save(.setPlaybackSettings(settings: draft.playback), setting: "Skip Outro", using: edits)
    draft.save(.setTrashDays(days: 7), setting: "Keep Playlists in Trash", using: edits)
    draft.reconcile(playback: .init(speed: 1, skipIntro: 0, skipOutro: 0, volumeBoost: false), trashDays: 30)
    #expect(draft.playback.skipIntro == 1.5 && draft.playback.skipOutro == 2.5)
    let pendingPlayback = try #require(edits.drafts.generalSettings(GeneralSettingsDraft.playbackField))
    #expect(pendingPlayback.change == .setPlaybackSettings(settings: draft.playback))
    await draft.waitForPendingEdits()
    let saved = try await db.loadState()
    #expect(saved.playbackSettings.skipIntro == 1.5 && saved.playbackSettings.skipOutro == 2.5)
    #expect(saved.trashDays == 7 && draft.failures.isEmpty)
    #expect(edits.drafts[GeneralSettingsDraft.playbackField].isEmpty && edits.drafts[GeneralSettingsDraft.trashField].isEmpty)
}

@Test func newNamesValidateOnlyAfterAnEditOrSubmitIncludingDeletingTheFirstInput() {
    for problem in [PlaylistNames.problem("", playlists: []), ViewNames.problem("", views: [])] {
        var field = FormValidationVisibility()
        #expect(problem != nil)
        #expect(field.message(problem) == nil)
        field.edited(from: "", to: "")
        #expect(field.message(problem) == nil)
        field.edited(from: "", to: "A")
        #expect(field.message(nil) == nil)
        field.edited(from: "A", to: "")
        #expect(field.message(problem) == problem)
        var submitted = FormValidationVisibility()
        submitted.submitted()
        #expect(submitted.message(problem) == problem)
    }
}

@Test(arguments: ["en_US", "de_DE", "fr_FR", "hi_IN"])
func lastDaysDraftsRequireAnEditableWholeNumberWithinRange(_ identifier: String) {
    let locale = Locale(identifier: identifier)
    for days in [Int64(1), 7, 3650] {
        let text = days.formatted(.number.locale(locale).grouping(.never))
        #expect(FormNumbers.lastDays(text, locale: locale) == days)
        #expect(FormNumbers.lastDaysProblem(text, locale: locale) == nil)
    }
    for text in ["", " ", "0", "-1", "3651", "1.5", "1,5", "seven", "9223372036854775808"] {
        #expect(FormNumbers.lastDays(text, locale: locale) == nil)
        #expect(FormNumbers.lastDaysProblem(text, locale: locale) == "Last days must be a whole number from 1 to 3650.")
    }
}

@Test func seekValidationExplainsTheRangeAfterEditingAndPreservesLocaleParsing() {
    let locale = Locale(identifier: "de_DE"), duration = 1748.0
    var visibility = FormValidationVisibility()
    #expect(visibility.message(FormNumbers.seekProblem("", duration: duration, locale: locale)) == nil)
    visibility.edited(from: "", to: "-")
    for raw in ["", "-", "-1", "NaN", "∞", "word", "1748,1"] {
        #expect(FormNumbers.seekPosition(raw, duration: duration, locale: locale) == nil)
        #expect(visibility.message(FormNumbers.seekProblem(raw, duration: duration, locale: locale)) == "Enter a time from 0:00 to 29:08 (in seconds).")
    }
    for (raw, expected) in [("0", 0.0), ("1,5", 1.5), ("1748", duration)] {
        #expect(FormNumbers.seekPosition(raw, duration: duration, locale: locale) == expected)
        #expect(visibility.message(FormNumbers.seekProblem(raw, duration: duration, locale: locale)) == nil)
    }
    #expect(FormNumbers.seekProblem("1", duration: nil, locale: locale) == "The Episode duration is unavailable.")
}

@MainActor @Test func invalidLastDaysDraftSurvivesReopeningAndClearsWithTheViewSession() async throws {
    let suite = UUID().uuidString
    let defaults = try #require(UserDefaults(suiteName: suite))
    defer { defaults.removePersistentDomain(forName: suite) }
    let db = try await fixtureDatabase()
    let editor = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "days", defaults: defaults)
    editor.setDraft("3651", field: "days.all")
    let reopened = LibraryEditingModel(database: db, source: PodcastLibrary(database: db), scope: "days", defaults: defaults)
    #expect(reopened.draft("days.all") == "3651")
    #expect(FormNumbers.lastDaysProblem(reopened.draft("days.all"), locale: Locale(identifier: "en_US")) != nil)
    reopened.clearViewDrafts("all", creating: false)
    #expect(!reopened.hasDraft("days.all"))
}
