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
      background: rgba(255,255,255,0.02);
      color: #c0c0d0;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 16px;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      font-size: 0.92rem;
      resize: vertical;
      line-height: 1.6;
      transition: border-color 0.15s;
    }
    textarea:focus {
      outline: none;
      border-color: rgba(79,195,247,0.4);
      background: rgba(255,255,255,0.03);
    }
    textarea::placeholder { color: #4a4a5e; }
    .editor-actions { display: flex; justify-content: flex-end; }
    button {
      padding: 8px 28px;
      background: linear-gradient(135deg, #4fc3f7, #64b5f6);
      color: #0d0d1a;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.3px;
      transition: transform 0.1s, box-shadow 0.15s;
      box-shadow: 0 2px 12px rgba(79,195,247,0.2);
    }
    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(79,195,247,0.3);
    }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class SqlEditorComponent {
  sql = model('');
  submit = output();
}
