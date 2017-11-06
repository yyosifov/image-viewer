'use strict';

const { app, BrowserWindow } = require('electron');

console.log('in main.js');

var mainWindow = null;

let serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
console.log(`args = ${args}`);
if (serve) {
  require('electron-reload')(__dirname, {});
  console.log('init electron-reload');
}

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

function createWindow() {
    mainWindow = new BrowserWindow({
        //frame: false,
        resizable: true,
        height: 600,
        width: 800,
        webPreferences: {
            webSecurity: false
        }
    });

    mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    // cleanup
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', function() {
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
      app.quit()
    }
});

app.on('activate', function () {
    // macOS specific close process
    if (mainWindow === null) {
      createWindow();
    }
  });

