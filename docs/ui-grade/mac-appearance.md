# Mac accent and Appearance (pod-apx.5.68)

Owner decision, 15 Nov 2026: adopt the macOS accent-colour convention (APPEAR-02).
PodList blue is used for controls only when System Settings › Appearance › Accent
colour is **Multicolor**. Other system accents take precedence. This follows
[Apple's accent-colour convention](https://developer.apple.com/design/human-interface-guidelines/color)
and the bundle's
[`NSAccentColorName`](https://developer.apple.com/documentation/bundleresources/information-property-list/nsaccentcolorname).

## Bundle and controls

`apps/apple/Resources/MacAssets.xcassets/AccentColor.colorset` contains opaque sRGB
Light `#2B50C8`, Dark `#9DB1FF`, high-contrast Light `#193A9B` and high-contrast
Dark `#B2C1FF`. `scripts/build-mac-app.sh` runs `xcrun actool` with `--platform
macosx`, `--target-device mac`, `--minimum-deployment-target 26.0` and
`--accent-color AccentColor`, writing `Assets.car` to `PodList.app/Contents/Resources`
before signing. Its main Info.plist declares `NSAccentColorName = AccentColor`.
This is a main-bundle resource, rather than a SwiftPM module resource. The script
fails if the compiled catalogue is missing; `assetutil` also verifies all four
packaged appearance variants and their exact sRGB values.

Library, Settings, Help, Getting Started, Listening Stats and Now Playing have no
brand tint override. Links, toggles, native controls and selections use the system
accent. The section picker retains native selection styling. Chart bars, sidebar
symbols, Current Entry marks and custom row actions use the resolved system
accent with the readable foreground fallback described below. Subscribe uses a
native button with semantic text; armed Unsubscribe retains its error foreground.

`podListOnAccent`'s appearance-only white/dark pairing is removed. Welcome Connect,
sheet footers and `macDefaultAction()` use `MacDefaultButtonStyle`, a thin wrapper
around native `.borderedProminent` buttons with their existing Return/Escape
shortcuts. Enabled labels choose black or white by the resolved accent's contrast,
rather than by Light/Dark appearance. Disabled labels, chrome and interaction are
fully native. The wrapper clears a glass footer's neutral tint so its fill and
contrast decision use the same system accent. Plain native bordered default
buttons were tried headlessly; they retained white labels on pale accents and
failed contrast, so the enabled-label correction remains necessary.
Untinted glass retains semantic primary symbols/text on its unknown backdrop.

## Contrast and accent fallbacks

Ratios use WCAG sRGB linearisation and `(Llighter + 0.05) / (Ldarker + 0.05)`.
A person can choose an accent unsuitable for small text, especially Yellow in
Light appearance. `MacAccentForegroundStyle` resolves `Color.accentColor` in the
current SwiftUI environment and checks native window, under-page and inactive
selected-content backgrounds. It uses the accent only if it reaches **4.5:1 on
all three**; otherwise it inherits semantic primary. Translucent accents also
fall back to primary. Native controls retain system handling.

`MacRowAccentStyle` reads `backgroundProminence` inside the row. Emphasized rows
always inherit `.primary`, preserving SwiftUI's selection foreground, including
non-white supplied foregrounds. Standard and inactive rows use the readable
accent fallback. Selected-row behavior is unchanged except that an unreadable
system accent can now fall back to primary.

Headless tests cover all eight system accent colour families, black/white
extremes and the four exact Multicolor palette values in both appearances. They
check the rendered fallback, its final foreground contrast on all three native
surfaces, and selection inheritance. Tests do not change the host's preferences.
The foreground fixtures measure at least **4.97:1 in Light / 4.57:1 in Dark**
after fallback. Actual rendered default-button labels measure **5.15–14.57:1
in Light / 5.15–15.49:1 in Dark**, across eight system colour families and all
four brand variants, with and without a Return shortcut. The minimum required
contrast is 4.5:1. Disabled controls are compared with the complete native
disabled treatment and are not held to the enabled-text contrast threshold.
The existing error and reading-secondary contrast rules remain in force.

## Brand identity

Only `Color.podListBrand` / `MacBrandPalette` provide explicit brand colour:

- Artwork placeholders: initials and a 12% brand wash over an opaque native
  window-background tile. The opaque base isolates them from selected-row fills.
- The non-interactive Welcome waveform mark: product identity, not a control.
- The existing app icon is untouched; this change adds no new icon artwork.

Artwork initials contrast remains **5.67:1 / 8.04:1** in Light / increased Light
and **6.40:1 / 7.33:1** in Dark / increased Dark. Multicolor's brand accent on
native white, under-page and inactive-selection backgrounds gives **6.81:1,
6.30:1, 4.97:1** in Light and **8.07:1, 7.14:1, 4.57:1** in Dark. Increase Contrast
raises those minimums to **7.22:1** and **5.38:1**. Active selections use the
inherited foreground rather than these foreground colours.

## Application appearance and verification

`MacAppearanceController` still applies Aqua for Light, Dark Aqua for Dark and
**nil** for System (or unknown values), observing UserDefaults for the application
lifetime. Every window, sheet and Settings pane inherits the application
appearance; no `.preferredColorScheme` overrides are used.

`AppearanceTests` verifies the source catalogue's four variants, identity palette
resolution and artwork compositing, actual default-button glyph/fill contrast for
each system accent and all four brand variants (with and without a Return
shortcut), native disabled rendering, readable
system-accent fallbacks, selected-row inheritance, errors, secondary text and
live defaults observation. AppKit's high-contrast appearance names are matching
targets; merely constructing one does not toggle Increase Contrast. Exact
high-contrast palette branches are tested directly.

This implementation sandbox has no screen. Live System Settings accent switches,
pressed/focused buttons, native selection compositing, live accessibility toggles
and wallpaper-dependent glass still require the standard UI tour on a GUI host.
The UI tour is built here, without launching it.

Validation for pod-apx.5.68: the required module-cache exports and
`swift test --scratch-path .build --disable-sandbox` passed **281 tests**
(192 UI, 30 domain, 59 data). The full suite ran outside the filesystem sandbox
for the existing local MCP socket and macOS registration tests. The seven focused
accent tests also passed inside the sandbox. `scripts/build-mac-app.sh` passed,
including verification of the four compiled `AccentColor` entries in the main
bundle, signing and extraction of 13 intents, 2 entities and 4 shortcuts.
`codesign --verify --deep --strict` passed, and the packaged Info.plist names
`AccentColor`. `xcodebuild build-for-testing -project PodListUITour.xcodeproj
-scheme PodListUITour -derivedDataPath .build/ui-tour-derived` succeeded.
The UI tour was built, not run.

## Earlier fixes

The following sections record earlier fixes and their validation. Their fixed
brand-tint and custom default-button descriptions are superseded by the system
accent convention above.

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
Controls now use the system accent. Custom foregrounds use the readable accent
fallback above; artwork placeholders retain the brand palette. Artwork keeps its opaque
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
