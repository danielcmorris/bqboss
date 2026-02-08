import { Component, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sql-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="editor-container">
      <textarea
        [ngModel]="sql()"
        (ngModelChange)="sql.set($event)"
        (keydown.control.enter)="submit.emit()"
        placeholder="SELECT * FROM dataset.table LIMIT 100"
        rows="6"
      ></textarea>
      <div class="editor-actions">
        <button (click)="submit.emit()" [disabled]="!sql().trim()">
          Execute (Ctrl+Enter)
        </button>
      </div>
    </div>
  `,
  styles: [`
    .editor-container { display: flex; flex-direction: column; gap: 8px; }
    textarea {
      width: 100%;
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 14px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.95rem;
      resize: vertical;
      line-height: 1.5;
    }
    textarea:focus { outline: none; border-color: #4fc3f7; }
    .editor-actions { display: flex; justify-content: flex-end; }
    button {
      padding: 8px 24px;
      background: #4fc3f7;
      color: #1a1a2e;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    button:hover:not(:disabled) { background: #81d4fa; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class SqlEditorComponent {
  sql = model('');
  submit = output();
}
