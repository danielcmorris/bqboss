import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  template: `
    <div class="page">
      <nav class="banner">
        <div class="banner-brand" (click)="home()"><img src="logo.png" alt="" class="brand-logo" />BQ Boss</div>
      </nav>

      <div class="content">
        <h1>Privacy Policy</h1>
        <p class="updated">Last updated: February 8, 2025</p>

        <section>
          <h2>Overview</h2>
          <p>
            BQ Boss is a browser-based SQL workspace for Google BigQuery. It is designed with
            a privacy-first architecture: your data stays in your browser and is never collected,
            stored, or shared by us.
          </p>
        </section>

        <section>
          <h2>Data We Collect</h2>
          <p><strong>None.</strong> BQ Boss does not collect, transmit, or store any personal data
            on external servers. There is no analytics, no tracking, and no cookies set by this application.</p>
        </section>

        <section>
          <h2>Google Account Data</h2>
          <p>
            If you choose to sign in with Google, BQ Boss requests an OAuth access token with
            the following scopes:
          </p>
          <ul>
            <li><code>https://www.googleapis.com/auth/bigquery</code> — to execute BigQuery queries on your behalf</li>
            <li><code>https://www.googleapis.com/auth/cloud-platform</code> — to access your GCP project resources (e.g. Vertex AI for the optional AI Assist feature)</li>
          </ul>
          <p>
            Your OAuth access token is stored <strong>only in your browser's IndexedDB</strong> and is
            sent directly to Google's APIs. It is never transmitted to or stored on any server
            controlled by BQ Boss.
          </p>
        </section>

        <section>
          <h2>Credentials Storage</h2>
          <p>
            Service account JSON keys and OAuth tokens are stored exclusively in your browser's
            IndexedDB. They are never uploaded, logged, or accessible to anyone other than you.
            You can delete all stored credentials at any time from within the application.
          </p>
        </section>

        <section>
          <h2>Third-Party Services</h2>
          <p>
            BQ Boss communicates with Google Cloud APIs (BigQuery, Vertex AI) using credentials
            you provide. These requests are governed by
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's Privacy Policy</a>.
            No other third-party services are used.
          </p>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>
            All application data (credentials, query history, favorites, settings) is stored
            locally in your browser. Clearing your browser data or using the in-app delete
            functions removes it permanently. We retain nothing.
          </p>
        </section>

        <section>
          <h2>Children's Privacy</h2>
          <p>
            BQ Boss is not directed at children under 13 and does not knowingly collect
            information from children.
          </p>
        </section>

        <section>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Changes will be reflected
            on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            If you have questions about this privacy policy, contact
            <a href="mailto:dmorris&#64;morrisdev.com">dmorris&#64;morrisdev.com</a>.
          </p>
        </section>
      </div>

      <footer class="footer">
        <button class="footer-link" (click)="home()">Back to BQ Boss</button>
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
    .content {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 32px 64px;
      width: 100%;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #e0e0e0;
      margin-bottom: 8px;
    }
    .updated {
      color: #5a5a70;
      font-size: 0.85rem;
      margin-bottom: 36px;
    }
    section {
      margin-bottom: 28px;
    }
    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #c0c0d0;
      margin-bottom: 10px;
    }
    p {
      color: #8a8a9e;
      font-size: 0.92rem;
      line-height: 1.65;
      margin-bottom: 10px;
    }
    ul {
      margin: 8px 0 12px 24px;
      color: #8a8a9e;
      font-size: 0.92rem;
      line-height: 1.65;
    }
    code {
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.82rem;
      color: #4fc3f7;
    }
    a {
      color: #4fc3f7;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    strong {
      color: #c0c0d0;
    }
    .footer {
      margin-top: auto;
      text-align: center;
      padding: 24px;
      border-top: 1px solid rgba(255,255,255,0.04);
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
export class PrivacyComponent {
  constructor(private router: Router) {}

  home() {
    this.router.navigate(['/']);
  }
}
