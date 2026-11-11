import { Schema } from "effect"
import { Device, Protocol } from "../src/index.ts"

/** Registration values shared with native decoders; adding a kind updates every runner. */
export const buildDeviceVectors = () => ({
  protocolVersion: Protocol.version,
  devices: Device.Device.fields.kind.literals.map((kind) =>
    Schema.encodeSync(Device.Device)(
      Schema.decodeUnknownSync(Device.Device)({
        id: `device-${kind}`,
        name: `PodList ${kind}`,
        kind,
        registeredAt: 1
      })
    )
  )
})
