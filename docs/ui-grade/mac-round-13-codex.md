# PodList Mac — round 13 independent Codex UI grade

## Frame

Task: Find Episodes, organize ordered Playlist Entries, and control listening without losing the browsing context.

Target: Native Mac app, macOS 26+; reviewed commit `a13f92a`. Evidence was captured on a macOS 27.2 VM, not this host.

Posture: Sovereign personal library with background playback and transient editing tasks.

Audience: Perpetual intermediate; newcomers need the distinction between Views, Episodes and Playlist Entries explained once.

Nearest exemplar: Things for a calm personal working surface; BBEdit for command coverage and preservation of work. These are craft references, not appearance targets. The supplied [Things list reference](/Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/02-project-headings.png) and [Settings reference](/Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/20-settings-general.png) were inspected. No current Apple Mac comparison image was supplied; a literal side-by-side with Mail/Finder could not be completed without adding outside evidence or launching an app. The Mac signals below therefore use the supplied platform canon and PodList evidence.

Character: Blue initials artwork and restrained accent under Multicolor (owner fixed); shallow Views/Playlists/Library source list; compact Episode metadata tables; Playlist-specific Positions with History/Listening Timeline; persistent bottom transport with restrained glass (owner fixed). Baseline: [L01], [D01], [L03], [D03], [L06], [D06].

Owner decisions: Retain bottom transport; System/Light/Dark appearance; no customizable toolbar; reversible, timed two-click Unsubscribe; glass on the stated control surfaces; Spotlight deferred to last; MCP off by default with App Intents on. The deep Dark accent is accepted, including its selected Settings-tab label consequence. These decisions still receive ordinary verdicts and caps, but are excluded from the proposed target.

Method: Full audit against [CRITIQUE], [CORE], [MAC], [RUBRIC], [FIT] and [PRINCIPLES]. All 35 Light and 35 Dark capture images were inspected, initially as contact sheets and at original resolution where needed; associated snapshots, the complete menu export and source supplied behavioral evidence. No earlier PodList grading report or UI-GRADE.md was read. No app launch, screen control, desktop automation, build or code modification was performed.

## Flows

The provided XCUITest tour is a state tour with selected behavioral assertions, not the measurement-complete flow run required by CRITIQUE. Its two appearance tests passed with zero failures: [RUN], [README], [TOUR]. The approximately 803-second total is test harness duration, not response latency.

| Main task | Supplied state sequence and what it establishes |
|---|---|
| Find an Episode and inspect it | Subscriptions → New this week → selected Episode → type-select another title → Starred/Search. [L01], [L02], [L03], [L04], [L15], [L33], with Dark counterparts; tour asserts type-select selects and reveals the row. |
| Organize a Playlist | Default Entries → selected Entry → History → Listening Timeline → Rewind preview → Cancel → Commute → Settings → Rename → Cancel → New Playlist → Cancel → Trash. [L06]–[L14], [L34a], [L34]; source supplies commit, undo and drop behavior. |
| Change a saved filter | Edit View → Cancel → New View → Cancel; matching-count and validation code examined. [L16], [L17], [VP]. |
| Manage subscriptions | Podcast page → description expanded → Unsubscribe armed → disarmed → Subscription Settings → Cancel; then Add to Playlist, Add Podcasts, bulk Download Rules. [L18]–[L25]; no actual unsubscribe or import was exercised by this grader. |
| Control listening and preferences | Now Playing opens alongside browsing; Episode Details/Add routes return to Library; close; Settings General/Automation; Stats; Getting Started; multi-selection. [L26]–[L33], [TOUR]. Playback stays paused. |

Widths: Main Library **1180×760 pt** (2360×1520 px at 2×); Add Podcasts and Settings have their own native sizes, including **640×224 pt** Automation. Minimum-size and half-display captures are absent. Appearances: Light and Dark, app-level choices. Hardware: VM on a Retina **1920×1200 pt desktop**; host CPU, VM resource allocation and refresh rate not provided. Timed repetitions, controlled late arrivals, per-step focus/input/scroll recording and hitch metrics: absent. Script location: [TOUR]. Measurements file: none. Screenshot strips: the numbered Light/Dark state folders, indexed below; they are not complete before/after transition strips.

**Scored stability failures: none established.** FLOW-01/02/04 and timing remain N/O rather than presumed passes or failures. Code can settle the guarded late-result behavior in FLOW-03; static captures can settle visible alignment and action placement. Stability sub-score: **N/O in both appearances**. It supplies no band limit; Consistency & polish is explicitly partial.

## Cross-screen inventory

Evidence is the cited captures plus shared source. “None captured” does not mean the feature is missing; source-backed cells are labeled C. Neutral means primary/secondary semantic text on the reading surface, not brand color.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / Episodes / Search | C: top content Edit status; short operation name, neutral | C: same top strip, authored red text + Retry | None captured | C: top strip + Edit menu, Undo operation, persistent while history exists | Inspector centered “Select an Episode”; search has no-result copy | None captured | Toolbar Play/Add; Search input trailing | Filter summary under sync, neutral; Help menu |
| Playlist Entries / History / Timeline | C: reserved top Edit status, neutral | C: same strip; failed drops also stay in destination rows with Retry/Remove | Rewind consequence sheet; plain text, Cancel/Rewind | C: same top strip + Edit menu | Centered History explanation; empty Entries offer Find Episodes | Rewind preview is an explicit task sheet | Principal section picker; task actions trailing; Rewind is row-trailing | Current Entry label; History explains playback versus manual marks |
| New/Edit View | C: successful commit dismisses to underlying list/status | C: field-local validation; failure above pinned footer, red + Retry | Same sheet contains filter choices, match count | C: scoped edit history + underlying menu | None; form has initial defaults | None | Create View/Save, bottom-trailing; Cancel adjacent | Live match count and condition labels |
| Playlist Settings / New Playlist | C: save dismisses; Rename has separate Save Name | C: local field/failure region above footer | Name and Clear on Played choices | C: underlying named edit history | None | None | Save/Create Playlist bottom-trailing; Delete leading secondary | Explicit text distinguishes Save/Cancel from immediate Delete |
| Subscription / bulk Download Rules | C: settings commit dismisses; subscription state stays on control | C: local validation/failure above footer, red + Retry | Download policy and subscription options in sheets | C: named Library history | None in captured fixture | None | Save/Apply bottom-trailing | Device-local scope, default inheritance, Mark All Played consequence |
| Podcast page | Persistent checkmark + Subscribed control | C: content Library feedback, red + Retry | Armed Unsubscribe changes same control to red; disarms after timeout | C: top Edit status + Edit menu after actual unsubscribe | C: no Episodes explanation | None | Subscribe/Unsubscribe in header; row Play/Add | Show Description link, share and feed address |
| Add Podcasts utility panel | C: persistent Subscribed marker at result | C: beneath query/help, red + Retry; no-results has direct correction | None captured | C: Library feedback before closing footer | “Find Your Next Podcast” centered below query, neutral | None | Search beside input; Close bottom-trailing | Feed URL example and OPML route |
| Bottom player / Now Playing | Persistent title, position and transport state | C: below transport, primary text on glass + Retry | Go to Time task (C) | No playback-position Undo promise | C: no loaded Episode explanation | None | Transport at bottom in Library; upper content in Now Playing | Action help, chapters/details routes |
| General / Automation Settings | Live control value; C: no save ceremony | C: near setting, authored red text + Retry | None captured | C: shared settings edit history | None | None | Ordinary controls apply live | Text-size scope, import continuation, explicit MCP consequence |
| Trash / Stats / Getting Started | C: Restore returns object; Stats derived | C: Library feedback for Trash | C: permanent-delete native confirmation | C: named edits where reversible | Centered empty Trash/Stats explanation | Permanent deletion only, C | Restore at row; Dismiss bottom-trailing for tutorial | Three numbered task steps; retained data explained |

