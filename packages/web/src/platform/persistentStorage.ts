/**
 * Asks the browser to keep this app's storage (the local database and downloads) when
 * space runs low. Chrome decides without asking for installed apps and sites people use
 * a lot; it is asked once something worth keeping exists, never as a prompt at start.
 */
export const keepStorage = async (): Promise<boolean> => {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist().catch(() => false)
}
