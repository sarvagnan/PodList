# Product behaviour

The shared product decisions for every client. [CONTEXT.md](../../CONTEXT.md) defines the domain language and rules; [client duties](../protocol/client-duties.md) specifies synchronization, playback and downloads. Presentation belongs in [web-layout.md](web-layout.md) for web and Electron and in each native platform's chosen layout document. Android's first design round is a proposal, not an agreed layout.

## Two equal halves

Finding (Views over the Library) and listening (Playlists with their own playback state) are peers. Neither is subordinate to the other. A View is a saved query, not a stored collection of Episodes. A Playlist is an ordered collection of Entries, not a View. People must be able to find, create and open both, and reach the Library and Settings.

## Views and Search

- A View shows its matching Episodes, count, conditions and ordering. Open Episode detail, Play Now, choose a Playlist for Play Next or Play Last, Star or Unstar, mark Played or Unplayed, and make or remove a Manual Download. Downloads in progress can be stopped; failed downloads can be retried.
- Support selecting multiple Episodes for Play Next, Play Last, Mark Played, Star and Download. Show which Playlist receives Play Next and Play Last; allow another target. Keep the selected Episodes in their displayed order when adding them together.
- Editing exposes all conditions: Published, Podcasts, Mentions (text), Played, Starred, In a Playlist and Length; then Sort and Show (limit). An unrestricted condition is Any. All conditions must match. Conditions are not added or removed.
- Played choices are Any, Unplayed (including in progress), In progress and Played. In progress means a Position exists on an Entry; it is not a separate Episode-level Played fact. Preserve the supported filter semantics in client duties, including the current absence of a positive In a Playlist filter.
- Condition edits apply as made, without Save. Show the live matching count and allow Undo of an edit. Let people rename or delete a View and finish editing. Renaming a View is an explicit step with Save and Cancel, like renaming a Playlist (owner, 10 Nov 2026).
- Search is the same query as an unsaved View, with Mentions filled in. Search titles, podcast names and available show notes. Saving Search as a View asks for a name.
- Distinguish loading from an empty result. With no Subscriptions, offer adding podcasts. With no matches, offer changing the View or Search. With no Views, offer creating one. A missing View gives a way back to Views.

## Play Now, Play Next and Play Last

These target the Active Playlist unless another Playlist is explicitly chosen. An Episode can be an Entry at most once in each Playlist; adding an existing Entry moves it instead of duplicating it.

- **Play Now:** put the Entry just before the Cursor and start it.
- **Play Next:** put the Entry just after the Cursor.
- **Play Last:** put the Entry at the end.

Add to a Playlist lets the person choose a Playlist, with the Active Playlist preselected, then choose Play Next or Play Last. It also allows creating a named Playlist and adding the Episode or selected Episodes in the same action. Explain an empty or duplicate name and preserve the input so it can be corrected.

## Episode detail

Show Artwork, podcast, full Episode title, Published, duration, Played, Starred and download status on this Device. Provide Played/Unplayed, Download, Play Now, Add to a Playlist and Star/Unstar. Give access to Play Next and Play Last. Sharing an Episode link is available in the existing product.

Show **In your Playlists** with each Entry's own Position and Resume action. Position is per Entry: the same Episode may have different Positions in different Playlists. Show Chapters with Chapter Artwork, and show notes. Artwork resolves Chapter, then Episode, then podcast. Missing metadata while Library synchronization catches up must not be presented as permanent loss.

## Playlists and Entries

