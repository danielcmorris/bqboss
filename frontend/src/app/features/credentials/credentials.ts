import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { BigQueryApiService } from '../../services/bigquery-api.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import type { ValidateCredentialsResponse } from '../../models/credential.model';
import type { StoredCredential } from '../../db/app-database';

@Component({
  selector: 'app-credentials',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <nav class="banner">
        <div class="banner-brand" (click)="goHome()"><img src="logo.png" alt="BQ Boss" class="brand-logo" />BQ Boss</div>
        <div class="banner-links">
          <button class="link-btn" (click)="goHome()">Home</button>
        </div>
      </nav>

      <div class="body">
        <!-- Saved Credentials -->
        @if (savedCredentials().length) {
          <div class="card">
            <h2>Saved Credentials</h2>
            @for (cred of savedCredentials(); track cred.id) {
              <div class="saved-item" [class.oauth-item]="cred.type === 'oauth'">
                <div class="saved-info" (click)="useCred(cred)">
                  <strong>
                    @if (cred.type === 'oauth') {
                      <span class="oauth-badge">G</span>
                    }
                    {{ cred.name }}
                  </strong>
                  <span class="saved-meta">{{ cred.projectId }}</span>
                </div>
                <button class="delete-btn" (click)="deleteCred(cred)" title="Remove">&#10005;</button>
              </div>
            }
          </div>
        }

        <!-- Service Account Card -->
        <div class="card">
          <h2>Service Account</h2>

          @if (!adding()) {
            <p>Connect to BigQuery using a Google Cloud service account JSON key.</p>
            <button class="primary-btn" (click)="adding.set(true)">
              + Add Service Account
            </button>
          }

          @if (adding()) {
            @if (!validated()) {
              <p>Paste your Google Cloud service account JSON credentials</p>
              <textarea
                [ngModel]="credentialsJson()"
                (ngModelChange)="credentialsJson.set($event)"
                placeholder='{"type": "service_account", ...}'
                rows="10"
              ></textarea>
              @if (error() && !oauthProjectStep()) {
                <div class="error">{{ error() }}</div>
              }
              <div class="btn-row">
                <button class="secondary-btn" (click)="cancelAdd()">Cancel</button>
                <button (click)="validate()" [disabled]="validating() || !credentialsJson().trim()">
                  {{ validating() ? 'Validating...' : 'Validate' }}
                </button>
              </div>
            }

            @if (validated() && validationResult(); as result) {
              <div class="project-badge">Project: {{ result.projectId }}</div>
              <label>
                Name these credentials
                <input type="text" [ngModel]="credentialName()" (ngModelChange)="credentialName.set($event)" placeholder="e.g. snapdragonerp-prod" />
              </label>
              <div class="btn-row">
                <button class="secondary-btn" (click)="cancelAdd()">Cancel</button>
                <button (click)="saveCredential()" [disabled]="!credentialName().trim()">
                  Save & Use
                </button>
              </div>
              <div class="success-info">
                <div class="datasets">
                  @for (ds of result.datasets; track ds.datasetId) {
                    <div class="dataset">
                      <strong>{{ ds.datasetId }}</strong>
                      <ul>
                        @for (t of ds.tables; track t) {
                          <li>{{ t }}</li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- OAuth Card -->
        <div class="card">
          <h2>Google OAuth</h2>
          <p>If you would like to use your own authenticator in Google Cloud OAuth validation, you can add your client ID here and authenticate that way.</p>

          @if (!oauthAvailable()) {
            <p>Enter your OAuth Client ID from the
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">GCP Credentials Console</a>.
            </p>
            <input
              type="text"
              [ngModel]="oauthClientIdInput()"
              (ngModelChange)="oauthClientIdInput.set($event)"
              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
            />
            <button (click)="saveOAuthClientId()" [disabled]="!oauthClientIdInput().trim()">
              Save Client ID
            </button>
          } @else {
            @if (error()) {
              <div class="error">{{ error() }}</div>
            }
            <div class="google-btn-row">
              <button class="google-btn" (click)="startOAuthLogin()" [disabled]="oauthLoading()">
                <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {{ oauthLoading() ? 'Signing in...' : 'Sign in with Google' }}
              </button>
              <button class="configure-btn" (click)="removeOAuthClientId()" title="Remove OAuth Client ID">
                &#9881;
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: #0d0d1a;
      display: flex;
      flex-direction: column;
    }

    /* ---- Banner (matches splash) ---- */
    .banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: rgba(13, 13, 26, 0.8);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .banner-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #4fc3f7, #ab47bc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      cursor: pointer;
    }
    .brand-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
    }
    .banner-links {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .link-btn {
      padding: 8px 20px;
      font-size: 0.9rem;
      font-weight: 500;
      color: #8a8a9e;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.2s;
    }
    .link-btn:hover { color: #e0e0e0; }

    /* ---- Body ---- */
    .body {
      max-width: 640px;
      width: 100%;
      margin: 0 auto;
      padding: 40px 24px 64px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ---- Card ---- */
    .card {
      padding: 32px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
    }
    h2 {
      font-size: 1.2rem;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 14px;
    }
    p { color: #8a8a9e; margin-bottom: 16px; font-size: 0.92rem; line-height: 1.55; }
    a { color: #4fc3f7; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ---- Saved credentials ---- */
    .saved-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 8px;
      transition: border-color 0.15s;
    }
    .saved-item:hover { border-color: #4fc3f7; }
    .saved-info { cursor: pointer; flex: 1; }
    .saved-info strong { color: #e0e0e0; display: block; }
    .saved-meta { color: #666; font-size: 0.85rem; }
    .oauth-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #4285F4;
      color: #fff;
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 700;
      margin-right: 6px;
      vertical-align: middle;
    }
    .oauth-item { border-color: rgba(66,133,244,0.25) !important; }
    .delete-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 4px 8px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .delete-btn:hover { color: #f44336; background: rgba(244,67,54,0.1); }

    /* ---- Form elements ---- */
    textarea {
      width: 100%;
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 12px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.85rem;
      resize: vertical;
      margin-bottom: 16px;
    }
    textarea:focus { outline: none; border-color: #4fc3f7; }
    input[type="text"] {
      display: block;
      width: 100%;
      margin-top: 8px;
      margin-bottom: 16px;
      padding: 10px 12px;
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 8px;
      font-size: 1rem;
    }
    input[type="text"]:focus { outline: none; border-color: #4fc3f7; }
    label { display: block; color: #9e9e9e; margin-top: 16px; }
    .error {
      color: #f44336;
      background: rgba(244,67,54,0.1);
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }

    /* ---- Buttons ---- */
    button {
      padding: 12px 24px;
      font-size: 1rem;
      background: #4fc3f7;
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover:not(:disabled) { background: #81d4fa; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .primary-btn { width: 100%; }
    .secondary-btn {
      background: transparent;
      color: #9e9e9e;
      border: 1px solid #30363d;
    }
    .secondary-btn:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: #e0e0e0; }
    .btn-row { display: flex; gap: 12px; }
    .btn-row button { flex: 1; }

    /* ---- Google OAuth ---- */
    .google-btn-row { display: flex; gap: 8px; }
    .google-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex: 1;
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
      background: #fff;
      color: #3c4043;
      border: 1px solid #dadce0;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .google-btn:hover:not(:disabled) {
      background: #f8f9fa;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .google-icon { flex-shrink: 0; }
    .configure-btn {
      padding: 12px 14px;
      font-size: 1.1rem;
      background: rgba(255,255,255,0.05);
      color: #9e9e9e;
      border: 1px solid #30363d;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .configure-btn:hover { color: #f44336; background: rgba(244,67,54,0.1); border-color: rgba(244,67,54,0.3); }
    .oauth-project-step {
      background: rgba(255,255,255,0.03);
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px;
    }

    /* ---- Misc ---- */
    .success-info { margin: 20px 0; }
    .project-badge {
      display: inline-block;
      background: rgba(79,195,247,0.15);
      color: #4fc3f7;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .datasets { color: #bdbdbd; }
    .dataset { margin-bottom: 12px; }
    .dataset strong { color: #e0e0e0; }
    .dataset ul { margin: 4px 0 0 20px; }
    .dataset li { font-size: 0.9rem; color: #9e9e9e; }
  `]
})
export class CredentialsComponent implements OnInit {
  private router = inject(Router);
  private dbService = inject(DatabaseService);
  private apiService = inject(BigQueryApiService);
  private googleAuth = inject(GoogleAuthService);

  savedCredentials = signal<StoredCredential[]>([]);
  adding = signal(false);
  credentialsJson = signal('');
  credentialName = signal('');
  validating = signal(false);
  validated = signal(false);
  error = signal('');
  validationResult = signal<ValidateCredentialsResponse | null>(null);

  // OAuth state
  oauthAvailable = signal(false);
  oauthLoading = signal(false);
  oauthProjectStep = signal(false);
  oauthProjectId = signal('');
  oauthClientIdInput = signal('');
  private pendingAccessToken = '';
  private pendingTokenExpiry = new Date();

  async ngOnInit() {
    await this.loadCredentials();
    // Initialize OAuth if client ID is stored in IndexedDB
    const clientId = await this.dbService.getOAuthClientId();
    if (clientId) {
      try {
        await this.googleAuth.init(clientId);
        this.oauthAvailable.set(true);
      } catch {}
    }
  }

  async loadCredentials() {
    const all = await this.dbService.getAllCredentials();
    // Sort: OAuth ("My Account") first, then service accounts by name
    all.sort((a, b) => {
      if (a.type === 'oauth' && b.type !== 'oauth') return -1;
      if (a.type !== 'oauth' && b.type === 'oauth') return 1;
      return a.name.localeCompare(b.name);
    });
    this.savedCredentials.set(all);
  }

  startOAuthLogin() {
    this.oauthLoading.set(true);
    this.error.set('');
    this.googleAuth.requestAccessToken().then(
      result => {
        this.pendingAccessToken = result.accessToken;
        this.pendingTokenExpiry = new Date(Date.now() + result.expiresIn * 1000);
        const projectId = window.prompt('Signed in with Google. Enter your GCP Project ID:');
        if (!projectId?.trim()) {
          this.oauthLoading.set(false);
          return;
        }
        this.oauthProjectId.set(projectId.trim());
        this.validateOAuthProject();
      },
      err => {
        this.error.set(err.message || 'OAuth sign-in failed');
        this.oauthLoading.set(false);
      }
    );
  }

  async validateOAuthProject() {
    this.oauthLoading.set(true);
    this.error.set('');
    try {
      const result = await this.apiService.validateCredentials({
        accessToken: this.pendingAccessToken,
        projectId: this.oauthProjectId().trim()
      });
      if (result.success) {
        const datasets = result.datasets.map(ds => ({ datasetId: ds.datasetId, tables: ds.tables }));
        const id = await this.dbService.saveOAuthCredential(
          this.pendingAccessToken,
          this.pendingTokenExpiry,
          this.oauthProjectId().trim(),
          datasets
        );
        this.router.navigate(['/query'], { queryParams: { credId: id } });
      } else {
        this.error.set(result.error || 'Validation failed');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to validate project');
    } finally {
      this.oauthLoading.set(false);
    }
  }

  async saveOAuthClientId() {
    const clientId = this.oauthClientIdInput().trim();
    if (!clientId) return;
    await this.dbService.setOAuthClientId(clientId);
    await this.googleAuth.init(clientId);
    this.oauthAvailable.set(true);
  }

  async removeOAuthClientId() {
    if (!confirm('Remove the stored OAuth Client ID?')) return;
    await this.dbService.deleteOAuthClientId();
    this.oauthAvailable.set(false);
    this.oauthClientIdInput.set('');
  }

  cancelOAuth() {
    this.oauthProjectStep.set(false);
    this.oauthProjectId.set('');
    this.pendingAccessToken = '';
    this.error.set('');
  }

  async validate() {
    this.validating.set(true);
    this.error.set('');
    try {
      const result = await this.apiService.validateCredentials({ credentialsJson: this.credentialsJson() });
      if (result.success) {
        this.validationResult.set(result);
        this.validated.set(true);
      } else {
        this.error.set(result.error || 'Validation failed');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to connect to backend');
    } finally {
      this.validating.set(false);
    }
  }

  async saveCredential() {
    const result = this.validationResult()!;
    const id = await this.dbService.saveCredential({
      name: this.credentialName(),
      credentialsJson: this.credentialsJson(),
      projectId: result.projectId!,
      datasets: result.datasets.map(ds => ({ datasetId: ds.datasetId, tables: ds.tables })),
      createdAt: new Date(),
      type: 'service-account'
    });
    this.router.navigate(['/query'], { queryParams: { credId: id } });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  useCred(cred: StoredCredential) {
    this.router.navigate(['/query'], { queryParams: { credId: cred.id } });
  }

  async deleteCred(cred: StoredCredential) {
    const label = cred.type === 'oauth' ? 'My Account (Google OAuth)' : cred.name;
    if (!confirm(`Remove "${label}"? Its query history will also be deleted.`)) return;
    await this.dbService.deleteCredential(cred.id!);
    await this.loadCredentials();
    if (!this.savedCredentials().length) {
      this.adding.set(true);
    }
  }

  cancelAdd() {
    this.adding.set(false);
    this.validated.set(false);
    this.credentialsJson.set('');
    this.credentialName.set('');
    this.error.set('');
    this.validationResult.set(null);
  }
}
