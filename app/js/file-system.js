'use strict';
var utilities = require('./utilities');
var _ = require('lodash');

module.exports = {
	getDirectoryImageFiles: function(dir) {
		var files = fs.readdirSync(dir);

		var fullFilePaths = _.map(files, function(fileName) {
			var newFilePath = path.join(dir, fileName);

			if (process.platform === "darwin"){
				newFilePath = encodeURIComponent(newFilePath).replace(/%2F/g, "/");
			} else if (process.platform === "win32"){
				newFilePath = encodeURIComponent(newFilePath).replace(/%3A/g, ":").replace(/%5C/g, "\\");
			}
			
			return newFilePath;
		});

		var imageFiles = _.filter(fullFilePaths, utilities.isSupportedImageFile);

		return imageFiles;
	}
};
