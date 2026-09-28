import type { CreateRoomRequest, Room, UpdateRoomRequest } from '../types/room.types';
import client from './client.api';

export interface PublicUser {
  user_id: number;
  username: string;
  email: string;
}

export const roomsApi = {
  listRooms: async (): Promise<Room[]> => {
    const response = await client.get<Room[]>('/rooms/');
    return response.data;
  },

  // The current user's private personal workspace. Auto-created on first
  // call, isolated from everyone else until the owner shares it.
  getPersonalWorkspace: async (): Promise<Room> => {
    const response = await client.get<Room>('/rooms/personal');
    return response.data;
  },

  // roomId is a VARCHAR(36) UUID string on the backend, not a number.
  getRoomById: async (roomId: string): Promise<Room> => {
    const response = await client.get<Room>(`/rooms/${roomId}/`);
    return response.data;
  },

  createRoom: async (data: CreateRoomRequest): Promise<Room> => {
    const response = await client.post<Room>('/rooms/', data);
    return response.data;
  },

  updateRoom: async (roomId: string, data: UpdateRoomRequest): Promise<Room> => {
    const response = await client.put<Room>(`/rooms/${roomId}/`, data);
    return response.data;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await client.delete(`/rooms/${roomId}/`);
  },

  searchUsers: async (q: string): Promise<PublicUser[]> => {
    const response = await client.get<PublicUser[]>('/auth/search', { params: { q } });
    return response.data;
  },
};