Mismatches: No verified same-kind success/error/Undo wording or color mismatch. Context-specific positions are deliberate: a per-setting failure belongs beside that setting, a failed drop beside its reserved row, and a playback failure with the player. All use explicit recovery. Shared sheet footers hold main actions in the same region. The brief success notice can expire after five seconds while error and undo history remain separately available ([EC], [NOTICE]). These observations do **not** establish that asynchronous arrivals never shift navigation, focus or scroll; that requires the missing flow measurements. Rename’s local Save Name versus outer Save adds conceptual load, but explanatory copy makes its two commit scopes explicit; no additional checklist failure assigned.

## Checklist

Coverage: **85.1%** (pass **120** · fail **6** · N/O **22** · N/A **20**). Verified/applicable = 126/148; all **168** IDs receive exactly one verdict below. A pass based on source means the implementation contract is present; it is not a claim that every runtime/assistive-technology path was exercised.

Failures by severity:

**Blockers: none verified.**

**Majors**

- **WIN-05 — Bottom transport carries primary actions.** [L01], [L03], [D03] show play/pause, skip, position and playback choices in the floating bottom strip; [W] lines 219–228 installs it with a bottom safeAreaInset and [P] lines 14–29 lays out the controls. The checklist allows only limited status at this edge. Controls menus and Now Playing mitigate reachability, but do not change the placement verdict. Principle: `content-first`. Fix if the owner revisits this decision: give primary transport an above-bottom home, keeping the bottom strip to limited status. **Owner-fixed; not a target.** Caps Platform fit at **6.9**.
- **APPEAR-04 — Dark selected Settings-tab label has insufficient contrast.** In [D30] the enabled Automation label is blue on a gray selected-tab surface; the sibling snapshot confirms an enabled toolbar button. Sampling the unscaled 2× PNG in label rectangle x=635–759, y=126–147 gives dominant opaque label **#435FDD** and local background **#4B4846**, **1.69:1** (sRGB relative luminance). That is below **4.5:1** for this small control label, including the stricter custom Dark criterion; the 3:1 small-bold ambiguity would not rescue it. This is a control-label failure, so it is major despite its restricted area. The deep Dark AccentColor **#3652D0** in [BUILD] and native pane selection in [C] explain the result. White on that accent is **6.41:1**, so selected-row white text is not the problem. Principle: `accessibility`; anti-pattern: Ghost-text elegance. Fix if the owner revisits this decision: retain the deep selection fill but use a separately readable semantic foreground on the selected pane label, verified at ≥4.5:1 against actual tab material. **Owner-accepted consequence; not a target.** Caps Color & contrast at **6.9** in the combined grade. Light has no demonstrated corresponding failure.
- **SYS-05 — Library search stops at the app boundary.** Searchable Podcasts/Episodes/Views/Playlists are not indexed in Spotlight. [L15] shows meaningful internal searchable content; [APP], [INT] and [BUILD] provide App Intents and bundle registration, but there is no Core Spotlight index/update/removal path in Sources. App Intent donation is not a substitute for a Library index. Principle: `discoverable-commands`. Fix: index stable content IDs with title, podcast, date and a navigation identifier; reconcile deletes and account/library changes. Custom-document Quick Look/thumbnail dependents do not apply to this database app. **Explicitly deferred to last; not the next target.** Caps Platform fit at **6.9**.

**Minors**

- **SYS-02 — No contextual feed Service.** [L24] requires a Podcast name/feed address; receiving a selected feed URL from another app is a meaningful workflow. [BUILD] has no NSServices registration, and [APP] has no provider registration/handler. Consuming native Services in fields is APP-03 and is not this finding. Principle: `conventions`. Fix: add a selection-based “Find Podcast in PodList” Service accepting URL/text, opening the existing discovery flow with that value; keep final subscription explicit. No capture of an open Services menu was supplied, so source establishes the absence.
- **SYS-03 — Shareable web URLs do not restore PodList context.** [L06], [L15] show addressable Playlist/View destinations. [URL] exports publisher/enclosure HTTP URLs only; [BUILD] declares OPML documents but no app URL scheme/associated links, and [APP] lines 43–49 accepts file OPML URLs only. A copied feed or Episode web page does not reopen a saved View, Playlist or selected Episode inside PodList. Principle: `user-control`. Fix: define stable read-only app links for these destinations, validate the Library identity and navigate without starting playback; add Copy PodList Link to the corresponding native menus.
- **COPY-04 — Tooltips frequently use title case.** [L03], [L18], [L26] identify the affected controls; [W] uses “Play This Playlist” and “Show or Hide Inspector (⌥⌘I)”. Capitalizing “This” and the second verb “Hide” makes these title-style fragments rather than sentence case. These are action tooltips, for which the checklist asks sentence case. Principle: `plain-language`. Fix: sentence-case ordinary action words while preserving actual proper/domain names, and keep existing shortcut hints. Tooltips were not open in the captures; the authored .help strings settle the verdict.

N/O: HELP-01, FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-06, DRAG-06, APPEAR-11, TYPE-06, AX-04, WIN-03, RESP-01, RESP-02, FOOT-02, APP-03, WMENU-02, WIN-10, TOOL-02, SET-04, SET-06, DRAG-07, FOOT-01.

N/O boundaries: FLOW-01 needs a measured transition run; FLOW-02/04 need focus/scroll and narrow-size follow-up observation; KEY-01/AX-04 need assistive-input traversal; KEY-06 needs international-layout dispatch evidence. APP-03 cannot establish installed Services from the excluded menu. HELP-01 leaves only ⌘? dispatch unverified; the menu position and useful documentation are established. WMENU-02 needs an actual before/after Zoom. WIN-03/10 and TOOL-02 need minimum/half-width resize and overflow evidence. DRAG-06/07 need an in-progress drag. APPEAR-11 needs intermediate frames. TYPE-06 lacks three representative full prose lines at the default reading width (short demo descriptions are insufficient). SET-04/06 require reopen/relaunch observation to settle the framework-owned lifetime of @State and Settings restoration. RESP-01/02, FOOT-01/02 lack the specified timed, resource and hitch measurements. This is why source presence is sufficient for some checks but not for these residual runtime questions.

N/A: DLG-09 — No app-authored rich popover; speed/sleep/overflow use native menus. [P], [EC].; LIST-05 — No expandable content tree; source sections and Podcast navigation are not nested document outlines. [W].; START-04 — No camera, microphone, Contacts or other protected-resource request in this feature set; user-selected file panels grant their own access. [BUILD], [S].; START-05 — → START-04; no app-authored protected-resource permission prompt.; START-07 — No account creation offered. [C], [S].; FILE-01 — Library database app, not a create/open editable-document app. OPML is explicitly Import/Export, with Finder opening staged for import. [CMD], [APP].; FILE-02 — No editable document history or Open Recent feature.; FILE-04 — No editable file Duplicate/Export As workflow; OPML exports a database snapshot. [S].; FILE-05 — No printing task offered.; FMT-01 — No formatted-text editing.; FMT-02 — → FMT-01; no formatting model.; DATA-02 — No editable document dirty-state model; settings drafts are journaled separately.; DATA-03 — Not an autosaved document editor; Library undo/Trash are DATA-04.; DATA-08 — Database/library app, no editable file/document-tab model.; SYS-06 — No credential/account, specialized Safari, or Finder Quick Action workflow. OPML receiving is already handled by Finder Open and drag/drop. A dedicated Share extension is optional here; not every integration technology is mandatory. [BUILD], [APP], [LD].; SYS-07 — No document preview or task-count Dock badge is warranted by this workload; media state is exposed by native Now Playing. No decorative badge requirement. [SYSTEM].; EXTRA-01 — No menu bar extra.; EXTRA-02 — → EXTRA-01.; EXTRA-03 — → EXTRA-01.; EXTRA-04 — Sovereign Library app, not a dual-mode quick-access utility.

