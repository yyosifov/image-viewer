'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');

var mainWindow = null;

var ipc = require('ipc');

ipc.on('close-main-window', function () {
    app.quit();
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        //frame: false,
        resizable: false,
        height: 600,
        width: 800
    });

    mainWindow.loadUrl('file://' + __dirname + '/app/index.html');
});

