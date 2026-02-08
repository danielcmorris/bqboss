import { Component, input, output } from '@angular/core';
import type { StoredCredential } from '../../../../db/app-database';

@Component({
  selector: 'app-menu',
  standalone: true,
  template: `
    <div class="menu-wrapper">
      <button class="menu-btn" (click)="open = !open">&#9776;</button>
      @if (open) {
        <div class="menu-backdrop" (click)="open = false"></div>
        <div class="menu-dropdown">
          @if (credentials().length > 1) {
            <div class="menu-section-label">Switch Credentials</div>
            @for (cred of credentials(); track cred.id) {
              <button
                [class.active]="cred.id === activeCredentialId()"
                (click)="switchCredential.emit(cred.id!); open = false"
              >
                {{ cred.name }}
                <span class="cred-project">{{ cred.projectId }}</span>
              </button>
            }
            <div class="menu-divider"></div>
          }
          <button (click)="manageCredentials.emit(); open = false">Manage Credentials</button>
          <button (click)="clearHist(); open = false">Clear History</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .menu-wrapper { position: relative; }
    .menu-btn {
      background: none;
      border: 1px solid #30363d;
      color: #e0e0e0;
      font-size: 1.4rem;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .menu-btn:hover { background: rgba(255,255,255,0.05); }
    .menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99;
    }
    .menu-dropdown {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
      z-index: 100;
      min-width: 220px;
    }
    .menu-section-label {
      padding: 8px 16px 4px;
      font-size: 0.75rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .menu-divider {
      height: 1px;
      background: #30363d;
      margin: 4px 0;
    }
    .menu-dropdown button {
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: none;
      border: none;
      color: #e0e0e0;
      text-align: left;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .menu-dropdown button:hover { background: rgba(79,195,247,0.1); }
    .menu-dropdown button.active {
      background: rgba(79,195,247,0.15);
      color: #4fc3f7;
    }
    .cred-project {
      display: block;
      font-size: 0.75rem;
      color: #666;
    }
  `]
})
export class AppMenuComponent {
  open = false;
  credentials = input<StoredCredential[]>([]);
  activeCredentialId = input<number>(0);
  switchCredential = output<number>();
  manageCredentials = output();
  clearHistory = output();

  clearHist() { this.clearHistory.emit(); }
}
