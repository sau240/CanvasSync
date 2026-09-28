export interface SyncChange {
  change_id?: number;
  user_id: number;
  entity_id: number;
  entity_type: 'shape' | 'canvas' | 'text';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  source_device_id: string;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RecordChangeRequest {
  changes: Omit<SyncChange, 'user_id' | 'createdAt' | 'updatedAt'>[];
}

export interface GetChangesResponse {
  changes: SyncChange[];
  last_sync_timestamp: string;
}

export interface AckChangesRequest {
  change_ids: number[];
  device_id: string;
}