Complete verdict register (passes include concrete evidence; failures refer to the severity detail above):

### Core checklist

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | See N/O boundary and available-evidence limitation above. |
| FLOW-02 | N/O | See N/O boundary and available-evidence limitation above. |
| FLOW-03 | pass | Late discovery results check cancellation and the submitted query; Settings writes use draft identities; fields are not cleared by an older completion. [A], [GS], [SD]. |
| FLOW-04 | N/O | See N/O boundary and available-evidence limitation above. |
| FLOW-05 | pass | Content list and Inspector share the toolbar baseline; sheet content/footer form one aligned unit. [L03], [D03], [SH]. |
| FLOW-06 | pass | No heading-only empty section in the supplied states; History, Trash, Inspector and Stats have explanations. [L08], [L14], [L31]; [I], [PL]. |
| FLOW-07 | pass | New/Edit task sheets consistently put their main action bottom-trailing. [L11], [L13], [L16], [L17], [L22], [L25]; [SH]. |
| KEY-01 | N/O | See N/O boundary and available-evidence limitation above. |
| KEY-04 | pass | New/Rename inputs request focus; native field order and focus rings retained. Focus assertions in [TOUR]; [L12], [L13], [L24]; [A], [PS], [SH]. |
| KEY-06 | N/O | See N/O boundary and available-evidence limitation above. |
| KEY-07 | pass | Native ScrollView/Table scrolling remains; custom type-select ignores function keys. Space is a documented, scoped transport key. [ROW], [PC], [C]. |
| KEY-08 | pass | Help contains a shortcut grid and explicitly describes Space/Return scope and text exceptions. [C], [KS]. |
| DLG-01 | pass | Ordinary edits use undo feedback; permanent Trash deletion alone uses a destructive confirmation. Rewind previews consequences. [PS], [PL], [EC]. |
| DLG-02 | pass | Permanent-delete title identifies its object and informative copy names retained versus removed data. Rendered long-name wrapping unverified. [PS] lines 260–265. |
| DLG-03 | pass | Delete Permanently / Cancel are two specific buttons. [PS] lines 260–265. |
| DLG-04 | pass | Native cancel roles and Esc; the key guard maps ⌘. to sheet cancellation. Default sheet actions trail. [PC], [SH]; [L34]. |
| DLG-05 | pass | Permanent deletion is explicitly requested and destructive; ordinary removal is reversible. Cancel is present. [PS], [EM]. |
| DLG-07 | pass | Task sheets show Cancel plus their verb; one-action dismissal screens use Dismiss/Done. No Cancel/Done/Back triple. [L13], [L23], [L32], [SH]. |
| DLG-09 | N/A | No app-authored rich popover; speed/sleep/overflow use native menus. [P], [EC]. |
| CTRL-02 | pass | Clear on Played and MCP retain checkbox semantics; no mixed-state child hierarchy. [L11], [L30], [D30]; [SH]. |
| CTRL-03 | pass | Names, numeric fields, feed query and filter conditions keep visible identifying labels; optional filter inputs are identified. [L13], [L17], [L24]; [VP], [S]. |
| CTRL-04 | pass | Numeric drafts use locale-aware FormNumbers and per-field validation; name uniqueness and nonnegative lengths checked. [S], [VP], [LM]. |
| CTRL-05 | pass | Custom styles wrap native Buttons rather than gesture-only imitation; prominent actions retain normal dimensions. [AP], [G], [SH]. |
| CTRL-06 | pass | Episode overflow groups related selection commands; Play/Add remain visible; speed/sleep commands are related sets. [L03], [EC], [P]. |
| CTRL-07 | pass | Toolbar prompts distinguish Search Library, Search this list and Search Episodes; Search heading identifies library results. No history UI. [W], [L15], [L18]. |
| CTRL-08 | pass | OPML import records counts, cancellation and resumable progress; download controls expose cancel/retry; discovery has indeterminate progress. [OPML], [LM], [DP], [A]. |
| LIST-01 | pass | Episode/Entry metadata use native Tables; saved Views, subscriptions and Timeline use native lists for non-tabular objects. [L03], [L06], [L09]; [W], [PL]. |
| LIST-02 | pass | Episode, Published, Length, State and Entry, Position are consistent noun headings; single-column lists have view titles. [L02], [L06], [L05]. |
| LIST-03 | pass | Episode tables bind native sortOrder and sortable column values with adjustable widths; Playlist order is deliberate and unsortable. [W], [POD], [PL]. |
| LIST-04 | pass | Hairline row separators, aligned dates and tabular time values keep rows trackable; no narrow file-name column. [L03], [L06], [D33]. |
| LIST-05 | N/A | No expandable content tree; source sections and Podcast navigation are not nested document outlines. [W]. |
| LIST-06 | pass | Sidebar and content selections remain visible; section/speed choices use native selected states. [L03], [L10], [D33]; [PL], [P]. |
| LIST-07 | pass | Native selection/arrows, custom incremental type-select, and double-click details are implemented; tour asserts typing jo selects/reveals Joinery. Return is documented Play Now. [ROW], [W], [PL], [TOUR], [C]. |
| DATA-01 | pass | Persistent draft journals, atomic database edits and playback shutdown/flush preserve work; Cancel intentionally discards the scoped draft. [LM], [EM], [SD], [APP]. Code-level verdict, not a crash test. |
| DATA-04 | pass | Named reversible database edits and multi-step EditHistory supply ⌘Z/⇧⌘Z; text editing delegates to its UndoManager. [EM], [EC]. |
| DATA-05 | pass | Restored Entries navigate to their Playlist, select the IDs and restore a visible row anchor. [RS], [W]; WindowModel.revealRestoredEntries in [MODEL]. |
| DATA-06 | pass | SceneStorage encodes destination, search, selection, sort, section, scroll anchor and pane widths; native WindowGroup supplies window restoration. [W], [RS], [ROW], [SW], [APP]. Implementation verified; relaunch not exercised. |
| DRAG-01 | pass | Episodes drag into Playlists and out as URL/text; feed URLs/OPML drop into Library; menus provide add, move and import equivalents. [D], [LD], [EC], [CMD]. |
| DRAG-03 | pass | Committed batches are one reversible edit; OPML drops first stage an explicit import preview. [D], [LD], [EM]. |
| DRAG-05 | pass | Native draggable rows and table drop destinations supply previews/insertion treatment; failures retain named rows and Retry/Remove. [PL], [D]. System threshold delegated to native drag, not measured. |
| DRAG-06 | N/O | See N/O boundary and available-evidence limitation above. |
| PTR-03 | pass | Native text, splitter, table and slider interaction; background probes do not hit-test or replace gestures. [SW], [ROW], [P]. |
| PTR-04 | pass | Transport/row/Inspector controls have action help, and truncated title/error text has full-value help. Tooltips’ capitalization is COPY-04. [P], [I], [EC], [PL]. |
| APPEAR-03 | pass | Custom glass becomes opaque with a border under Reduce Transparency or Increase Contrast; custom text/error/brand palettes have high-contrast variants. [G], [AP], [BUILD]. Handling verified in code; no preference-on captures. |
| APPEAR-04 | fail | major — selected Settings tab label contrast; see failure detail below. |
| APPEAR-05 | pass | No authored positional, depth, blur or decorative animations found in UI source; native state transitions are left to the system. [G], [W], [P]. |
| APPEAR-09 | pass | SF Symbols with shared 28 pt icon labels, standard play/share/trash meanings and matching optical weight. [ICON], [I], [P]; [L03], [D03]. |
| APPEAR-10 | pass | Controls sit on discrete glass strips; content stays on plain reading surfaces and Tables retain row separators. [L03], [D03], [L16]; [G]. |
| APPEAR-11 | N/O | See N/O boundary and available-evidence limitation above. |
| TYPE-02 | pass | System Regular through Bold, compact role-based hierarchy; no thin reading text. [L03], [L17], [D27]; [I], [SH], [S]. |
| TYPE-03 | pass | Body/caption text uses system semantic fonts through macContentFont. [TS], [I], [P]. |
| TYPE-05 | pass | Semantic multiline styles, wrapping prose and an alternate large-text row layout retain hierarchy; forms scroll above pinned actions. [TS], [SH], [SZ], [S]. Code evidence at enlargement; only default size captured. |
| TYPE-06 | N/O | See N/O boundary and available-evidence limitation above. |
| TYPE-07 | pass | No extended all-caps reading text or combined bold/italic emphasis; underlines identify link-style actions. [L17], [L22], [AP]. MCP is a short acronym. |
| TYPE-08 | pass | Authored UI uses typographic ellipses, curly apostrophes and real dashes; literal URLs/configuration remain literal. [C], [S], [CMD], [L24]. |
| COPY-01 | pass | Play Now/Next/Last, Rename, Save, Rewind and Mark Played use specific verbs; Help explains Episode/Entry distinctions. [L23], [L34], [C]. |
| COPY-02 | pass | Field-local validation and authored recovery copy identify action/connection/feed failures, preserve drafts, and offer Retry. [FM], [FF], [S], [VP]. |
| COPY-03 | pass | Empty History/Trash/Stats explain their contents; Add Podcasts gives an input example and empty Playlists offer Find Episodes. [L08], [L14], [L24], [L31]; [PL]. |
| COPY-04 | fail | minor — title-style tooltip action fragments; see failure detail below. |
| AX-01 | pass | Snapshots expose distinct controls, names, slider values, checkbox state and selection; source labels icon-only actions and announces feedback. [L03], [L12], [L26], [D30] with sibling .txt files; [ICON], [I], [P], [ANN]. Live VoiceOver order/subroles unverified. |
| AX-02 | pass | Current Entry text/icon, Active Playlist symbol/label, Played text, selected shapes and error wording supplement hue. [L06], [L33], [D20]; [FM]. |
| AX-04 | N/O | See N/O boundary and available-evidence limitation above. |
| AX-05 | pass | Playback has visible start/stop, position and state; app status is textual and no UI-critical sound-only cue exists. [L26], [P], [PC], [ANN]. User-supplied podcast transcripts are outside this UI-state check. |
| START-01 | pass | Opening Library presents a named progress indicator; persisted local content is loaded before background sync. [W], [APP]; latency itself is RESP-01 N/O. |
| START-02 | pass | Getting Started is optional, dismissible, stored by library scope, and reopenable in Help/Settings. [LM], [S], [MENUS], [L32]. |
| START-03 | pass | Help explains the domain and scoped keyboard controls; onboarding gives three task steps and a File-menu route. [C], [L32], [S]. |
| START-04 | N/A | No camera, microphone, Contacts or other protected-resource request in this feature set; user-selected file panels grant their own access. [BUILD], [S]. |
| START-05 | N/A | → START-04; no app-authored protected-resource permission prompt. |
| START-06 | pass | Standalone Library is available without account registration; optional server connection has its own explicit action. [C], [S], [APP]. |
| START-07 | N/A | No account creation offered. [C], [S]. |
| EDIT-02 | pass | Native fields keep standard responder commands; row copy and delete act on selected IDs, with text context guarded. [SC], [PL], [EC], [MENUS]. |
| EDIT-05 | pass | Selected Episodes copy title plus URL and register URL/plain text representations; feed URL is selectable/copyable. [SC], [URL], [POD]. No rich-text editor or image editing selection. |
| WIN-03 | N/O | See N/O boundary and available-evidence limitation above. |
| TOOL-06 | pass | Sidebar and Inspector have visible toolbar toggles plus View commands/shortcuts. No customizable toolbar is offered, by owner decision. [W], [CMD], [MENUS]. |
| SIDE-03 | pass | Native sidebar button plus View › Show Sidebar (⌃⌘S); Inspector button plus ⌥⌘I. [W], [CMD], [MENUS]. |
| SIDE-04 | pass | Source selection persists when content/Inspector takes focus; Podcast pages map to Subscriptions. [L03], [L18], [D33]; [W]. |
| SET-01 | pass | Global playback/appearance/server options are in Settings; subscription and Playlist options stay near those objects. [L11], [L22], [L27], [L30]; [S]. |
| RESP-01 | N/O | See N/O boundary and available-evidence limitation above. |
| RESP-02 | N/O | See N/O boundary and available-evidence limitation above. |
| FOOT-02 | N/O | See N/O boundary and available-evidence limitation above. |

