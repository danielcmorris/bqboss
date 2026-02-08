import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class BigQueryApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  validateCredentials(auth: AuthPayload): Promise<ValidateCredentialsResponse> {
    return firstValueFrom(
      this.http.post<ValidateCredentialsResponse>(
        `${this.baseUrl}/validate-credentials`,
        auth
      )
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

}
