import { Component, input, output } from '@angular/core';
import type { SqlHistoryEntry } from '../../../../db/app-database';

@Component({
  selector: 'app-sql-history',
  standalone: true,
  template: `
    <div class="history-panel">
      <div class="history-header">
        <h3>History</h3>
        @if (entries().length) {
          <button class="clear-btn" title="Clear history" (click)="confirmClear()">&#10005;</button>
        }
      </div>
      @if (entries().length === 0) {
        <p class="empty">No queries yet</p>
      }
      @for (entry of entries(); track entry.id) {
        <div class="history-item" (click)="selectSql.emit(entry.sql)" [title]="entry.sql">
          <span class="sql-preview">{{ entry.sql.substring(0, 40) }}{{ entry.sql.length > 40 ? '...' : '' }}</span>
          <span class="meta">{{ entry.rowCount }} rows</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .history-panel {
      height: 100%;
      overflow-y: auto;
      padding: 12px;
    }
    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      padding-right: 20px;
      border-bottom: 1px solid #30363d;
    }
    h3 {
      color: #e0e0e0;
      font-size: 0.95rem;
    }
    .clear-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .clear-btn:hover { color: #f44336; background: rgba(244,67,54,0.1); }
    .empty { color: #666; font-size: 0.85rem; }
    .history-item {
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.15s;
    }
    .history-item:hover { background: rgba(79,195,247,0.1); }
    .sql-preview {
      display: block;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.8rem;
      color: #c9d1d9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      font-size: 0.75rem;
      color: #666;
    }
  `]
})
export class SqlHistoryComponent {
  entries = input<SqlHistoryEntry[]>([]);
  selectSql = output<string>();
  clearHistory = output();

  confirmClear() {
    if (confirm('Clear all query history?')) {
      this.clearHistory.emit();
    }
  }
}
