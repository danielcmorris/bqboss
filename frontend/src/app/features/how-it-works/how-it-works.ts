import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  template: `
    <div class="page">
      <nav class="banner">
        <div class="banner-brand" (click)="goHome()"><img src="logo.png" alt="" class="brand-logo" />BQ Boss</div>
        <button class="nav-btn" (click)="goHome()">Home</button>
      </nav>

      <article class="content">
        <h1>How It Works</h1>
        <p class="subtitle">BQ Boss is designed to keep everything local to your machine. Here's how.</p>

        <section>
          <h2>Everything stays on your machine</h2>
          <p>
            BQ Boss runs entirely in your browser and a lightweight local backend.
            There is no cloud-hosted service in between, no user accounts, no telemetry,
            and no analytics. Your credentials, query history, and schema metadata never
            leave your machine unless you're sending a query directly to Google BigQuery.
          </p>
        </section>

        <section>
          <h2>Data stored in IndexedDB</h2>
          <p>
            All persistent data &mdash; saved credentials, SQL history, and cached schema &mdash;
            lives in your browser's
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API" target="_blank" rel="noopener">IndexedDB</a>,
            a built-in browser database. Nothing is written to a remote server or synced to the cloud.
            If you clear your browser data, it's gone. If you want to start fresh, just clear the site data.
          </p>
        </section>

        <section>
          <h2>Your credentials, your access</h2>
          <p>
            BQ Boss asks for a Google Cloud service account JSON key. That key is stored
            locally in IndexedDB and passed through to the backend only when you execute a
            query or use AI Assist. The backend forwards it directly to the Google BigQuery
            and Vertex AI APIs &mdash; it never logs, persists, or caches your credentials.
            You control the access, and you can revoke the service account key in GCP at any time.
          </p>
        </section>

        <section>
          <h2>AI Assist &amp; Gemini</h2>
          <p>
            When you use AI Assist, BQ Boss sends your cached schema and your prompt to
            Google's Gemini model via the Vertex AI API, authenticated with your own service
            account. The request goes directly from the local backend to Google &mdash;
            no third-party AI services are involved. Your data stays within your GCP project's
            trust boundary.
          </p>
        </section>

        <section>
          <h2>Open source &amp; self-hostable</h2>
          <p>
            BQ Boss is fully open source. You can clone the
            <a href="https://github.com/danielcmorris/bqboss" target="_blank" rel="noopener">GitHub repository</a>,
            inspect every line, and run it yourself. It works as a local desktop tool
            (just run the backend and open the frontend), on a private VM, or behind your
            company's firewall. There are no license servers, no SaaS dependencies, and
            no feature gates.
          </p>
        </section>

        <div class="cta-row">
          <button class="cta" (click)="getStarted()">Get Started</button>
        </div>
      </article>

      <footer class="footer">
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
      cursor: pointer;
    }
    .brand-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: contain;
    }
    .nav-btn {
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
    .nav-btn:hover {
      background: rgba(255,255,255,0.12);
      border-color: rgba(255,255,255,0.2);
    }

    .content {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 32px 64px;
      width: 100%;
    }

    h1 {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #e0e0e0, #4fc3f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #7a7a90;
      font-size: 1.1rem;
      margin-bottom: 40px;
    }

    section {
      margin-bottom: 32px;
    }
    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 10px;
    }
    section p {
      color: #9e9eaa;
      font-size: 0.95rem;
      line-height: 1.7;
    }
    a {
      color: #4fc3f7;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    .cta-row {
      text-align: center;
      margin-top: 48px;
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
      box-shadow: 0 4px 24px rgba(79,195,247,0.25);
    }
    .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 32px rgba(79,195,247,0.35);
    }

    .footer {
      margin-top: auto;
      text-align: center;
      padding: 24px;
      color: #4a4a5e;
      font-size: 0.82rem;
      border-top: 1px solid rgba(255,255,255,0.04);
    }
  `]
})
export class HowItWorksComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  getStarted() {
    this.router.navigate(['/credentials']);
  }
}