- List Playlists with Entry counts, whether they are Active and whether they use Clear on Played. Create and open a Playlist. Renaming a Playlist is an explicit step with Save and Cancel, never applied while typing (owner, 10 Nov 2026). The Default Playlist always exists and cannot be renamed or deleted.
- A Playlist exposes Entries, History and Listening Timeline. Mark its Cursor, distinguish the Active Playlist from another Playlist and display each Entry's Position. The old layout's NOW/HERE labels are presentation; the underlying distinction must remain available.
- Open an Entry's Episode, Play from here, reorder Entries, remove an Entry, Star/Unstar and mark Played/Unplayed. Reordering is undoable; support discrete move actions as well as the platform's direct manipulation.
- **Play this** on an inactive Playlist switches the Active Playlist and resumes its Cursor (or starts its first Entry if there is no Cursor). An empty Playlist can become Active without starting audio. Switching Playlists resumes their independent playback state.
- Empty Playlists and Playlists past their end must clearly say there is no current Entry. An empty Playlist offers a route to find Episodes. History records Entries finished through that Playlist's playback; a manual Played mark creates no History.
- Playlist and View names are unique, ignoring case and surrounding spaces: a Playlist's among Playlists not in Trash, a View's among Views (owner, 10 Nov 2026). Creating, renaming or saving Search as a View with a name already in use is refused, saying which name is taken. Restoring a Playlist whose name has since been taken gives it the next free name ("Commute 2") and says so. Duplicates that arrive from another Device offline are kept until someone renames one.
- Playlist settings have their own screen, where people can change the name, Clear on Played and Delete. Clear on Played removes an Entry as soon as its Episode becomes Played, wherever that happened. It is on by default for the Default Playlist; enabling it does not retroactively remove already Played Entries. Star does not prevent Clear on Played.
- Delete sends a Playlist, its History and its Listening Timeline to Trash. Deleting the Active Playlist makes the Default Playlist Active. Trash supports Restore and retains deleted Playlists for 30 days by default, changeable in Settings. Deletion and restoration offer Undo; the deletion message names the Playlist ("Playlist Commute moved to Trash", owner, 10 Nov 2026).

## Listening Timeline and Rewind

The Listening Timeline is a dated and timed record of starts, finishes, partial listening and the person's deliberate edits, kept for 30 days. Every eligible moment offers **Rewind to here**.

Before Rewind, confirm the target Entry and Position, exactly which Episodes become Unplayed again, which Entries return and what is kept. Rewind returns the Cursor and Position to that moment. Episodes that became Played through this Playlist's playback since then become Unplayed again, and their Entries return between their old neighbours as nearly as later edits permit. Episodes started since then lose the Position gained. Deliberate later adds, reorders and manual Played marks are kept. Rewind itself can be undone.

Rewind and marking Unplayed do not subtract time from the permanent Listening log. Listening Timeline, History and Listening log are different records.

## Player and Now Playing

Provide Artwork, Play/Pause, back 15 seconds, forward 30 seconds and Position feedback while navigating elsewhere. Show the number of Entries after the current one and provide access to the Active Playlist's upcoming Entries. Stopping or dismissing the expanded presentation does not itself pause playback.

