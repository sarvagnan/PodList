# Hidden desktop captures

Run from the main session on macOS (requires the Swift compiler from Xcode Command Line Tools):

```sh
env -u ELECTRON_RUN_AS_NODE pnpm --filter @podlist/desktop ui:capture /tmp/podlist-desktop-grade
```

The command builds the desktop web bundle and MCP bridge, then launches Electron with `PODLIST_HIDDEN_WINDOW=1`. Each flow and appearance gets a fresh temporary profile and the shared web demo server, with `PODLIST_TEST_DEMO_NOW` set to the run date. It uses only local fictional podcasts and silent audio. Profiles, server databases and the compiled focus monitor are removed after the run.

The window stays hidden and cannot take native focus. macOS uses accessory activation policy, background throttling is off, and initially-hidden painting keeps Electron's default. With the environment variable unset, normal app behavior is unchanged.

Screens in both light and dark, at 1440×900 CSS pixels and scale 2:

- Shared web **browse** flow: Views (the first View on desktop), Commute, Default, Library.
- Shared **listen** flow: Default, play an Entry, playing, paused, skip forward, Commute, switch playback to Commute, playing.
- Shared **now playing** flow: Default, play an Entry, Now Playing with Chapters and Up next beside it, Up next, play an upcoming Entry, Episode page, close drawer.
- **Desktop**: Playlists, New Playlist dialog, Playlist settings, Trash, Search, results with Refine, View editor, Library, podcast details and settings, Episode details, Add podcasts, podcast search results, feed-address tab, Settings, OPML controls, Automation with MCP off and on, Listening Stats, Keyboard Shortcuts, Getting Started.
- **Setup**: server connection page and inline invalid-address error.

Appearance switches through `nativeTheme.themeSource`, with no CSS or Playwright color override. The current web UI and setup page have fixed light palettes (with a dark player), so many light/dark images will look identical. This captures the app's current behavior.

The shared definitions live in `packages/web/ui-flows/screens.mjs`. The web runner keeps its existing walks. Web-only second-tab takeover and the held web catalogue response are omitted from Electron; startup sync is awaited on every fresh desktop profile.

Output:

- `strips/<flow>/desktop-<light|dark>/NN-screen.png` and matching `.aria.txt` (`body.ariaSnapshot()`).
- `measurements.json` indexes screens; `summary.md` ends with PASS only if captures and guards pass.
- `menus.txt` walks the actual native application menu, excluding Services. Native UI roles are disabled for hidden mode, and the dump reflects those enabled states.
- `focus.json` records frontmost PIDs before and after, plus all NSWorkspace activation events during the run. Owner app switches are allowed; any activation of a capture Electron PID fails, including events received before Playwright reports that PID.
- `window-guard.json` records completed visibility checks. Main-process checks assert all BrowserWindows are invisible; show/focus event listeners also catch transient reveals. The run exercises `activate` and `second-instance` handlers.
- `README.md` in the output records capture scope and omissions. Partial output is retained on failure.

Native frames, native dialogs, context-menu popups, notifications and tray UI are **not captured**. OPML controls are pictured but never invoked; Open/Save dialogs and the owner's files are never opened. The owner's clipboard is not read or changed.

Electron capture and existing app tests must be verified from the main session, outside Codex:

```sh
cd packages/desktop
env -u ELECTRON_RUN_AS_NODE pnpm -s test:app
```
