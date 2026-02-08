import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  template: `
    <div class="page">
      <nav class="banner">
        <div class="banner-brand" (click)="home()"><img src="logo.png" alt="" class="brand-logo" />BQ Boss</div>
      </nav>

      <div class="content">
        <h1>Terms of Service</h1>
        <p class="updated">Last updated: February 8, 2025</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using BQ Boss ("the Software"), you agree to be bound by these
            Terms of Service. If you do not agree, do not use the Software.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            BQ Boss is a free, open-source, browser-based SQL workspace for Google BigQuery.
            It allows you to connect to your own Google Cloud projects, execute queries, and
            optionally use AI-assisted SQL generation via Google Vertex AI.
          </p>
        </section>

        <section>
          <h2>3. Open-Source License</h2>
          <p>
            BQ Boss is provided as open-source software under the MIT License. You are free
            to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
            of the Software, subject to the conditions of that license.
          </p>
        </section>

        <section>
          <h2>4. Your Responsibilities</h2>
          <ul>
            <li>You are responsible for any credentials (service account keys, OAuth tokens)
              you provide to the application.</li>
            <li>You are responsible for all queries executed through the application and any
              costs incurred in your Google Cloud account.</li>
            <li>You must comply with Google Cloud's
              <a href="https://cloud.google.com/terms" target="_blank" rel="noopener">Terms of Service</a>
              and applicable laws when using BQ Boss.</li>
          </ul>
        </section>

        <section>
          <h2>5. No Warranty</h2>
          <p>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
            HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION
            OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE
            SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </p>
        </section>

        <section>
          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, the authors and maintainers of BQ Boss
            shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages, including but not limited to loss of data, loss of profits,
            or Google Cloud billing charges, arising from your use of the Software.
          </p>
        </section>

        <section>
          <h2>7. Data Handling</h2>
          <p>
            BQ Boss does not collect, store, or transmit your data to any server. All
            credentials, query history, and settings are stored locally in your browser's
            IndexedDB. See our <a (click)="privacy()" style="cursor:pointer">Privacy Policy</a>
            for details.
          </p>
        </section>

        <section>
          <h2>8. Third-Party Services</h2>
          <p>
            BQ Boss interacts with Google Cloud APIs on your behalf. Your use of those APIs
            is subject to Google's terms and pricing. BQ Boss has no control over and assumes
            no responsibility for Google Cloud service availability, pricing changes, or API
            modifications.
          </p>
        </section>

        <section>
          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. Changes will be reflected on this
            page with an updated revision date. Continued use of the Software after changes
            constitutes acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            If you have questions about these terms, contact
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
export class TermsComponent {
  constructor(private router: Router) {}

  home() {
    this.router.navigate(['/']);
  }

  privacy() {
    this.router.navigate(['/privacy']);
  }
}
