'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var remote = require('electron').remote;
const { dialog } = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;

var fileSystem = require('./js/file-system');
var constants = require('./js/constants');

// jquery selectors
var $currentImage = $('#currentImage'),
	$previous = $('#previous'),
	$next = $('#next'),
	$directoryStats = $('#directoryStats'),
	$openFile = $('#open-file'),
	$controlPanel = $('#control-panel'),
	$rotateLeft = $('#rotate-left'),
	$rotateRight = $('#rotate-right');

// the list of all retrieved files
var imageFiles = [],
	currentImageFile = '',
	currentDir = '';

var toggleButtons = function(hasSelectedImage) {
	// disable buttons?
	if(hasSelectedImage) {
		$openFile.hide();
		$currentImage.show();
		$controlPanel.show();
	} else {
		$openFile.show();
		$currentImage.hide();
		$controlPanel.hide();
	}
};

// Shows an image on the page.
var showImage = function(index) {
	toggleButtons(true);

	setRotateDegrees(0);
	$currentImage.data('currentIndex', index);
	$currentImage.attr('src', imageFiles[index]);
	currentImageFile = imageFiles[index];

	// Hide show previous/next if there are no more/less files.
	// $next.toggle(!(index + 1 === imageFiles.length));
	// $previous.toggle(!(index === 0));

	// set the stats text
	var statsText = (index + 1) + ' / ' + imageFiles.length;
	$directoryStats.text(statsText);

	ipcRenderer.send('image-changed', currentImageFile);
};

var onPreviousClick = function() {
	var currentImageId = $currentImage.data('currentIndex');
	if(currentImageId > 0) {
		showImage(--currentImageId);
	} else {
		// we're at 0 -> move to the end.
		showImage(imageFiles.length - 1);
	}
};

$previous.click(onPreviousClick);

var onNextClick = function() {
	var currentImageId = $currentImage.data('currentIndex');
	if(currentImageId + 1 < imageFiles.length) {
		showImage(++currentImageId);
	} else {
		// we're at the end - next is the beginning
		showImage(0);
	}
};

$next.click(onNextClick);

// Show image in Full screen on double click
var fullscreenButton = document.getElementById("currentImage");
fullscreenButton.addEventListener("dblclick", toggleFullScreen, false);

function toggleFullScreen() {
	//console.log('double click...');
	ipcRenderer.send('toggle-full-screen');
}

var _loadDir = function(dir, fileName) {
	currentDir = dir;
	imageFiles = fileSystem.getDirectoryImageFiles(dir);

	var selectedImageIndex = imageFiles.indexOf(fileName);
	if(selectedImageIndex === -1) {
		selectedImageIndex = 0;
	}

	if(selectedImageIndex < imageFiles.length) {
		showImage(selectedImageIndex);	
	}
	else {
		alert('No image files found in this directory.');
	}
};

var onOpen = function(filePath) {
	filePath = filePath + ''; // convert to string
	var stat = fs.lstatSync(filePath);
	if(stat.isDirectory()) {
		onDirOpen(filePath);
	} else {
		onFileOpen(filePath);
	}
};

var onFileOpen = function(fileName) {
	fileName = fileName + ''; // convert to string.
	var dirName = path.dirname(fileName);

	_loadDir(dirName, fileName);
};

var onDirOpen = function(dir) {
	_loadDir(dir + ''); // convert to string
};

var onFileDelete = function() {
	// file has been deleted, show previous or next...
	var index = imageFiles.indexOf(currentImageFile);
	if(index > -1) {
		imageFiles.splice(index, 1);
	}
	if(index === imageFiles.length) index--;
	if(index < 0) {
		// no more images in this directory - it's empty...
		toggleButtons(false);
	} else {
		showImage(index);
	}
};

var getCurrentFile = function() {
	return currentImageFile;
};

var setRotateDegrees = function(deg) {
	$currentImage.css({
		 '-webkit-transform' : 'rotate('+deg+'deg)',
	     '-moz-transform' : 'rotate('+deg+'deg)',  
	      '-ms-transform' : 'rotate('+deg+'deg)',  
	       '-o-transform' : 'rotate('+deg+'deg)',  
	          'transform' : 'rotate('+deg+'deg)',  
	               'zoom' : 1
	});

	$currentImage.data('rotateDegree', deg);
};

var onRotate = function(rotationDegrees) {
	// get current degree and rotationDegrees
	var deg = $currentImage.data('rotateDegree') || 0;
	deg -= rotationDegrees;

	setRotateDegrees(deg);
};

$rotateLeft.click(function() {
	onRotate(-90);
});

$rotateRight.click(function() {
	onRotate(90);
});

// Initialize the app
var initialize = function() {
	console.log('what?');
	var appMenu = require('./js/app-menu'); 
	appMenu.initialize({
		onOpen: onOpen,
		onFileDelete: onFileDelete,
		getCurrentFile: getCurrentFile
	});

	// no files selected
	toggleButtons(false);

	//ipcRenderer.send('log', '$openFile = ' + $openFile);
	$openFile.click(function() {
		//ipcRenderer.send('log', 'dialog = ' + dialog);
		// TODO: Refactor this... code duplication
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
			if(fileName) {
				onOpen(fileName);
			}
		});
	});

	// handle navigation from left/right clicks
	$(window).keydown(function(ev) {
		switch(ev.keyCode) {
			case constants.LeftKey:
				onPreviousClick();
				break;

			case constants.RightKey:
				onNextClick();
				break;

			case constants.UpKey:
				onRotate(-90);
				break;

			case constants.DownKey:
				onRotate(90);
				break;

			case constants.EscapeKey:
				ipcRenderer.send('exit-full-screen', currentImageFile);
				break;
		}
	});
};
initialize();
