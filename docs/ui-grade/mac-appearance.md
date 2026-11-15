# Mac accent and Appearance (pod-apx.5.23)

The Light accent remains the owner's sRGB brand blue, `#2B50C8`. Dark uses
`#9DB1FF`. Increase Contrast uses `#193A9B` in Light and `#B2C1FF` in Dark.
`Color.podListAccent` wraps an `NSColor(name:dynamicProvider:)` that asks the
drawing appearance for its best match among all four variants. AppKit resolves
the colour again as appearance or accessibility contrast changes.

## Contrast

Ratios use WCAG sRGB linearisation and `(Llighter + 0.05) / (Ldarker + 0.05)`.
The native colours below were resolved headlessly from AppKit on macOS 26 using
`NSAppearance.performAsCurrentDrawingAppearance` and `usingColorSpace(.sRGB)`.
The composited sidebar, Inspector, row and reference sheet fixtures come from the
[round-1 Codex audit](mac-round-1-codex.md)
(APPEAR-04) and the [Opus audit](mac-round-1.md) (APPEAR-04's suggested sheet
surface). They retain the audit's measured colours alongside native baselines;
material pixels can change with the wallpaper and window activation.

| Dark surface | sRGB background | Dark `#9DB1FF` | Increase Contrast `#B2C1FF` |
| --- | --- | ---: | ---: |
| Native window / control / text background | `#1E1E1E` | 8.07:1 | 9.50:1 |
| Native under-page background | `#282828` | 7.14:1 | 8.40:1 |
| Native inactive selected content | `#464646` | 4.57:1 | 5.38:1 |
| Audited sidebar material | `#222B38` | 6.91:1 | 8.14:1 |
| Audited Inspector material | `#212931` | 7.13:1 | 8.39:1 |
| Audited row surface | `#212427` | 7.55:1 | 8.89:1 |
| Audit reference sheet surface | `#22262F` | 7.33:1 | 8.63:1 |

Dark keeps the blue channel at full intensity, with a hue near the brand blue,
and is only slightly above the limiting inactive-selection threshold (4.57:1).
It remains visibly blue beside white primary text: 2.07:1 in Dark and 1.76:1
with Increase Contrast, both above the 1.6:1 distinction floor. Increase Contrast
is lighter while retaining that distinction.

The active selected-content fill (`#0059D1`) is **not** an accent contrast
requirement. SwiftUI supplies the emphasised selection's foreground instead:
`MacRowAccentStyle.resolve(in:)` checks `EnvironmentValues.backgroundProminence`
inside the row. For `.increased` it returns the inherited `.primary` shape style,
not a fixed white colour; otherwise it returns the dynamic accent. On the native
active blue fill, white selection text gives 6.27:1. The accents themselves would
give 3.04:1 / 3.57:1 there and are intentionally not drawn on that fill.

The player now uses untinted regular Liquid Glass. Its text, symbols and native
control tint use semantic primary rather than drawing the brand blue against an
unknown glass backdrop. Sheets retain system reading backgrounds; only their
custom control chrome uses glass. The tests cover native window/control
baselines, inactive selection and supplied tinted samples. Wallpaper-dependent
composited pixels still need a real-app check.

| Light surface | sRGB background | Light `#2B50C8` | Increase Contrast `#193A9B` |
| --- | --- | ---: | ---: |
| Native window / control / text background | `#FFFFFF` | 6.81:1 | 9.91:1 |
| Native under-page background | `#F6F6F6` | 6.30:1 | 9.17:1 |
| Native inactive selected content | `#DCDCDC` | 4.97:1 | 7.22:1 |

Artwork placeholders composite 12% dynamic accent over an opaque native window
background, so initials cannot inherit a selected-row fill through the tile.
Initials contrast is 5.67:1 / 8.04:1 in Light / increased Light and 6.40:1 /
7.33:1 in Dark / increased Dark. Welcome's prominent Connect button uses white
in Light and `#111827` in Dark: glyph contrast is 6.81:1 / 9.91:1 and 8.59:1 /
10.11:1, respectively. Inspector Play now uses a native glass button with a
semantic primary glyph. Native controls retain their standard styles.

