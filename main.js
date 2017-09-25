'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;

var ipcMain = require('electron').ipcMain

ipcMain.on('close-main-window', function () {
    app.quit();
});

ipcMain.on('image-changed', function(sender, fileName) {
	//console.log('on image-changed  with ' + JSON.stringify(arguments));
	mainWindow.setTitle(fileName);
});

ipcMain.on('exit-full-screen', function() {
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    }
});

ipcMain.on('enter-full-screen', function() {
    if (!mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(true);
    }
});

ipcMain.on('log', (sender, msg) => {
    console.log(msg);
});

ipcMain.on('toggle-full-screen', function() {
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    } else {
        mainWindow.setFullScreen(true);
    }
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        //frame: false,
        resizable: true,
        height: 600,
        width: 800
    });

    mainWindow.loadURL('file://' + __dirname + '/app/index.html');
});

