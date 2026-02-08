import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  template: `
    <div class="help-container">
      <div class="help-content">
        <div class="help-header">
          <h1>BigQuery Utility Commands Reference</h1>
          <button class="back-btn" (click)="goBack()">&larr; Back to Query</button>
        </div>

        <section>
          <h2>Schema & Metadata</h2>

          <div class="query-block">
            <h3>List all datasets in your project</h3>
            <pre><code>SELECT schema_name FROM \`{{ p() }}.INFORMATION_SCHEMA.SCHEMATA\`</code></pre>
          </div>

          <div class="query-block">
            <h3>List all tables in a dataset</h3>
            <pre><code>SELECT table_name, table_type, creation_time, row_count, size_bytes
FROM \`{{ p() }}.{{ ds() }}.INFORMATION_SCHEMA.TABLES\`</code></pre>
          </div>

          <div class="query-block">
            <h3>List columns for a specific table</h3>
            <pre><code>SELECT column_name, data_type, is_nullable
FROM \`{{ p() }}.{{ ds() }}.INFORMATION_SCHEMA.COLUMNS\`
WHERE table_name = 'ProductList'</code></pre>
          </div>

          <div class="query-block">
            <h3>Table size and row count</h3>
            <pre><code>SELECT table_name, row_count,
       ROUND(size_bytes / 1024 / 1024, 2) AS size_mb
FROM \`{{ p() }}.{{ ds() }}.__TABLES__\`</code></pre>
          </div>
        </section>

        <section>
          <h2>Data Profiling</h2>

          <div class="query-block">
            <h3>Quick row count</h3>
            <pre><code>SELECT COUNT(*) AS total_rows FROM \`{{ p() }}.{{ ds() }}.ProductList\`</code></pre>
          </div>

          <div class="query-block">
            <h3>Check for nulls across a column</h3>
            <pre><code>SELECT COUNTIF(column_name IS NULL) AS null_count,
       COUNT(*) AS total,
       ROUND(COUNTIF(column_name IS NULL) / COUNT(*) * 100, 2) AS null_pct
FROM \`{{ p() }}.{{ ds() }}.ProductList\`</code></pre>
          </div>

          <div class="query-block">
            <h3>Distinct values in a column</h3>
            <pre><code>SELECT column_name, COUNT(*) AS cnt
FROM \`{{ p() }}.{{ ds() }}.ProductList\`
GROUP BY column_name
ORDER BY cnt DESC</code></pre>
          </div>

          <div class="query-block">
            <h3>Find duplicate rows</h3>
            <pre><code>SELECT col1, col2, COUNT(*) AS dupes
FROM \`{{ p() }}.{{ ds() }}.ProductList\`
GROUP BY col1, col2
HAVING COUNT(*) > 1</code></pre>
          </div>
        </section>

        <section>
          <h2>Cost & Job Monitoring</h2>

          <div class="query-block">
            <h3>Recent query history (last 7 days)</h3>
            <pre><code>SELECT user_email, query, total_bytes_processed, creation_time
FROM \`region-us.INFORMATION_SCHEMA.JOBS\`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY creation_time DESC
LIMIT 20</code></pre>
          </div>

          <div class="query-block">
            <h3>Total bytes billed per user (last 30 days)</h3>
            <pre><code>SELECT user_email,
       ROUND(SUM(total_bytes_billed) / POW(1024, 4), 4) AS tb_billed
FROM \`region-us.INFORMATION_SCHEMA.JOBS\`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY user_email
ORDER BY tb_billed DESC</code></pre>
          </div>
        </section>

        <section>
          <h2>Date Utilities</h2>

          <div class="query-block">
            <h3>Current timestamp and date</h3>
            <pre><code>SELECT CURRENT_TIMESTAMP()
SELECT CURRENT_DATE()</code></pre>
          </div>

          <div class="query-block">
            <h3>Date math</h3>
            <pre><code>SELECT DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
SELECT DATE_ADD(CURRENT_DATE(), INTERVAL 1 MONTH)</code></pre>
          </div>

          <div class="query-block">
            <h3>Extract and format dates</h3>
            <pre><code>SELECT EXTRACT(YEAR FROM CURRENT_DATE())
SELECT FORMAT_DATE('%Y-%m', CURRENT_DATE())</code></pre>
          </div>
        </section>

        <section>
          <h2>Table Management</h2>

          <div class="query-block">
            <h3>Copy a table</h3>
            <pre><code>CREATE TABLE \`{{ p() }}.{{ ds() }}.ProductList_backup\` AS
SELECT * FROM \`{{ p() }}.{{ ds() }}.ProductList\`</code></pre>
          </div>

          <div class="query-block">
            <h3>Create partitioned table from query</h3>
            <pre><code>CREATE TABLE \`{{ p() }}.{{ ds() }}.orders_partitioned\`
PARTITION BY DATE(order_date) AS
SELECT * FROM \`{{ p() }}.{{ ds() }}.Orders\`</code></pre>
          </div>

          <div class="query-block">
            <h3>Add a column</h3>
            <pre><code>ALTER TABLE \`{{ p() }}.{{ ds() }}.ProductList\`
ADD COLUMN new_col STRING</code></pre>
          </div>

          <div class="query-block">
            <h3>Delete rows</h3>
            <pre><code>DELETE FROM \`{{ p() }}.{{ ds() }}.ProductList\`
WHERE some_column = 'value'</code></pre>
          </div>
        </section>

        <section>
          <h2>bq CLI Commands</h2>

          <div class="query-block cli">
            <pre><code># List datasets
bq ls

# List tables in a dataset
bq ls {{ p() }}:{{ ds() }}

# Show table schema
bq show {{ p() }}:{{ ds() }}.ProductList

# Preview rows
bq head {{ p() }}:{{ ds() }}.ProductList

# Estimate query cost (dry run)
bq query --dry_run "SELECT * FROM ..."

# Export table to Cloud Storage
bq extract {{ p() }}:{{ ds() }}.ProductList gs://bucket/file.csv

# Load data from Cloud Storage
bq load --source_format=CSV {{ p() }}:{{ ds() }}.TableName gs://bucket/file.csv

# Run a query
bq query --use_legacy_sql=false "SELECT COUNT(*) FROM \`{{ p() }}.{{ ds() }}.ProductList\`"</code></pre>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .help-container {
      min-height: 100vh;
      background: #1a1a2e;
      padding: 32px;
      overflow-y: auto;
    }
    .help-content {
      max-width: 900px;
      margin: 0 auto;
    }
    .help-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    h1 {
      font-size: 1.6rem;
      color: #e0e0e0;
    }
    .back-btn {
      background: rgba(79,195,247,0.1);
      color: #4fc3f7;
      border: 1px solid rgba(79,195,247,0.25);
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.15s;
    }
    .back-btn:hover { background: rgba(79,195,247,0.2); }
    section {
      margin-bottom: 36px;
    }
    h2 {
      font-size: 1.2rem;
      color: #4fc3f7;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #30363d;
    }
    h3 {
      font-size: 0.95rem;
      color: #9e9e9e;
      margin-bottom: 8px;
    }
    .query-block {
      margin-bottom: 20px;
    }
    pre {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 14px 16px;
      overflow-x: auto;
    }
    code {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.85rem;
      color: #c9d1d9;
      white-space: pre;
    }
    .cli code {
      color: #a5d6a7;
    }
  `]
})
export class HelpComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  p = signal('snapdragonerp');
  ds = signal('snapdragon_data');

  private credId = '';

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('project')) this.p.set(params.get('project')!);
    if (params.get('dataset')) this.ds.set(params.get('dataset')!);
    this.credId = params.get('credId') || '';
  }

  goBack() {
    const queryParams: any = {};
    if (this.credId) queryParams.credId = this.credId;
    this.router.navigate(['/query'], { queryParams });
  }
}
