# Mac accent and Appearance (pod-apx.5.23)

The Light accent remains the owner's sRGB brand blue, `#2B50C8`. Dark uses
`#D1DDFF`. Increase Contrast uses `#193A9B` in Light and `#E5EBFF` in Dark.
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

| Dark surface | sRGB background | Dark `#D1DDFF` | Increase Contrast `#E5EBFF` |
| --- | --- | ---: | ---: |
| Native window / control / text background | `#1E1E1E` | 12.30:1 | 14.02:1 |
| Native under-page background | `#282828` | 10.88:1 | 12.40:1 |
| Native active selected content (system blue) | `#0059D1` | 4.63:1 | 5.27:1 |
| Native inactive selected content | `#464646` | 6.97:1 | 7.94:1 |
| Audited sidebar material | `#222B38` | 10.54:1 | 12.01:1 |
| Audited Inspector material | `#212931` | 10.87:1 | 12.38:1 |
| Audited row surface | `#212427` | 11.51:1 | 13.12:1 |
| Audit reference sheet surface | `#22262F` | 11.18:1 | 12.74:1 |

The suggested `#7D97FF` would give only 2.31:1 on the active blue selection and
3.48:1 on the inactive selection. The paler Dark value is deliberate: the
selected-row Current Entry marker must remain readable too. The old brand blue
gave 1.39:1 on `#464646`, matching the audit's 1.4:1 failure.
The player uses SwiftUI's `.bar` material; sheets use system backgrounds. The
tests cover the native window/control baselines and supplied tinted samples,
with both selection colours providing more demanding contrast checks. Their
wallpaper-dependent composited pixels still need the owner's real-app check.

| Light surface | sRGB background | Light `#2B50C8` | Increase Contrast `#193A9B` |
| --- | --- | ---: | ---: |
| Native window / control / text background | `#FFFFFF` | 6.81:1 | 9.91:1 |
| Native under-page background | `#F6F6F6` | 6.30:1 | 9.17:1 |
| Native inactive selected content | `#DCDCDC` | 4.97:1 | 7.22:1 |

Artwork placeholders composite 12% dynamic accent over an opaque native window
background, so initials cannot inherit a selected-row fill through the tile.
Initials contrast is 5.67:1 / 8.04:1 in Light / increased Light and 9.06:1 /
10.07:1 in Dark / increased Dark. Custom accent-filled Play uses white in Light
and `#111827` in Dark: glyph contrast is 6.81:1 / 9.91:1 and 13.09:1 / 14.92:1,
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
resolve through that colour.

## Verification

`apps/apple/Tests/PodListUITests/AppearanceTests.swift` checks all four palette
values, the documented surfaces and current native Dark colours, artwork
compositing, filled-control glyphs, primary Inspector text and live defaults
observation (Dark → Light → Dark → System). A separate provider test checks the
actual drawing appearance match, including when Increase Contrast is enabled.
The pre-fix Dark contrast test failed
with 18 expectations, including the inactive selection at 1.39:1.

AppKit's accessibility appearance names are matching targets; constructing
`NSAppearance(named: .accessibilityHighContrastDarkAqua)` alone does not enable
Increase Contrast. The tests therefore exercise those two palette branches
directly without changing the user's accessibility settings. Native drawing
resolution is exercised for ordinary Aqua and Dark Aqua. Real-window appearance,
material rendering and live accessibility toggles remain for the owner's GUI
verification; no GUI was launched or driven for this change.

Validation: the complete required `swift test --scratch-path .build
--disable-sandbox` run passed all 177 tests (94 UI, 29 domain, 54 data).
The MCP socket tests require running outside the agent sandbox, whose socket
bind restriction caused the first full run to fail. The Mac bundle build via
`apps/apple/scripts/build-mac-app.sh` passed, including signing and App Intents
metadata extraction (9 intents, 2 entities, 3 shortcuts).
