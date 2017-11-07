import { Component } from '@angular/core';
const { dialog } = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
import { NgZone } from '@angular/core';
const fs = require('fs');
const path = require('path')
import { FileSystemService } from './fileSystem.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
	currentImageUrl = '';
	currentDir = '';
	imageFiles = [];
	
	constructor(private zone:NgZone,
		private fileSystem: FileSystemService) {}	

	_loadDir(dir: string, filePath?: string) {
		this.currentDir = dir;
		this.imageFiles = this.fileSystem.getDirectoryImageFiles(dir);
	
		var selectedImageIndex = this.imageFiles.indexOf(filePath);
		if(selectedImageIndex === -1) {
			selectedImageIndex = 0;
		}
	}

	onFileOpen(filePath: string) {
		this.currentImageUrl = 'file:///' + filePath;

		var dirName = path.dirname(filePath);
		
		this._loadDir(dirName, filePath);
	}

	onDirOpen(dir) {
		this._loadDir(dir); // convert to string
	}

  onOpen(): void {
		const self = this;
    dialog.showOpenDialog({
			properties: [
				'openFile',
				'openDirectory'
			],
			filters: [
				{
          name: 'Images',
          // TODO: constants!!!
					extensions: [ 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff' ] //constants.SupportedImageExtensions	
				}
			]
		},
		function(fileName) {
			self.zone.run(() => {
				// todo: make this cross-platform
				fileName = fileName + ''; // convert to string
				ipcRenderer.send('log', 'selected filename: ' + fileName);
				var stat = fs.lstatSync(fileName);
				if(stat.isDirectory()) {
					self.onDirOpen.apply(self, [fileName]);
				} else {
					self.onFileOpen.apply(self, [fileName]);
				}
			});
		});
  }
}
