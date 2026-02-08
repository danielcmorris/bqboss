import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  standalone: true,
  template: `
    <div class="splash-container">
      <div class="splash-card">
        <h1>BigQuery SQL Manager</h1>
        <p>A streamlined interface for ad-hoc SQL work against Google BigQuery</p>
        <button (click)="enter()">Enter</button>
      </div>
    </div>
  `,
  styles: [`
    .splash-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }
    .splash-card {
      text-align: center;
      padding: 60px 80px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
    }
    h1 {
      font-size: 2.4rem;
      margin-bottom: 12px;
      color: #e0e0e0;
    }
    p {
      color: #9e9e9e;
      margin-bottom: 32px;
      font-size: 1.1rem;
    }
    button {
      padding: 12px 48px;
      font-size: 1.1rem;
      background: #4fc3f7;
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover {
      background: #81d4fa;
    }
  `]
})
export class SplashComponent {
  constructor(private router: Router) {}

  enter() {
    this.router.navigate(['/credentials']);
  }
}