Inspector metadata, download status, labelled values and the empty-state
description use primary text. The native primary label's alpha is included in
the tests: it gives approximately 10.95:1 over the audited Dark Inspector fill
and 14.07:1 over Light's native under-page background.

## Application appearance

`MacApplicationDelegate.applicationWillFinishLaunching` creates and retains one
`MacAppearanceController`. It reads `PodList.appearance` before the first window
and observes UserDefaults changes for the application's lifetime. On the main
actor it sets `NSApplication.shared.appearance` to Aqua for Light, Dark Aqua for
Dark, or **nil** for System (and unknown values). Nil leaves live macOS appearance
changes to AppKit; System is never converted into a cached Light or Dark value.

All `.preferredColorScheme` overrides are removed. Library windows, Listening
stats, Help, both Settings panes and sheets inherit the application appearance.
Every scene gets the dynamic brand tint, and chart bars explicitly use the same
dynamic accent. Existing artwork, Current Entry and Active Playlist marks also
resolve through that colour, with row marks using the selection foreground when
the row is emphasised.

## Selected-row audit

All explicit accent content on selectable rows now uses `MacRowAccentStyle`:

- `MacWindow.swift`, sidebar item label icons and the Active Playlist speaker.
- `MacWindow.swift`, `episodeTitle`: Current Entry text and location marker,
  Add (+) and Play Now buttons (View and Search episode tables).
- `MacWindow.swift`, `subscriptions`: the Open chevron button.
- `PlaylistContentView.swift`, `entryTitle`: Current Entry text and location
  marker, plus the Play from Here button.
- `PodcastScreens.swift`, `PodcastPageScreen` episode table: Add (+) and Play
  buttons, including Episodes not yet brought into the local Library.

The sidebar's action buttons, All Views plain buttons, directory result controls,
Listening Timeline Rewind and Trash Restore retain native control styles and
have no fixed accent foreground. History rows have only semantic text. Context
menus retain native menu styles. Their selection rendering stays with SwiftUI.
Artwork initials are an intentional exception: their opaque window-background
tile isolates the dynamic accent from the row highlight. Charts, artwork
placeholders and non-row markers continue using the dynamic accent.

## Verification

`apps/apple/Tests/PodListUITests/AppearanceTests.swift` checks all four palette
values, the documented surfaces and current native Dark colours, the 1.6:1
minimum distinction from white for both Dark variants, artwork compositing,
filled-control glyphs, primary Inspector text and live defaults observation
(Dark → Light → Dark → System). The active selected background is excluded from
the accent's 4.5:1 requirement. A separate provider test checks the actual drawing
appearance match, including when Increase Contrast is enabled.

`rowAccentInheritsSelectionForegroundOnlyOnEmphasisedRows` renders the actual
row shape style with `ImageRenderer`, using both standard and increased
`backgroundProminence` in Light and Dark. Pixel checks confirm standard rows
keep the dynamic accent, while emphasised rows inherit either white or a supplied
green foreground. The latter catches a hard-coded white fallback. This runs
headlessly; it does not simulate AppKit's native selected-row environment.
The audited call sites above attach the style inside row content, where SwiftUI
supplies that environment.

AppKit's accessibility appearance names are matching targets; constructing
`NSAppearance(named: .accessibilityHighContrastDarkAqua)` alone does not enable
Increase Contrast. The tests therefore exercise those two palette branches
directly without changing the user's accessibility settings. Native drawing
resolution is exercised for ordinary Aqua and Dark Aqua. Real-window appearance,
material rendering and live accessibility toggles remain for GUI verification;
no GUI was launched or driven for this change.

Validation of the accent revision: the required `swift test --scratch-path .build
--disable-sandbox` command, with both module-cache environment variables set,
passed all 178 tests (95 UI, 29 domain, 54 data). The full suite ran outside the
agent sandbox for its local MCP socket tests. `apps/apple/scripts/build-mac-app.sh`
also passed, including signing and App Intents extraction (9 intents, 2 entities,
3 shortcuts). The six focused appearance tests passed headlessly in the sandbox.

## Liquid Glass (pod-apx.5.37)

