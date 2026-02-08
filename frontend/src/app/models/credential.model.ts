export interface DatasetInfo {
  datasetId: string;
  tables: string[];
}

export interface ValidateCredentialsResponse {
  success: boolean;
  error?: string;
  projectId?: string;
  datasets: DatasetInfo[];
}
