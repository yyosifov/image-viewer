import { Component } from '@angular/core';
const { dialog } = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
import { NgZone } from '@angular/core';
const fs = require('fs');
const path = require('path')
import { FileSystemService } from './fileSystem.service';
import { Constants } from './constants';
import { HostListener } from '@angular/core';

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
	selectedImageIndex = 0;
	directoryStatsText = '';

	constructor(private zone: NgZone,
		private fileSystem: FileSystemService,
		private constants: Constants) { }

	_loadDir(dir: string, filePath?: string) {
		this.currentDir = dir;
		this.imageFiles = this.fileSystem.getDirectoryImageFiles(dir);

		this.selectedImageIndex = this.imageFiles.indexOf(filePath);
		if (this.selectedImageIndex === -1) {
			this.selectedImageIndex = 0;
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

	hasImages() {
		return this.imageFiles && this.imageFiles.length > 0;
	}

	// Shows an image on the page.
	showImage(index) {
		//setRotateDegrees(0);
		// clear the CSS 
		/*
		$currentImage.css({
			height: '100%',
			width: '100%'
		});
		*/
		// clean up

		this.selectedImageIndex = index;
		this.currentImageUrl = 'file:///' + this.imageFiles[index];

		// set the stats text
		this.directoryStatsText = (index + 1) + ' / ' + this.imageFiles.length;

		ipcRenderer.send('image-changed', this.currentImageUrl);
	};

	onPreviousClick() {
		if (!this.hasImages()) {
			return;
		}

		if (this.selectedImageIndex > 0) {
			this.showImage(--this.selectedImageIndex);
		} else {
			// we're at 0 -> move to the end.
			this.showImage(this.imageFiles.length - 1);
		}
	};

	onNextClick() {
		if(!this.hasImages()) {
			return;
		}
	
		if(this.selectedImageIndex + 1 < this.imageFiles.length) {
			this.showImage(++this.selectedImageIndex);
		} else {
			// we're at the end - next is the beginning
			this.showImage(0);
		}
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
					extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff'] //constants.SupportedImageExtensions	
				}
			]
		},
			function (fileName) {
				self.zone.run(() => {
					// todo: make this cross-platform
					fileName = fileName + ''; // convert to string
					ipcRenderer.send('log', 'selected filename: ' + fileName);
					var stat = fs.lstatSync(fileName);
					if (stat.isDirectory()) {
						self.onDirOpen.apply(self, [fileName]);
					} else {
						self.onFileOpen.apply(self, [fileName]);
					}
				});
			});
	}

	@HostListener('window:keydown', ['$event'])
	handleKeyDown(ev: KeyboardEvent) {
		switch(ev.keyCode) {
			case this.constants.LeftKey:
				this.onPreviousClick();
				break;

			case this.constants.RightKey:
				this.onNextClick();
				break;

			case this.constants.UpKey:
				//onRotate(-90);
				break;

			case this.constants.DownKey:
				//onRotate(90);
				break;

			case this.constants.EscapeKey:
				ipcRenderer.send('exit-full-screen', this.currentImageUrl);
				break;
		}
	});
}
