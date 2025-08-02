import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    setFocusMode: (isFocusMode: boolean) => ipcRenderer.invoke('set-focus-mode', isFocusMode)
});

// TypeScript interface for the exposed API
declare global {
    interface Window {
        electronAPI: {
            setFocusMode: (isFocusMode: boolean) => Promise<void>;
        };
    }
} 