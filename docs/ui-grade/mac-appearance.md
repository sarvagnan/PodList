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

The player uses SwiftUI's `.bar` material; sheets use system backgrounds. The
tests cover native window/control baselines, inactive selection and supplied
tinted samples. Wallpaper-dependent composited pixels still need a real-app
check.

| Light surface | sRGB background | Light `#2B50C8` | Increase Contrast `#193A9B` |
| --- | --- | ---: | ---: |
| Native window / control / text background | `#FFFFFF` | 6.81:1 | 9.91:1 |
| Native under-page background | `#F6F6F6` | 6.30:1 | 9.17:1 |
| Native inactive selected content | `#DCDCDC` | 4.97:1 | 7.22:1 |

Artwork placeholders composite 12% dynamic accent over an opaque native window
background, so initials cannot inherit a selected-row fill through the tile.
Initials contrast is 5.67:1 / 8.04:1 in Light / increased Light and 6.40:1 /
7.33:1 in Dark / increased Dark. Custom accent-filled Play uses white in Light
and `#111827` in Dark: glyph contrast is 6.81:1 / 9.91:1 and 8.59:1 / 10.11:1,
respectively. The same foreground is used for Welcome's prominent Connect
button. Native controls retain their standard styles.

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

Validation of this revision: the required `swift test --scratch-path .build
--disable-sandbox` command, with both module-cache environment variables set,
passed all 178 tests (95 UI, 29 domain, 54 data). The full suite ran outside the
agent sandbox for its local MCP socket tests. `apps/apple/scripts/build-mac-app.sh`
also passed, including signing and App Intents extraction (9 intents, 2 entities,
3 shortcuts). The six focused appearance tests passed headlessly in the sandbox.
