import { Injectable } from '@angular/core';

@Injectable()
export class Constants {
	public readonly LeftKey: number = 37;
	public readonly UpKey: number = 38;
	public readonly RightKey: number = 39;
	public readonly DownKey: number = 40;
	public readonly EscapeKey: number = 27;

	get SupportedImageExtensions() {
		return [ 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff' ];
	}
}