"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path_1 = require("path");
electron_1.app.on("ready", function () {
    var mainWindow = new electron_1.BrowserWindow({});
    mainWindow.loadFile(path_1.default.join(electron_1.app.getAppPath(), '/dist-react/index.html'));
});
