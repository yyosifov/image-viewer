'use strict';

var constants = require('./constants');

module.exports = {
	isSupportedImageFile: function(file) {
		var extension = path.extname(file);
		if(extension) {
			extension = extension.slice(1); // remove the dot
			extension = extension.toLowerCase();
			return constants.SupportedImageExtensions.indexOf(extension) !== -1;
		}

		// no extension
		return false;
	}
}