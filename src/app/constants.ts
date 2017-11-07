import { Injectable } from '@angular/core';

@Injectable()
export class Constants {
	public readonly LeftKey: 37;
	public readonly UpKey: 38;
	public readonly RightKey: 39;
	public readonly DownKey: 40;
	public readonly EscapeKey: 27;

	get SupportedImageExtensions() {
		return [ 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff' ];
	}
}