import { Injectable } from '@angular/core';
import { db, type StoredCredential, type SqlHistoryEntry, type SchemaEntry, type FavoriteQuery, type AppSetting } from '../db/app-database';

@Injectable({ providedIn: 'root' })
export class DatabaseService {

  async hasCredentials(): Promise<boolean> {
    const count = await db.credentials.count();
    return count > 0;
  }

  async getAllCredentials(): Promise<StoredCredential[]> {
    return db.credentials.toArray();
  }

  async getCredentialById(id: number): Promise<StoredCredential | undefined> {
    return db.credentials.get(id);
  }

  async getFirstCredential(): Promise<StoredCredential | undefined> {
    return db.credentials.toCollection().first();
  }

  async saveCredential(credential: StoredCredential): Promise<number> {
    return db.credentials.put(credential);
  }

  async deleteCredential(id: number): Promise<void> {
    await db.credentials.delete(id);
    await db.sqlHistory.where('credentialId').equals(id).delete();
    await db.schema.where('credentialId').equals(id).delete();
  }

  async clearCredentials(): Promise<void> {
    await db.credentials.clear();
    await db.sqlHistory.clear();
  }

  async addHistoryEntry(entry: Omit<SqlHistoryEntry, 'id'>): Promise<void> {
    const existing = await db.sqlHistory
      .where('credentialId').equals(entry.credentialId)
      .filter(e => e.sql === entry.sql)
      .toArray();
    if (existing.length) {
      await db.sqlHistory.bulkDelete(existing.map(e => e.id!));
    }
    await db.sqlHistory.add(entry as SqlHistoryEntry);
  }

  async getHistory(credentialId: number): Promise<SqlHistoryEntry[]> {
    return db.sqlHistory
      .where('credentialId').equals(credentialId)
      .reverse()
      .sortBy('id');
  }

  async clearHistory(credentialId: number): Promise<void> {
    await db.sqlHistory.where('credentialId').equals(credentialId).delete();
  }

  async saveSchemaEntries(credentialId: number, datasetId: string, entries: Omit<SchemaEntry, 'id'>[]): Promise<void> {
    await db.schema.where('[credentialId+datasetId]').equals([credentialId, datasetId]).delete();
    await db.schema.bulkAdd(entries as SchemaEntry[]);
  }

  async hasSchema(credentialId: number, datasetId: string): Promise<boolean> {
    const count = await db.schema.where('[credentialId+datasetId]').equals([credentialId, datasetId]).count();
    return count > 0;
  }

  async getSchemaEntries(credentialId: number, datasetId: string): Promise<SchemaEntry[]> {
    return db.schema.where('[credentialId+datasetId]').equals([credentialId, datasetId]).toArray();
  }

  async getFavorites(credentialId: number): Promise<FavoriteQuery[]> {
    return db.favorites.where('credentialId').equals(credentialId).toArray();
  }

  async addFavorite(entry: Omit<FavoriteQuery, 'id'>): Promise<number> {
    return db.favorites.add(entry as FavoriteQuery);
  }

  async findFavoriteBySql(credentialId: number, sql: string): Promise<FavoriteQuery | undefined> {
    return db.favorites
      .where('credentialId').equals(credentialId)
      .filter(f => f.sql === sql)
      .first();
  }

  async deleteFavorite(id: number): Promise<void> {
    await db.favorites.delete(id);
  }

  async getDistinctTableNames(credentialId: number, datasetId: string): Promise<string[]> {
    const entries = await db.schema.where('[credentialId+datasetId]').equals([credentialId, datasetId]).toArray();
    return [...new Set(entries.map(e => e.tableName))].sort();
  }

  async getOAuthCredential(): Promise<StoredCredential | undefined> {
    return db.credentials.filter(c => c.type === 'oauth').first();
  }

  async saveOAuthCredential(accessToken: string, tokenExpiry: Date, projectId: string, datasets: StoredCredential['datasets']): Promise<number> {
    const existing = await this.getOAuthCredential();
    const cred: StoredCredential = {
      ...(existing ?? {}),
      id: existing?.id,
      name: 'My Account',
      credentialsJson: '',
      projectId,
      datasets,
      createdAt: existing?.createdAt ?? new Date(),
      type: 'oauth',
      accessToken,
      tokenExpiry
    };
    return db.credentials.put(cred);
  }

  async updateOAuthToken(id: number, accessToken: string, tokenExpiry: Date): Promise<void> {
    await db.credentials.update(id, { accessToken, tokenExpiry });
  }

  async getSetting(key: string): Promise<string | undefined> {
    const entry = await db.settings.get(key);
    return entry?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.settings.put({ key, value });
  }

  async getOAuthClientId(): Promise<string | undefined> {
    return this.getSetting('oauthClientId');
  }

  async setOAuthClientId(value: string): Promise<void> {
    return this.setSetting('oauthClientId', value);
  }

  async deleteOAuthClientId(): Promise<void> {
    await db.settings.delete('oauthClientId');
  }
}