Now Playing provides the resolved Artwork, current Chapter title, previous/next Chapter, Episode title (or a direct route to it, as on Android, where the Artwork identifies what's playing), seeking with Chapter boundaries, elapsed/remaining time, back 15, Play/Pause, forward 30, speed and sleep timer. Sleep supports a duration, end of Chapter or end of Episode, and cancellation. Player speed changes affect only the Episode playing now; saved Playback Settings change only in settings.

From Now Playing, open Chapters, Episode detail and the Active Playlist's Entries, including Play from here, reorder and Switch Playlist. Adding from Episode detail works without losing the listening context. Starting playback from one of these returns to the main Now Playing presentation. The platform decides the navigation and dismissal mechanism; the web's nested drawer is specified in web-layout.md.

Played uses the Subscription's threshold or 30 seconds before the end by default. Continue the remaining audio after reaching that threshold; advance at the actual end or configured outro boundary, unless the sleep timer stops playback. Use the client duties for source fallback, Position reporting and errors. On offline clients, a stored download on this Device is preferred; direct streaming must still work when the server is unreachable but the podcast host is reachable. Preserve Position and speed on source fallback, and offer Retry on failure.

## Library and Subscriptions

- The Library groups Subscriptions by their Download Rule on this Device. Open a Subscription's Episodes and settings. Support changing multiple Subscriptions' Download Rules together.
- Add podcasts through Search (a podcast directory) or a feed address resolved directly without an index. These are methods of adding Subscriptions, distinct from Search over the Library. Explain invalid addresses and server failures, with a way to retry. Opening a result shows its Podcast page; each result can also be subscribed to directly.
- The Podcast page shows a podcast's Episodes before or after subscribing, with a search within them. Pulling down reveals its artwork and description. Episodes can be played or added before subscribing; each comes in on its own as Orphaned (ADR 0013). A subscribed podcast shows a green check, which is also how to Unsubscribe, and a gear for its settings.
- OPML import and export live in Settings, because they usually happen once (owner, 9 Nov 2026). Explain partial import results, with a way to retry.
- A Subscription exposes its Episodes, Mark all Played, Unsubscribe, Download Rule for this Device, Played threshold in seconds and Playback Settings overrides. New Subscriptions start at Stream. Overrides inherit global defaults until changed; they are never per Playlist.
- Download Rules apply per Subscription and Device: Stream, when Episodes become an Entry, or as they are published, optionally capped. Manual Downloads are independent of rule cleanup. A Starred Episode's stored downloads are never automatically discarded. For exact selection and retention, use client duties; the short Download Rule definition in CONTEXT.md is not an unconditional deletion rule.
- Distinguish no Subscriptions, no Episodes yet, loading, failed downloads and unavailable server actions. Offline clients retain usable local data, pending edits and downloads when the server cannot be reached and expose synchronization failure without inventing a successful server change.

### Unsubscribe

No confirmation dialog (owner, 10 Nov 2026). Unsubscribe takes two taps on the same control: tapping the subscribed control (the green check on the Podcast page) turns it into an Unsubscribe button, and tapping that unsubscribes. The button turns back into the check after a few seconds, or on any other interaction, scroll, Back or leaving the page. Afterwards stay on the Podcast page and let the person navigate back (owner, 10 Nov 2026). Episodes leave the Library except Orphaned Episodes that remain Entries or Starred. Downloads stay on their Devices. After success still offer Undo; Redo repeats the action. Undo re-subscribes to the same feed.

The server retains Subscription and Episode ids, settings (Played threshold and Playback Settings overrides), all Devices' Download Rules, Played and Starred states, Entries and Positions. Re-subscribing reveals those retained records again. A failed server call keeps the Undo or Redo step available and explains that it can be retried. Do not silently queue Subscribe or Unsubscribe as an offline State edit.

## First run

Apps with a local database open without needing a server: people can start as a Standalone Device or connect to a server (ADR 0012). Connecting a Standalone Device later offers to bring its Library over, showing what will move first. Declining keeps the two separate.

First run then shows a skippable introduction on Views with three points: adding podcasts; what Views do; what Playlists hold. They explain the app; they are not tasks, so nothing is ticked (owner, 12 Nov 2026). For a fresh Library without Views, create the starter Views once: **New this week** (Published in the last seven days, Unplayed), **Under 30 minutes** (Unplayed, up to 30 minutes, shortest first), and **Starred**. The Default Playlist is ready from the start.

The introduction goes away by itself once the Library has a Subscription, but not while an Add flow is open: adding the first Subscription never dismisses an open Add flow or erases input, and the introduction leaves when that flow closes. It can also be skipped. Settings can reopen Getting started; a reopened introduction stays until dismissed. Never mistake a temporarily loading Library for a fresh one.

## Settings and Listening stats

Global Playback Settings include Speed, Skip intro, Skip outro and Volume boost, inherited by each Subscription unless overridden. Settings also controls Trash retention, opens Listening stats and can reopen Getting started.

Listening stats shows time listened, Episodes finished, top podcasts, daily listening and the current Listening streak, including this week, this month and all-time totals. Time listened comes from the permanent Listening log, including partial listening. Episodes finished counts playback-source Played facts; manual marks do not count, and Rewind or marking Unplayed can reduce that count. See client duties for date boundaries and retained Episode rows. An empty Listening log explains how to begin.

## Source reconciliation

Split from ui-layout.md on 8 Nov 2026 without changing the selected web layout. Its presentation decisions, prototype provenance and outstanding web design notes remain in web-layout.md. This document also makes existing screen behaviour explicit from routes and components.

The former “Not yet designed” note for global Playback Settings is stale: the Settings screen exists. FirstRun.tsx's introductory comments disagree with its later implementation: the checklist now stays while steps advance. The former generic “drawer” and toast/keyboard instructions were web presentation, not requirements for native clients. The platform plan already requires native dark mode; the old open dark-theme item applies to web. No Android variant has been selected yet.