### Mac checklist

| ID | Verdict | Evidence / scope |
|---|---|---|
| MENU-01 | pass | PodList · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help; no inappropriate Format menu. [MENUS]. |
| MENU-02 | pass | Domain actions, toolbar actions, sharing, sort, recovery, chapters and cross-Playlist resume have menu routes. [MENUS], [CMD], [ACT], [EC], [PC]. Dialog-local submit/cancel and field choices are controls within the indexed command, not additional global commands. |
| MENU-03 | pass | Unavailable commands remain dimmed, section/speed toggles use Picker/Toggle and Play/Pause titles change. [MENUS], [EC], [PC], [ACT]. |
| MENU-04 | pass | Concise action titles and input-dependent ellipses throughout captured menus. [MENUS], [CMD], [EC]. |
| MENU-05 | pass | Domain submenus stay one deep; menus are mostly text, with native separators rather than icon decoration. [MENUS], [EC], [ACT]. |
| MENU-06 | pass | System Option alternates Close All/Minimize All/Zoom All remain; no custom hidden modifier-only task. [MENUS]. |
| APP-01 | pass | About PodList is in its own group; native About receives version and copyright from the bundle. [MENUS], [BUILD]. |
| APP-02 | pass | Native Settings scene, App › Settings… and tour’s ⌘, path open a separate movable window. [APP], [TOUR], [L27], [MENUS]. |
| APP-03 | N/O | See N/O boundary and available-evidence limitation above. |
| APP-04 | pass | Native Hide, Hide Others, Show All and Quit actions in standard order; termination flushes playback. [MENUS], [APP]. |
| FILE-01 | N/A | Library database app, not a create/open editable-document app. OPML is explicitly Import/Export, with Finder opening staged for import. [CMD], [APP]. |
| FILE-02 | N/A | No editable document history or Open Recent feature. |
| FILE-03 | pass | Standard Close/Close All responder actions retained; tour closes utility windows with ⌘W. [MENUS], [TOUR]. |
| FILE-04 | N/A | No editable file Duplicate/Export As workflow; OPML exports a database snapshot. [S]. |
| FILE-05 | N/A | No printing task offered. |
| EDIT-01 | pass | Undo/Redo head Edit and use operation-aware model or text UndoManager titles. [MENUS], [EC], [EM]. |
| EDIT-03 | pass | Native Edit › Find retains text selectors; Search Library is the explicit object-search command. [MENUS], [CMD]. |
| EDIT-04 | pass | TextEditingCommands installs native spelling, substitutions, transformations and speech; captured Edit retains Dictation/Emoji. [APP], [MENUS]. |
| FMT-01 | N/A | No formatted-text editing. |
| FMT-02 | N/A | → FMT-01; no formatting model. |
| VIEW-01 | pass | View includes sidebar, Inspector, size, sort, description and native Enter Full Screen. [MENUS], [ACT], [CMD]. |
| VIEW-02 | pass | Show/Hide Inspector, Sidebar and Description reflect visibility; Window holds window navigation. [MENUS], [ACT], [W]. |
| WMENU-01 | pass | Native Minimize, Zoom and Bring All to Front are present as separate commands. [MENUS]. |
| WMENU-02 | N/O | See N/O boundary and available-evidence limitation above. |
| WMENU-03 | pass | Native WindowGroup/Window/UtilityWindow supply window listing; the captured library appears and no panel duplicates are listed. [MENUS], [APP]. Multi-window alphabetical behavior is delegated to the system. |
| HELP-01 | N/O | Documentation and trailing placement are verified, but replacing the Help group does not explicitly assign ⌘? in source, and XCUI exports no equivalents. Its system delivery is unverified. [MENUS], [C], [APP]. |
| HELP-02 | pass | System Help Search field remains; only PodList Help and Getting Started follow it. [MENUS]. No Help Book claimed. |
| KEY-02 | pass | Settings, Edit and window commands retain standard actions; text Cmd-arrows/Return and sheet cancellation are protected before playback shortcuts. [PC], [EC], [CMD]. |
| KEY-03 | pass | Frequent playback, marking, queue, create and inspector actions have discoverable Command families. Sidebar’s ⌃⌘S is one limited visibility binding; no general Control-based custom accelerator scheme. [KS], [CMD], [PC], [C]. |
| KEY-05 | pass | Native menu equivalents localize; Help renders ⌥⇧⌘ order and ⌘+ notation. [KS], [TS], [C]. |
| TEXT-01 | pass | Native TextFields retain Cocoa editing; the playback guard explicitly uses interpretKeyEvents for conflicting text navigation. [PC], [A], [PS], [VP]. |
| TEXT-02 | pass | Native Cocoa fields and TextEditingCommands retain system spelling/substitution behavior without a custom editor or blanket disabling. [APP], [MENUS], [A], [PS]. Actual user dictionaries not exercised. |
| WIN-01 | pass | Native WindowGroup supplies traffic lights; main captures and menu selectors show close/minimize/zoom. [APP], [L01], [MENUS]. |
| WIN-02 | pass | Native source list becomes gray when content takes focus and sheet parents dim; semantic control/material styles retained. [L03], [L11], [D11], [W], [G]. Other-app deactivation styling not captured. |
| WIN-04 | pass | View/Playlist names title the main window, with concise count/status subtitle; utility titles identify their tasks. [L02], [L10], [L24], [L31], [W]. |
| WIN-05 | fail | major — primary transport lives at the bottom edge; see failure detail below. |
| WIN-06 | pass | System full-screen route and native window controls retained; no custom full-screen implementation. [APP], [MENUS], [W]. |
| WIN-07 | pass | View/Playlist comparison uses Open in New Window; Now Playing/Add Podcasts have distinct persistent tasks. [CMD], [APP], [NP], [A]. |
| WIN-08 | pass | WindowGroup supports independent Library scenes with discoverable New Window and Open in New Window; modeless playback preserves browsing. [APP], [CMD], [TOUR]. |
| WIN-09 | pass | Native unified frame and toolbar; no custom titlebar hit-test or double-click interception. [APP], [W], [SW]. |
| WIN-10 | N/O | See N/O boundary and available-evidence limitation above. |
| TOOL-01 | pass | Leading navigation/title, principal section switcher, trailing action groups then Inspector/search. [L06], [L10], [W], [PL]. |
| TOOL-02 | N/O | See N/O boundary and available-evidence limitation above. |
| TOOL-03 | pass | Functional task, selection and inspector/search groups are separated; Playlist switcher is principal navigation. [L06], [L03], [W], [PL]. |
| TOOL-04 | pass | Standard borderless SF symbols and native grouping; no competing tinted toolbar buttons. [L03], [L06], [D06], [W]. |
| TOOL-05 | pass | Window actions are ToolbarItems; checkboxes, numeric fields and other settings live in body forms. [W], [S], [PS]. |
| SIDE-01 | pass | Leading native source sidebar, initially visible. [L01], [D01], [W]. |
| SIDE-02 | pass | Sections plus destinations stay within two levels. [L01], [L06], [W]. |
| SIDE-05 | pass | Thin visible system split boundaries; snapshot reports 0.5 pt native sidebar separator. [L03] and sibling .txt; [W]. |
| SIDE-06 | pass | Native .sidebar List retains system metrics; content text-size override is explicitly reset within the sidebar. Actions also have toolbar/menu routes. [W], [TS], [CMD]. |
| SET-02 | pass | Default Appearance is System; contrast/transparency follow Environment values; content text-size control does not replace system sidebar sizing. [AP], [G], [TS], [S]. |
| SET-03 | pass | Two visible native pane tabs, selected treatment, pane-sized height and disabled minimize/zoom. [L27], [L30], [D30] with .txt; [C], [SZ]. |
| SET-04 | N/O | See N/O boundary and available-evidence limitation above. |
| SET-05 | pass | Global settings write through immediately; failure retains a retryable journal. Save in Playlist/Subscription sheets commits object options, not global Settings. [S], [GS], [SD]. |
| SET-06 | N/O | See N/O boundary and available-evidence limitation above. |
| DLG-06 | pass | SwiftUI parent sheets share one routed task item; content caps to parent height with a pinned footer. Separate app windows remain modeless. [W], [SH], [SZ], [PL], [TOUR]. |
| DLG-08 | pass | Add Podcasts is a named UtilityWindow panel, with automatic hide/reactivation and retained draft asserted in the successful tour. [APP], [A], [TOUR], [L24]. Inspector is embedded, not floating. |
| CTRL-01 | pass | Native pop-up choices, segmented Playlist switcher, two-tab Settings and checkboxes match Mac choice semantics. [L06], [L11], [L17], [L30]; [S], [PL]. |
| DATA-02 | N/A | No editable document dirty-state model; settings drafts are journaled separately. |
| DATA-03 | N/A | Not an autosaved document editor; Library undo/Trash are DATA-04. |
| DATA-07 | pass | Native NSOpenPanel/NSSavePanel preserve system browsing and explicit OPML name; scope acquired for selected URLs. No new Untitled document is created. [S], [LD]. |
| DATA-08 | N/A | Database/library app, no editable file/document-tab model. |
| DRAG-02 | pass | Same-Playlist reorder is move; cross-Playlist transfers copy; Option is sampled at drop time. Duplicate Episode entries are not invented by a force-copy. [D], [PL]. |
| DRAG-04 | pass | Rich private Episode representation precedes URL and text; ordered multi-selection is carried together; receiver prefers richest valid type. [D], [LD]. |
| DRAG-07 | N/O | See N/O boundary and available-evidence limitation above. |
| PTR-01 | pass | Episode, Entry, View, Playlist, Subscription and Timeline objects expose contextual commands targeting the corresponding IDs. [W], [PL], [POD], [A], [PS]. |
| PTR-02 | pass | Context actions retain common groups and omit per-Playlist placement proliferation; keyboardShortcut is only enabled for menu-bar instances. [EC], [PL], [W]. |
| PTR-05 | pass | Native contextMenu(forSelectionType:) receives contextual IDs without mutating selected IDs; sidebar closures bind their destination. [W], [PL], [POD]. Actual outline appearance is delegated to native menus. |
| APPEAR-01 | pass | Light/Dark captures are coherent; app-scoped nil/System appearance lets macOS drive changes. [L01], [D01], [L27], [D27], [AP]. |
| APPEAR-02 | pass | Bundle AccentColor under Multicolor; controls/selection use system accent, artwork uses brand; readable fallback for pale accents. [BUILD], [AP], [W]. No global brand-tint override. |
| APPEAR-06 | pass | Glass confined to transport, Inspector actions, Now Playing controls and editor footers; reading content remains plain. [G], [I], [P], [SH]; [L03], [D16]. |
| APPEAR-07 | pass | Custom strips use regular glass; no clear glass or nested surface stacking. [G], [I], [SH], [NP]. |
| APPEAR-08 | pass | Native toolbar/sidebar and scroll-edge behavior retained; content has safe-area reservation above player. [W], [L03], [D03]. |
| TYPE-01 | pass | 13 pt Body, 11 pt metadata and 10 pt captions use semantic styles; 17 pt Inspector title is role-based. [I], [P], [TS]; [L03]. Artwork initials and symbols are not reading text. |
| TYPE-04 | pass | Shared custom icon hit regions are 28×28 pt; native field/toolbar targets retained. Inspector’s 44 pt play target is a deliberate primary transport, not pervasive touch scaling. [ICON], [I], [L03] with .txt. |
| AX-03 | pass | 100–200% content size plus Bigger/Smaller/Actual Size; enlarged tables become wrapping reading lists. [TS], [W], [PL], [POD], [SH]. Source establishes the adaptation; no enlarged capture. |
| SYS-01 | pass | Semantic Episode/Playlist AppEntities plus play, pause, search, add and mark App Intents, AppShortcut phrases and metadata build processing. [INT], [BUILD], [APP]. No AppleScript interface claimed; Shortcuts discovery not exercised. |
| SYS-02 | fail | minor — no purpose-specific contextual feed Service; see failure detail below. |
| SYS-03 | fail | minor — no in-app addressable links; see failure detail below. |
| SYS-04 | pass | Native ShareLink for Podcast/Episode web URLs and visible Share controls; no custom sharing imitation. [CMD], [EC], [I], [POD], [URL]; [L18]. |
| SYS-05 | fail | major — searchable Library is not Spotlight indexed; see failure detail below. |
| SYS-06 | N/A | No credential/account, specialized Safari, or Finder Quick Action workflow. OPML receiving is already handled by Finder Open and drag/drop. A dedicated Share extension is optional here; not every integration technology is mandatory. [BUILD], [APP], [LD]. |
| SYS-07 | N/A | No document preview or task-count Dock badge is warranted by this workload; media state is exposed by native Now Playing. No decorative badge requirement. [SYSTEM]. |
| EXTRA-01 | N/A | No menu bar extra. |
| EXTRA-02 | N/A | → EXTRA-01. |
| EXTRA-03 | N/A | → EXTRA-01. |
| EXTRA-04 | N/A | Sovereign Library app, not a dual-mode quick-access utility. |
| FOOT-01 | N/O | See N/O boundary and available-evidence limitation above. |