`MacGlass.swift` applies `.glassEffect(.regular, in:)` after each custom control
surface's padding and layout. The bottom player remains in the bottom safe-area
inset, with an eight-point margin and one glass surface; its transport buttons
remain borderless so glass is not stacked inside glass. The Inspector keeps its
system pane and plain metadata/show notes. Its action strip uses regular glass,
and its large Play/Pause button uses `.glass` with `.buttonBorderShape(.circle)`.
`GlassEffectContainer` groups those neighboring effects. Now Playing groups its
transport surface and pinned Done footer in another `GlassEffectContainer`.
The View editor's pinned action footer also uses regular glass, with feedback
kept outside it on the reading surface. Ordinary
forms and sheet content keep their native backgrounds and controls. No toolbar
or sidebar background/material overrides suppress the SDK's standard glass.

All custom glass is untinted, with semantic primary text/symbols and control tint.
Player failures also use primary text on glass, retaining their message and Retry.
The dynamic brand palette still applies to known content backgrounds, selected
rows, artwork placeholders and ordinary native controls. Artwork keeps its opaque
base even inside the player, preserving the measured initials contrast above.

Either Reduce Transparency (`accessibilityReduceTransparency`) or Increase
Contrast (`colorSchemeContrast == .increased`) switches custom surfaces to an
opaque native `windowBackgroundColor` with an outline; Increase Contrast gets
the stronger outline. The Play/Pause glass button switches to the native
bordered style under either setting. These are live SwiftUI environment values.
System toolbar, sidebar, sheets and controls retain system accessibility handling.
`glassAccessibilityFallbackBlocksTheBackdropAndKeepsTextReadable` renders both
Light and Dark over red and green backdrops, passes each setting separately and
jointly to the rendering modifier, and checks opaque center pixels and
primary-text contrast ≥4.5:1. These system environment properties are read-only;
the test doesn't change the user's settings or simulate their live propagation.

Glass modifiers preserve `macTextScale`; player reading text now uses
`macContentFont` and inherits the preference instead of resetting it to 100%.
`glassPlayerBarReflowsAtEnlargedTextSizesWithoutAScreen` renders the actual bar
at 100% and 200%, at 760- and 1180-point widths.
No screen is available in this implementation sandbox: regular glass's live
wallpaper compositing, inactive-window appearance and the native AX tree need
the existing UI test tour on a GUI host. Existing labels and identifiers are
preserved in source.

Validation: the required `swift test --scratch-path .build --disable-sandbox`,
with both module-cache environment variables set, passed all 218 tests
(135 UI, 29 domain, 54 data). It ran outside the sandbox for the local MCP socket
and system type-registration tests. `scripts/build-mac-app.sh` from `apps/apple`
passed, including signing and metadata extraction (9 intents, 2 entities,
3 shortcuts); no App Intents source was changed. The known
`gettingStartedNeverReplacesNumbersWithCheckMarksOrDoneLabels` image-comparison
flake failed once in an earlier full run and passed in both subsequent full runs.

## Round 2 contrast and feedback fixes (pod-apx.5.44, .47, .48)

Before measurements below use the supplied round-2 PNGs' fully covered glyph
pixels and dominant local fill, read as raw RGB samples (no image-profile
conversion). This reproduces the graders' sRGB calculation. The 2.13:1
Subscribed failure is in **Light**, rather than Dark; Dark's original green
passes, but now uses the same semantic label treatment as Light.

After values are **headless color/surface checks**, rather than new app captures.
The section picker opts out of inherited brand tint with `.tint(nil)` and uses
native selection colors. Subscribed uses semantic primary on a neutral native
button. Armed Unsubscribe uses the error foreground on that same neutral button.
The brand accent and selected-row foreground rules remain unchanged.

