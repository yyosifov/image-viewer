'use strict';
var utilities = require('./utilities');
var _ = require('lodash');

module.exports = {
	getDirectoryImageFiles: function(dir) {
		var files = fs.readdirSync(dir);

		var fullFilePaths = _.map(files, function(fileName) {
			return path.join(dir, fileName);
		});

		var imageFiles = _.filter(fullFilePaths, utilities.isSupportedImageFile);

		return imageFiles;
	}	
};