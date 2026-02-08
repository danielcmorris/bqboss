import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  standalone: true,
  template: `
    <div class="page">
      <nav class="banner">
        <div class="banner-brand"><img src="logo.png" alt="BQ Boss" class="brand-logo" />BQ Boss</div>
        <div class="banner-links">
          <button class="link-btn" (click)="howItWorks()">How It Works</button>
          <button class="link-btn" (click)="aiAssistInfo()">AI Assist</button>
          <button class="login-btn" (click)="login()">Log In</button>
        </div>
      </nav>

      <div class="hero">
        <h1>BQ Boss</h1>
        <p class="tagline">Your command center for Google BigQuery</p>
        <button class="cta" (click)="login()">Get Started</button>
      </div>

      <div class="cards">
        <div class="card">
          <div class="card-icon">&#9889;</div>
          <h3>Ad-Hoc SQL</h3>
          <p>Write and execute BigQuery SQL with a fast, focused editor. Results render instantly in a sortable, filterable grid.</p>
        </div>
        <div class="card">
          <div class="card-icon">&#128202;</div>
          <h3>Schema Explorer</h3>
          <p>Browse datasets, tables, and columns at a glance. No more switching to the GCP console to look up field names.</p>
        </div>
        <div class="card">
          <div class="card-icon">&#129302;</div>
          <h3>AI Assist</h3>
          <p>Describe what you need in plain English and let Gemini generate the SQL for you, grounded in your actual schema.</p>
        </div>
        <div class="card">
          <div class="card-icon">&#128274;</div>
          <h3>Local Credentials</h3>
          <p>Service account keys stay in your browser's IndexedDB. Nothing is stored on a server — your data stays yours.</p>
        </div>
      </div>

      <footer class="footer">
        <div class="footer-links">
          <button class="footer-link" (click)="howItWorks()">How It Works</button>
          <button class="footer-link" (click)="privacy()">Privacy Policy</button>
          <button class="footer-link" (click)="terms()">Terms of Service</button>
        </div>
        <span>Built for teams that live in BigQuery.</span>
      </footer>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: #0d0d1a;
      display: flex;
      flex-direction: column;
    }

    /* ---- Banner ---- */
    .banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: rgba(13, 13, 26, 0.8);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .banner-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #4fc3f7, #ab47bc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
    }
    .banner-links {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .link-btn {
      padding: 8px 20px;
      font-size: 0.9rem;
      font-weight: 500;
      color: #8a8a9e;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.2s;
    }
    .link-btn:hover { color: #e0e0e0; }
    .login-btn {
      padding: 8px 28px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #e0e0e0;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .login-btn:hover {
      background: rgba(255,255,255,0.12);
      border-color: rgba(255,255,255,0.2);
    }

    /* ---- Hero ---- */
    .hero {
      text-align: center;
      padding: 80px 24px 48px;
      position: relative;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      width: 520px;
      height: 520px;
      background: radial-gradient(circle, rgba(79,195,247,0.08) 0%, rgba(171,71,188,0.06) 40%, transparent 70%);
      pointer-events: none;
    }
    .hero h1 {
      font-size: 3.6rem;
      font-weight: 800;
      letter-spacing: -1px;
      background: linear-gradient(135deg, #e0e0e0, #4fc3f7, #ab47bc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 16px;
      position: relative;
    }
    .tagline {
      color: #8a8a9e;
      font-size: 1.2rem;
      margin-bottom: 36px;
      position: relative;
    }
    .cta {
      padding: 14px 52px;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0d0d1a;
      background: linear-gradient(135deg, #4fc3f7, #81d4fa);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      position: relative;
      box-shadow: 0 4px 24px rgba(79,195,247,0.25);
    }
    .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 32px rgba(79,195,247,0.35);
    }

    /* ---- Cards ---- */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      padding: 24px 48px 64px;
      max-width: 1040px;
      margin: 0 auto;
      width: 100%;
    }
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 28px 24px;
      transition: border-color 0.2s, transform 0.2s;
    }
    .card:hover {
      border-color: rgba(79,195,247,0.25);
      transform: translateY(-3px);
    }
    .card-icon {
      font-size: 1.8rem;
      margin-bottom: 12px;
    }
    .card h3 {
      font-size: 1.05rem;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 8px;
    }
    .card p {
      color: #7a7a90;
      font-size: 0.88rem;
      line-height: 1.55;
    }

    /* ---- Footer ---- */
    .footer {
      margin-top: auto;
      text-align: center;
      padding: 24px;
      color: #4a4a5e;
      font-size: 0.82rem;
      border-top: 1px solid rgba(255,255,255,0.04);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .footer-links {
      display: flex;
      gap: 16px;
    }
    .footer-link {
      background: none;
      border: none;
      color: #5a5a70;
      font-size: 0.82rem;
      cursor: pointer;
      transition: color 0.2s;
    }
    .footer-link:hover { color: #4fc3f7; }
  `]
})
export class SplashComponent {
  constructor(private router: Router) {}

  login() {
    this.router.navigate(['/credentials']);
  }

  howItWorks() {
    this.router.navigate(['/how-it-works']);
  }

  aiAssistInfo() {
    this.router.navigate(['/ai-assist']);
  }

  privacy() {
    this.router.navigate(['/privacy']);
  }

  terms() {
    this.router.navigate(['/terms']);
  }
}
