import type { PlaybackSettings } from "@podlist/domain"

export interface EffectiveSettings {
  readonly speed: number
  readonly skipIntro: number
  readonly skipOutro: number
  readonly volumeBoost: boolean
}

/** The global Playback Settings with a Subscription's overrides on top (CONTEXT.md). */
export const effectiveSettings = (
  global: PlaybackSettings.PlaybackSettings,
  override: PlaybackSettings.PlaybackSettingsOverride
): EffectiveSettings => ({
  speed: override.speed ?? global.speed,
  skipIntro: override.skipIntro ?? global.skipIntro,
  skipOutro: override.skipOutro ?? global.skipOutro,
  volumeBoost: override.volumeBoost ?? global.volumeBoost
})

/** Overrides as the local catalogue stores them (JSON); anything unreadable is ignored. */
export const storedOverride = (json: string | null): PlaybackSettings.PlaybackSettingsOverride => {
  try {
    const value = JSON.parse(json ?? "{}") as Record<string, unknown>
    return {
      ...(typeof value.speed === "number" ? { speed: value.speed } : {}),
      ...(typeof value.skipIntro === "number" ? { skipIntro: value.skipIntro } : {}),
      ...(typeof value.skipOutro === "number" ? { skipOutro: value.skipOutro } : {}),
      ...(typeof value.volumeBoost === "boolean" ? { volumeBoost: value.volumeBoost } : {})
    } as PlaybackSettings.PlaybackSettingsOverride
  } catch {
    return {}
  }
}
