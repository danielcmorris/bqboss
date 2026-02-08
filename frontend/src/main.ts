import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AllEnterpriseModule, LicenseManager, ModuleRegistry } from 'ag-grid-enterprise';
import { environment } from './environments/environment';

ModuleRegistry.registerModules([AllEnterpriseModule]);
LicenseManager.setLicenseKey(environment.agGridLicenseKey);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
