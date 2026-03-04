import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ValidateCredentialsResponse } from '../models/credential.model';
import type { QueryResult } from '../models/query-result.model';

export type AuthPayload =
  | { credentialsJson: string }
  | { accessToken: string; projectId: string };

export interface CheckGeminiAccessResult {
  hasAccess: boolean;
  error?: string;
  projectId?: string;
  location?: string;
}

export interface GenerateSqlResult {
  success: boolean;
  sql: string;
  error?: string;
}

export interface PentaColumnSchema {
  name: string;
  type: string;
}

export interface PentaTableSchema {
  tableName: string;
  columns: PentaColumnSchema[];
}

export interface PentaSchemaResponse {
  tables: PentaTableSchema[];
}

export interface PentaSyncResponse {
  registered: number;
  files: string[];
}

@Injectable({ providedIn: 'root' })
export class BigQueryApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;
  private pentaBaseUrl = '/api/penta';

  validateCredentials(auth: AuthPayload): Promise<ValidateCredentialsResponse> {
    return firstValueFrom(
      this.http.post<ValidateCredentialsResponse>(
        `${this.baseUrl}/validate-credentials`,
        auth
      ).pipe(timeout(20000))
    );
  }

  executeQuery(auth: AuthPayload, sql: string): Promise<QueryResult> {
    return firstValueFrom(
      this.http.post<QueryResult>(
        `${this.baseUrl}/execute`,
        { ...auth, sql }
      )
    );
  }

  checkGeminiAccess(auth: AuthPayload): Promise<CheckGeminiAccessResult> {
    return firstValueFrom(
      this.http.post<CheckGeminiAccessResult>(
        `${this.baseUrl}/check-gemini-access`,
        auth
      )
    );
  }

  generateSql(auth: AuthPayload, schema: string, prompt: string): Promise<GenerateSqlResult> {
    return firstValueFrom(
      this.http.post<GenerateSqlResult>(
        `${this.baseUrl}/generate-sql`,
        { ...auth, schema, prompt }
      )
    );
  }

  executePentaQuery(sql: string): Promise<QueryResult> {
    return firstValueFrom(
      this.http.post<QueryResult>(`${this.pentaBaseUrl}/execute`, { sql })
    );
  }

  getPentaSchema(): Promise<PentaSchemaResponse> {
    return firstValueFrom(
      this.http.get<PentaSchemaResponse>(`${this.pentaBaseUrl}/schema`)
    );
  }

  syncPentaDocs(auth: AuthPayload): Promise<PentaSyncResponse> {
    return firstValueFrom(
      this.http.post<PentaSyncResponse>(`${this.pentaBaseUrl}/sync`, auth)
    );
  }

  getPentaSyncStatus(): Promise<PentaSyncResponse> {
    return firstValueFrom(
      this.http.get<PentaSyncResponse>(`${this.pentaBaseUrl}/sync/status`)
    );
  }

  generatePentaSql(auth: AuthPayload, schema: string, prompt: string): Promise<GenerateSqlResult> {
    return firstValueFrom(
      this.http.post<GenerateSqlResult>(
        `${this.pentaBaseUrl}/generate-sql`,
        { ...auth, schema, prompt }
      )
    );
  }

}
