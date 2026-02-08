import { Injectable } from '@angular/core';
import { db, type StoredCredential, type SqlHistoryEntry, type SchemaEntry } from '../db/app-database';

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
}
