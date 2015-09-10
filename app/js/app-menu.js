'use strict';

var path = require('path');
var constants = require('./constants');
var remote = require('remote');
var Menu = remote.require('menu');
var dialog = remote.require('dialog');
var ipc = require('ipc'); // used for close-window and other commands

//http://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}

module.exports = {
	getMenuTemplate: function() {
		var self = this;

		var template = [
			{
				label: 'File',
				submenu: [
					{
						label: 'Open',
						accelerator: 'CmdOrCtrl+O',
						click: function() {
							dialog.showOpenDialog({
									properties: [
										'openFile',
										'openDirectory'
									],
									filters: [
										{
											name: 'Images',
											extensions: constants.SupportedImageExtensions	
										}
									]
								},
								function(fileName) {
									if(fileName && self.options.onOpen) {
										self.options.onOpen(fileName);
									}
								});
						}
					},
					{
						label: 'Make a copy',
						accelerator: 'CmdOrCtrl+S',
						click: function() {
							var currentFile = self.options.getCurrentFile();
							var selectedFileName = path.basename(currentFile);
							var ext = (path.extname(currentFile) + '').slice(1);
							dialog.showSaveDialog({
								title: 'Save as...',
								defaultPath: currentFile,
								filters: [{
									name: selectedFileName,
									extensions: [ ext ]
								}]
							}, function(fileName) {								
							    if (fileName === undefined) return;
							    copyFile(currentFile, fileName, function(err) {
									if (err) {
										return dialog.showErrorBox("File Save Error", err.message);
							     	}
							    });
							});
						}
					},
					{
						label: 'Delete',
						click: function() {
							var currentFile = self.options.getCurrentFile();

							dialog.showMessageBox({
								type: 'info',
								buttons: [
									'Yes',
									'No'
								],
								title: 'Confirm delete',
								message: 'Are you sure you want to delete file "' + currentFile + '"?'
							}, function(buttonIndex) {
								if(buttonIndex === 1) return;

								fs.unlink(currentFile, function(err) {
									if(err) {
										return dialog.showErrorBox("File Delete Error", err.message);
									}

									self.options.onFileDelete();
								});
							});
						}
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
			    label: 'Window',
			    role: 'window',
			    submenu: [
			      {
			        label: 'Minimize',
			        accelerator: 'CmdOrCtrl+M',
			        role: 'minimize'
			      },
			      {
			        label: 'Close',
			        accelerator: 'CmdOrCtrl+W',
			        click: function() {
                        	ipc.send('close-main-window');
                    }
			      },
			    ]
			  }
		];

		// for MacOS X
		if (process.platform == 'darwin') {
			  var name = 'Image Viewer';
			  template.unshift({
			    label: name,
			    submenu: [
			      {
			        label: 'About ' + name,
			        role: 'about',
			        selector: 'orderFrontStandardAboutPanel:'
			      },
			      {
			        type: 'separator'
			      },
			      {
			        label: 'Services',
			        role: 'services',
			        submenu: []
			      },
			      {
			        type: 'separator'
			      },
			      {
			        label: 'Hide ' + name,
			        accelerator: 'Command+H',
			        role: 'hide'
			      },
			      {
			        label: 'Hide Others',
			        accelerator: 'Command+Shift+H',
			        role: 'hideothers:'
			      },
			      {
			        label: 'Show All',
			        role: 'unhide:'
			      },
			      {
			        type: 'separator'
			      },
			      {
			        label: 'Quit',
			        accelerator: 'Command+Q',
			        click: function() { ipc.send('close-main-window'); }
			      },
			    ]
			  });
			  // Window menu.
			  template[2].submenu.push(
			    {
			      type: 'separator'
			    },
			    {
			      label: 'Bring All to Front',
			      role: 'front'
			    }
			  );
			}

		return template;
	},

	initialize: function(options) {
		this.options = options;

		var template = this.getMenuTemplate();
		var menu = Menu.buildFromTemplate(template);

		Menu.setApplicationMenu(menu);		
	}
};