| Element / appearance | Before foreground / fill | Before | After foreground / reference fill | After |
| --- | --- | ---: | --- | ---: |
| Selected section, Dark (`dark/06`) | `#FFFFFF` / `#9FB3FF` | 2.03:1 | Native selection `#FFFFFF` / `#0059D1` | 6.27:1 |
| Subscribed, Light (`light/18`) | `#34C759` / `#F5FCF7` | 2.13:1 | Native label on native control `#FFFFFF` | 14.94:1 |
| Subscribed, Dark (`dark/18`) | `#30D158` / `#252B25` | 7.16:1 | Native label on native control `#3F3F3F` | 8.10:1 |
| Armed Unsubscribe, Light (`light/20`) | `#FF383C` / `#FFF5F5` | 3.34:1 | `#B91C1C` on original fill / native white control | 6.05:1 / 6.47:1 |
| Armed Unsubscribe, Dark (`dark/20`) | `#FF4245` / `#2F2424` | 4.37:1 | `#FF9FA1` on original fill / native `#3F3F3F` control | 7.67:1 / 5.38:1 |
| Validation, Light (`light/17`, also `light/13`) | `#FF383C` / `#FFFFFF` | 3.57:1 | `#B91C1C` / `#FFFFFF` | 6.47:1 |
| Validation, Dark (`dark/17`) | `#FF4245` / `#292726` | 4.33:1 | `#FF9FA1` / `#292726` | 7.59:1 |
| Secondary/help text, Light (`light/27`; also rows, dates, descriptions, sync status) | `#808080` / `#FFFFFF` | 3.95:1 | Semantic primary / `#FFFFFF` | 14.94:1 |

`AppearanceTests.roundTwoErrorsAndSecondaryTextMeetContrastInBothAppearances`
keeps the exact captured surfaces as fixtures and checks regular text at 4.5:1.
Dark's red was increased again after the test caught 4.03:1 on the documented
inactive-selection gray: `#FF9FA1` now gives 4.82:1 on `#464646`.
Increase Contrast has separate darker Light and brighter Dark error variants.
Native semantic primary preserves SwiftUI's foreground on emphasized rows;
hierarchy also retains its existing font sizes and weights.

`FeedbackAnnouncements` is the shared posting path:
`NSAccessibility.post(... notification: .announcementRequested ...)` targets the
application, with medium priority for status and high priority for errors.
`PlaylistEditingModel` posts each notice once at its source; Library/import
notices already use that model. `ApplicationModel` shares its announcer and
reports download completion/failure transitions, ignoring stored downloads loaded
at startup. Error changes in models, inline forms, `EditingFeedback` and shared
`FailureFeedback` route through the same error deduplication. Repeated attempts
and repeated successful operations can still announce the same wording again.

Rename focuses from the newly inserted name field's task. Optional View fields
have persistent Optional labels while preserving their existing accessibility
labels. New-name validation waits for an actual edit or submission, including
when the person types and then deletes the first character. Tour assertions
check keyboard entry after Rename, absence of initial empty-name errors, and
persistent Optional labels. The tour is built here; focus, actual composed
pixels and VoiceOver speech still require running it on a GUI host.

Final validation: all **235 Swift tests passed** (152 UI, 29 domain, 54 data)
using the required module-cache environment variables and
`swift test --scratch-path .build --disable-sandbox`. The complete suite ran
outside the filesystem sandbox for existing local MCP socket and macOS type
registration tests. `scripts/build-mac-app.sh` succeeded, including signing and
metadata extraction (13 intents, 2 entities, 4 shortcuts).
`xcodebuild build-for-testing -project PodListUITour.xcodeproj -scheme PodListUITour
-derivedDataPath .build/ui-tour-derived` succeeded. The UI tour itself was not
run because this implementation sandbox has no screen.

## Round 3 readable secondary and sidebar sizing (pod-apx.5.55, .54)

`MacReadableSecondaryStyle` is the shared reading-text hierarchy below primary.
Its opaque `Color.podListReadableSecondary` resolves through the drawing
appearance: `#606060` in Light and `#A0A0A0` in Dark. Increase Contrast uses
`#505050` and `#C0C0C0`. It replaces the round-2 primary workaround on counts,
metadata, descriptions and help text; empty-state descriptions, the Subscriptions
Download Rule group headers (including Stream), and chart axis labels opt into
the same style explicitly. Chart grid lines and native sidebar section headers
remain system drawn. Player/glass text retains primary because its material
backdrop is not a known reading surface.

