/// <reference types="@angular/localize" />

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from '@environment/environment';
import { AppModule } from './app/app.module';

import * as Sentry from "@sentry/angular-ivy";

if (environment.production) {
  enableProdMode();
  window.console.log = () => { };
}

Sentry.init({
  dsn: "https://c43111bfae664837b4a663223d1673f4@gt.b310.de/2",
  integrations: [
    // Registers and configures the Tracing integration,
    // which automatically instruments your application to monitor its
    // performance, including custom Angular routing instrumentation

    Sentry.browserTracingIntegration(),
    // Registers the Replay integration,
    // which automatically captures Session Replays
    // Sentry.replayIntegration(),
  ],

  autoSessionTracking: false,
  // Set sampleRates to 1.0 to capture 100% during testing
  tracesSampleRate: 1.0,
});


platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));