import { buildMCP } from "./build-mcp.ts"
// Builds an unsigned app for the host OS and architecture. On macOS --install
// copies PodList.app to /Applications. It carries no quarantine flag (ADR 0005).

import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { packager } from "@electron/packager"
import { rolldown } from "rolldown"
import sharp from "sharp"

const root = join(import.meta.dirname, "..")
const out = join(root, "out")
const build = join(out, "build")

/** The PWA icon on the macOS icon grid: an 824 px body centred on a 1024 px canvas. */
const makeIcon = async () => {
  const artwork = readFileSync(join(root, "../web/public/favicon.svg"), "utf8")
    .replace(/<title[^>]*>.*?<\/title>/s, "")
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><g transform="translate(100 100) scale(${824 / 512})">${artwork}</g></svg>`
  const iconset = join(build, "PodList.iconset")
  mkdirSync(iconset, { recursive: true })
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const name = `icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`
      await sharp(Buffer.from(svg))
        .resize(size * scale, size * scale)
        .png()
        .toFile(join(iconset, name))
    }
  }
  const icns = join(build, "PodList.icns")
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", icns])
  return icns
}

rmSync(out, { recursive: true, force: true })
mkdirSync(build, { recursive: true })
// The app carries its own copy of the web app (ADR 0005).
execFileSync("pnpm", ["--filter", "@podlist/web", "build", "--mode", "desktop"], {
  stdio: "inherit"
})
const web = join(build, "web")
cpSync(join(root, "../web/dist-desktop"), web, { recursive: true })
const icon = process.platform === "darwin" ? await makeIcon() : undefined
const bridge = buildMCP(join(build, "mcp"))
const electronVersion = JSON.parse(
  readFileSync(join(root, "node_modules/electron/package.json"), "utf8")
).version as string

// Electron runs source in development. Bundle the shell's JavaScript dependencies
// into the release so its ASAR doesn't need a pnpm workspace or TS in node_modules.
const stagedShell = join(build, "shell")
const src = join(stagedShell, "src")
mkdirSync(src, { recursive: true })
for (const name of ["preload.cjs", "setup.html", "setup.js", "page.css"]) {
  cpSync(join(root, "src", name), join(src, name))
}
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
writeFileSync(
  join(stagedShell, "package.json"),
  JSON.stringify({
    name: manifest.name,
    productName: manifest.productName,
    version: manifest.version,
    type: "module",
    main: "src/main.js"
  })
)
const shellBundle = await rolldown({
  input: join(root, "src/main.ts"),
  platform: "node",
  external: ["electron"]
})
try {
  await shellBundle.write({ file: join(src, "main.js"), format: "esm", codeSplitting: false })
} finally {
  await shellBundle.close()
}

const [appDir] = await packager({
  dir: stagedShell,
  out,
  name: "PodList",
  appBundleId: "app.podlist.desktop",
  appCategoryType: "public.app-category.music",
  protocols: [{ name: "PodList Link", schemes: ["podlist"] }],
  platform: process.platform as "darwin" | "linux" | "win32",
  arch: process.arch === "arm64" ? "arm64" : "x64",
  electronVersion,
  ...(icon ? { icon } : {}),
  asar: true,
  // Served by the app from Contents/Resources/web.
  extraResource: [web, bridge],
  prune: false,
  overwrite: true
})
const app = process.platform === "darwin" ? join(appDir ?? "", "PodList.app") : (appDir ?? "")
console.log(`Built ${app}`)

if (process.argv.includes("--install")) {
  if (process.platform !== "darwin")
    throw new Error(
      "--install is only supported on macOS. Use the packaged app directory on this platform."
    )
  const target = "/Applications/PodList.app"
  if (existsSync(target)) rmSync(target, { recursive: true, force: true })
  cpSync(app, target, { recursive: true, verbatimSymlinks: true })
  console.log(`Installed ${target}. Quit PodList first if it was open, then open it again.`)
}
