import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"
import { Schema } from "effect"
import { operationCoverage } from "../scripts/coverage.ts"
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
    if (vector.checkpoints) {
      expect(vector.checkpoints).toHaveLength(operations.length)
      for (let index = 0; index < operations.length; index++) {
        expect(
          Schema.encodeSync(State.State)(
            State.applyOperations(initial, operations.slice(0, index + 1)).state
          )
        ).toEqual(vector.checkpoints[index])
      }
    }
  })

  it("committed vectors and JSON Schema match the code (run `pnpm --filter @podlist/domain protocol`)", () => {
    expect(
      readFileSync(new URL("../../../docs/protocol/operation-coverage.md", import.meta.url), "utf8")
    ).toBe(operationCoverage())
    expect(read("operation.schema.json")).toEqual(operationJsonSchema())
    const generated = buildVectors()
    expect(files.sort()).toEqual(generated.map((v) => `${v.name}.json`).sort())
    for (const vector of generated) expect(read(`vectors/${vector.name}.json`)).toEqual(vector)
  })

  it("every Operation.Change variant has a committed replay vector", () => {
    // Read the schema members, not a second hand-maintained list of change names.
    const kinds = Operation.Change.members.map((member) => {
      const ast = member.fields._tag.ast
      if (ast._tag !== "Literal") throw new Error("Expected literal discriminator")
      return ast.literal
    })
    const covered = new Set(
      files.flatMap((file) =>
        read(`vectors/${file}`).operations.map((o: { change: { _tag: string } }) => o.change._tag)
      )
    )
    expect(kinds.filter((kind) => !covered.has(kind))).toEqual([])
  })

  it("the JSON Schema is a standard document with every change kind", () => {
    const schema = read("operation.schema.json")
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema")
    expect(JSON.stringify(schema)).toContain('"Rewind"')
  })
})
