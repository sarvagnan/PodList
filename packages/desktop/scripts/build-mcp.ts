import { execFileSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

export const buildMCP = (directory: string) => {
  mkdirSync(directory, { recursive: true })
  const output = join(directory, process.platform === "win32" ? "podlist-mcp.exe" : "podlist-mcp")
  const source = join(import.meta.dirname, "../native/mcp.cpp")
  if (process.platform === "win32") {
    execFileSync(
      "cl",
      [
        "/nologo",
        "/std:c++17",
        "/EHsc",
        "/MT",
        source,
        `/Fe:${output}`,
        `/Fo:${join(directory, "mcp.obj")}`,
        "advapi32.lib"
      ],
      { stdio: "inherit" }
    )
  } else {
    execFileSync("c++", ["-std=c++17", "-O2", "-pthread", source, "-o", output], {
      stdio: "inherit"
    })
  }
  return output
}
if (process.argv[1] === import.meta.filename) buildMCP(join(import.meta.dirname, "../build/mcp"))
