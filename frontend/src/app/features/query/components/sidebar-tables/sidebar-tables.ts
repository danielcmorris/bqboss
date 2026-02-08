import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-sidebar-tables',
  standalone: true,
  template: `
    <div class="tables-panel">
      @if (tables().length === 0) {
        <p class="empty">Enable AI to load schema</p>
      } @else {
        @for (table of tables(); track table) {
          <div class="table-item" (click)="selectTable.emit(table)" [title]="table">
            <span class="table-name">{{ table }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .tables-panel {
      height: 100%;
      overflow-y: auto;
      padding: 12px;
    }
    .empty { color: #4a4a5e; font-size: 0.82rem; }
    .table-item {
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 2px;
      transition: all 0.15s;
      border: 1px solid transparent;
    }
    .table-item:hover {
      background: rgba(79,195,247,0.04);
      border-color: rgba(79,195,247,0.1);
    }
    .table-name {
      display: block;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: #9e9eaa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class SidebarTablesComponent {
  tables = input<string[]>([]);
  selectTable = output<string>();
}
