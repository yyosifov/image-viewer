'use strict';

var ipc = require('ipc');
var fs = require('fs');

var currentImage = $("#currentImage"),
	previous = $("#previous"),
	next = $("#next");

var imageFiles = [];

/*
var closeEl = document.querySelector('.close');
closeEl.addEventListener('click', function () {
	console.log('clicked close el.');
    ipc.send('close-main-window');
});
*/
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