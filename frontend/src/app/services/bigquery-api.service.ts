import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ValidateCredentialsResponse } from '../models/credential.model';
import type { QueryResult } from '../models/query-result.model';

export interface CheckGeminiAccessResult {
  hasAccess: boolean;
  error?: string;
  projectId?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class BigQueryApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  validateCredentials(credentialsJson: string): Promise<ValidateCredentialsResponse> {
    return firstValueFrom(
      this.http.post<ValidateCredentialsResponse>(
        `${this.baseUrl}/validate-credentials`,
        { credentialsJson }
      )
    );
  }

  executeQuery(credentialsJson: string, sql: string): Promise<QueryResult> {
    return firstValueFrom(
      this.http.post<QueryResult>(
        `${this.baseUrl}/execute`,
        { credentialsJson, sql }
      )
    );
  }

  checkGeminiAccess(credentialsJson: string): Promise<CheckGeminiAccessResult> {
    return firstValueFrom(
      this.http.post<CheckGeminiAccessResult>(
        `${this.baseUrl}/check-gemini-access`,
        { credentialsJson }
      )
    );
  }
}
