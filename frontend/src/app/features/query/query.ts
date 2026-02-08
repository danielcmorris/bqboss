import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { BigQueryApiService } from '../../services/bigquery-api.service';
import type { QueryResult } from '../../models/query-result.model';
import type { SqlHistoryEntry, StoredDatasetInfo, StoredCredential, SchemaEntry } from '../../db/app-database';
import { SqlEditorComponent } from './components/sql-editor/sql-editor';
import { ResultsGridComponent } from './components/results-grid/results-grid';
import { SqlHistoryComponent } from './components/sql-history/sql-history';
import { AppMenuComponent } from './components/app-menu/app-menu';

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [FormsModule, SqlEditorComponent, ResultsGridComponent, SqlHistoryComponent, AppMenuComponent],
  template: `
    <div class="workspace">
      <header>
        <div class="header-left">
          <h1>BigQuery SQL Manager</h1>
          @if (projectId()) {
            <span class="project-badge">{{ projectId() }}</span>
          }
          @if (activeCredName()) {
            <span class="cred-badge">{{ activeCredName() }}</span>
          }
        </div>
        <app-menu
          [credentials]="allCredentials()"
          [activeCredentialId]="activeCredentialId()"
          (switchCredential)="onSwitchCredential($event)"
          (manageCredentials)="onManageCredentials()"
          (clearHistory)="onClearHistory()"
        />
      </header>

      <div class="toolbar">
        <label class="dataset-selector">
          <span>Dataset:</span>
          <select [ngModel]="selectedDataset()" (ngModelChange)="onDatasetChange($event)">
            @for (ds of datasets(); track ds.datasetId) {
              <option [value]="ds.datasetId">{{ ds.datasetId }}</option>
            }
          </select>
        </label>
        <div class="sample-queries">
          <button (click)="runListTables()">List Tables</button>
          <button (click)="runListColumns()">List Columns</button>
          <button (click)="openHelp()">Help</button>
        </div>
        <button
          class="ai-btn"
          [class.ai-enabled]="aiEnabled()"
          [class.ai-loading]="aiLoading()"
          [disabled]="aiLoading()"
          (click)="enableAi()"
        >
          @if (aiLoading()) {
            Enabling AI...
          } @else if (aiEnabled()) {
            AI Enabled
          } @else {
            Enable AI
          }
        </button>
      </div>

      @if (aiNotification()) {
        <div class="ai-notification" [class.ai-notification-error]="aiNotificationType() === 'error'" [class.ai-notification-success]="aiNotificationType() === 'success'">
          <span>{{ aiNotification() }}</span>
          <button class="ai-notification-dismiss" (click)="aiNotification.set('')">&times;</button>
        </div>
      }

      <div class="main-area">
        <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
          <button class="sidebar-toggle" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
            {{ sidebarCollapsed() ? '&#9654;' : '&#9664;' }}
          </button>
          @if (!sidebarCollapsed()) {
            <app-sql-history
              [entries]="history()"
              (selectSql)="onSelectSql($event)"
              (clearHistory)="onClearHistory()"
            />
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
            <div class="loading">Executing query...</div>
          }

          <app-results-grid [queryResult]="queryResult()" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workspace {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1a1a2e;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: #16213e;
      border-bottom: 1px solid #30363d;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    h1 { font-size: 1.2rem; color: #e0e0e0; }
    .project-badge {
      background: rgba(79,195,247,0.15);
      color: #4fc3f7;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .cred-badge {
      background: rgba(255,255,255,0.05);
      color: #9e9e9e;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 20px;
      background: #16213e;
      border-bottom: 1px solid #30363d;
    }
    .dataset-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9e9e9e;
      font-size: 0.9rem;
    }
    .dataset-selector select {
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .dataset-selector select:focus { outline: none; border-color: #4fc3f7; }
    .sample-queries {
      display: flex;
      gap: 8px;
    }
    .sample-queries button {
      padding: 5px 14px;
      background: rgba(79,195,247,0.1);
      color: #4fc3f7;
      border: 1px solid rgba(79,195,247,0.25);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.15s;
    }
    .sample-queries button:hover { background: rgba(79,195,247,0.2); }
    .ai-btn {
      margin-left: auto;
      padding: 5px 16px;
      background: rgba(156,39,176,0.15);
      color: #ce93d8;
      border: 1px solid rgba(156,39,176,0.35);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .ai-btn:hover:not(:disabled) { background: rgba(156,39,176,0.25); }
    .ai-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .ai-btn.ai-loading { color: #ba68c8; }
    .ai-btn.ai-enabled {
      background: rgba(76,175,80,0.15);
      color: #81c784;
      border-color: rgba(76,175,80,0.35);
    }
    .ai-notification {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 20px;
      font-size: 0.85rem;
      border-bottom: 1px solid #30363d;
    }
    .ai-notification-success {
      background: rgba(76,175,80,0.1);
      color: #81c784;
    }
    .ai-notification-error {
      background: rgba(244,67,54,0.1);
      color: #ef9a9a;
    }
    .ai-notification-dismiss {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0 4px;
      opacity: 0.7;
    }
    .ai-notification-dismiss:hover { opacity: 1; }
    .main-area {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .sidebar {
      width: 280px;
      border-right: 1px solid #30363d;
      background: #16213e;
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
      border: 1px solid #30363d;
      color: #9e9e9e;
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
      transition: background 0.15s;
    }
    .sidebar-toggle:hover { background: rgba(255,255,255,0.05); }
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
    .error-banner {
      color: #f44336;
      background: rgba(244,67,54,0.1);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    .loading {
      color: #4fc3f7;
      font-size: 0.9rem;
      padding: 8px 0;
    }
  `]
})
export class QueryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dbService = inject(DatabaseService);
  private apiService = inject(BigQueryApiService);

  sql = signal('');
  projectId = signal('');
  activeCredName = signal('');
  activeCredentialId = signal(0);
  allCredentials = signal<StoredCredential[]>([]);
  datasets = signal<StoredDatasetInfo[]>([]);
  selectedDataset = signal('');
  queryResult = signal<QueryResult | null>(null);
  history = signal<SqlHistoryEntry[]>([]);
  error = signal('');
  loading = signal(false);
  sidebarCollapsed = signal(false);
  aiEnabled = signal(false);
  aiLoading = signal(false);
  aiNotification = signal('');
  aiNotificationType = signal<'success' | 'error'>('success');

  private credentialsJson = '';

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
    this.credentialsJson = cred.credentialsJson;
    this.projectId.set(cred.projectId);
    this.activeCredName.set(cred.name);
    this.activeCredentialId.set(cred.id!);
    this.queryResult.set(null);
    this.error.set('');
    this.aiNotification.set('');

    if (cred.datasets?.length) {
      this.datasets.set(cred.datasets);
      this.selectedDataset.set(cred.datasets[0].datasetId);
    } else {
      await this.refreshDatasets(cred);
    }
    await this.loadHistory();
    await this.checkExistingSchema();
  }

  async onSwitchCredential(credId: number) {
    const cred = await this.dbService.getCredentialById(credId);
    if (cred) {
      await this.activateCredential(cred);
    }
  }

  async executeQuery() {
    const currentSql = this.sql();
    if (!currentSql.trim()) return;

    this.loading.set(true);
    this.error.set('');
    this.queryResult.set(null);

    try {
      const result = await this.apiService.executeQuery(this.credentialsJson, currentSql);
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

  runListTables() {
    const ds = this.selectedDataset();
    const proj = this.projectId();
    this.sql.set(`SELECT table_name, table_type, creation_time\nFROM \`${proj}.${ds}.INFORMATION_SCHEMA.TABLES\`\nORDER BY table_name`);
    this.executeQuery();
  }

  runListColumns() {
    const ds = this.selectedDataset();
    const proj = this.projectId();
    this.sql.set(`SELECT table_name, column_name, data_type, is_nullable\nFROM \`${proj}.${ds}.INFORMATION_SCHEMA.COLUMNS\`\nORDER BY table_name, ordinal_position`);
    this.executeQuery();
  }

  async onDatasetChange(datasetId: string) {
    this.selectedDataset.set(datasetId);
    this.aiNotification.set('');
    await this.checkExistingSchema();
  }

  async enableAi() {
    const credId = this.activeCredentialId();
    const dataset = this.selectedDataset();
    const project = this.projectId();

    this.aiLoading.set(true);
    this.aiNotification.set('');
    this.aiEnabled.set(false);

    try {
      // Step 1: Fetch schema from INFORMATION_SCHEMA
      const schemaSql = `SELECT t.table_name, c.column_name, c.data_type, c.is_nullable, t.row_count, ROUND(t.size_bytes / 1024 / 1024, 2) AS table_size_mb FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\` c JOIN \`${project}.${dataset}.INFORMATION_SCHEMA.TABLES\` t ON c.table_name = t.table_name ORDER BY t.table_name, c.ordinal_position`;

      const schemaResult = await this.apiService.executeQuery(this.credentialsJson, schemaSql);
      if (!schemaResult.success) {
        this.aiNotificationType.set('error');
        this.aiNotification.set(`Failed to fetch schema: ${schemaResult.error}`);
        return;
      }

      // Step 2: Store schema in IndexedDB
      const now = new Date();
      const entries: Omit<SchemaEntry, 'id'>[] = schemaResult.rows.map((row: any) => ({
        credentialId: credId,
        datasetId: dataset,
        tableName: row.table_name ?? '',
        columnName: row.column_name ?? '',
        dataType: row.data_type ?? '',
        isNullable: row.is_nullable ?? '',
        rowCount: Number(row.row_count ?? 0),
        tableSizeMb: Number(row.table_size_mb ?? 0),
        fetchedAt: now
      }));

      await this.dbService.saveSchemaEntries(credId, dataset, entries);

      const tableCount = new Set(entries.map(e => e.tableName)).size;
      const columnCount = entries.length;

      // Step 3: Check Gemini access
      try {
        const geminiResult = await this.apiService.checkGeminiAccess(this.credentialsJson);
        if (geminiResult.hasAccess) {
          this.aiEnabled.set(true);
          this.aiNotificationType.set('success');
          this.aiNotification.set(`AI enabled -- schema loaded: ${tableCount} tables, ${columnCount} columns. Gemini access verified.`);
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
      const result = await this.apiService.validateCredentials(this.credentialsJson);
      if (result.success && result.datasets.length) {
        const datasets = result.datasets.map(ds => ({ datasetId: ds.datasetId, tables: ds.tables }));
        this.datasets.set(datasets);
        this.selectedDataset.set(datasets[0].datasetId);
        cred.datasets = datasets;
        await this.dbService.saveCredential(cred);
      }
    } catch {}
  }

  private async loadHistory() {
    this.history.set(await this.dbService.getHistory(this.activeCredentialId()));
  }
}
