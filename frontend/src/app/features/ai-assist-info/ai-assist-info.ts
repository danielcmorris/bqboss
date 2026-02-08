import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ai-assist-info',
  standalone: true,
  template: `
    <div class="page">
      <nav class="banner">
        <div class="banner-brand" (click)="goHome()">BQ Boss</div>
        <div class="banner-links">
          <button class="nav-btn" (click)="goHowItWorks()">How It Works</button>
          <button class="nav-btn" (click)="goHome()">Home</button>
        </div>
      </nav>

      <article class="content">
        <h1>AI-Powered SQL</h1>
        <p class="subtitle">Ask a question about your data in plain English. Get SQL back. You decide when to run it.</p>

        <section>
          <h2>Step 1: Enable AI</h2>
          <p>
            The first time you click <strong>Enable AI</strong>, BQ Boss queries your dataset's
            <code>INFORMATION_SCHEMA</code> to download the full schema &mdash; every table name
            and column name. This schema is cached locally in your browser's IndexedDB so it
            doesn't need to be fetched again until you switch datasets or re-enable.
          </p>
          <p>
            At the same time, BQ Boss verifies that your service account has access to the
            Vertex AI API and Google's Gemini model. If the check passes, the button changes
            to <strong>AI Assist</strong> and you're ready to go.
          </p>
        </section>

        <section>
          <h2>Step 2: Ask a question</h2>
          <p>
            Type anything into the SQL editor &mdash; it doesn't have to be SQL. You can write
            a plain English question like:
          </p>
          <div class="example-box">
            <div class="example">"Show me all active jobs created in the last 30 days"</div>
            <div class="example">"Which customers have the highest total order value?"</div>
            <div class="example">"Count rows per table in the dataset"</div>
          </div>
          <p>
            Then click <strong>AI Assist</strong>. BQ Boss sends your cached schema along with
            your question to Gemini. The schema gives Gemini the context it needs to reference
            your actual table and column names &mdash; not made-up placeholders.
          </p>
        </section>

        <section>
          <h2>Step 3: Review the SQL</h2>
          <p>
            Gemini's response is placed directly into the editor. That's it &mdash; BQ Boss
            does <strong>not</strong> run the query automatically. You get to read the SQL,
            tweak it if needed, and execute it yourself when you're satisfied. You stay in
            control of what actually hits your BigQuery project.
          </p>
        </section>

        <section>
          <h2>Your credentials, your Gemini</h2>
          <p>
            AI Assist uses the same Google Cloud service account you already provided for
            running queries. The request goes from the local backend directly to Google's
            Vertex AI API &mdash; authenticated with your service account, billed to your
            GCP project, and subject to your project's IAM policies. No third-party AI
            service is involved, and your schema and prompts never pass through anyone
            else's servers.
          </p>
        </section>

        <section>
          <h2>What you need</h2>
          <ul>
            <li>The <strong>Vertex AI API</strong> enabled on your GCP project</li>
            <li>The <strong>Vertex AI User</strong> role (or equivalent) granted to your service account</li>
            <li>That's it &mdash; the same credentials file handles both BigQuery and Gemini</li>
          </ul>
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
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #4fc3f7, #ab47bc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      cursor: pointer;
    }
    .banner-links {
      display: flex;
      align-items: center;
      gap: 12px;
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
      background: linear-gradient(135deg, #e0e0e0, #ab47bc);
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
      margin-bottom: 12px;
    }
    code {
      background: rgba(79,195,247,0.1);
      color: #4fc3f7;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88rem;
    }

    .example-box {
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .example {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-left: 3px solid #ab47bc;
      border-radius: 6px;
      padding: 10px 16px;
      color: #c0c0d0;
      font-size: 0.9rem;
      font-style: italic;
    }

    ul {
      margin: 8px 0 0 20px;
      color: #9e9eaa;
      font-size: 0.95rem;
      line-height: 1.7;
    }
    li { margin-bottom: 4px; }
    li strong { color: #e0e0e0; }

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
export class AiAssistInfoComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  goHowItWorks() {
    this.router.navigate(['/how-it-works']);
  }

  getStarted() {
    this.router.navigate(['/credentials']);
  }
}
