import { Component, ElementRef, ViewChild } from '@angular/core';
const { dialog } = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
import { NgZone } from '@angular/core';
const fs = require('fs');
const path = require('path')
import { FileSystemService } from './fileSystem.service';
import { Constants } from './constants';
import { HostListener } from '@angular/core';
import * as _ from 'lodash';

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
	currentImageCss = {};
	rotateDegree = 0;
	containerDimensions = {};

	@ViewChild('currentImage') currentImageRef: ElementRef;
	@ViewChild('centerContainer') centerContainer: ElementRef;

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

	getCurrentImageCss() {
		return this.currentImageCss;
	}

	onDirOpen(dir) {
		this._loadDir(dir); // convert to string
	}

	getDimensionIndex(deg) {
		return (deg == 0 || Math.abs(deg) == 180) ? 0 : 1;
	}

	setRotateDegrees(deg) {
		if(!this.currentImageUrl) {
			return;
		}
	
		const imgHeight = this.currentImageRef.nativeElement.height,
			imgWidth = this.currentImageRef.nativeElement.height.width;
	
		const containerHeight = this.centerContainer.nativeElement.height,
			containerWidth = this.centerContainer.nativeElement.width;
		//console.log(`imgHeight = ${imgHeight}, imgWidth = ${imgWidth}`);
	
		const prevDegrees = this.rotateDegree;
		const dimensionsIndex = this.getDimensionIndex(prevDegrees);
		if(!this.containerDimensions[dimensionsIndex]) {
			// persist them
			this.containerDimensions[dimensionsIndex] = {
				height: containerHeight,
				width: containerWidth
			};
	
			//console.log(`set ${dimensionsIndex} in container dimensions: h:` + containerDimensions[dimensionsIndex].height + ' and w:' + containerDimensions[dimensionsIndex].width);
		}
	
		let css = {};
		const otherIndex = (dimensionsIndex + 1) % 2;
		if(this.containerDimensions[otherIndex]) {
			//console.log('in container dimensions: h:' + containerDimensions[otherIndex].height + ' and w:' + containerDimensions[otherIndex].width);
			css = {
				height: this.containerDimensions[otherIndex].height,
				width: this.containerDimensions[otherIndex].width
			};
		} else {
			this.containerDimensions[otherIndex] = {
				height: containerWidth,
				width: containerHeight
			}
			//console.log(`set ${otherIndex} in container dimensions: h:` + containerDimensions[otherIndex].height + ' and w:' + containerDimensions[otherIndex].width);
	
			css = {
				height: containerWidth,
				width: containerHeight
			};
		}
		
		css = _.merge({}, css, {
			'-webkit-transform' : 'rotate('+deg+'deg)',
				'-moz-transform' : 'rotate('+deg+'deg)',  
				 '-ms-transform' : 'rotate('+deg+'deg)',  
					'-o-transform' : 'rotate('+deg+'deg)',  
						 'transform' : 'rotate('+deg+'deg)',  
									'zoom' : 1
	 });

	 this.rotateDegree = deg;
	 this.currentImageCss = css;
	};

	onRotate(rotationDegrees) {
		// get current degree and rotationDegrees
		var deg = this.rotateDegree;
		deg -= rotationDegrees;
		deg = deg % 360;
	
		this.setRotateDegrees(deg);
	};

	hasImages() {
		return this.imageFiles && this.imageFiles.length > 0;
	}

	// Shows an image on the page.
	showImage(index) {
		this.setRotateDegrees(0);
		// clear the CSS 
		this.currentImageCss = {
			height: '100%',
			width: '100%'
		};

		// clean up
		this.containerDimensions = {};

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
				this.onRotate(-90);
				break;

			case this.constants.DownKey:
				this.onRotate(90);
				break;

			case this.constants.EscapeKey:
				ipcRenderer.send('exit-full-screen', this.currentImageUrl);
				break;
		}
	});
}
