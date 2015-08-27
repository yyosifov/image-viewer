'use strict';

var ipc = require('ipc');
var fs = require('fs');

var currentImage = $("#currentImage"),
	previous = $("#previous"),
	next = $("#next"),
	directoryStats = $("#directoryStats");

var imageFiles = [];

/*
var closeEl = document.querySelector('.close');
closeEl.addEventListener('click', function () {
	console.log('clicked close el.');
    ipc.send('close-main-window');
});
*/

ipc.on('on-file-open', function(fileName) {
	alert('opened ' + fileName);
});

var selectMonth = function(id) {
	
};

var isImage = function(file) {
	return true;
};

var setImage = function(index) {
	currentImage.data('currentIndex', index);
	currentImage.attr('src', imageFiles[index]);

	// Hide show previous/next if there are no more/less files.
	next.toggle(!(index + 1 === imageFiles.length));
	previous.toggle(!(index === 0));

	// set the stats text
	var statsText = (index + 1) + ' / ' + imageFiles.length;
	directoryStats.text(statsText);
};

var loadDir = function(dir) {
	var files = fs.readdirSync(dir);

	// get only image files
	for(var index in files) {
		var file = dir + '\\' + files[index];
		if(isImage(file)) {
			imageFiles.push(file);
		}
	}

	// bind current image.
	setImage(0);
};
loadDir("C:\\Users\\yosifov\\Desktop\\images");

previous.click(function() {
	var currentImageId = currentImage.data('currentIndex');
	if(currentImageId > 0) {
		setImage(--currentImageId);
	}
});

next.click(function() {
	var currentImageId = currentImage.data('currentIndex');
	if(currentImageId + 1 < imageFiles.length) {
		setImage(++currentImageId);
	}
});

$('.list-group-item').click(function() {
	$('.list-group-item').removeClass('active');
	$(this).addClass('active');

	var id = $(this).data('id');
	selectMonth(id);
});

// Add Menu
var remote = require('remote');
var Menu = remote.require('menu');

var dialog = remote.require('dialog');

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
								'openFile'
							],
							filters: [
								{
									name: 'Images',
									extensions: ['jpg', 'png', 'gif']
								}
							]
						},
						function(fileName) {
							if(fileName) {
								alert('file opened: ' + fileName);
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

var menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);
