// Regenerates the language-neutral client contract and its operation coverage table.
// Run with: pnpm --filter @podlist/domain protocol
import { readFileSync, writeFileSync } from "node:fs"
import { openApiDocument } from "../../api/src/OpenApi.ts"
import { operationCoverage } from "./coverage.ts"
import { buildDeviceVectors } from "./device-vectors.ts"
import { buildFeedVectors } from "./feed-vectors.ts"
import { buildListeningVectors } from "./listening-vectors.ts"
import { buildVectors, operationJsonSchema } from "./protocol.ts"
import { buildServerVectors } from "./server-vectors.ts"
import {
  compatibilityVectors,
  kotlinProtocol,
  swiftProtocol,
  versionTable
} from "./sync-compatibility.ts"
import { buildViewVectors } from "./view-vectors.ts"

const root = new URL("../protocol/", import.meta.url)
writeFileSync(
  new URL("operation.schema.json", root),
  `${JSON.stringify(operationJsonSchema(), null, 2)}\n`
)
for (const vector of buildVectors()) {
  writeFileSync(
    new URL(`vectors/${vector.name}.json`, root),
    `${JSON.stringify(vector, null, 2)}\n`
  )
}

for (const [file, value] of Object.entries({
  "sync-compatibility.json": compatibilityVectors(),
  "devices.json": buildDeviceVectors(),
  "openapi.json": openApiDocument(),
  "views.json": buildViewVectors(),
  "listening.json": buildListeningVectors(),
  "server.json": buildServerVectors(),
  "feeds.json": buildFeedVectors()
})) {
  writeFileSync(new URL(file, root), `${JSON.stringify(value, null, 2)}\n`)
}

writeFileSync(
  new URL("../../../docs/protocol/operation-coverage.md", import.meta.url),
  operationCoverage()
)
writeFileSync(
  new URL("../../../apps/apple/Sources/PodListDomain/SyncProtocol.swift", import.meta.url),
  swiftProtocol()
)
writeFileSync(
  new URL(
    "../../../apps/android/domain/src/main/kotlin/app/podlist/domain/SyncProtocol.kt",
    import.meta.url
  ),
  kotlinProtocol()
)
// Docs use the same frozen version table as the server and native clients.
const spec = new URL("../../../docs/protocol/README.md", import.meta.url)
writeFileSync(
  spec,
  readFileSync(spec, "utf8").replace(
    /<!-- BEGIN GENERATED SYNC VERSIONS -->[\s\S]*?<!-- END GENERATED SYNC VERSIONS -->/,
    versionTable()
  )
)
writeFileSync(
  new URL(
    "../../../apps/apple/Sources/PodListDomain/Resources/operation.schema.json",
    import.meta.url
  ),
  `${JSON.stringify(operationJsonSchema(), null, 2)}\n`
)
console.log("protocol exported")
