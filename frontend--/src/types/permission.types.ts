export type RoomRole = 'OWNER' | 'EDITOR' | 'VIEWER' | 'ADMIN';

export interface RoomPermission {
  permission_id: number;
  permission_status: string;
  room_id: number;
  user_id: number;
  room_name: string;
  user_name: string;
  email: string;
  role: RoomRole;
  createdAt: string;
  updatedAt: string;
}

export interface GrantPermissionRequest {
  room_id: string;
  user_id: number;
  permission_level: RoomRole;
}

export interface RevokePermissionRequest {
  room_id: string;
  user_id: number;
}

export interface CheckPermissionRequest {
  room_id: string;
  user_id: number;
}

export interface CheckPermissionResponse {
  room_id: string;
  user_id: number;
  permission_level: RoomRole | null;
}