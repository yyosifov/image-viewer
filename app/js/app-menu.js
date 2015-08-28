'use strict';

var constants = require('./constants');
var remote = require('remote');
var Menu = remote.require('menu');
var dialog = remote.require('dialog');
var ipc = require('ipc'); // used for close-window and other commands

module.exports = {
	getMenuTemplate: function() {
		var self = this;

		var template = [
			{
				label: 'File',
				submenu: [
					{
						label: 'Open File',
						accelerator: 'CmdOrCtrl+O',
						click: function() {
							dialog.showOpenDialog({
									properties: [
										'openFile'
									],
									filters: [
										{
											name: 'Images',
											extensions: constants.SupportedImageExtensions	
										}
									]
								},
								function(fileName) {
									if(fileName && self.options.onFileOpen) {
										self.options.onFileOpen(fileName);
									}
								});
						}
					},
					{
						label: 'Open Directory',
						click: function() {
							dialog.showOpenDialog({
									properties: [
										'openDirectory'
									]
								},
								function(dirName) {
									if(dirName && self.options.onDirOpen) {
										self.options.onDirOpen(dirName);
									}
								});
						}
					},
					{
						label: 'Make a copy',
						accelerator: 'CmdOrCtrl+S'
					},
					{
						label: 'Delete'
					},
					{
						label: 'Quit',
						accelerator: 'CmdOrCtrl+Q',
						click: function() {
							ipc.send('close-main-window');
						}
					}
				]
			},
			{
				label: 'Help',
				submenu: [
					{
						label: 'About'
					}
				]
			}
		];
		return template;
	},

	initialize: function(options) {
		this.options = options;

		var template = this.getMenuTemplate();
		var menu = Menu.buildFromTemplate(template);

		Menu.setApplicationMenu(menu);		
	}
};