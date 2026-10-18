'use strict';

// Puente seguro: la pantalla (renderer) solo puede usar estas funciones.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cobalto', {
  platform: process.platform,

  // archivos y carpetas
  openFiles: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  save: (filePath, content) => ipcRenderer.invoke('fs:save', filePath, content),
  saveAs: (content, suggestedName) => ipcRenderer.invoke('fs:saveAs', content, suggestedName),
  search: (folder, query, caseSensitive) => ipcRenderer.invoke('fs:search', folder, query, caseSensitive),

  // ejecutar código
  run: (opts) => ipcRenderer.invoke('run:start', opts),
  stopRun: () => ipcRenderer.invoke('run:stop'),
  sendInput: (text) => ipcRenderer.invoke('run:input', text),
  onRunData: (cb) => ipcRenderer.on('run:data', (_e, data) => cb(data)),
  onRunExit: (cb) => ipcRenderer.on('run:exit', (_e, data) => cb(data)),
  previewHtml: (opts) => ipcRenderer.invoke('preview:html', opts),

  // terminal
  termStart: (cwd) => ipcRenderer.invoke('term:start', cwd),
  termInput: (text) => ipcRenderer.invoke('term:input', text),
  termStop: () => ipcRenderer.invoke('term:stop'),
  onTermData: (cb) => ipcRenderer.on('term:data', (_e, data) => cb(data)),
  onTermExit: (cb) => ipcRenderer.on('term:exit', (_e, data) => cb(data)),

  // sesión y ventana
  loadSession: () => ipcRenderer.invoke('session:load'),
  saveSession: (data) => ipcRenderer.invoke('session:save', data),
  setTitleBar: (opts) => ipcRenderer.invoke('window:titlebar', opts),
});
