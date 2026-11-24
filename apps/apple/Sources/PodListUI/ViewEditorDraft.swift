import Foundation
import PodListDomain

struct ViewEditorDraft: Codable, Equatable, Sendable {
    enum Field: String, Codable {
        case name, published, podcasts, mentions, played, starred, playlist, minimumLength, maximumLength, sort, limit

        func copy(from source: PodListDomain.View, into target: inout PodListDomain.View) {
            switch self {
            case .name: target.name = source.name
            case .published: target.filter.published = source.filter.published
            case .podcasts: target.filter.podcasts = source.filter.podcasts
            case .mentions: target.filter.text = source.filter.text
            case .played: target.filter.played = source.filter.played
            case .starred: target.filter.starred = source.filter.starred
            case .playlist: target.filter.notInAnyPlaylist = source.filter.notInAnyPlaylist
            case .minimumLength: target.filter.minDuration = source.filter.minDuration
            case .maximumLength: target.filter.maxDuration = source.filter.maxDuration
            case .sort: target.sort = source.sort
            case .limit: target.limit = source.limit
            }
        }
    }

    private(set) var value: PodListDomain.View
    private(set) var touched: Set<Field> = []
    private(set) var numbers: [Field: String] = [:]

    init(_ value: PodListDomain.View) { self.value = value }

    mutating func edit(_ field: Field, _ mutation: (inout PodListDomain.View) -> Void) {
        var next = value
        mutation(&next)
        guard next != value else { return }
        value = next
        touched.insert(field)
    }

    mutating func clearNumber(_ field: Field) { numbers[field] = nil }

    mutating func setNumber(_ text: String, for field: Field, locale: Locale) {
        numbers[field] = text
        touched.insert(field)
        let empty = text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        switch field {
        case .published:
            if let days = FormNumbers.lastDays(text, locale: locale) { value.filter.published = .lastDays(days: days) }
        case .limit:
            if empty { value.limit = nil }
            else if let limit = FormNumbers.positiveCount(text, locale: locale) { value.limit = limit }
        case .minimumLength, .maximumLength:
            let seconds = FormNumbers.seconds(fromMinutes: text, locale: locale)
            if empty || seconds != nil {
                if field == .minimumLength { value.filter.minDuration = seconds }
                else { value.filter.maxDuration = seconds }
            }
        default: break
        }
    }

    func merging(into current: PodListDomain.View) -> PodListDomain.View {
        var merged = current
        for field in touched { field.copy(from: value, into: &merged) }
        return merged
    }

    mutating func receive(_ current: PodListDomain.View) {
        value = merging(into: current)
    }
}

@MainActor extension LibraryEditingModel {
    func viewDraft(for view: PodListDomain.View, in windowID: String, creating: Bool, locale: Locale = .current) -> ViewEditorDraft {
        let field = viewDraftField(view.id, in: windowID)
        if let stored = draft(field).data(using: .utf8),
           var restored = try? JSONDecoder().decode(ViewEditorDraft.self, from: stored) {
            if !creating { restored.receive(view) }
            return restored
        }
        var restored = ViewEditorDraft(view)
        let id = view.id
        if let stored = draft("view.\(id)").data(using: .utf8),
           let legacy = try? JSONDecoder().decode(PodListDomain.View.self, from: stored) {
            // Existing Views saved valid changes live. Migrate only numeric buffers
            // and names for them, since the old snapshot has no record of touched fields.
            if creating { restored = ViewEditorDraft(legacy) }
        }
        if hasDraft("rename.\(id)") {
            restored.edit(.name) { $0.name = draft("rename.\(id)") }
        }
        for (number, legacyKey) in [(ViewEditorDraft.Field.published, "days.\(id)"), (.limit, "limit.\(id)"),
                                    (.minimumLength, "\(id).Minimum length (minutes)"),
                                    (.maximumLength, "\(id).Maximum length (minutes)")] where hasDraft(legacyKey) {
            restored.setNumber(draft(legacyKey), for: number, locale: locale)
        }
        if creating || !restored.touched.isEmpty { stageViewDraft(restored, in: windowID) }
        clearViewDrafts(id, creating: creating)
        return restored
    }

    func stageViewDraft(_ value: ViewEditorDraft, in windowID: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        setDraft(String(decoding: data, as: UTF8.self), field: viewDraftField(value.value.id, in: windowID))
    }

    func discardViewDraft(_ id: String, in windowID: String, creating: Bool) {
        clearDraft(viewDraftField(id, in: windowID))
        if creating { clearDraft("newViewID.\(windowID)") }
    }

    private func viewDraftField(_ id: String, in windowID: String) -> String { "viewDraft.\(windowID).\(id)" }
}
