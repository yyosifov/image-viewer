const path = require('path');
import { Injectable } from '@angular/core';
import { Constants } from './constants';

var constants = new Constants();

@Injectable()
export class UtilitiesService {
    isSupportedImageFile = function(file: string) {
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