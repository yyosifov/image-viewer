import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { UtilitiesService } from './utilities.service';
import { FileSystemService } from './fileSystem.service';
import { Constants } from './constants';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
    Constants,
    UtilitiesService,
    FileSystemService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
