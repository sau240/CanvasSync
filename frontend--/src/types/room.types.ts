export interface Room {
  room_id: string;        // VARCHAR(36) UUID -- not a number
  room_title: string;
  active_users: number;
  owner_id: number;
  capacity: number;       // real column; room_description doesn't exist
  created_at: string;
  updated_at: string;
  // Added by the backend's GET /rooms/{room_id} for the join preview
  owner_username?: string;
  your_role?: 'OWNER' | 'EDITOR' | 'VIEWER' | 'ADMIN' | null;
}

export interface CreateRoomRequest {
  roomTitle: string;      // backend's RoomCreateRequest fields are camelCase
  capacity: number;
}

export interface UpdateRoomRequest {
  roomTitle?: string;
  capacity?: number;
}