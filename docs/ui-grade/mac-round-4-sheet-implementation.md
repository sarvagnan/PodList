# Mac round 4 sheet consistency (pod-apx.5.63)

`PodListSheet` now owns every custom task sheet's title, scrolling content,
feedback area and pinned footer. The title is bold title2 with the accessibility
header trait. Name fields use the same native columns Form/LabeledContent
pattern. Secondary actions lead; Cancel and the action default trail, with the
default last. Footer actions reflow into two rows when their intrinsic widths
will not fit. Feedback stays on the reading surface above the footer.

All footers use one untinted regular Liquid Glass control surface through
`macGlassSurface()`, including Now Playing's modeless-window footer. This keeps
the established glass direction in `mac-appearance.md`. Reading content retains
native backgrounds. Reduce Transparency and Increase Contrast retain the shared
opaque window-background/outline fallback. This follows Apple's distinction
between the functional control layer and reading content in
[Materials](https://developer.apple.com/design/human-interface-guidelines/materials).

Enabled defaults retain the tested brand-fill/on-accent pair. Disabled defaults
use the native bordered-prominent button's entire disabled treatment, including
its label, rather than forcing white/on-accent onto the disabled fill. The
rendering test compares the actual disabled result to a native reference in
Light and Dark; it does not claim a newly measured screen contrast ratio.

## Sheet and keyboard inventory

Every row uses the common glass footer and content-limited scrolling. The
Now Playing row is a window, included because it shared the old footer chrome.

| Title | Default verb / Return | Leading secondary actions | Trailing footer / Escape | Apply choice |
| --- | --- | --- | --- | --- |
| New Playlist | Create Playlist; valid unique name and idle | — | Cancel / Create Playlist; Esc cancels | Create on submit; retained draft |
| New View | Create View; valid name and fields, idle | — | Cancel / Create View; Esc cancels | Create on submit |
| Edit View | Save; valid fields, idle, outside rename | Delete View | Cancel / Save; Esc rolls back | Existing session-scoped live preview and rollback retained; Save finishes the session |
| Playlist Settings | Save; outside rename, valid staged name, idle | Delete Playlist | Cancel / Save; Esc discards settings | Rename and Clear on Played stage locally; one reversible edit on Save |
| Add … to a Playlist | Play Next; valid target/name, idle | Play Now, Play Last | Cancel / Play Next; Esc cancels | Existing placement actions retained; default is now last |
| Download Rules for … | Apply; idle and nonempty selection | — | Cancel / Apply; Esc cancels | Apply draft to selected Subscriptions |
| … Settings (Subscription) | Save; idle | — | Cancel / Save; Esc discards settings | Overrides, threshold, Device rule and Mark All Played stage locally; one reversible edit on Save |
| Add Podcasts | Search; valid nonempty query, not searching | — | Close; Esc closes | Search/Subscribe remain explicit independent operations; closing does not undo subscriptions |
| Import OPML | Import when a nonempty selection is ready; Close otherwise | Choose a Different File when ready | Cancel / Import when ready; Close otherwise; Esc closes | Import starts explicitly; closing progress leaves the app-owned job running |
| Bring this Mac’s Library over? | Bring Over | — | Not Now / Bring Over; Esc declines | Existing explicit accept/decline transaction |
| Getting Started | Dismiss | — | Dismiss; Esc dismisses | Read-only introduction |
| Go to Time | Go; valid position for the same current Episode | — | Cancel / Go; Esc cancels | Seek on submit |
| Now Playing (window) | Existing Return behavior retained | — | Done; Esc closes | Modeless live playback controls |

Playlist's inline rename retains focus transfer, Cancel Rename and Return to
save the name draft. Its local verb is **Save Name**, distinguishing it from the
sheet-level **Save** that writes both settings. Edit View's existing inline
rename Return, local history, session rollback, and failure recovery remain.
Default Playlist protections and database name validation remain in force.

## DLG-07 choices

Playlist Settings and Subscription Settings stay attached to their current
object as finite, cancelable tasks. Save applies their drafts; Cancel has no
write to reverse. Subscription's Mark All Played is a selection that Save
applies, including when invoked by its focused Podcast menu command. The same
Undo restores the settings and Played/Entry state using existing domain
semantics. Save with no changes simply closes. Failures retain drafts and the
shared error announcement/Retry path.

Playlist Delete is an independent destructive verb: its help explicitly says it
takes effect immediately and closes settings, and Trash/Undo remain available.
Edit View already supports cancelable preview through a session ID and a tested
rollback; it keeps that behavior with Save instead of Done. The independent
General/Automation Settings window, inline Download Rules on Podcast pages, and
Now Playing remain modeless live surfaces. No misleading Cancel is added to
those surfaces. These choices follow
[Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets):
a modal task must provide an honest way to discard changes; supplementary live
work can use a nonmodal surface.

Discovery's separate DLG-08 modeless-lookup request is outside this bead; its
existing search, subscription, stale-result cancellation and query draft remain.
OPML progress and Getting Started are progress/read-only surfaces with explicit
Close/Dismiss rather than a save-like Done.

## Tour and validation

The tour now dismisses Playlist Settings with Cancel and discovery with Close.
It asserts that New View has a disabled Create View default and no Done. Existing
Subscription Settings Escape and Return checks now exercise Cancel and Save.
Other labels used by the tour, including Cancel Rename, Dismiss, Go and Now
Playing's Done, are retained.

The required Swift command passed **279 tests** (190 UI, 30 domain, 59 data).
This includes staged Playlist/Subscription settings, one-step Undo, untouched
field protection, native disabled rendering in both appearances, existing View
rollback/failure recovery, feedback announcements, keyboard guards and import
lifetime tests. The full suite ran outside the filesystem sandbox for its local
MCP sockets and macOS type-registration tests. No app or UI tour was launched:
this sandbox has no screen. Live focus/VoiceOver speech, glass compositing and
new paired captures still require the authorized GUI-host tour.

`scripts/build-mac-app.sh` succeeded, including ad-hoc signing and extraction of
13 intents, 2 entities and 4 shortcuts. `xcodebuild build-for-testing -project
PodListUITour.xcodeproj -scheme PodListUITour -derivedDataPath
.build/ui-tour-derived` ended with **TEST BUILD SUCCEEDED**. `git diff --check`
passed. The UI-tour build emitted sandbox CoreSimulator logging/service warnings
but built the Mac test runner successfully; it did not run any UI tests.
