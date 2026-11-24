import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { createServer as createNetServer } from "node:net"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import { relay, tartExec } from "./relay.mjs"

const [vm, staging, tartOutput] = process.argv.slice(2)
const initializeReport = vm === "--initialize-report"
const out = initializeReport ? staging : dirname(tartOutput)
const repo = fileURLToPath(new URL("../..", import.meta.url))
const port = Number(process.env.PODLIST_SYNC_PORT)
const sandbox = process.env.BOAT_SANDBOX
const androidServer = `http://10.0.2.2:${port}`
const webServer = `http://localhost:${port}`
const serial = process.env.PODLIST_SYNC_ANDROID_SERIAL ?? "emulator-5554"
let adbPath = process.env.PODLIST_SYNC_BOAT_ADB
const control = join(staging, "cross-sync-control")
const macOffline = join(control, "mac-offline")
const androidOffline = join(control, "android-offline")
const remoteDir = `/tmp/podlist-sync-${randomUUID()}`
const guestScript = "/Volumes/My Shared Files/repo/scripts/cross-client-sync/guest.sh"
const androidPackage = "app.podlist"
const runner = "app.podlist.test/androidx.test.runner.AndroidJUnitRunner"
const children = new Set()

const scenarioNames = [
  "Setup",
  "Connect and read the seeded Library",
  "Web edits reach Mac and Android",
  "Mac edits reach web and Android",
  "Android edits reach web and Mac",
  "Offline conflict, existing Entry moves and duplicate delivery",
  "Android listening position resumes on web",
  "Delete, Restore and Undo",
  "Subscribe, catalogue paging and Unsubscribe",
  "Version refusal preserves the queued edit"
]

const results = new Map()
const interrupt = new AbortController()
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    interrupt.abort(new Error(`Interrupted by ${signal}`))
    for (const child of children) child.kill("SIGTERM")
  })
}
function report() {
  const rows = scenarioNames.map((name) => `| ${name} | ${results.get(name) ?? "FAIL (blocked)"} |`)
  writeFileSync(
    join(out, "report.md"),
    ["# Cross-client sync", "", "| Scenario | Result |", "| --- | --- |", ...rows, ""].join("\n")
  )
}
report()
if (initializeReport) process.exit(0)
mkdirSync(control)
mkdirSync(join(out, "logs"))

function command(binary, args, label, { env = {}, timeout = 600_000 } = {}) {
  const log = join(out, "logs", `${label}.log`)
  const fd = openSync(log, "w")
  let processHandle
  try {
    processHandle = spawn(binary, args, {
      cwd: repo,
      env: { ...process.env, ...env },
      stdio: ["ignore", fd, fd]
    })
  } finally {
    closeSync(fd)
  }
  children.add(processHandle)
  const result = new Promise((resolve, reject) => {
    const timer = timeout > 0 ? setTimeout(() => processHandle.kill("SIGTERM"), timeout) : undefined
    processHandle.once("error", reject)
    processHandle.once("close", (code, signal) => {
      clearTimeout(timer)
      children.delete(processHandle)
      if (code !== 0) reject(new Error(`${label}: ${signal ?? `exit ${code}`}; see ${log}`))
      else resolve(readFileSync(log, "utf8"))
    })
  })
  // Some long-running commands are awaited only after dependent work completes.
  result.catch(() => {})
  return { result, process: processHandle }
}

const tart = (label, ...args) => command("tart", args, label).result
const guest = (label, args, options) =>
  command("tart", ["exec", vm, "/bin/bash", guestScript, ...args], label, options)
const boat = (label, ...args) => command("boat", args, label).result
// boat exec reports a JSON envelope (stdout, stderr, exitCode). Unwrap it so callers get
// the command's own output, and fail on a non-zero exit or Boat's timeout (600 s is the
// longest single-result timeout; longer ones stream instead).
const remote = async (label, ...args) => {
  const raw = await boat(label, "exec", "--json", "--timeout", "600", sandbox, "--", ...args)
  const line = raw.trim().split("\n").filter((entry) => entry.startsWith("{")).at(-1)
  const envelope = JSON.parse(line ?? "{}")
  if (envelope.exitCode !== 0 || envelope.timedOut) {
    throw new Error(
      `${label}: exit ${envelope.exitCode}${envelope.timedOut ? " (timed out)" : ""}: ${String(envelope.stderr ?? "").slice(-500)}`
    )
  }
  return String(envelope.stdout ?? "")
}
const adb = (label, ...args) => remote(label, adbPath, "-s", serial, ...args)
const mac = (phase) => guest(`mac-${phase}`, ["test", phase]).result

