const { contextBridge, ipcRenderer } = require('electron');

const onMaximizeChanged = (callback) => {
  const listener = (_event, maximized) => callback(maximized);
  ipcRenderer.on('window:maximize-changed', listener);
  return () => ipcRenderer.removeListener('window:maximize-changed', listener);
};

contextBridge.exposeInMainWorld('electronApi', {
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: onMaximizeChanged,
  loadBudgetData: () => ipcRenderer.invoke('budget:load'),
  saveBudgetData: (payload) => ipcRenderer.invoke('budget:save', payload)
});
