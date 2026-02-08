import { Routes } from '@angular/router';
import { SplashComponent } from './features/splash/splash';
import { CredentialsComponent } from './features/credentials/credentials';
import { QueryComponent } from './features/query/query';
import { HelpComponent } from './features/help/help';

export const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'query', component: QueryComponent },
  { path: 'help', component: HelpComponent },
  { path: '**', redirectTo: '' }
];