async function until(label, check, timeout = 90_000, signal = interrupt.signal) {
  const end = performance.now() + timeout
  let last
  do {
    signal.throwIfAborted()
    try {
      const result = await check()
      if (result) return result
    } catch (error) {
      last = error
    }
    await delay(500, undefined, { signal })
  } while (performance.now() < end)
  throw new Error(`Timed out waiting for ${label}`, { cause: last })
}

let apiOrigin
let versionHeaders
let fixtureFeed
async function api(path, { headers: extra, ...init } = {}) {
  return fetch(`${apiOrigin}/api${path}`, {
    ...init,
    headers: { ...versionHeaders, ...extra },
    signal: AbortSignal.timeout(10_000)
  })
}
async function json(path, init) {
  const response = await api(path, init)
  assert.equal(response.status, 200, `${path}: ${response.status} ${response.statusText}`)
  return response.json()
}
const pull = (since = 0) => json(`/sync/pull?since=${since}`)
const push = (operations) =>
  json("/sync/push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operations })
  })
const snapshot = async () => (await pull()).snapshot
const playlist = (state, id) => state.playlists.find((item) => item.id === id)
const trashed = (state, id) => state.trash?.find((item) => item.playlist.id === id)
const book = "The workshop as a notebook"
const chair = "Repairing a chair, twice"
const joinery = "Joinery without screws"
const rice = "Who sets the price of rice?"
const currency = "When a currency disappears"
const lighthouse = "Lighthouses and public goods"
const episodeIds = new Map()
let notebookDuration
function episode(title) {
  const id = episodeIds.get(title)
  assert.ok(id, `Missing fixture Episode: ${title}`)
  return id
}
const entryOrder = (list) => list?.entries.map((entry) => entry.episodeId)
const position = (list, title) => list?.entries.find((entry) => entry.episodeId === episode(title))
const matchesEntries = (list, ...titles) =>
  JSON.stringify(entryOrder(list)) === JSON.stringify(titles.map(episode))
const stateHas = (label, condition) => until(label, async () => condition(await snapshot()))

async function android(phase, env = {}) {
  const png = `cross-sync-${phase}.png`
  const args = Object.entries(env).flatMap(([key, value]) => ["-e", key, String(value)])
  try {
    const output = await adb(
      `android-${phase}`,
      "shell",
      "am",
      "instrument",
      "-w",
      "-r",
      "-e",
      "class",
      "app.podlist.CrossClientSyncTest#runPhase",
      "-e",
      "phase",
      phase,
      "-e",
      "server",
      androidServer,
      ...args,
      runner
    )
    assert.match(
      output,
      /^OK \(1 test\)\s*$/m,
      `Android ${phase} failed; see logs/android-${phase}.log`
    )
  } catch (error) {
    await adb(
      `android-${phase}-semantics`,
      "logcat",
      "-d",
      "-t",
      "300",
      "-s",
      "CrossClientSync"
    ).catch(() => {})
    // The instrumentation captures the active UI before the Activity rule tears it down.
    await adb(
      `android-${phase}-collect`,
      "pull",
      `/sdcard/Android/data/${androidPackage}/files/${png}`,
      `${remoteDir}/${png}`
    )
      .then(() =>
        boat(`android-${phase}-screenshot`, "scp", `${sandbox}:${remoteDir}/${png}`, join(out, png))
      )
      .catch(() => {})
    throw error
  }
}
const web = (phase, env = {}) =>
  command(
    process.execPath,
    [
      "packages/web/node_modules/playwright/cli.js",
      "test",
      "--config",
      "packages/web/playwright.cross-client.config.ts",
      "--output",
      join(out, "web", phase)
    ],
    `web-${phase}`,
    {
      env: {
        PODLIST_CROSS_SYNC_PHASE: phase,
        PODLIST_CROSS_SYNC_ORIGIN: webServer,
        PODLIST_CROSS_SYNC_PROFILE: join(out, "web-profile"),
        PODLIST_CROSS_SYNC_FEED: fixtureFeed,
        ...env
      }
    }
  ).result

