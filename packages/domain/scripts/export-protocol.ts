// Regenerates protocol/operation.schema.json and protocol/vectors/*.json.
// Run with: pnpm --filter @podlist/domain protocol
import { writeFileSync } from "node:fs"
import { buildVectors, operationJsonSchema } from "./protocol.ts"

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
console.log("protocol exported")
