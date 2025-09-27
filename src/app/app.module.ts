import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
// Modules and Components
import { environment } from '@environment/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ComponentsModule } from '@components/components.module';
import { PipesModule } from '@pipes/pipes.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent], imports: [BrowserModule,
    IonicModule.forRoot({
      mode: 'md' // force material UI mode, iOS has not been styled
    }),
    AppRoutingModule,
    BrowserAnimationsModule,
    ComponentsModule,
    PipesModule,
    TranslateModule.forRoot({
      loader: provideTranslateHttpLoader()
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    NgbModule], providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideHttpClient(withInterceptorsFromDi()),
    ]
})
export class AppModule { }
