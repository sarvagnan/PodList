/** Only identity and the next sequence are durable. Never store edits here.
 * IndexedDB read/write transactions serialize across connections and browser tabs.
 * Committing allocation before returning also makes a tab crash leave only a gap. */
export interface BrowserProfile {
  readonly id: string
  readonly registeredAt: number
  readonly nextSequence: number
}

export class BrowserDevice {
  private readonly db: IDBDatabase
  private constructor(db: IDBDatabase) {
    this.db = db
  }

  static open(name = "podlist-web-profile"): Promise<BrowserDevice> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => request.result.createObjectStore("profile")
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(new BrowserDevice(request.result))
    })
  }

  close() {
    this.db.close()
  }

  allocate(reserve: boolean): Promise<BrowserProfile> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction("profile", "readwrite")
      const store = transaction.objectStore("profile")
      const request = store.get("device")
      let profile: BrowserProfile
      request.onsuccess = () => {
        profile = request.result ?? {
          id: crypto.randomUUID(),
          registeredAt: Date.now(),
          nextSequence: 0
        }
        if (
          !Number.isSafeInteger(profile.nextSequence) ||
          profile.nextSequence >= Number.MAX_SAFE_INTEGER
        ) {
          transaction.abort()
          return
        }
        store.put({ ...profile, nextSequence: profile.nextSequence + (reserve ? 1 : 0) }, "device")
      }
      transaction.oncomplete = () => resolve(profile)
      transaction.onabort = () => reject(transaction.error ?? new Error("Device allocation failed"))
      transaction.onerror = () => reject(transaction.error)
    })
  }
}
