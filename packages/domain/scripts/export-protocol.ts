// Regenerates the language-neutral client contract and its operation coverage table.
// Run with: pnpm --filter @podlist/domain protocol
import { writeFileSync } from "node:fs"
import { openApiDocument } from "../../api/src/OpenApi.ts"
import { operationCoverage } from "./coverage.ts"
import { buildListeningVectors } from "./listening-vectors.ts"
import { buildVectors, operationJsonSchema } from "./protocol.ts"
import { buildServerVectors } from "./server-vectors.ts"
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
  "openapi.json": openApiDocument(),
  "views.json": buildViewVectors(),
  "listening.json": buildListeningVectors(),
  "server.json": buildServerVectors()
})) {
  writeFileSync(new URL(file, root), `${JSON.stringify(value, null, 2)}\n`)
}

writeFileSync(
  new URL("../../../docs/protocol/operation-coverage.md", import.meta.url),
  operationCoverage()
)
console.log("protocol exported")
