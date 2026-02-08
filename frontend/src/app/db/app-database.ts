import Dexie, { type Table } from 'dexie';

export interface StoredDatasetInfo {
  datasetId: string;
  tables: string[];
}

export interface StoredCredential {
  id?: number;
  name: string;
  credentialsJson: string;
  projectId: string;
  datasets: StoredDatasetInfo[];
  createdAt: Date;
  type: 'service-account' | 'oauth';
  accessToken?: string;
  tokenExpiry?: Date;
}

export interface SqlHistoryEntry {
  id?: number;
  credentialId: number;
  sql: string;
  executedAt: Date;
  rowCount: number;
}

export interface SchemaEntry {
  id?: number;
  credentialId: number;
  datasetId: string;
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: string;
  rowCount: number;
  tableSizeMb: number;
  fetchedAt: Date;
}

export interface FavoriteQuery {
  id?: number;
  credentialId: number;
  name: string;
  sql: string;
  isBuiltIn: boolean;
  createdAt: Date;
}

export interface AppSetting {
  key: string;
  value: string;
}

export class AppDatabase extends Dexie {
  credentials!: Table<StoredCredential, number>;
  sqlHistory!: Table<SqlHistoryEntry, number>;
  schema!: Table<SchemaEntry, number>;
  favorites!: Table<FavoriteQuery, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('BigQuerySqlManager');
    this.version(1).stores({
      credentials: 'name',
      sqlHistory: '++id'
    });
    this.version(2).stores({
      credentials: null,
      sqlHistory: null
    });
    this.version(3).stores({
      credentials: '++id, name',
      sqlHistory: '++id, credentialId'
    });
    this.version(4).stores({
      schema: '++id, credentialId, [credentialId+datasetId]'
    });
    this.version(5).stores({
      favorites: '++id, credentialId'
    });
    this.version(6).stores({}).upgrade(tx => {
      return tx.table('credentials').toCollection().modify(cred => {
        if (!cred.type) {
          cred.type = 'service-account';
        }
      });
    });
    this.version(7).stores({
      settings: 'key'
    });
  }
}

export const db = new AppDatabase();
