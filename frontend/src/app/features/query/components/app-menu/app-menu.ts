import { Component, input, output, computed } from '@angular/core';
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
            @for (cred of sortedCredentials(); track cred.id) {
              <button
                [class.active]="cred.id === activeCredentialId()"
                (click)="switchCredential.emit(cred.id!); open = false"
              >
                @if (cred.type === 'oauth') {
                  <span class="oauth-indicator">G</span>
                }
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
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: #8a8a9e;
      font-size: 1.3rem;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .menu-btn:hover {
      background: rgba(255,255,255,0.08);
      color: #c0c0d0;
    }
    .menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99;
    }
    .menu-dropdown {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      background: #1a1a28;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      overflow: hidden;
      z-index: 100;
      min-width: 220px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .menu-section-label {
      padding: 10px 16px 4px;
      font-size: 0.7rem;
      color: #5a5a70;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
    }
    .menu-divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 4px 0;
    }
    .menu-dropdown button {
      display: block;
      width: 100%;
      padding: 10px 16px;
      background: none;
      border: none;
      color: #c0c0d0;
      text-align: left;
      cursor: pointer;
      font-size: 0.88rem;
      transition: background 0.12s;
    }
    .menu-dropdown button:hover { background: rgba(79,195,247,0.06); }
    .menu-dropdown button.active {
      background: rgba(79,195,247,0.08);
      color: #4fc3f7;
    }
    .cred-project {
      display: block;
      font-size: 0.72rem;
      color: #5a5a70;
    }
    .oauth-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #4285F4;
      color: #fff;
      border-radius: 50%;
      font-size: 0.65rem;
      font-weight: 700;
      margin-right: 6px;
      vertical-align: middle;
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

  sortedCredentials = computed(() => {
    const creds = [...this.credentials()];
    creds.sort((a, b) => {
      if (a.type === 'oauth' && b.type !== 'oauth') return -1;
      if (a.type !== 'oauth' && b.type === 'oauth') return 1;
      return a.name.localeCompare(b.name);
    });
    return creds;
  });

  clearHist() { this.clearHistory.emit(); }
}
