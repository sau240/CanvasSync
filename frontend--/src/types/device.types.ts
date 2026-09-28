export interface Device {
  device_id: string; // matches UUID generated on frontend
  user_id: number;
  device_type: string;
  last_sync_time: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceRequest {
  device_id: string;
  device_type: string;
}