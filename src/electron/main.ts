import {app, BrowserWindow} from "electron";
import path from "path";

app.on("ready", ()=>{
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.maximize();
    
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