async function observe(phase, clients) {
  for (const client of clients) await client(phase)
}
async function scenario(name, action) {
  process.stdout.write(`${name}\n`)
  results.set(name, "FAIL (interrupted)")
  report()
  try {
    interrupt.signal.throwIfAborted()
    await action()
    results.set(name, "PASS")
  } catch (error) {
    results.set(name, "FAIL (see logs)")
    throw error
  } finally {
    report()
  }
}

let hostRelay
let apiRelay
const apiPort = await new Promise((resolve) => {
  const probe = createNetServer()
  probe.listen(0, "127.0.0.1", () => {
    const { port: free } = probe.address()
    probe.close(() => resolve(free))
  })
})
let demo
let remoteStaged = false
try {
  await scenario(scenarioNames[0], async () => {
    assert.ok(/^emulator-\d+$/.test(serial), "Use a disposable Android emulator")
    // The host never opens TCP to the guest IP (macOS Local Network privacy blocks it).
    // An ungated relay serves the harness's own API checks; the gated one serves web and Android.
    apiRelay = relay(apiPort, tartExec(vm, port + 1), join(control, "never-offline"))
    await apiRelay.ready
    apiOrigin = `http://127.0.0.1:${apiPort}`
    demo = guest("demo", ["start", "127.0.0.1", String(port)], { timeout: 0 })
    const readyFile = join(control, "ready.json")
    const startup = new AbortController()
    demo.result.then(
      () => startup.abort(new Error("Guest demo stopped before readiness")),
      (error) => startup.abort(error)
    )
    const ready = await until(
      "seeded demo readiness",
      () => existsSync(readyFile) && JSON.parse(readFileSync(readyFile, "utf8")),
      120_000,
      AbortSignal.any([startup.signal, interrupt.signal])
    )
    fixtureFeed = ready.fixtureFeed
    const health = await json("/health")
    assert.equal(health.status, "ok")
    versionHeaders = { "x-podlist-protocol-version": String(health.protocolVersion) }
    hostRelay = relay(port, tartExec(vm, port + 1), androidOffline)
    await hostRelay.ready
    await until(
      "host relay",
      async () =>
        (await fetch(`${webServer}/api/health`, { signal: AbortSignal.timeout(2_000) })).ok
    )

    adbPath ??= `${(await remote("boat-home", "printenv", "HOME")).trim()}/android-sdk/platform-tools/adb`
    assert.match(adbPath, /^[./a-zA-Z0-9_-]+$/, "ADB path must be a simple sandbox path")
    const avd = await adb("android-avd", "emu", "avd", "name")
    assert.match(avd, /^podlist\s*$/m, "Use the disposable AVD named podlist")
    await until("Android boot completed", async () =>
      /^1\s*$/m.test(await adb("android-boot", "shell", "getprop", "sys.boot_completed"))
    )
    // Validate the reverse before clearing or installing anything on the disposable AVD.
    assert.match(
      await remote(
        "boat-reverse",
        "curl",
        "-fsS",
        "--max-time",
        "5",
        `http://127.0.0.1:${port}/api/health`
      ),
      /"status"\s*:\s*"ok"/
    )
    await remote("boat-stage", "mkdir", "-p", remoteDir)
    remoteStaged = true
    for (const [name, file] of [
      ["app.apk", process.env.PODLIST_SYNC_APP_APK],
      ["test.apk", process.env.PODLIST_SYNC_TEST_APK]
    ]) {
      await boat(`upload-${name}`, "scp", file, `${sandbox}:${remoteDir}/${name}`)
      assert.match(await adb(`install-${name}`, "install", "-r", `${remoteDir}/${name}`), /Success/)
    }
    assert.match(await adb("android-reset", "shell", "pm", "clear", androidPackage), /Success/)
    // A download is part of the offline case. Keep Google's notification-permission
    // dialog from obscuring the app once the download begins.
    await adb(
      "android-notifications",
      "shell",
      "pm",
      "grant",
      androidPackage,
      "android.permission.POST_NOTIFICATIONS"
    )
    const instrumentation = await adb("android-runners", "shell", "pm", "list", "instrumentation")
    assert.ok(instrumentation.includes(runner), `Missing persistent Android runner: ${runner}`)
  })

  await scenario(scenarioNames[1], async () => {
    const catalogue = await json("/library/changes?since=0")
    assert.equal(catalogue.more, false)
    assert.deepEqual(catalogue.subscriptions.map((sub) => sub.title).sort(), [
      "Deep Field",
      "Market Hours",
      "Slow Build"
    ])
    for (const item of catalogue.episodes) episodeIds.set(item.title, item.id)
    notebookDuration = catalogue.episodes.find((item) => item.title === book)?.duration
    assert.ok(
      notebookDuration > 210,
      "Notebook fixture must be long enough for the playback checks"
    )
    assert.deepEqual((await snapshot()).playlists.map((item) => item.name).sort(), [
      "Commute",
      "Default",
      "Workshop"
    ])
    await observe("connect", [web, mac, android])
  })

  await scenario(scenarioNames[2], async () => {
    await web("web-edit")
    await stateHas(
      "all Web edits committed",
      (state) =>
        playlist(state, "commute")?.name === "Commute Web" &&
        state.episodeStates[episode(rice)]?.starred &&
        state.episodeStates[episode(currency)]?.played?.source?._tag === "User" &&
        matchesEntries(playlist(state, "workshop"), book, chair, joinery)
    )
    await observe("web-check", [mac, android])
  })

  await scenario(scenarioNames[3], async () => {
    await mac("mac-edit")
    await stateHas(
      "Mac rename and star",
      (state) =>
        playlist(state, "workshop")?.name === "Workshop Mac" &&
        state.episodeStates[episode(joinery)]?.starred
    )
    await observe("mac-check", [web, android])
  })

  await scenario(scenarioNames[4], async () => {
    await android("android-edit")
    await stateHas(
      "Android rename and star",
      (state) =>
        playlist(state, "commute")?.name === "Commute Android" &&
        state.episodeStates[episode(lighthouse)]?.starred
    )
    await observe("android-check", [web, mac])
  })

  await scenario(scenarioNames[5], async () => {
    await android("download")
    const { cursor: before } = await pull()
    writeFileSync(macOffline, "")
    writeFileSync(androidOffline, "")
    // The gate files reach the guest through the shared folder, which can lag; wait
    // until each relay actually refuses rather than probing once.
    await until("Mac relay offline", async () => {
      try {
        await command(
          "tart",
          ["exec", vm, "/usr/bin/curl", "-fsS", "--max-time", "3", `http://127.0.0.1:${port}/api/health`],
          "mac-offline-probe"
        ).result
        return false
      } catch {
        return true
      }
    }, 30_000)
    await until("host relay offline", async () => {
      try {
        await fetch(`${webServer}/api/health`, { signal: AbortSignal.timeout(3_000) })
        return false
      } catch {
        return true
      }
    }, 30_000)
    await mac("offline-edit")
    await android("offline-edit")
    const disconnected = await pull(before)
    assert.equal(disconnected.snapshot, null)
    assert.equal(disconnected.cursor, before, "Offline edits leaked to the server")

    rmSync(androidOffline)
    await android("offline-flush")
    const androidChanges = (await pull(before)).operations
    const reports = (operations) =>
      operations.filter(
        ({ change }) =>
          change._tag === "ReportPosition" &&
          change.playlistId === "workshop" &&
          change.episodeId === episode(book)
      )
    const mostRecent = (operations) =>
      reports(operations).reduce(
        (latest, operation) =>
          !latest || operation.change.listenedAt >= latest.change.listenedAt ? operation : latest,
        undefined
      )
    const androidListen = mostRecent(androidChanges)
    assert.ok(androidListen, "Android did not send an offline position")
    assert.ok(androidListen.change.position >= 90 && androidListen.change.position < 130)
    assert.ok(
      androidChanges.some(
        ({ change }) =>
          change._tag === "AddEntry" &&
          change.playlistId === "workshop" &&
          change.episodeId === episode(book) &&
          change.placement === "last"
      )
    )
    const androidCursor = (await pull()).cursor

    rmSync(macOffline)
    // The gate file's removal also reaches the guest through the lagging shared folder.
    await until("Mac relay back online", async () => {
      try {
        await command(
          "tart",
          ["exec", vm, "/usr/bin/curl", "-fsS", "--max-time", "3", `http://127.0.0.1:${port}/api/health`],
          "mac-online-probe"
        ).result
        return true
      } catch {
        return false
      }
    }, 30_000)
    await mac("offline-flush")
    const macChanges = (await pull(androidCursor)).operations
    const macListen = mostRecent(macChanges)
    assert.ok(macListen, "Mac did not send an offline position")
    assert.ok(macListen.change.position >= 30 && macListen.change.position < 65)
    assert.ok(
      macListen.change.listenedAt < androidListen.change.listenedAt,
      "The Mac report arrived last and must carry the earlier listening timestamp"
    )
    const macAdd = macChanges.find(
      ({ change }) =>
        change._tag === "AddEntry" &&
        change.playlistId === "workshop" &&
        change.episodeId === episode(chair) &&
        change.placement === "last"
    )
    assert.ok(macAdd, "Mac did not add the existing Chair Entry through the UI")
    const settled = await pull()
    const workshop = playlist(settled.snapshot, "workshop")
    assert.equal(workshop.name, "Workshop Offline Mac")
    assert.ok(
      matchesEntries(workshop, joinery, book, chair),
      "Expected exactly Joinery, Notebook, Chair"
    )
    assert.equal(position(workshop, book).position, androidListen.change.position)
    assert.equal(position(workshop, book).positionAt, androidListen.change.listenedAt)
    const duplicate = await push([macAdd, androidListen])
    assert.equal(duplicate.accepted, 0)
    assert.deepEqual(duplicate.acknowledged, [macAdd.id, androidListen.id])
    assert.deepEqual(await pull(), settled, "Replay changed the cursor or shared State")
    writeFileSync(join(control, "offline-position"), String(androidListen.change.position))
    await web("offline-check", {
      PODLIST_CROSS_SYNC_POSITION: String(androidListen.change.position),
      PODLIST_CROSS_SYNC_DURATION: String(notebookDuration)
    })
    await mac("offline-check")
    await android("offline-check", { position: androidListen.change.position })
  })

  await scenario(scenarioNames[6], async () => {
    await android("handoff-edit")
    const fromAndroid = await stateHas("Android's new handoff position", (state) => {
      const notebook = position(playlist(state, "workshop"), book)
      return notebook?.position >= 150 && notebook.position < 210 && notebook
    })
    await mac("handoff-check")
    await web("handoff-check", { PODLIST_CROSS_SYNC_POSITION: String(fromAndroid.position) })
  })

  await scenario(scenarioNames[7], async () => {
    // A live Mac invocation retains its originating Undo stack across the web Restore.
    const macDelete = mac("delete-undo")
    const deleted = join(control, "mac-deleted")
    const undo = join(control, "mac-undo")
    const checkpoint = new AbortController()
    macDelete.then(
      () => checkpoint.abort(new Error("Mac exited before its Delete checkpoint")),
      (error) => checkpoint.abort(error)
    )
    try {
      await until(
        "Mac's Delete UI checkpoint",
        () => existsSync(deleted),
        120_000,
        AbortSignal.any([checkpoint.signal, interrupt.signal])
      )
      await stateHas(
        "Commute in server Trash",
        (state) =>
          !playlist(state, "commute") &&
          trashed(state, "commute")?.playlist.name === "Commute Android"
      )
      await android("trash-check")
      await web("restore")
      await stateHas(
        "web Restore committed",
        (state) =>
          playlist(state, "commute")?.name === "Commute Android" && !trashed(state, "commute")
      )
      const { cursor } = await pull()
      writeFileSync(undo, "")
      await macDelete
      await until("Mac's second Delete and its Undo delivered in order", async () => {
        const changes = (await pull(cursor)).operations
          .map(({ change }) => change)
          .filter((change) => change.playlistId === "commute")
          .map(({ _tag }) => _tag)
        return changes.join(",") === "DeletePlaylist,RestorePlaylist"
      })
      await observe("restore-check", [web, android])
    } finally {
      // Unblock the live test on a peer failure so it can export its result bundle.
      if (!existsSync(undo)) {
        writeFileSync(join(control, "mac-abort"), "")
        await macDelete.catch(() => {})
      }
    }
  })

  await scenario(scenarioNames[8], async () => {
    const { cursor } = await json("/library/changes?since=0")
    await web("subscribe")
    const first = await json(`/library/changes?since=${cursor}`)
    assert.equal(
      first.more,
      true,
      "500 Episodes plus their Subscription must cross the native page boundary"
    )
    const second = await json(`/library/changes?since=${first.cursor}`)
    assert.ok(second.cursor > first.cursor)
    assert.equal(second.more, false)
    const subscription = [...first.subscriptions, ...second.subscriptions].find(
      (item) => item.title === "Long listening"
    )
    assert.ok(subscription)
    const episodes = [...first.episodes, ...second.episodes].filter(
      (item) => item.subscriptionId === subscription.id
    )
    assert.equal(new Set(episodes.map((item) => item.id)).size, 500)
    await observe("subscription-check", [mac, android, web])
    await web("unsubscribe")
    await observe("unsubscribe-check", [mac, android])
  })

  await scenario(scenarioNames[9], async () => {
    const baseline = await pull()
    const device = {
      id: randomUUID(),
      name: "Cross sync protocol probe",
      kind: "web",
      registeredAt: Date.now()
    }
    await json("/devices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(device)
    })
    // Model the native outbox order: push, then pull, then acknowledge locally.
    const pendingFile = join(out, "version-outbox.json")
    const operation = {
      id: randomUUID(),
      deviceId: device.id,
      sequence: 1,
      recordedAt: Date.now(),
      change: { _tag: "RenamePlaylist", playlistId: "commute", name: "Commute Protocol" }
    }
    const pending = JSON.stringify([operation])
    writeFileSync(pendingFile, pending)
    const oldHeaders = { "x-podlist-protocol-version": "1" }
    const pushed = await json("/sync/push", {
      method: "POST",
      headers: { ...oldHeaders, "content-type": "application/json" },
      body: JSON.stringify({ operations: JSON.parse(readFileSync(pendingFile, "utf8")) })
    })
    assert.equal(pushed.accepted, 1)
    const refused = await api("/sync/pull?since=0", { headers: oldHeaders })
    assert.equal(refused.status, 426)
    const refusal = await refused.json()
    assert.equal(refusal._tag, "UpdateRequired")
    assert.equal(refusal.minimumProtocolVersion, 4)
    assert.ok(refusal.unsupportedOperations.includes("RestorePlaylist"))
    assert.equal(readFileSync(pendingFile, "utf8"), pending)
    const retried = await push(JSON.parse(readFileSync(pendingFile, "utf8")))
    assert.equal(retried.accepted, 0)
    assert.deepEqual(retried.acknowledged, [operation.id])
    const delivered = await pull(baseline.cursor)
    assert.deepEqual(
      delivered.operations.filter(({ id }) => id === operation.id),
      [operation]
    )
    const final = await snapshot()
    assert.equal(playlist(final, "commute").name, "Commute Protocol")
    assert.deepEqual(playlist(final, "workshop"), playlist(baseline.snapshot, "workshop"))
    writeFileSync(pendingFile, "[]\n")
    writeFileSync(join(out, "version-refusal.json"), JSON.stringify(refusal, null, 2))
    await observe("version-check", [web, mac, android])
  })
} catch (error) {
  process.exitCode = 1
  console.error(error)
  writeFileSync(join(out, "failure.log"), `${error.stack}\n${error.cause?.stack ?? ""}\n`)
} finally {
  hostRelay?.stop()
  apiRelay?.stop()
  demo?.process.kill("SIGTERM")
  if (remoteStaged)
    await command("boat", ["exec", sandbox, "--", "rm", "-rf", remoteDir], "boat-cleanup", {
      timeout: 30_000
    }).result.catch((error) => {
      process.exitCode = 1
      console.error(error)
    })
  for (const child of children) child.kill("SIGTERM")
}
