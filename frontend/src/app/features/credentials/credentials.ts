import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { BigQueryApiService } from '../../services/bigquery-api.service';
import type { ValidateCredentialsResponse } from '../../models/credential.model';
import type { StoredCredential } from '../../db/app-database';

@Component({
  selector: 'app-credentials',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="cred-container">
      <div class="cred-card">
        <h1>Credentials</h1>

        @if (savedCredentials().length) {
          <div class="saved-section">
            <h2>Saved Credentials</h2>
            @for (cred of savedCredentials(); track cred.id) {
              <div class="saved-item">
                <div class="saved-info" (click)="useCred(cred)">
                  <strong>{{ cred.name }}</strong>
                  <span class="saved-meta">{{ cred.projectId }}</span>
                </div>
                <button class="delete-btn" (click)="deleteCred(cred)" title="Remove">&#10005;</button>
              </div>
            }
          </div>
          <div class="divider">
            <span>or add new</span>
          </div>
        }

        @if (!adding()) {
          <button class="add-btn" (click)="adding.set(true)">
            + Add Credentials
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
            @if (error()) {
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
    </div>
  `,
  styles: [`
    .cred-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 24px;
    }
    .cred-card {
      width: 100%;
      max-width: 640px;
      padding: 48px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    h1 { font-size: 1.8rem; margin-bottom: 20px; color: #e0e0e0; }
    h2 { font-size: 1.1rem; color: #9e9e9e; margin-bottom: 12px; }
    p { color: #9e9e9e; margin-bottom: 16px; }
    .saved-section { margin-bottom: 8px; }
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
    .saved-info {
      cursor: pointer;
      flex: 1;
    }
    .saved-info strong { color: #e0e0e0; display: block; }
    .saved-meta { color: #666; font-size: 0.85rem; }
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
    .divider {
      text-align: center;
      margin: 20px 0;
      position: relative;
      color: #666;
      font-size: 0.85rem;
    }
    .divider::before, .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 40%;
      height: 1px;
      background: #30363d;
    }
    .divider::before { left: 0; }
    .divider::after { right: 0; }
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
    .add-btn { width: 100%; }
    .secondary-btn {
      background: transparent;
      color: #9e9e9e;
      border: 1px solid #30363d;
    }
    .secondary-btn:hover:not(:disabled) { background: rgba(255,255,255,0.05); color: #e0e0e0; }
    .btn-row { display: flex; gap: 12px; }
    .btn-row button { flex: 1; }
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

  savedCredentials = signal<StoredCredential[]>([]);
  adding = signal(false);
  credentialsJson = signal('');
  credentialName = signal('');
  validating = signal(false);
  validated = signal(false);
  error = signal('');
  validationResult = signal<ValidateCredentialsResponse | null>(null);

  async ngOnInit() {
    await this.loadCredentials();
    if (!this.savedCredentials().length) {
      this.adding.set(true);
    }
  }

  async loadCredentials() {
    this.savedCredentials.set(await this.dbService.getAllCredentials());
  }

  async validate() {
    this.validating.set(true);
    this.error.set('');
    try {
      const result = await this.apiService.validateCredentials(this.credentialsJson());
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
      createdAt: new Date()
    });
    this.router.navigate(['/query'], { queryParams: { credId: id } });
  }

  useCred(cred: StoredCredential) {
    this.router.navigate(['/query'], { queryParams: { credId: cred.id } });
  }

  async deleteCred(cred: StoredCredential) {
    if (!confirm(`Remove "${cred.name}"? Its query history will also be deleted.`)) return;
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
