import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { BigQueryApiService, type AuthPayload } from '../../services/bigquery-api.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import type { QueryResult } from '../../models/query-result.model';
import type { SqlHistoryEntry, StoredDatasetInfo, StoredCredential, SchemaEntry, FavoriteQuery } from '../../db/app-database';
import { SqlEditorComponent } from './components/sql-editor/sql-editor';
import { ResultsGridComponent } from './components/results-grid/results-grid';
import { SqlHistoryComponent } from './components/sql-history/sql-history';
import { SidebarTablesComponent } from './components/sidebar-tables/sidebar-tables';
import { SidebarFavoritesComponent } from './components/sidebar-favorites/sidebar-favorites';
import { AppMenuComponent } from './components/app-menu/app-menu';
import { validateBQSQL, type BQSchema } from '../../lib/bq-validator';

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [FormsModule, SqlEditorComponent, ResultsGridComponent, SqlHistoryComponent, SidebarTablesComponent, SidebarFavoritesComponent, AppMenuComponent],
  template: `
    <div class="workspace">
      <header>
        <div class="header-left">
          <span class="brand" (click)="onManageCredentials()"><img src="logo.png" alt="" class="brand-logo" />BQ Boss</span>
          <span class="header-sep"></span>
          @if (projectId()) {
            <span class="project-badge">{{ projectId() }}</span>
          }
          @if (activeCredName()) {
            <span class="cred-badge">
              @if (activeCredType() === 'oauth') {
                <span class="oauth-dot"></span>
              }
              {{ activeCredName() }}
            </span>
          }
        </div>
        <div class="header-right">
          <label class="dataset-selector">
            <select [ngModel]="selectedDataset()" (ngModelChange)="onDatasetChange($event)">
              @for (ds of datasets(); track ds.datasetId) {
                <option [value]="ds.datasetId">{{ ds.datasetId }}</option>
              }
            </select>
          </label>
          <app-menu
            [credentials]="allCredentials()"
            [activeCredentialId]="activeCredentialId()"
            (switchCredential)="onSwitchCredential($event)"
            (manageCredentials)="onManageCredentials()"
            (clearHistory)="onClearHistory()"
          />
        </div>
      </header>

      <div class="toolbar">
        <div class="toolbar-group">
          <button class="tool-btn" (click)="runListTables()">List Tables</button>
          <button class="tool-btn" (click)="runListColumns()">List Columns</button>
          <button class="tool-btn" (click)="openHelp()">Help</button>
        </div>
        <div class="toolbar-actions">
          <button
            class="action-btn fav-btn"
            [class.fav-active]="currentFavorite()"
            [title]="currentFavorite() ? 'Remove from favorites' : 'Add this sql to your favorites'"
            (click)="toggleFavorite()"
          >
            <span class="action-icon">{{ currentFavorite() ? '&#9733;' : '&#9734;' }}</span>
            Favorite
          </button>
          <button
            class="action-btn ai-btn"
            [class.ai-enabled]="aiEnabled()"
            [class.ai-loading]="aiLoading()"
            [disabled]="aiLoading()"
            (click)="aiEnabled() ? aiAssist() : enableAi()"
          >
            @if (aiLoading()) {
              <span class="ai-spinner"></span> Working...
            } @else if (aiEnabled()) {
              <span class="action-icon">&#10024;</span> AI Assist
            } @else {
              <span class="action-icon">&#10024;</span> Enable AI
            }
          </button>
          <button
            class="action-btn validate-btn"
            (click)="validateSql()"
          >
            <span class="action-icon">&#10003;</span> Validate
          </button>
          <button
            class="action-btn execute-btn"
            [disabled]="loading()"
            (click)="executeQuery()"
          >
            <span class="action-icon">&#9654;</span> Execute
          </button>
        </div>
      </div>

      @if (aiNotification()) {
        <div class="notification" [class.notification-error]="aiNotificationType() === 'error'" [class.notification-success]="aiNotificationType() === 'success'">
          <span>{{ aiNotification() }}</span>
          <button class="notification-dismiss" (click)="aiNotification.set('')">&times;</button>
        </div>
      }

      <div class="main-area">
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
          <button class="sidebar-toggle" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
            {{ sidebarCollapsed() ? '&#9654;' : '&#9664;' }}
          </button>
          @if (!sidebarCollapsed()) {
            <select class="sidebar-tab-select" [ngModel]="sidebarTab()" (ngModelChange)="onSidebarTabChange($event)">
              <option value="history">History</option>
              <option value="tables">Tables</option>
              <option value="favorites">Favorites</option>
            </select>
            @switch (sidebarTab()) {
              @case ('history') {
                <app-sql-history
                  [entries]="history()"
                  (selectSql)="onSelectSql($event)"
                  (clearHistory)="onClearHistory()"
                />
              }
              @case ('tables') {
                <app-sidebar-tables
                  [tables]="sidebarTables()"
                  (selectTable)="onSelectTable($event)"
                />
              }
              @case ('favorites') {
                <app-sidebar-favorites
                  [favorites]="favorites()"
                  (selectFavorite)="onSelectSql($event)"
                  (deleteFavorite)="onDeleteFavorite($event)"
                />
              }
            }
          }
        </aside>

        <div class="content">
          <app-sql-editor
            [(sql)]="sql"
            (submit)="executeQuery()"
          />

          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          @if (loading()) {
            <div class="loading-bar">
              <div class="loading-bar-inner"></div>
            </div>
          }

          <app-results-grid [queryResult]="queryResult()" />
        </div>
      </div>

      @if (showValidationDialog()) {
        <div class="dialog-backdrop" (click)="showValidationDialog.set(false)">
          <div class="dialog" (click)="$event.stopPropagation()">
            <div class="dialog-title">Validation Warning</div>
            <p class="dialog-message">This SQL may not execute successfully in BigQuery. Would you like Gemini to fix it?</p>
            <div class="dialog-errors">{{ validationDialogErrors() }}</div>
            <div class="dialog-actions">
              <button class="dialog-btn dialog-cancel" (click)="showValidationDialog.set(false)">Cancel</button>
              <button class="dialog-btn dialog-ai" (click)="onDialogAiAssist()">AI Assist</button>
              <button class="dialog-btn dialog-exec" (click)="onDialogExecute()">Execute</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .workspace {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0d0d1a;
    }

    /* ---- Header ---- */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: rgba(13, 13, 26, 0.95);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
      z-index: 10;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #4fc3f7, #ab47bc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      cursor: pointer;
    }
    .brand-logo {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      object-fit: contain;
    }
    .header-sep {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.1);
    }
    .project-badge {
      background: rgba(79,195,247,0.1);
      color: #4fc3f7;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .cred-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #6a6a80;
      font-size: 0.8rem;
    }
    .oauth-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #4285F4;
      border-radius: 50%;
    }
    .dataset-selector select {
      background: rgba(255,255,255,0.04);
      color: #c0c0d0;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.82rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .dataset-selector select:focus {
      outline: none;
      border-color: #4fc3f7;
    }

    /* ---- Toolbar ---- */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 20px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .toolbar-group {
      display: flex;
      gap: 6px;
    }
    .tool-btn {
      padding: 5px 14px;
      background: transparent;
      color: #7a7a90;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.15s;
    }
    .tool-btn:hover {
      color: #4fc3f7;
      background: rgba(79,195,247,0.06);
      border-color: rgba(79,195,247,0.2);
    }
    .toolbar-actions {
      display: flex;
      gap: 1px;
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      overflow: hidden;
    }
    .action-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border: none;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .action-icon { font-size: 0.95rem; line-height: 1; }
    .fav-btn {
      background: rgba(255,255,255,0.03);
      color: #6a6a80;
    }
    .fav-btn:hover {
      background: rgba(255,213,79,0.08);
      color: #ffd54f;
    }
    .fav-btn.fav-active {
      color: #ffd54f;
      background: rgba(255,213,79,0.1);
    }
    .fav-btn.fav-active:hover {
      background: rgba(255,213,79,0.16);
    }
    .ai-btn {
      background: rgba(255,255,255,0.03);
      color: #ce93d8;
    }
    .ai-btn:hover:not(:disabled) {
      background: rgba(171,71,188,0.12);
    }
    .ai-btn.ai-enabled {
      color: #4fc3f7;
    }
    .ai-btn.ai-enabled:hover:not(:disabled) {
      background: rgba(79,195,247,0.12);
    }
    .ai-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(206,147,216,0.3);
      border-top-color: #ce93d8;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .validate-btn {
      background: rgba(255,255,255,0.03);
      color: #80cbc4;
    }
    .validate-btn:hover {
      background: rgba(128,203,196,0.12);
      color: #a7dbd8;
    }
    .execute-btn {
      background: rgba(76,175,80,0.12);
      color: #81c784;
    }
    .execute-btn:hover:not(:disabled) {
      background: rgba(76,175,80,0.22);
      color: #a5d6a7;
    }

    /* ---- Notification ---- */
    .notification {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 20px;
      font-size: 0.82rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .notification-success {
      background: rgba(76,175,80,0.06);
      color: #81c784;
    }
    .notification-error {
      background: rgba(244,67,54,0.06);
      color: #ef9a9a;
    }
    .notification-dismiss {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0 4px;
      opacity: 0.5;
      transition: opacity 0.15s;
    }
    .notification-dismiss:hover { opacity: 1; }

    /* ---- Layout ---- */
    .main-area {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .sidebar {
      width: 260px;
      border-right: 1px solid rgba(255,255,255,0.05);
      background: rgba(255,255,255,0.015);
      flex-shrink: 0;
      overflow-y: auto;
      position: relative;
      transition: width 0.2s;
    }
    .sidebar.collapsed {
      width: 36px;
      overflow: hidden;
    }
    .sidebar-toggle {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: 1px solid rgba(255,255,255,0.08);
      color: #6a6a80;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      z-index: 1;
      padding: 0;
      transition: all 0.15s;
    }
    .sidebar-toggle:hover {
      background: rgba(255,255,255,0.04);
      color: #9e9eaa;
    }
    .sidebar-tab-select {
      display: block;
      width: calc(100% - 24px);
      margin: 10px 12px 0;
      padding: 5px 8px;
      background: rgba(255,255,255,0.04);
      color: #c0c0d0;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .sidebar-tab-select:focus {
      outline: none;
      border-color: #4fc3f7;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px 20px;
      gap: 12px;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    /* ---- Status ---- */
    .error-banner {
      color: #ef9a9a;
      background: rgba(244,67,54,0.06);
      border: 1px solid rgba(244,67,54,0.15);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
    }
    .loading-bar {
      height: 3px;
      background: rgba(79,195,247,0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    .loading-bar-inner {
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, #4fc3f7, #ab47bc);
      border-radius: 2px;
      animation: slide 1.2s ease-in-out infinite;
    }
    @keyframes slide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }

    /* ---- Validation Dialog ---- */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .dialog {
      background: #1a1a2e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 16px 48px rgba(0,0,0,0.4);
    }
    .dialog-title {
      font-size: 1rem;
      font-weight: 700;
      color: #e0e0e8;
      margin-bottom: 10px;
    }
    .dialog-message {
      font-size: 0.88rem;
      color: #9e9eaa;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .dialog-errors {
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: #ef9a9a;
      background: rgba(244,67,54,0.06);
      border: 1px solid rgba(244,67,54,0.12);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 20px;
      max-height: 120px;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .dialog-btn {
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .dialog-cancel {
      background: rgba(255,255,255,0.05);
      color: #8a8a9e;
      border-color: rgba(255,255,255,0.1);
    }
    .dialog-cancel:hover {
      background: rgba(255,255,255,0.08);
      color: #b0b0be;
    }
    .dialog-ai {
      background: rgba(171,71,188,0.12);
      color: #ce93d8;
      border-color: rgba(171,71,188,0.25);
    }
    .dialog-ai:hover {
      background: rgba(171,71,188,0.2);
    }
    .dialog-exec {
      background: rgba(76,175,80,0.12);
      color: #81c784;
      border-color: rgba(76,175,80,0.2);
    }
    .dialog-exec:hover {
      background: rgba(76,175,80,0.22);
      color: #a5d6a7;
    }
  `]
})
export class QueryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dbService = inject(DatabaseService);
  private apiService = inject(BigQueryApiService);
  private googleAuth = inject(GoogleAuthService);

  sql = signal('');
  projectId = signal('');
  activeCredName = signal('');
  activeCredentialId = signal(0);
  activeCredType = signal<'service-account' | 'oauth'>('service-account');
  allCredentials = signal<StoredCredential[]>([]);
  datasets = signal<StoredDatasetInfo[]>([]);
  selectedDataset = signal('');
  queryResult = signal<QueryResult | null>(null);
  history = signal<SqlHistoryEntry[]>([]);
  error = signal('');
  loading = signal(false);
  sidebarCollapsed = signal(false);
  sidebarTab = signal<'history' | 'tables' | 'favorites'>('history');
  sidebarTables = signal<string[]>([]);
  favorites = signal<FavoriteQuery[]>([]);
  currentFavorite = computed(() => {
    const currentSql = this.sql();
    if (!currentSql.trim()) return undefined;
    return this.favorites().find(f => !f.isBuiltIn && f.sql === currentSql);
  });
  aiEnabled = signal(false);
  aiLoading = signal(false);
  aiNotification = signal('');
  aiNotificationType = signal<'success' | 'error'>('success');
  showValidationDialog = signal(false);
  validationDialogErrors = signal('');

  // Auth state: either service account JSON or OAuth token + project
  private credentialsJson = '';
  private oauthAccessToken = '';
  private oauthProjectId = '';

  async ngOnInit() {
    this.allCredentials.set(await this.dbService.getAllCredentials());

    const credIdParam = this.route.snapshot.queryParamMap.get('credId');
    let cred: StoredCredential | undefined;

    if (credIdParam) {
      cred = await this.dbService.getCredentialById(Number(credIdParam));
    }
    if (!cred) {
      cred = await this.dbService.getFirstCredential();
    }
    if (!cred) {
      this.router.navigate(['/credentials']);
      return;
    }

    await this.activateCredential(cred);
  }

  async activateCredential(cred: StoredCredential) {
    this.activeCredType.set(cred.type || 'service-account');
    this.projectId.set(cred.projectId);
    this.activeCredName.set(cred.name);
    this.activeCredentialId.set(cred.id!);
    this.queryResult.set(null);
    this.error.set('');
    this.aiNotification.set('');

    if (cred.type === 'oauth') {
      this.credentialsJson = '';
      this.oauthAccessToken = cred.accessToken || '';
      this.oauthProjectId = cred.projectId;
      await this.ensureValidToken();
    } else {
      this.credentialsJson = cred.credentialsJson;
      this.oauthAccessToken = '';
      this.oauthProjectId = '';
    }

    if (cred.datasets?.length) {
      this.datasets.set(cred.datasets);
      this.selectedDataset.set(cred.datasets[0].datasetId);
    } else {
      await this.refreshDatasets(cred);
    }
    await this.loadFavorites();
    await this.refreshActiveTab();
    await this.checkExistingSchema();
  }

  async onSwitchCredential(credId: number) {
    const cred = await this.dbService.getCredentialById(credId);
    if (cred) {
      await this.activateCredential(cred);
    }
  }

  async executeQuery(skipValidation = false) {
    const currentSql = this.sql();
    if (!currentSql.trim()) return;

    if (!skipValidation) {
      const schema = await this.buildCurrentSchema();
      const result = validateBQSQL(schema, currentSql);
      const errors = result.errors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        this.validationDialogErrors.set(
          errors.map(e => e.line ? `Line ${e.line}: ${e.message}` : e.message).join('\n')
        );
        this.showValidationDialog.set(true);
        return;
      }
    }

    this.loading.set(true);
    this.error.set('');
    this.queryResult.set(null);

    try {
      await this.ensureValidToken();
      const auth = this.activeAuthPayload();
      const result = await this.apiService.executeQuery(auth, currentSql);
      if (result.success) {
        this.queryResult.set(result);
        await this.dbService.addHistoryEntry({
          credentialId: this.activeCredentialId(),
          sql: currentSql,
          executedAt: new Date(),
          rowCount: result.totalRows
        });
        await this.loadHistory();
      } else {
        this.error.set(result.error || 'Query failed');
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to execute query');
    } finally {
      this.loading.set(false);
    }
  }

  onDialogCancel() {
    this.showValidationDialog.set(false);
  }

  onDialogAiAssist() {
    this.showValidationDialog.set(false);
    if (this.aiEnabled()) {
      this.aiAssist();
    } else {
      this.enableAi();
    }
  }

  onDialogExecute() {
    this.showValidationDialog.set(false);
    this.executeQuery(true);
  }

  onSelectSql(sql: string) {
    this.sql.set(sql);
  }

  onManageCredentials() {
    this.router.navigate(['/credentials']);
  }

  openHelp() {
    this.router.navigate(['/help'], {
      queryParams: {
        project: this.projectId(),
        dataset: this.selectedDataset(),
        credId: this.activeCredentialId()
      }
    });
  }

  async onClearHistory() {
    await this.dbService.clearHistory(this.activeCredentialId());
    await this.loadHistory();
  }

  async onSidebarTabChange(tab: 'history' | 'tables' | 'favorites') {
    this.sidebarTab.set(tab);
    if (tab === 'tables') await this.loadSidebarTables();
    if (tab === 'favorites') await this.loadFavorites();
  }

  onSelectTable(name: string) {
    const proj = this.projectId();
    const ds = this.selectedDataset();
    this.sql.set(`SELECT *\nFROM \`${proj}.${ds}.${name}\`\nLIMIT 100`);
  }

  async toggleFavorite() {
    const currentSql = this.sql();
    if (!currentSql.trim()) return;

    const existing = this.currentFavorite();
    if (existing) {
      if (confirm('Remove from favorites?')) {
        await this.dbService.deleteFavorite(existing.id!);
        await this.loadFavorites();
      }
    } else {
      const name = window.prompt('Name for this favorite (max 30 characters):');
      if (!name?.trim()) return;
      const trimmed = name.trim().substring(0, 30);
      await this.dbService.addFavorite({
        credentialId: this.activeCredentialId(),
        name: trimmed,
        sql: currentSql,
        isBuiltIn: false,
        createdAt: new Date()
      });
      await this.loadFavorites();
    }
  }

  async onDeleteFavorite(id: number) {
    await this.dbService.deleteFavorite(id);
    await this.loadFavorites();
  }

  async validateSql() {
    const currentSql = this.sql();
    if (!currentSql.trim()) {
      this.aiNotificationType.set('error');
      this.aiNotification.set('Enter SQL to validate.');
      return;
    }

    const schema = await this.buildCurrentSchema();
    const result = validateBQSQL(schema, currentSql);
    const errors = result.errors.filter(e => e.severity === 'error');
    const warnings = result.errors.filter(e => e.severity === 'warning');

    if (result.valid && warnings.length === 0) {
      this.aiNotificationType.set('success');
      this.aiNotification.set(`SQL is valid. Statements: ${result.statementTypes.join(', ')}`);
    } else if (result.valid) {
      this.aiNotificationType.set('success');
      this.aiNotification.set(`SQL is valid with ${warnings.length} warning${warnings.length > 1 ? 's' : ''}: ${warnings.map(w => w.message).join('; ')}`);
    } else {
      this.aiNotificationType.set('error');
      this.aiNotification.set(errors.map(e => e.line ? `Line ${e.line}: ${e.message}` : e.message).join(' | '));
    }
  }

  runListTables() {
    const ds = this.selectedDataset();
    const proj = this.projectId();
    this.sql.set(`SELECT table_name, table_type, creation_time\nFROM \`${proj}.${ds}.INFORMATION_SCHEMA.TABLES\`\nORDER BY table_name`);
    this.executeQuery(true);
  }

  runListColumns() {
    const ds = this.selectedDataset();
    const proj = this.projectId();
    this.sql.set(`SELECT table_name, column_name, data_type, is_nullable\nFROM \`${proj}.${ds}.INFORMATION_SCHEMA.COLUMNS\`\nORDER BY table_name, ordinal_position`);
    this.executeQuery(true);
  }

  async onDatasetChange(datasetId: string) {
    this.selectedDataset.set(datasetId);
    this.aiNotification.set('');
    await this.checkExistingSchema();
    await this.loadFavorites();
    await this.refreshActiveTab();
  }

  async enableAi() {
    const credId = this.activeCredentialId();
    const dataset = this.selectedDataset();
    const project = this.projectId();

    this.aiLoading.set(true);
    this.aiNotification.set('');
    this.aiEnabled.set(false);

    try {
      await this.ensureValidToken();
      const auth = this.activeAuthPayload();

      // Step 1: Fetch schema from INFORMATION_SCHEMA
      const schemaSql = `SELECT t.table_name, c.column_name, c.data_type, c.is_nullable FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` c JOIN \`${project}.${dataset}.INFORMATION_SCHEMA.TABLES\` t ON c.table_name = t.table_name ORDER BY t.table_name, c.ordinal_position`;

      const schemaResult = await this.apiService.executeQuery(auth, schemaSql);
      if (!schemaResult.success) {
        this.aiNotificationType.set('error');
        this.aiNotification.set(`Failed to fetch schema: ${schemaResult.error}`);
        return;
      }

      // Step 2: Deduplicate date-suffixed tables, then store schema in IndexedDB
      const now = new Date();
      const datePattern = /^(.+?)(\d{8})$/;

      // Group tables by prefix to find date-suffixed duplicates
      const tablesByPrefix = new Map<string, string[]>();
      const allTableNames = new Set(schemaResult.rows.map((r: any) => r.table_name ?? ''));
      for (const name of allTableNames) {
        const m = name.match(datePattern);
        if (m) {
          const prefix = m[1];
          let group = tablesByPrefix.get(prefix);
          if (!group) { group = []; tablesByPrefix.set(prefix, group); }
          group.push(name);
        }
      }
      // For prefixes with 2+ date-suffixed tables, keep only the first and rename
      const renameMap = new Map<string, string>();
      const skipTables = new Set<string>();
      for (const [prefix, tables] of tablesByPrefix) {
        if (tables.length >= 2) {
          renameMap.set(tables[0], `${prefix}YYYYMMDD`);
          for (let i = 1; i < tables.length; i++) {
            skipTables.add(tables[i]);
          }
        }
      }

      const entries: Omit<SchemaEntry, 'id'>[] = schemaResult.rows
        .filter((row: any) => !skipTables.has(row.table_name ?? ''))
        .map((row: any) => ({
          credentialId: credId,
          datasetId: dataset,
          tableName: renameMap.get(row.table_name ?? '') ?? (row.table_name ?? ''),
          columnName: row.column_name ?? '',
          dataType: row.data_type ?? '',
          isNullable: row.is_nullable ?? '',
          rowCount: 0,
          tableSizeMb: 0,
          fetchedAt: now
        }));

      await this.dbService.saveSchemaEntries(credId, dataset, entries);

      const tableCount = new Set(entries.map(e => e.tableName)).size;
      const columnCount = entries.length;
      const skippedCount = allTableNames.size - tableCount;

      // Step 3: Check Gemini access
      try {
        const geminiResult = await this.apiService.checkGeminiAccess(auth);
        if (geminiResult.hasAccess) {
          this.aiEnabled.set(true);
          this.aiNotificationType.set('success');
          const dedup = skippedCount > 0 ? ` (${skippedCount} date-suffixed duplicates collapsed)` : '';
          this.aiNotification.set(`AI enabled -- schema loaded: ${tableCount} tables, ${columnCount} columns${dedup}. Gemini access verified.`);
        } else {
          this.aiEnabled.set(false);
          this.aiNotificationType.set('error');
          this.aiNotification.set(`Schema saved (${tableCount} tables, ${columnCount} columns), but Gemini access failed: ${this.buildGeminiErrorMessage(geminiResult.error ?? '', geminiResult.projectId)}`);
        }
      } catch (err: any) {
        this.aiEnabled.set(false);
        this.aiNotificationType.set('error');
        this.aiNotification.set(`Schema saved (${tableCount} tables, ${columnCount} columns), but Gemini check failed: ${err.message}`);
      }
    } catch (err: any) {
      this.aiNotificationType.set('error');
      this.aiNotification.set(`Failed to enable AI: ${err.message}`);
    } finally {
      this.aiLoading.set(false);
    }
  }

  async aiAssist() {
    const credId = this.activeCredentialId();
    const dataset = this.selectedDataset();
    const userText = this.sql();

    if (!userText.trim()) {
      this.aiNotificationType.set('error');
      this.aiNotification.set('Enter a prompt or SQL in the editor first.');
      return;
    }

    this.aiLoading.set(true);
    this.aiNotification.set('');

    try {
      await this.ensureValidToken();
      const auth = this.activeAuthPayload();

      const entries = await this.dbService.getSchemaEntries(credId, dataset);
      const grouped = new Map<string, string[]>();
      for (const e of entries) {
        let cols = grouped.get(e.tableName);
        if (!cols) { cols = []; grouped.set(e.tableName, cols); }
        cols.push(e.columnName);
      }
      const project = this.projectId();
      const tableLines = Array.from(grouped.entries())
        .map(([table, cols]) => `${table}: ${cols.join(', ')}`)
        .join('\n');
      const schema = `Project: ${project}\nDataset: ${dataset}\nAll table references must use \`${project}.${dataset}.table_name\` format.\n\n${tableLines}`;

      const result = await this.apiService.generateSql(auth, schema, userText);
      if (result.success) {
        this.sql.set(result.sql);
        this.aiNotificationType.set('success');
        this.aiNotification.set('SQL generated by AI.');
      } else {
        this.aiNotificationType.set('error');
        this.aiNotification.set(`AI generation failed: ${result.error}`);
      }
    } catch (err: any) {
      this.aiNotificationType.set('error');
      this.aiNotification.set(`AI Assist error: ${err.message}`);
    } finally {
      this.aiLoading.set(false);
    }
  }

  private activeAuthPayload(): AuthPayload {
    if (this.activeCredType() === 'oauth' && this.oauthAccessToken) {
      return { accessToken: this.oauthAccessToken, projectId: this.oauthProjectId };
    }
    return { credentialsJson: this.credentialsJson };
  }

  private async ensureValidToken(): Promise<void> {
    if (this.activeCredType() !== 'oauth') return;

    const cred = await this.dbService.getCredentialById(this.activeCredentialId());
    if (!cred || cred.type !== 'oauth') return;

    const now = new Date();
    const expiry = cred.tokenExpiry ? new Date(cred.tokenExpiry) : new Date(0);
    // Refresh if token expires within 2 minutes
    if (expiry.getTime() - now.getTime() < 120_000) {
      if (!this.googleAuth.isInitialized()) {
        try {
          const clientId = await this.dbService.getOAuthClientId();
          if (clientId) await this.googleAuth.init(clientId);
        } catch {}
      }

      if (this.googleAuth.isInitialized()) {
        const result = await this.googleAuth.requestAccessToken();
        this.oauthAccessToken = result.accessToken;
        const newExpiry = new Date(Date.now() + result.expiresIn * 1000);
        await this.dbService.updateOAuthToken(cred.id!, result.accessToken, newExpiry);
      }
    } else {
      this.oauthAccessToken = cred.accessToken || '';
    }
  }

  private buildGeminiErrorMessage(error: string, projectId?: string): string {
    const lower = error.toLowerCase();
    if (lower.includes('is not enabled') || lower.includes('has not been used') || lower.includes('403') && lower.includes('aiplatform.googleapis.com')) {
      return `The Vertex AI API is not enabled for project "${projectId}". Enable it at: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=${projectId}`;
    }
    if (lower.includes('permission') || lower.includes('iam') || lower.includes('does not have')) {
      return `The service account lacks the "Vertex AI User" role. Grant it at: https://console.cloud.google.com/iam-admin/iam?project=${projectId}`;
    }
    return error;
  }

  private async checkExistingSchema() {
    const has = await this.dbService.hasSchema(this.activeCredentialId(), this.selectedDataset());
    this.aiEnabled.set(has);
  }

  private async refreshDatasets(cred: StoredCredential) {
    try {
      const auth = this.activeAuthPayload();
      const result = await this.apiService.validateCredentials(auth);
      if (result.success && result.datasets.length) {
        const datasets = result.datasets.map(ds => ({ datasetId: ds.datasetId, tables: ds.tables }));
        this.datasets.set(datasets);
        this.selectedDataset.set(datasets[0].datasetId);
        cred.datasets = datasets;
        await this.dbService.saveCredential(cred);
      }
    } catch {}
  }

  private async buildCurrentSchema(): Promise<BQSchema> {
    const entries = await this.dbService.getSchemaEntries(this.activeCredentialId(), this.selectedDataset());
    const tableMap = new Map<string, { name: string; type: string }[]>();
    for (const e of entries) {
      let cols = tableMap.get(e.tableName);
      if (!cols) { cols = []; tableMap.set(e.tableName, cols); }
      cols.push({ name: e.columnName, type: e.dataType });
    }
    const project = this.projectId();
    const dataset = this.selectedDataset();
    return {
      defaultProject: project,
      defaultDataset: dataset,
      tables: Array.from(tableMap.entries()).map(([table, columns]) => ({
        project,
        dataset,
        table,
        columns
      }))
    };
  }

  private async loadHistory() {
    this.history.set(await this.dbService.getHistory(this.activeCredentialId()));
  }

  private async loadSidebarTables() {
    const tables = await this.dbService.getDistinctTableNames(this.activeCredentialId(), this.selectedDataset());
    this.sidebarTables.set(tables);
  }

  private async loadFavorites() {
    const proj = this.projectId();
    const ds = this.selectedDataset();
    const builtIns: FavoriteQuery[] = [
      {
        id: -1,
        credentialId: this.activeCredentialId(),
        name: 'List Tables',
        sql: `SELECT table_name, table_type, creation_time\nFROM \`${proj}.${ds}.INFORMATION_SCHEMA.TABLES\`\nORDER BY table_name`,
        isBuiltIn: true,
        createdAt: new Date()
      },
      {
        id: -2,
        credentialId: this.activeCredentialId(),
        name: 'List Columns',
        sql: `SELECT table_name, column_name, data_type, is_nullable\nFROM \`${proj}.${ds}.INFORMATION_SCHEMA.COLUMNS\`\nORDER BY table_name, ordinal_position`,
        isBuiltIn: true,
        createdAt: new Date()
      }
    ];
    const stored = await this.dbService.getFavorites(this.activeCredentialId());
    this.favorites.set([...builtIns, ...stored]);
  }

  private async refreshActiveTab() {
    const tab = this.sidebarTab();
    if (tab === 'history') await this.loadHistory();
    if (tab === 'tables') await this.loadSidebarTables();
    if (tab === 'favorites') await this.loadFavorites();
  }
}
