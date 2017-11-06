import { Component } from '@angular/core';
const { dialog } = require('electron').remote;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';
  currentImageUrl = '';

  onOpen(): void {
		console.log('on open click');
    dialog.showOpenDialog({
			properties: [
				'openFile',
				'openDirectory'
			],
			filters: [
				{
          name: 'Images',
          // TODO: constants!!!
					extensions: [ 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff' ] //constants.SupportedImageExtensions	
				}
			]
		},
		function(fileName) {
      console.log('selected filename: ' + fileName);
			if(fileName) {
				//onOpen(fileName);
			}
		});
  }
}
