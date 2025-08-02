import {app, BrowserWindow, ipcMain, screen} from "electron";
import * as path from "path";

app.on("ready", ()=>{
    // Get the primary display's work area (screen minus dock/taskbar)
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    
    const mainWindow = new BrowserWindow({
        width: screenWidth,
        height: screenHeight,
        x: 0,
        y: 0,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });
    
    // Handle focus mode window resizing
    ipcMain.handle('set-focus-mode', async (event, isFocusMode: boolean) => {
        if (isFocusMode) {
            // Resize to sidebar (300px wide, full height)
            mainWindow.setSize(300, screenHeight, true);
            mainWindow.setPosition(0, 0); // Position on left side
        } else {
            // Restore to full size
            mainWindow.setSize(screenWidth, screenHeight, true);
            mainWindow.setPosition(0, 0);
        }
    });
    
    // In development, load from the Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built files
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
    }
});