## Scores

Scores apply to both appearances unless noted. Strong means deliberate work between the Competent and Exemplary anchors, not simply the presence of native controls. Behavioral assessments use source plus captured assertions, and remain partial for the explicitly unobserved runtime checks.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.2** | Strong: 13 pt task text, 11/10 pt metadata/captions, tabular durations, and a 17 pt Inspector heading give roles clear emphasis. [L03], [L06], [D03], [I], [P], [TS]. Above generic competence because roles and enlarged reading layouts are deliberate; below Exemplary because show-notes reading measure and enlarged visual quality are unobserved. | `hierarchy`, `craft`, `accessibility` |
| Hierarchy | **8.1** | Strong: shallow source → table → Inspector structure, quiet metadata and one prominent primary sheet action. [L03], [L16], [D33]. Below Exemplary because persistent transport, substantial artwork and repeated Play/Add controls claim attention alongside the list; bottom placement is retained by decision. | `content-first`, `hierarchy` |
| Spacing & density | **8.0** | Strong: native 225 pt sidebar, 28 pt icon targets, 20/24 pt content padding and orderly table columns fit frequent browsing. Episode rows are about 54.5 pt in snapshots; the extra line and row actions explain their density. [L03], [L13], [ICON], [SH]. Below Exemplary because small-window/tiled fitting is unverified and the Inspector’s artwork makes details less efficient to scan vertically. | `craft`, `conventions` |
| Color & contrast | **6.9** | Light visual assessment **8.3**, Dark uncapped visual assessment **7.5**, combined final **6.9** under APPEAR-04. Most recurring secondary text uses explicit readable palettes, and accent follows the person’s choice. [AP], [G], [BUILD]. #606060 on white is **6.29:1**; #A0A0A0 on representative #242322 is **6.00:1**. These sample pairs are not certification of every material. The enabled selected Dark Settings label at **1.69:1** prevents Strong, even though the rest of the palette is considered. | `color-restraint`, `accessibility` |
| Iconography | **8.4** | Strong: one SF family, correct Play/Share/Trash meanings, useful active/current symbols, and explicit labels/help. [L03], [L06], [L18], [D33], [ICON]. Below Exemplary because rows and the Inspector repeat the same action glyphs and unfamiliar playlist/played indicators still need explanation. | `conventions`, `craft` |
| Consistency & polish | **8.1 (stability N/O Light/Dark; partial: no full flow run)** | Strong visible finish: common sheet layout, quiet native disabled states, empty states, coherent Light/Dark treatment and scoped error/undo infrastructure. [L11]–[L17], [L24], [D24], [SH], [FF], [EC]. Edge states are designed in source, lifting it above generic competence. Unmeasured transitions, minimum sizes, drag frames and full inactive-window behavior prevent an Exemplary claim. No stability band cap applies with N/O. | `craft`, `conventions`, `stability` |
| Clarity | **8.0** | Strong: counts, Current Entry, Active Playlist, explicit empty states, match counts and reversible Rewind consequences make state readable. [L06], [L08], [L17], [L24], [L34]. Below Exemplary because Episode versus Entry versus Position requires Help, and local Save Name plus sheet Save is an extra distinction to learn. COPY-04 is a minor copy finish issue. | `plain-language`, `feedback` |
| Platform fit | **6.9 (partial runtime verification)** | Looks **8.5**, Behaves **7.9** → (8.5 + 2×7.9)/3 = **8.1 uncapped**, then WIN-05/SYS-05 cap to **6.9**. Real menus, native Settings, command equivalents, utility panel, contextual actions and object-based App Intents are substantial strengths. [MENUS], [APP], [CMD], [EC], [D], [INT]. Deferred system search and absent in-app links/Services limit integration. See signal register below. | `conventions`, `discoverable-commands`, `stability` |
| Interaction & feedback | **8.0 (partial: code and tour assertions; timing/FKA unverified)** | Strong implementation: named multi-step Undo, draft persistence, type-select, safe text key routing, real drag representations and retryable failures. [EM], [SD], [ROW], [PC], [D], [FF], [TOUR]. Above competence because these go beyond framework defaults. Below Exemplary because instantaneous response, full keyboard/assistive traversal and continuous gestures have not been measured. | `keyboard-efficiency`, `forgiveness`, `feedback`, `direct-manipulation` |
| Overall | **7.8** | Holistic Strong: the build serves browsing, organizing and paused-playback control with a coherent Mac working model. Its biggest scored weakness is the capped platform integration/placement category, with a separate Dark control-label contrast cap. The lowest category is **6.9**, so the Overall maximum is **8.9**; **7.8** respects that rule. This is an independent grade of this build, not an improvement claim. | `content-first`, `character`, `conventions` |

