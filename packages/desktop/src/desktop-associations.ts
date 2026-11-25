import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { isAbsolute, join } from "node:path"
import { promisify } from "node:util"

export const desktopEntry = "app.podlist.desktop.desktop"
const mimeType = "text/x-opml"
const run = promisify(execFile)

async function writeIfChanged(path: string, contents: string) {
  if ((await readFile(path, "utf8").catch(() => null)) === contents) return
  await writeFile(path, contents)
}

export async function registerDesktopAssociations() {
  const executable = process.execPath
  if (process.platform === "win32") {
    const classes = "HKCU\\Software\\Classes"
    const progId = "PodList.OPML"
    const set = (key: string, name: string[], value: string) =>
      run("reg.exe", ["ADD", key, ...name, "/t", "REG_SZ", "/d", value, "/f"], {
        windowsHide: true,
        timeout: 5000
      })
    await set(`${classes}\\${progId}`, ["/ve"], "OPML Podcast Subscriptions")
    await set(`${classes}\\${progId}\\shell\\open\\command`, ["/ve"], `"${executable}" "%1"`)
    await set(`${classes}\\.opml\\OpenWithProgids`, ["/v", progId], "")
  } else if (process.platform === "linux") {
    if (/[\r\n]/.test(executable)) return
    const configured = process.env.XDG_DATA_HOME
    const data = configured && isAbsolute(configured) ? configured : join(homedir(), ".local/share")
    const applications = join(data, "applications")
    const mime = join(data, "mime")
    const types = join(mime, "packages")
    await Promise.all([mkdir(applications, { recursive: true }), mkdir(types, { recursive: true })])
    // Desktop-entry string escaping is applied before Exec quoting is interpreted.
    const quoted = executable
      .replaceAll("\\", "\\\\\\\\")
      .replace(/["`$]/g, (char) => `\\\\${char}`)
      .replaceAll("%", "%%")
    await writeIfChanged(
      join(applications, desktopEntry),
      `[Desktop Entry]\nType=Application\nName=PodList\nExec="${quoted}" %U\nMimeType=${mimeType};x-scheme-handler/podlist;\nCategories=AudioVideo;Audio;\n`
    )
    await writeIfChanged(
      join(types, "app.podlist.desktop.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info"><mime-type type="${mimeType}"><glob pattern="*.opml"/></mime-type></mime-info>\n`
    )
    await Promise.allSettled([
      run("update-mime-database", [mime], { timeout: 5000 }),
      run("update-desktop-database", [applications], { timeout: 5000 })
    ])
  }
}
