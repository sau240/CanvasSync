import type {
    CheckPermissionResponse,
    GrantPermissionRequest,
    RevokePermissionRequest,
    RoomPermission,
} from '../types/permission.types';
import client from './client.api';

export const permissionApi = {
  grantPermission: async (data: GrantPermissionRequest): Promise<RoomPermission> => {
    const response = await client.post<RoomPermission>('/permissions/grant', {
      room_id: data.room_id,
      user_id: data.user_id,
      permission_level: data.permission_level,
    });
    return response.data;
  },

  revokePermission: async (data: RevokePermissionRequest): Promise<void> => {
    await client.post('/permissions/revoke', data);
  },

  checkPermission: async (roomId: string, userId: number): Promise<CheckPermissionResponse> => {
    const response = await client.get<CheckPermissionResponse>(
      `/permissions/check/${roomId}/${userId}`,
    );
    return response.data;
  },

  listRoomMembers: async (roomId: string): Promise<RoomPermission[]> => {
    const response = await client.get<RoomPermission[]>(`/permissions/room/${roomId}`);
    return response.data;
  },
};