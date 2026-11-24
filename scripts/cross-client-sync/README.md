# Cross-client sync

Run from the repository root on the host Mac. The run uses one fresh demo Library inside
a throwaway clone of the prepared `podlist-ui` Tart VM, one Chromium profile, and the
disposable `podlist` Android AVD in an existing Boat sandbox.

1. Install the checkout's pinned JavaScript dependencies and Playwright Chromium.

   ```sh
   pnpm install --frozen-lockfile
   pnpm --dir packages/web exec playwright install chromium
   ```

2. Build the two Android APKs with the persistent test runner. Set the Android Studio
   JBR and SDK paths used for local Android builds if they are absent from your shell.

   ```sh
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   export PODLIST_JAVA_HOME="$JAVA_HOME" ANDROID_HOME="$HOME/Library/Android/sdk"
   (cd apps/android && ./gradlew -PpodlistCrossClientSync=true :app:assembleDebug :app:assembleDebugAndroidTest)
   ```

3. Boot the API 36 x86_64 `podlist` AVD in the existing KVM-enabled Boat sandbox.
   In a separate terminal run the reverse forward using the sandbox ID and a free
   host port. Leave it running through the test.

   ```sh
   export BOAT_SANDBOX=bx_YOUR_SANDBOX PODLIST_SYNC_PORT=51281
   boat forward "$BOAT_SANDBOX" --reverse --local "$PODLIST_SYNC_PORT"
   ```

4. In the host test terminal use the same values and run the harness.

   ```sh
   export BOAT_SANDBOX=bx_YOUR_SANDBOX PODLIST_SYNC_PORT=51281
   scripts/cross-client-sync/run.sh
   ```

   The harness builds the web and Mac targets, waits for any running Tart VM,
   starts its clone and relays, copies the two APKs to Boat and installs them on the
   verified `podlist` AVD. It clears PodList data there once before Connect. The
   sandbox needs `curl` and the Android SDK's `adb`. Set
   `PODLIST_SYNC_BOAT_ADB` if it lives outside `$HOME/android-sdk/platform-tools/adb`
   and `PODLIST_SYNC_ANDROID_SERIAL` if the emulator is outside the default
   `emulator-5554`. The `PODLIST_UI_VM`, `PODLIST_SYNC_APP_APK` and
   `PODLIST_SYNC_TEST_APK` environment variables override the default VM and APK locations.

5. Read `podlist-grading/cross-client-sync/<run>/report.md`. The run directory also
   has client and infrastructure logs, Mac xcresults, and any captured failure
   screenshots and browser traces. On completion the harness removes its Tart clone
   and the APK staging directory. Stop your reverse forward and emulator when done.

## Assertions

| Phase | What the clients and server verify |
| --- | --- |
| Connect | All three Libraries show Default, Commute, Workshop, Deep Field, Market Hours and Slow Build. |
| Web edits | Web renames Commute, stars Rice, marks Currency Played and adds Joinery to Workshop. Mac and Android check the resulting name, marks and Entry order. |
| Mac edits | Mac renames Workshop and stars Joinery. Web and Android check both changes. |
| Android edits | Android renames Commute and stars Lighthouses. Web and Mac check both changes. |
| Offline conflict | Both native server routes lose TCP connections. Mac records the older Notebook position and Android the newer one. Android ships first. Mac ships last. All three show Workshop Offline Mac, Joinery → Notebook → Chair, and Android's position for Notebook. The server acknowledges a replay of the captured operations without changing the cursor or State. |
| Handoff | Android advances and pauses Notebook. Mac shows the received position. Web plays the same Entry and observes the scrubber advance from the received position. |
| Delete, Restore and Undo | Mac deletes Commute, Android sees it in Trash and web Restores it. Mac waits for the restoration, then performs a second Delete and undoes it on Mac. Web and Android see the restored Playlist. The second Delete exercises Undo with an available Trash item. The original Mac Undo currently reports an error once a peer already restored the item. |
| Subscribe and paging | Web subscribes to the 500-Episode Long listening feed, which spans two native catalogue pages. All three clients find Episodes 001 and 500. Web unsubscribes and all three Libraries drop the Subscription. |
| Version refusal | A protocol-1 HTTP probe pushes a staged edit, gets HTTP 426 with `UpdateRequired` on pull, then retries the same operation after upgrading. The edit is delivered once, the outbox is cleared after recovery, and each current client shows the resulting rename. |

The guest demo binds to the guest IP. Mac reaches it through a guest loopback relay,
web through the host's loopback relay at `http://localhost:PORT`, and Android
through Boat's reverse forward at `http://10.0.2.2:PORT`. During the offline phase
the relays close existing connections and reject new ones. Mac can still play the
separate guest fixture audio, and Android uses its downloaded copy of the Episode.
The convergence assertions follow `latest-listen-wins`, `add-moves-existing-entry`
and `duplicate-operation-applies-once` in [the protocol vectors](../../packages/domain/protocol/vectors).
