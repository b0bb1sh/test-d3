import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { B3ChartModule } from 'dist/b3-chart';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    B3ChartModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
