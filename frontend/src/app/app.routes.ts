import { Routes } from '@angular/router';
import { SplashComponent } from './features/splash/splash';
import { CredentialsComponent } from './features/credentials/credentials';
import { QueryComponent } from './features/query/query';
import { HelpComponent } from './features/help/help';
import { HowItWorksComponent } from './features/how-it-works/how-it-works';
import { AiAssistInfoComponent } from './features/ai-assist-info/ai-assist-info';

export const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'query', component: QueryComponent },
  { path: 'help', component: HelpComponent },
  { path: 'how-it-works', component: HowItWorksComponent },
  { path: 'ai-assist', component: AiAssistInfoComponent },
  { path: '**', redirectTo: '' }
];