| Reading surface | Round-3 before | Shared secondary after |
| --- | ---: | ---: |
| Light white (`#FFFFFF`), empty descriptions / Stream / chart labels | `#808080`, 3.95:1 | `#606060`, 6.29:1 |
| Light white, metadata changed to primary in round 2 | Native primary, 14.94:1 | `#606060`, 6.29:1 |
| Light under-page (`#F6F6F6`) | Native primary, 14.07:1 | `#606060`, 5.82:1 |
| Dark window (`#1E1E1E`) | System secondary passed (audit: about 5.7:1) | `#A0A0A0`, 6.38:1 |
| Dark under-page (`#282828`) | Primary workaround | `#A0A0A0`, 5.64:1 |
| Dark round-2 reading fill (`#2F2D2B`) | Primary workaround | `#A0A0A0`, 5.25:1 |
| Dark audited Inspector (`#212931`) | Primary workaround | `#A0A0A0`, 5.63:1 |
| Dark audited sidebar (`#222B38`) | Primary workaround | `#A0A0A0`, 5.46:1 |

After ratios above are WCAG calculations against documented surface fixtures,
not fresh window captures. Secondary remains distinct from primary; Increase
Contrast deliberately raises its ratios (7.46–9.16:1 on these surfaces).
`MacReadableSecondaryStyle` inherits `.primary` on emphasized rows. Callers also
supply selection state for sidebar counts and selected metadata in the standard
and enlarged Episode lists, History, Timeline and Trash. This protects inactive
selections too: the Dark secondary is intended for reading backgrounds, not the
lighter `#464646` inactive selection fill.

The failing Dark buttons are **Subscription Settings Done, Add to Playlist Play
Next, Download Rules Apply, and Rewind** (D22/D23/D25/D34). The D25 crop was
resampled headlessly: its solid fill is `#9DB1FF` and text is `#FFFFFF`, 2.07:1;
Light Apply remains `#2B50C8` / white, 6.81:1. `macDefaultAction()` now applies
`MacDefaultButtonStyle`: a native bordered-prominent button whose label explicitly
uses `podListOnAccent` **inside the label**, with brand tint on the native control.
Setting a foreground outside the native label does not reliably replace its
white default. The style forwards role and trigger and retains the default Return
shortcut. It is shared by all ordinary default actions (Create Playlist, Play
Next, Done, Apply, Rewind, Bring Over). Welcome Connect already explicitly pairs
its prominent fill with on-accent text and keeps that treatment.

Palette-pair ratios remain **6.81:1 Light / 8.59:1 Dark**, and **9.91:1 /
10.11:1** with Increase Contrast. Native rendering can adjust the palette colors;
the new rendering test checks the actual fully covered label and dominant fill,
in addition to the palette tests. It compares enabled and disabled native button
rendering in both appearances. This host's headless output, converted to sRGB,
measures **5.15:1 Light** (`#FFFFFF` on `#3868D2`) and **9.20:1 Dark**
(`#152034` on `#ADC1FF`). These are rendered button checks, not new tour captures.
Actual pressed/focused rendering, live Increase
Contrast, wallpaper-dependent materials and live Sidebar icon size changes still
need a GUI host; this implementation sandbox has no screen.

**Sidebar decision:** the sidebar always follows System Settings › Appearance ›
Sidebar icon size, at every app Text Size. The sidebar List has no explicit font,
its Active Playlist symbol inherits the sidebar font, and it resets the app's
`macTextScale` environment to 1. Text Size enlarges content text across windows,
not navigation chrome; the Settings explanation says so. The sidebar's
`navigationSplitViewColumnWidth(min: 180, ideal: 225, max: 320)` and its measurement
behavior are unchanged, preserving the fix described in pod-apx.5.51.

Validation: the required module-cache exports and `swift test --scratch-path
.build --disable-sandbox` passed **253 tests** (166 UI, 29 domain, 58 data).
The full suite ran outside the filesystem sandbox for its existing local MCP
socket and macOS registration tests; the new focused rendering/contrast tests
also passed inside the sandbox. `scripts/build-mac-app.sh` succeeded, including
signing and extraction of 13 intents, 2 entities and 4 shortcuts.
`xcodebuild build-for-testing -project PodListUITour.xcodeproj -scheme PodListUITour
-derivedDataPath .build/ui-tour-derived` succeeded. The UI tour was built, not run.
