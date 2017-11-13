const fs = require('fs'),
    _ = require('lodash'),
    path = require('path');
import { UtilitiesService } from './utilities.service';
import { Injectable } from '@angular/core';

@Injectable()
export class FileSystemService {
    constructor(private utilities: UtilitiesService) { }

    getDirectoryImageFiles = function (dir: string) {
        var files = fs.readdirSync(dir);

        var fullFilePaths = _.map(files, function (fileName) {
            var newFilePath = path.join(dir, fileName);

            if (process.platform === "darwin") {
                newFilePath = encodeURIComponent(newFilePath).replace(/%2F/g, "/");
            } else if (process.platform === "win32") {
                newFilePath = encodeURIComponent(newFilePath).replace(/%3A/g, ":").replace(/%5C/g, "\\");
            }

            return newFilePath;
        });
        
        var imageFiles = fullFilePaths;
        var imageFiles = _.filter(fullFilePaths, this.utilities.isSupportedImageFile);
        
        return imageFiles;
    }
}