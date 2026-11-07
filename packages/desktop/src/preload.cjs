// Only the setup page gets this bridge; the web app runs as a plain web app.
const { contextBridge, ipcRenderer } = require("electron")

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("podlist", {
    connect: (address) => ipcRenderer.invoke("podlist:connect", address),
    server: () => ipcRenderer.invoke("podlist:server"),
    cancel: () => ipcRenderer.invoke("podlist:cancel")
  })
}
