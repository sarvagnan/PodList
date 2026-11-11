// The setup page gets the connect bridge. The web app gets the server's address, so a
// link it shares opens on the phone too (app:// opens nowhere), and names the steps
// Edit › Undo and Redo act on.
const { contextBridge, ipcRenderer } = require("electron")

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("podlist", {
    connect: (address) => ipcRenderer.invoke("podlist:connect", address),
    server: () => ipcRenderer.invoke("podlist:server"),
    cancel: () => ipcRenderer.invoke("podlist:cancel")
  })
} else if (location.protocol === "app:") {
  contextBridge.exposeInMainWorld("podlistApp", {
    server: () => ipcRenderer.invoke("podlist:server"),
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
    setUndoRedo: (undo, redo, editing) => ipcRenderer.send("podlist:undo-redo", undo, redo, editing)
  })
}
