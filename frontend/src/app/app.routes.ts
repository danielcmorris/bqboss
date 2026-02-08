import { Routes } from '@angular/router';
import { SplashComponent } from './features/splash/splash';
import { CredentialsComponent } from './features/credentials/credentials';
import { QueryComponent } from './features/query/query';
import { HelpComponent } from './features/help/help';
import { HowItWorksComponent } from './features/how-it-works/how-it-works';
import { AiAssistInfoComponent } from './features/ai-assist-info/ai-assist-info';
import { PrivacyComponent } from './features/privacy/privacy';
import { TermsComponent } from './features/terms/terms';

export const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'credentials', component: CredentialsComponent },
  { path: 'query', component: QueryComponent },
  { path: 'help', component: HelpComponent },
  { path: 'how-it-works', component: HowItWorksComponent },
  { path: 'ai-assist', component: AiAssistInfoComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'terms', component: TermsComponent },
  { path: '**', redirectTo: '' }
];