### Mac platform signals

Visual comparison found no web control kit, iOS wheel, fake titlebar, foreign shortcut notation, fixed-brand selection implementation or Settings overlay. The remaining departures are integration omissions and a bottom primary-control placement, not an imported visual theme. Native (S) = visible capture; C = source evidence added to the platform guide’s channels; B = captured menu/bundle contract. No R observation was made by this grader.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Window frame | Native (S/C) | Native traffic lights/unified toolbar; [L01], [APP]. |
| L2 Type | Native (S/C) | Semantic Mac body/caption roles; [L03], [TS]. |
| L3 Controls | Native (S/C) | Pop-ups, checkboxes, tables and segmented control; [L11], [L17], [L30]. |
| L4 Menus/popovers | Native (B/C) | Native menu tree, one-level domain submenus; [MENUS], [EC]. |
| L5 Shortcut notation | Native (C) | Native key equivalents and glyph help; [KS], [C]. |
| L6 Sidebar/selection | Native (S/C) | Source list, native selection and system accent; [L03], [D33], [W], [AP]. |
| L7 Symbols | Native (S/C) | Consistent SF Symbols; [I], [ICON]. |
| L8 Settings | Native (S/C) | Own live window, native pane toolbar; [L27], [L30], [C]. Dark label contrast is still APPEAR-04. |
| L9 Density | Adapted (S/C) | Compact multi-line media rows with artwork/transport target sizing; [L03], [L06]. |
| L10 Materials/era | Adapted (S/C) | Native chrome plus deliberate regular glass strips and opaque preference fallback; [G], [L03], [D03]. |
| L11 Appearance | Native (S/C) | System default and global Light/Dark overrides; [AP], [L27], [D27]. |
| B1 Menu bar | Native (B/C) | Domain command index and dimmed unavailable items; [MENUS], [ACT], [EC]. |
| B2 Settings | Native (B/C) | Standard Settings scene and successful tour’s ⌘, path; [APP], [TOUR]. |
| B3 Shortcuts | Adapted (C) | Documented contextual Space/Return and Command families, guarded text semantics; [PC], [KS]. International layouts N/O. |
| B4 Text | Native (C; partial) | Cocoa fields and TextEditingCommands; [APP], [PC]. Installed Services behavior N/O. |
| B5 Keyboard/lists | Adapted (C; partial) | Native selection with custom incremental type-select; [ROW], [TOUR]. Full Keyboard Access N/O. |
| B6 Context menus | Native (C) | Native contextual ID routing and matching command menus; [W], [PL], [EC]. |
| B7 Windows/state | Adapted (C; partial) | Multi-scene Library, explicit browsing archive, modeless windows; [APP], [RS], [TOUR]. Relaunch display restoration not executed. |
| B8 Drag/drop | Adapted (C; partial) | Rich Episode transfer and ordered destination placeholders; [D], [LD], [PL]. Live gestures N/O. |
| B9 System integration | Adapted with gaps (C/B) | Semantic App Intents and Share/Finder OPML work at the implementation level; no Spotlight index, Service provider or app content-link resolver. [INT], [APP], [BUILD], [URL]. |
| B10 Undo/help | Native (B/C) | Named Undo/Redo and real Help/shortcut reference; [EC], [C], [MENUS]. |
| B11 Footprint | N/O | No workload-comparable resource/timing metrics. |

