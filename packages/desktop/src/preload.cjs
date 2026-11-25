// The setup page gets the connect bridge. The web app gets the server's address, so a
// link it shares opens on the phone too (app:// opens nowhere), and names the steps
// Edit › Undo and Redo act on.
const { contextBridge, ipcRenderer } = require("electron")

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("podlist", {
    connect: (address) => ipcRenderer.invoke("podlist:connect", address),
    setup: () => ipcRenderer.invoke("podlist:setup"),
    startStandalone: () => ipcRenderer.invoke("podlist:start-standalone"),
    cancel: () => ipcRenderer.invoke("podlist:cancel")
  })
} else if (location.protocol === "app:") {
  contextBridge.exposeInMainWorld("podlistApp", {
    server: () => ipcRenderer.invoke("podlist:server"),
    links: {
      take: () => ipcRenderer.invoke("podlist:take-links"),
      onAvailable: (listener) => {
        const handle = () => listener()
        ipcRenderer.on("podlist:links-available", handle)
        return () => ipcRenderer.removeListener("podlist:links-available", handle)
      }
    },
    standalone: process.argv.includes("--podlist-standalone"),
    bringOverSource: process.argv.includes("--podlist-bring-over-source"),
    bringOver: {
      offer: () => ipcRenderer.invoke("podlist:bring-over-offer"),
      dismissOffer: () => ipcRenderer.invoke("podlist:dismiss-bring-over-offer"),
      snapshot: () => ipcRenderer.invoke("podlist:bring-over-snapshot"),
      closeSource: () => ipcRenderer.invoke("podlist:close-bring-over-source")
    },
    appearance: {
      get: () => ipcRenderer.invoke("podlist:appearance"),
      set: (appearance) => ipcRenderer.invoke("podlist:set-appearance", appearance)
    },
    connection: {
      settings: () => ipcRenderer.invoke("podlist:connection-settings"),
      changeServer: () => ipcRenderer.invoke("podlist:change-server"),
      disconnect: () => ipcRenderer.invoke("podlist:disconnect")
    },
    automation: {
      status: () => ipcRenderer.invoke("podlist:automation-status"),
      setEnabled: (enabled) => ipcRenderer.invoke("podlist:automation-enabled", enabled),
      onCall: (call) => {
        const listener = async (_event, id, name, args) => {
          try {
            ipcRenderer.send("podlist:automation-reply", id, await call(name, args), null)
          } catch (error) {
            ipcRenderer.send(
              "podlist:automation-reply",
              id,
              null,
              error instanceof Error ? error.message : String(error)
            )
          }
        }
        ipcRenderer.on("podlist:automation-call", listener)
        ipcRenderer.send("podlist:automation-ready", true)
        return () => {
          ipcRenderer.removeListener("podlist:automation-call", listener)
          ipcRenderer.send("podlist:automation-ready", false)
        }
      }
    },
    setFeedRefreshMenu: (running) => ipcRenderer.send("podlist:feed-refresh", running),
    setCreatedView: (available) => ipcRenderer.send("podlist:created-view", available),
    setRestoredEntries: (available) => ipcRenderer.send("podlist:restored-entries", available),
    setPaneMenu: (sidebar, inspector, canToggle) =>
      ipcRenderer.send("podlist:pane-menu", sidebar, inspector, canToggle),
    setUndoRedo: (undo, redo, editing) => ipcRenderer.send("podlist:undo-redo", undo, redo, editing)
  })
}
