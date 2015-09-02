'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var remote = require('remote');
var dialog = remote.require('dialog');

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
	$next.toggle(!(index + 1 === imageFiles.length));
	$previous.toggle(!(index === 0));

	// set the stats text
	var statsText = (index + 1) + ' / ' + imageFiles.length;
	$directoryStats.text(statsText);
};

var onPreviousClick = function() {
	var currentImageId = $currentImage.data('currentIndex');
	if(currentImageId > 0) {
		showImage(--currentImageId);
	}
};

$previous.click(onPreviousClick);

var onNextClick = function() {
	var currentImageId = $currentImage.data('currentIndex');
	if(currentImageId + 1 < imageFiles.length) {
		showImage(++currentImageId);
	}
};

$next.click(onNextClick);

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
}

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
	var appMenu = require('./js/app-menu'); 
	appMenu.initialize({
		onFileOpen: onFileOpen,
		onDirOpen: onDirOpen,
		onFileDelete: onFileDelete,
		getCurrentFile: getCurrentFile
	});

	// no files selected
	toggleButtons(false);

	$openFile.click(function() {
		// TODO: Refactor this... code duplication
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
			if(fileName && onFileOpen) {
				onFileOpen(fileName);
			}
		});
	});

	// handle navigation from left/right clicks
	$(window).keydown(function(ev) {
		ev.keyCode === constants.LeftKey && onPreviousClick();
		ev.keyCode === constants.RightKey && onNextClick();
	});
};
initialize();
