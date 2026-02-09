import { Component, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sql-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <textarea
      [ngModel]="sql()"
      (ngModelChange)="sql.set($event)"
      (keydown.control.enter)="submit.emit()"
      placeholder="SELECT * FROM dataset.table LIMIT 100"
      rows="6"
    ></textarea>
  `,
  styles: [`
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
  `]
})
export class SqlEditorComponent {
  sql = model('');
  submit = output();
}
