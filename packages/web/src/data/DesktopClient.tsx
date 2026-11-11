export { TabGate as ClientGate } from "../app/TabGate.tsx"
export { localClientLayer as clientLayer } from "./LocalClient.ts"
export const localClient = true

import { Player } from "../platform/Player.ts"
export const playerLayer = Player.layerWeb
