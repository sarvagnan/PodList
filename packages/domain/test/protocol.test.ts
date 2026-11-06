import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { buildVectors, operationJsonSchema } from "../scripts/protocol.ts"
import { Operation, State } from "../src/index.ts"

const protocolDir = new URL("../protocol/", import.meta.url)
const read = (path: string) => JSON.parse(readFileSync(new URL(path, protocolDir), "utf8"))
const files = readdirSync(new URL("vectors/", protocolDir)).filter((f) => f.endsWith(".json"))

describe("Sync protocol conformance vectors (ADR 0007)", () => {
  it.each(files)("%s replays to its expected State", (file) => {
    const vector = read(`vectors/${file}`)
    const initial = Schema.decodeUnknownSync(State.State)(vector.initial)
    const operations = vector.operations.map((o: unknown) =>
      Schema.decodeUnknownSync(Operation.Operation)(o)
    )
    const result = State.applyOperations(initial, operations).state
    expect(Schema.encodeSync(State.State)(result)).toEqual(vector.expected)
  })

  it("committed vectors and JSON Schema match the code (run `pnpm --filter @podlist/domain protocol`)", () => {
    expect(read("operation.schema.json")).toEqual(operationJsonSchema())
    const generated = buildVectors()
    expect(files.sort()).toEqual(generated.map((v) => `${v.name}.json`).sort())
    for (const vector of generated) expect(read(`vectors/${vector.name}.json`)).toEqual(vector)
  })

  it("the JSON Schema is a standard document with every change kind", () => {
    const schema = read("operation.schema.json")
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    expect(JSON.stringify(schema)).toContain('"Rewind"')
  })
})
