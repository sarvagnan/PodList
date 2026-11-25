/** Fixed for a renderer's lifetime. Changing Libraries opens a new profile. */
export const desktopStandalone =
  import.meta.env.MODE === "desktop" &&
  typeof window !== "undefined" &&
  window.podlistApp?.standalone === true

export const publisherAudioUrl = (url: string) =>
  `app://podlist/audio-download?url=${encodeURIComponent(url)}`