### What stands between this build and 9.0

With the current owner decisions, **9.0 Overall is mathematically unavailable under this rubric**: Platform fit and Color & contrast remain capped at 6.9, hence Overall ≤8.9. That is a scoring consequence, not a recommendation to undo those decisions. Beyond those caps, complete the read-only content-link boundary, contextual feed entry route and tooltip copy; then obtain minimum/tiled/default-size transition measurements, five timed repetitions, drag frames, VoiceOver/FKA traversal and resource evidence in the disposable VM. N/O is uncertainty, not a scored defect and not permission to run on the owner’s Mac.

## Next step

Target: **SYS-03**, in the lowest-scoring eligible category, Platform fit. There are no verified blockers. All verified majors in that category or Color are owner-fixed/deferred, so CRITIQUE’s owner-decision rule skips them. The next target is an unaccepted integration gap close to the primary browsing task.

Anti-pattern: No exact named catalog match; this is an incomplete app-content boundary. The nearest comparison is **WHOLE-05, “Reading fluency extends across the system”**, with **PLAT-10** for external entry points ([CONTRASTS]). Things would let a person refer to the actual saved object, rather than requiring them to recreate a search or navigate the sidebar from scratch. BBEdit’s relevant lesson is semantic addressing, not reproducing its appearance.

Root cause: Publisher sharing URLs and internal destination IDs are separate abstractions with no stable resolver connecting a link back to a PodList Library object. [URL], [APP], [BUILD].

Candidate changes, for the implementation owner to consider:

1. **Preferred smallest change:** Add one validated read-only `podlist:` route for a Library identity plus Playlist/View/Episode ID; extend the existing open-URL dispatch to navigate and select that object while preserving playback. Expose “Copy PodList Link” in the corresponding native menus and contextual actions. Keep publisher “Copy Link” as a distinct outward-sharing action. Principle: `user-control`, `discoverable-commands`; expected gain in Platform fit and Clarity. Risk: an ambiguous library target or an expired object; show an explicit recovery message instead of choosing a different library silently. Signature elements remain intact.
2. Add a field/copy entry in the Inspector only after the menu route works, using the same resolver and clipboard representation. Principle: `discoverable-commands`; possible Clarity gain, possible density regression if another permanent button competes with transport. Prefer a secondary command with normal dimensions.

Acceptance evidence: In the disposable VM, copy a Playlist/View/Episode link, open it with the app running and after relaunch, and verify the exact destination/selection appears, playback stays unchanged, stale or wrong-library links explain recovery, and text/scroll already in progress is preserved where navigation was not requested. Re-run the affected measured flows in Light/Dark at minimum, half-display and default sizes. This review brief forbids applying the change, so no implementation or iteration was attempted.

## Log

Single independent audit; no iteration. All five signature elements remain **kept**. No before/after improvement or drift claim is made. Only this report is written. Validation checks the 168-ID register, counts, arithmetic and referenced paths; the supplied tour success is reported separately from tests run by this grader.

Beads note: `bd prime` reported that its embedded Dolt database could not open `LOCK` (`operation not permitted`), so durable tracker state was unavailable. No remote sync, merge or push was performed. The requested report-only commit could not be created: `git add -- docs/ui-grade/mac-round-13-codex.md` failed with `fatal: Unable to create /Users/sarvagnan/Documents/PodcastClient/.git/worktrees/t3-309ab30f-774f1536307a714f/index.lock: Operation not permitted`. This environment exposes that Git metadata read-only. Per the brief’s fallback, the report remains in the worktree, unstaged. Requested commit message: “docs: add independent round 13 Mac UI grade”, followed by the final trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Evidence index

Capture keys are links to the supplied original PNGs. Each has a sibling `.txt` snapshot at the same path/stem; [README] lists all states. The index is limited to this round. Source links point to the reviewed worktree, not an external branch.

