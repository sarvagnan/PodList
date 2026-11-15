# Mac text size (AX-03)

Research and implementation, 15 November 2026. Xcode 27.2 SDK; deployment target macOS 26. No window server or screen is required for the added tests.

## What the platform supports

- `dynamicTypeSize` is declared on macOS, but does **not** enlarge Mac fonts. Apple's [EnvironmentValues.dynamicTypeSize documentation](https://developer.apple.com/documentation/swiftui/environmentvalues/dynamictypesize) explicitly documents that Mac behavior. A headless test also resolves body, caption, headline and title2 at `.large` and `.accessibility5` and verifies equal point sizes on macOS 27.2.1.
- The installed SwiftUICore interface declares `Font.scaled(by:)`, `Font.pointSize(_:)`, and `Font.resolve(in:)` as available from **macOS 26.0**. `scaled(by:)` preserves the chosen semantic font and multiplies its point size; [Apple's Font reference](https://developer.apple.com/documentation/swiftui/font) documents those methods. The test verifies the four styles reach exactly 200% through this API. This is the supported font mechanism for both the app's macOS 26 minimum and macOS 27.
- The installed macOS 27.2 public SwiftUI/SwiftUICore interfaces expose no numeric subtree/per-app text-size multiplier. `View.textScale` takes `Text.Scale`, whose only public choices are `.default` and `.secondary`; it is not a 100–200% control. `fontResolutionContext` is read-only. Setting a single root `.font(.body.scaled(by: ...))` would leave descendants' explicit `.caption`, `.title2`, etc. at their original sizes.
- AppKit's `NSFont.h` exposes `preferredFont(forTextStyle:options:)` (macOS 11) and explicit system font sizes, but no app-controlled preferred content-size category. Inspection of NSApplication, NSView and NSWindow headers found no per-app reading-size setter.
- Xcode's bundled `SwiftUI-Styled-Text-Editing.md` describes semantic fonts, line limits, and Dynamic Type. Its `.dynamicTypeSize(.large)` example is not a Mac-specific enlargement API. The bundled documentation directory contains no newer per-app numeric text-size API.

SDK sources inspected under `/Applications/Xcode-27.2.0.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/`:

- `System/Library/Frameworks/SwiftUICore.framework/Versions/A/Modules/SwiftUICore.swiftmodule/arm64e-apple-macos.swiftinterface`: Font.Context and read-only fontResolutionContext (4133–4156), Font.resolve (11717–11757), Dynamic Type (15004–15025), Font.scaled (15517–15520), Text.Scale/textScale (16592–16620).
- `System/Library/Frameworks/SwiftUI.framework/Versions/A/Modules/SwiftUI.swiftmodule/arm64e-apple-macos.swiftinterface`: List/Table sizing and public environment APIs.
- `System/Library/Frameworks/AppKit.framework/Versions/C/Headers/{NSFont,NSFontDescriptor,NSApplication,NSView,NSWindow}.h`.

Bundled documentation: `/Applications/Xcode-27.2.0.app/Contents/PlugIns/IDEIntelligenceChat.framework/Versions/A/Resources/AdditionalDocumentation/SwiftUI-Styled-Text-Editing.md` (semantic font examples at 17–46; Dynamic Type example around 381). The installed Xcodes contain macOS 27 SDKs; macOS 26 availability is established from SDK annotations, not a separate macOS 26 runtime execution.

## Implementation

`MacTextSizePreference` owns one device-local UserDefaults value, `PodList.textSizePercent`, bounded to 100–200%. All windows, sheets and Settings share the app's observable instance. View › Bigger (⌘+), Smaller (⌘−), Actual Size (⌘0), and Settings › General › Text Size update that instance. Commands step by 10 percentage points and disable at the bounds. An audit of existing keyboard shortcuts found no binding to +, =, −, or 0; the app uses TextEditingCommands, not TextFormattingCommands.

One root environment value supplies the multiplier. `macContentFont` applies the standard `Font.scaled(by:)` operation to explicit semantic styles and the content's default body font. Explicit reading styles require mechanical helper substitutions because SwiftUI has no public root override for them. Artwork and explicitly sized glyphs keep their dimensions. Navigation titles, toolbar items, Settings tabs, menus, and the transport bar retain system sizing.

Above 100%, Library, Playlist Entries and Podcast episode tables adapt to selectable native Lists: full titles wrap, metadata moves beneath each title, and row height follows the text. Sort controls reuse the same sort state as column headers. Selection, copy, context menus and primary actions remain attached to the enclosing presentation; Playlist drag/drop and delete remain available. At 100%, the existing column tables remain. Sidebar and Subscription rows grow vertically; Inspector/show notes and sheet/Settings content use their existing scrolling containers. ContentSizedPanel continues measuring sheet and Settings content, with a scroll limit for available height.

## Integration with drag and drop and window restoration

Reapplied `95bbf81` to main at `528b42c` on `t3/mac-app-text-scaling-2`. The three conflicting presentations retain main's explicit `TableRow` drag sources and gain the wrapping List alternative. Each presentation shares its title/actions and enclosing selection context menu, primary action, keyboard handlers and accessibility modifiers between the two layouts. Drag payload helpers are shared as well.

| Feature | View / Search | Playlist Entries | Podcast page |
| --- | --- | --- | --- |
| Episode drag source | Preserved: ordered local selection | Preserved: ordered local selection plus source Playlist | Preserved: ordered local IDs or publisher feed/GUID references |
| Entry reordering | N/A | Preserved: native insertion indexes in both layouts call the same validated EpisodeTransfer move handler | N/A |
| Selection context menu and primary action | Preserved | Preserved | Preserved, including publisher Episodes awaiting local preparation |
| Native Copy command | Preserved | Preserved | N/A: main's Podcast Table has no native Copy handler |
| Native Delete command | N/A: main has no handler | Preserved: Remove from Playlist, guarded while busy | N/A: main has no handler |
| Selection and restored state | Same WindowModel and SceneStorage context | Same restored selection and Entry order | Same restored selection, including publisher GUIDs, and podcastSort binding |
| Focused menu values | Shared window Episode and Library command context | Shared window Episode context, Playlist and Rewind values | Shared window Episode context, Podcast, Details and Play Selection values |
| Accessibility | Shared row/action labels; List label describes sort controls | Shared row/action labels and reordering guidance | Shared action labels; List label describes sort controls |

The layout switch introduces no navigation or selection resets. View/Search and Podcast Lists render rows using the same restored comparator arrays as their Tables. Since Lists have no sortable column headers, their section header supplies **Sort by** and **Descending** controls that update the same persisted state. **Default order** clears an explicit override and returns to the View/library order; changing direction retains restored secondary comparators. The controls stack when enlarged text needs more width. Playlist Entries keep Playlist order at every size; drag insertion points, Move Up and Move Down change it.

## Integration with Mac craft fixes

Reapplied `71e9b4d` onto main at `f819cfc` on `t3/mac-app-text-scaling-3`. All ten overlapping files were reconciled. Main's capitalisation, plural-aware counts, red armed Unsubscribe, consolidated feedback and Retry actions, plain sidebar actions, contextual toolbar and Inspector visibility, symbols, Open in New Window, Clear on Played explanation, chart minutes label and column widths are retained.

Craft headings retain both their semantic font and bold weight through `macContentFont(...).bold()`. The detail container keeps its top-anchored frame alongside its scaled body font. The Podcast Table and enlarged List share the extracted row actions, including main's `text.badge.plus` symbol; the Table keeps its minimum Episode column width of 240 points. Feedback retains main's single message and custom Undo/Redo callbacks, while allowing multiline text above 100%. The parity table above still applies, including restored sort/selection, focused values, native Copy/Delete handlers and insertion-based Playlist reordering.

## Validation

Added tests cover the default, persistence across new preference instances, Bigger/Smaller/reset, repeated boundary commands, direct out-of-range settings, invalid persisted data, semantic font point sizes, and multiline row growth at 200% and narrower widths using ImageRenderer without a screen.

The required full command passed on `t3/mac-app-text-scaling-3`, based on `f819cfc`: **216 tests** (133 UI, 29 domain, 54 data), including all five text-size tests. From `apps/apple`:

```sh
export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache" SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache"
swift test --scratch-path .build --disable-sandbox
scripts/build-mac-app.sh
```

The first test run compiled successfully but failed five existing tests (seven reported issues): the sandbox blocked local MCP socket binding and system drag/drop type registration. The complete second run outside the sandbox passed. The Getting Started TIFF-image comparison, reported as intermittent on the earlier branch, passed in both runs here: **0 failures in 2 executions**. No tests were disabled or changed to avoid failures. The Mac build succeeded in the sandbox with 9 extracted intents, 2 entities, 3 shortcuts, and an ad-hoc signed `.build/PodList.app`. `git diff --check` passed. Visual interaction, native focus dispatch and drag gestures require a screen; validation here combines headless rendering, existing command/restoration/drag-data tests, source parity review and compilation.
