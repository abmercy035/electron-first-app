const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ttsApp', {
  generateAI: (apiKey, mode, userText, persona) =>
    ipcRenderer.invoke('ai-generate', { apiKey, mode, userText, persona }),
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  }
})