| State | Light | Dark |
|---|---|---|
| 01-subscriptions | [L01] | [D01] |
| 02-new-this-week | [L02] | [D02] |
| 03-episode-inspector | [L03] | [D03] |
| 04-starred | [L04] | [D04] |
| 05-all-views | [L05] | [D05] |
| 06-default-playlist | [L06] | [D06] |
| 07-entry-inspector | [L07] | [D07] |
| 08-history | [L08] | [D08] |
| 09-listening-timeline | [L09] | [D09] |
| 10-commute | [L10] | [D10] |
| 11-playlist-settings | [L11] | [D11] |
| 12-playlist-rename | [L12] | [D12] |
| 13-new-playlist | [L13] | [D13] |
| 14-trash | [L14] | [D14] |
| 15-search-rice | [L15] | [D15] |
| 16-edit-view | [L16] | [D16] |
| 17-new-view | [L17] | [D17] |
| 18-podcast-market-hours | [L18] | [D18] |
| 19-description-expanded | [L19] | [D19] |
| 20-unsubscribe-armed | [L20] | [D20] |
| 21-unsubscribe-disarmed | [L21] | [D21] |
| 22-subscription-settings | [L22] | [D22] |
| 23-add-to-playlist | [L23] | [D23] |
| 24-add-podcasts | [L24] | [D24] |
| 25-download-rules | [L25] | [D25] |
| 26-now-playing | [L26] | [D26] |
| 27-settings-general-top | [L27] | [D27] |
| 28-settings-general-middle | [L28] | [D28] |
| 29-settings-general-bottom | [L29] | [D29] |
| 30-settings-automation | [L30] | [D30] |
| 31-listening-stats | [L31] | [D31] |
| 32-getting-started | [L32] | [D32] |
| 33-multi-selection | [L33] | [D33] |
| 34-rewind-summary | [L34] | [D34] |
| 34a-timeline-rewind-button | [L34a] | [D34a] |

Source/evidence key: [W], [CMD], [ACT], [EC], [PC], [SC], [KS], [I], [P], [NP], [AP], [G], [TS], [S], [C], [SH], [SZ], [PS], [PL], [VP], [DP], [D], [LD], [RS], [ROW], [SW], [A], [LM], [EM], [SD], [GS], [FF], [FM], [ANN], [URL], [ICON], [POD], [OPML], [APP], [INT], [BUILD], [TOUR], [MENUS], [RUN], [README], [RUBRIC], [CRITIQUE], [CORE], [MAC], [FIT], [PRINCIPLES], [CONTRASTS].

[W]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacWindow.swift
[CMD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/LibraryCommands.swift
[ACT]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MenuCommandActions.swift
[EC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift
[PC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PlaybackCommands.swift
[SC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/SelectionCommands.swift
[KS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift
[I]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/EpisodeInspector.swift
[P]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PlayerViews.swift
[NP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/NowPlayingWindow.swift
[AP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacAppearance.swift
[G]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacGlass.swift
[TS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacTextSize.swift
[S]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift
[C]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/ConnectionViews.swift
[SH]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PodListSheet.swift
[SZ]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/ContentSizedPanel.swift
[PS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift
[PL]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PlaylistContentView.swift
[VP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/ViewEditorScreen.swift
[DP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/DownloadViews.swift
[D]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/EpisodeTransfer.swift
[LD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/LibraryDrops.swift
[RS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/WindowRestoration.swift
[ROW]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacRowScroll.swift
[SW]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacSidebarWidth.swift
[A]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift
[LM]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/LibraryEditingModel.swift
[EM]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift
[SD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/SheetSettingsDrafts.swift
[GS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift
[FF]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/FailureFeedback.swift
[FM]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/FailureMessages.swift
[ANN]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/FeedbackAnnouncements.swift
[URL]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/ShareLinks.swift
[ICON]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/MacIconLabel.swift
[POD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/PodcastScreens.swift
[OPML]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/OPMLImportContent.swift
[APP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListMac/PodListMac.swift
[INT]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListMac/AppIntents.swift
[BUILD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/scripts/build-mac-app.sh
[TOUR]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/UITour/PodListUITour.swift
[MENUS]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/menus.txt
[RUN]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/xcodebuild.log
[README]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/README.md
[RUBRIC]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/rubric.md
[CRITIQUE]: /Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md
[CORE]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/core-checklist.md
[MAC]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/mac-checklist.md
[FIT]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/platform-fit.md
[PRINCIPLES]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/principles.md
[CONTRASTS]: /Users/sarvagnan/Documents/UI_Guidelines/examples/contrasts.md
[L01]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/01-subscriptions.png
[D01]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/01-subscriptions.png
[L02]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/02-new-this-week.png
[D02]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/02-new-this-week.png
[L03]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/03-episode-inspector.png
[D03]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/03-episode-inspector.png
[L04]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/04-starred.png
[D04]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/04-starred.png
[L05]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/05-all-views.png
[D05]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/05-all-views.png
[L06]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/06-default-playlist.png
[D06]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/06-default-playlist.png
[L07]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/07-entry-inspector.png
[D07]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/07-entry-inspector.png
[L08]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/08-history.png
[D08]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/08-history.png
[L09]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/09-listening-timeline.png
[D09]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/09-listening-timeline.png
[L10]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/10-commute.png
[D10]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/10-commute.png
[L11]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/11-playlist-settings.png
[D11]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/11-playlist-settings.png
[L12]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/12-playlist-rename.png
[D12]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/12-playlist-rename.png
[L13]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/13-new-playlist.png
[D13]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/13-new-playlist.png
[L14]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/14-trash.png
[D14]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/14-trash.png
[L15]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/15-search-rice.png
[D15]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/15-search-rice.png
[L16]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/16-edit-view.png
[D16]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/16-edit-view.png
[L17]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/17-new-view.png
[D17]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/17-new-view.png
[L18]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/18-podcast-market-hours.png
[D18]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/18-podcast-market-hours.png
[L19]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/19-description-expanded.png
[D19]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/19-description-expanded.png
[L20]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/20-unsubscribe-armed.png
[D20]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/20-unsubscribe-armed.png
[L21]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/21-unsubscribe-disarmed.png
[D21]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/21-unsubscribe-disarmed.png
[L22]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/22-subscription-settings.png
[D22]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/22-subscription-settings.png
[L23]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/23-add-to-playlist.png
[D23]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/23-add-to-playlist.png
[L24]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/24-add-podcasts.png
[D24]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/24-add-podcasts.png
[L25]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/25-download-rules.png
[D25]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/25-download-rules.png
[L26]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/26-now-playing.png
[D26]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/26-now-playing.png
[L27]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/27-settings-general-top.png
[D27]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/27-settings-general-top.png
[L28]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/28-settings-general-middle.png
[D28]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/28-settings-general-middle.png
[L29]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/29-settings-general-bottom.png
[D29]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/29-settings-general-bottom.png
[L30]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/30-settings-automation.png
[D30]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/30-settings-automation.png
[L31]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/31-listening-stats.png
[D31]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/31-listening-stats.png
[L32]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/32-getting-started.png
[D32]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/32-getting-started.png
[L33]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/33-multi-selection.png
[D33]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/33-multi-selection.png
[L34]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/34-rewind-summary.png
[D34]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/34-rewind-summary.png
[L34a]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/light/34a-timeline-rewind-button.png
[D34a]: /Users/sarvagnan/Documents/podlist-grading/mac-round-13/dark/34a-timeline-rewind-button.png
[NOTICE]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/EditingNotice.swift
[MODEL]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/LibraryModel.swift
[SYSTEM]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-309ab30f-774f1536307a714f/apps/apple/Sources/PodListUI/SystemPlayback.swift
