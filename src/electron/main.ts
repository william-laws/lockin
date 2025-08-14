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
            preload: path.join(__dirname, 'preload.cjs'),
            devTools: true
        },
        useContentSize: true
    });
    
    // Track window and mode states
    let isWindowFocused = true;
    let isFocusMode = false;
    
    // Handle window focus events
    mainWindow.on('focus', () => {
        console.log('Window focused');
        isWindowFocused = true;
        mainWindow.webContents.send('window-focus-changed', true);
    });
    
    mainWindow.on('blur', () => {
        console.log('Window blurred');
        isWindowFocused = false;
        mainWindow.webContents.send('window-focus-changed', false);
    });
    
    // Handle focus mode window resizing
    ipcMain.handle('set-focus-mode', async (event, enableFocusMode: boolean) => {
        isFocusMode = enableFocusMode;
        // Enter focus mode: shrink to sidebar
        if (enableFocusMode) {
            mainWindow.setContentSize(300, screenHeight, true);
            mainWindow.setPosition(0, 0);
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        }
        // Note: when disabling focus mode we intentionally do NOT resize here,
        // so that other modes (e.g., mini focus) can take control without a flash to fullscreen.
    });

    // Remove mini-focus mode support entirely
    
    // In development, load from the Vite dev server
    if (process.env.NODE_ENV === 'development') {
        // Try to load from common Vite ports
        const tryLoadDevServer = async () => {
            const ports = [5173, 5174, 5175, 3000];
            
            for (const port of ports) {
                try {
                    console.log(`Trying to load from port ${port}`);
                    await mainWindow.loadURL(`http://localhost:${port}`);
                    console.log(`Successfully loaded from port ${port}`);
                    mainWindow.webContents.openDevTools();
                    return;
                } catch (error) {
                    console.log(`Port ${port} failed:`, error instanceof Error ? error.message : String(error));
                    continue;
                }
            }
            
            console.error('Failed to load from any dev server port. Please ensure the dev server is running.');
        };
        
        tryLoadDevServer();
    } else {
        // In production, load the built files
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
    }
})