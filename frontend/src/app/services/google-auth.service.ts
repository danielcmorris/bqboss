import { Injectable, NgZone, inject } from '@angular/core';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private zone = inject(NgZone);
  private tokenClient: any = null;
  private _initialized = false;

  isInitialized(): boolean {
    return this._initialized;
  }

  async init(clientId: string): Promise<void> {
    if (this._initialized) return;

    await this.loadGisScript();

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/cloud-platform',
      callback: () => {}  // overridden per-request in requestAccessToken
    });

    this._initialized = true;
  }

  requestAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Google Auth not initialized'));
        return;
      }

      this.tokenClient.callback = (response: any) => {
        console.log('[GIS] callback fired, response keys:', Object.keys(response));
        this.zone.run(() => {
          if (response.error) {
            console.error('[GIS] error in response:', response.error, response.error_description);
            reject(new Error(response.error_description || response.error));
            return;
          }
          console.log('[GIS] access_token received, expires_in:', response.expires_in);
          resolve({
            accessToken: response.access_token,
            expiresIn: Number(response.expires_in)
          });
        });
      };

      this.tokenClient.error_callback = (error: any) => {
        console.error('[GIS] error_callback fired:', error);
        this.zone.run(() => {
          reject(new Error(error.message || 'OAuth popup was closed or blocked'));
        });
      };

      this.tokenClient.requestAccessToken();
    });
  }

  private loadGisScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }
}
