import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    setFocusMode: (isFocusMode: boolean) => ipcRenderer.invoke('set-focus-mode', isFocusMode),
    onWindowFocusChanged: (callback: (isFocused: boolean) => void) => {
        ipcRenderer.on('window-focus-changed', (event, isFocused: boolean) => {
            callback(isFocused);
        });
    }
});

// TypeScript interface for the exposed API
declare global {
    interface Window {
        electronAPI: {
            setFocusMode: (isFocusMode: boolean) => Promise<void>;
            onWindowFocusChanged: (callback: (isFocused: boolean) => void) => void;
        };
    }
} 