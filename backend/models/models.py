from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, Field

class UserModel(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: Optional[int] = None
    designation: str
    is_deleted: bool = False

class ProductModel(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    age: Optional[int] = None
    designation: Optional[str] = None
    stock: int
    price: int

class RoomModel(BaseModel):
    # rooms.room_id is VARCHAR(36) -- a client-generated UUID, not an
    # auto-increment INT.
    roomID: Optional[str] = None
    roomTitle: str
    ownerID: int
    capacity: int
    active_users: int = 0

class DataModels(BaseModel):
    shapes: List[Dict[str, Any]] = []
    freehanddrawing: List[Dict[str, Any]] = []
    time_stamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PermissionModels(BaseModel):
    # sp_room_permissions' p_permission_level is VIEWER/EDITOR/ADMIN --
    # "owner" is never a permission_level value, it's rooms.owner_id.
    permissionLevel: str
    roomID: str
    userID: int