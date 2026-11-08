import { Schema } from "effect"
import { Operation, PlaybackSettings, Protocol, State, Units } from "../src/index.ts"
import { contractScenarios } from "./contract-scenarios.ts"
import { scenarios } from "./scenarios.ts"

const minute = (m: number) => 1_793_750_400_000 + m * 60_000

/** A standard draft 2020-12 JSON Schema for one Operation, for clients in any language. */
export const operationJsonSchema = () => {
  const document = Schema.toJsonSchemaDocument(Operation.Operation)
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://podlist.local/protocol/v${Protocol.version}/operation.schema.json`,
    $comment: `PodList sync protocol v${Protocol.version}. Generated from packages/domain/src/Operation.ts; do not edit.`,
    ...document.schema,
    $defs: document.definitions
  }
}

export const initialState = () =>
  State.initial(
    new PlaybackSettings.PlaybackSettings({
      speed: 1,
      skipIntro: Units.Seconds.make(0),
      skipOutro: Units.Seconds.make(0),
      volumeBoost: false
    })
  )

const encodeState = Schema.encodeSync(State.State)
const encodeOperation = Schema.encodeSync(Operation.Operation)
const decodeOperation = Schema.decodeUnknownSync(Operation.Operation)

export const buildVectors = () =>
  [...scenarios, ...contractScenarios].map((scenario) => {
    const operations: Array<Operation.Operation> = []
    scenario.changes.forEach((step, index) => {
      if (step.duplicateOf !== undefined) {
        const original = operations[step.duplicateOf]
        if (original) operations.push(original)
        return
      }
      const change = { ...step.change } as Record<string, unknown>
      // Timeline and listen times are written in minutes in the scenarios.
      if (typeof change.listenedAt === "number") change.listenedAt = minute(change.listenedAt)
      if (change._tag === "Rewind" && typeof change.to === "number") change.to = minute(change.to)
      operations.push(
        decodeOperation({
          id: `${scenario.name}-${index}`,
          deviceId: step.device ?? "phone",
          sequence: index,
          recordedAt: minute(step.minute ?? 0),
          change
        })
      )
    })
    const initial = initialState()
    const expected = State.applyOperations(initial, operations).state
    const checkpoints = operations.map((_, index) =>
      encodeState(State.applyOperations(initial, operations.slice(0, index + 1)).state)
    )
    return {
      name: scenario.name,
      description: scenario.description,
      protocolVersion: Protocol.version,
      initial: encodeState(initial),
      operations: operations.map((o) => encodeOperation(o)),
      expected: encodeState(expected),
      ...(contractScenarios.includes(scenario) ? { checkpoints } : {})
    }
  })
