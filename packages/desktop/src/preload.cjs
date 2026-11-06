// Only the app's own local pages (setup and offline) get this bridge; the server's
// pages run as a plain web app.
const { contextBridge, ipcRenderer } = require("electron")

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("podlist", {
    connect: (address) => ipcRenderer.invoke("podlist:connect", address),
    server: () => ipcRenderer.invoke("podlist:server")
  })
}
