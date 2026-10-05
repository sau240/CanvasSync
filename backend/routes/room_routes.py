import hashlib
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from database import db_connect
from middleware.auth import get_current_user

router = APIRouter(prefix="/rooms", tags=["Rooms"])


class RoomCreateRequest(BaseModel):
    roomTitle: str
    capacity: int


class RoomUpdateRequest(BaseModel):
    roomTitle: Optional[str] = None
    capacity: Optional[int] = None


def _personal_room_id(user_id: int) -> str:
    """Deterministic room_id for a user's personal workspace.

    Always produces the same UUID for the same user_id, so the personal
    room is easy to find and never collides with random UUIDs.
    """
    return hashlib.sha256(f"personal-{user_id}".encode()).hexdigest()[:36]


async def _call_room_management(
    db: AsyncSession,
    op: str,
    room_id: Optional[str] = None,
    owner_id: Optional[int] = None,
    room_title: Optional[str] = None,
    capacity: Optional[int] = None,
    limit: Optional[int] = None,
):
    """Plain-SQL replacement for the missing sp_room_management procedure."""

    if op == "GET_BY_ID":
        return await db.execute(
            text("SELECT * FROM rooms WHERE room_id = :room_id AND is_deleted = FALSE LIMIT 1"),
            {"room_id": room_id},
        )

    if op == "GET_BY_OWNER":
        return await db.execute(
            text("SELECT * FROM rooms WHERE owner_id = :owner_id AND is_deleted = FALSE"),
            {"owner_id": owner_id},
        )

    if op == "CREATE":
        await db.execute(
            text(
                "INSERT INTO rooms (room_id, room_title, owner_id, capacity, active_users, is_deleted, created_at) "
                "VALUES (:room_id, :room_title, :owner_id, :capacity, 0, FALSE, NOW())"
            ),
            {
                "room_id": room_id,
                "room_title": room_title or "Untitled Room",
                "owner_id": owner_id,
                "capacity": capacity or 10,
            },
        )
        return await db.execute(
            text("SELECT * FROM rooms WHERE room_id = :room_id LIMIT 1"),
            {"room_id": room_id},
        )

    if op == "UPDATE":
        sets = []
        params: dict = {"room_id": room_id}
        if room_title is not None:
            sets.append("room_title = :room_title")
            params["room_title"] = room_title
        if capacity is not None:
            sets.append("capacity = :capacity")
            params["capacity"] = capacity
        if sets:
            await db.execute(
                text(f"UPDATE rooms SET {', '.join(sets)} WHERE room_id = :room_id"),
                params,
            )
        return await db.execute(
            text("SELECT * FROM rooms WHERE room_id = :room_id LIMIT 1"),
            {"room_id": room_id},
        )

    if op == "DELETE":
        return await db.execute(
            text("UPDATE rooms SET is_deleted = TRUE WHERE room_id = :room_id AND owner_id = :owner_id"),
            {"room_id": room_id, "owner_id": owner_id},
        )

    if op == "JOIN":
        await db.execute(
            text("UPDATE rooms SET active_users = active_users + 1 WHERE room_id = :room_id AND active_users < capacity"),
            {"room_id": room_id},
        )
        return await db.execute(
            text("SELECT * FROM rooms WHERE room_id = :room_id LIMIT 1"),
            {"room_id": room_id},
        )

    if op == "LEAVE":
        await db.execute(
            text("UPDATE rooms SET active_users = GREATEST(0, active_users - 1) WHERE room_id = :room_id"),
            {"room_id": room_id},
        )
        return await db.execute(
            text("SELECT * FROM rooms WHERE room_id = :room_id LIMIT 1"),
            {"room_id": room_id},
        )

    raise HTTPException(status_code=400, detail=f"Unknown room op: {op}")


@router.get("/personal", status_code=status.HTTP_200_OK)
async def get_personal_workspace(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Returns (or auto-creates) the current user's personal workspace.

    Each user gets exactly one personal room with a deterministic ID derived
    from their user_id. This workspace is private by default -- no one else
    can join unless the owner explicitly grants permission.
    """
    user_id = int(current_user["user_id"])
    personal_room_id = _personal_room_id(user_id)

    result = await _call_room_management(db, "GET_BY_ID", room_id=personal_room_id)
    room = result.mappings().first()

    if room is not None:
        return dict(room)

    try:
        result = await _call_room_management(
            db,
            "CREATE",
            room_id=personal_room_id,
            owner_id=user_id,
            room_title="My Workspace",
            capacity=1,
        )
        row = result.mappings().first()
        await db.commit()
        return dict(row)
    except DBAPIError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create personal workspace",
        )


@router.get("/", status_code=status.HTTP_200_OK)
async def list_my_rooms(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Lists rooms owned by the current user AND rooms shared with them.

    The personal workspace is excluded from this list -- the frontend
    fetches it separately via /rooms/personal so it can be displayed
    differently.
    """
    user_id = int(current_user["user_id"])

    # Rooms the user owns (excluding personal workspace)
    owned_result = await _call_room_management(db, "GET_BY_OWNER", owner_id=user_id)
    owned_rooms = [dict(r) for r in owned_result.mappings().all()]

    personal_id = _personal_room_id(user_id)
    owned_rooms = [r for r in owned_rooms if r["room_id"] != personal_id]

    # Rooms the user has been explicitly granted access to
    shared_result = await db.execute(
        text(
            "SELECT r.room_id, r.room_title, r.owner_id, r.capacity, "
            "r.active_users, r.created_at "
            "FROM rooms r "
            "INNER JOIN rooms_permission rp ON r.room_id = rp.room_id "
            "WHERE rp.user_id = :user_id AND r.is_deleted = FALSE"
        ),
        {"user_id": user_id},
    )
    shared_rooms = [dict(r) for r in shared_result.mappings().all()]

    # De-duplicate (owner might also have a permission row)
    seen = set()
    all_rooms = []
    for r in owned_rooms + shared_rooms:
        if r["room_id"] not in seen:
            seen.add(r["room_id"])
            all_rooms.append(r)

    return all_rooms


@router.get("/{room_id}", status_code=status.HTTP_200_OK)
async def get_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    room = result.mappings().first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    room_dict = dict(room)

    # Attach the owner's username so the frontend can show "Created by X"
    owner_result = await db.execute(
        text("SELECT id, username FROM users WHERE id = :uid AND is_deleted = FALSE LIMIT 1"),
        {"uid": room["owner_id"]},
    )
    owner_row = owner_result.mappings().first()
    if owner_row:
        room_dict["owner_username"] = owner_row["username"]

    # Check the current user's access level
    user_id = int(current_user["user_id"])
    if room["owner_id"] == user_id:
        room_dict["your_role"] = "OWNER"
    else:
        # Lazy import to avoid the circular dependency between the rooms
        # and permissions routers (permission_routes imports us back).
        from routes.permission_routes import _call_room_permissions, _DB_ROLE_TO_LEVEL

        perm_result = await _call_room_permissions(db, "CHECK", room_id, user_id)
        perm_row = perm_result.mappings().first()
        # CHECK's query returns a `role` column (viewer/editor/owner), not
        # `permission_level` -- map it through the same table permission_routes
        # uses elsewhere so the API keeps returning VIEWER/EDITOR/ADMIN.
        room_dict["your_role"] = _DB_ROLE_TO_LEVEL.get(perm_row["role"]) if perm_row else None

    return room_dict


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """room_id is a VARCHAR(36) PK, not AUTO_INCREMENT, so we generate the
    UUID here and pass it in -- the procedure just inserts it as given."""
    new_room_id = str(uuid.uuid4())

    try:
        result = await _call_room_management(
            db,
            "CREATE",
            room_id=new_room_id,
            owner_id=int(current_user["user_id"]),
            room_title=room_data.roomTitle,
            capacity=room_data.capacity,
        )
        row = result.mappings().first()
        await db.commit()
    except DBAPIError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create room",
        )

    return dict(row)


@router.put("/{room_id}")
async def update_room(
    room_id: str,
    room_data: RoomUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Update details of an existing room. Caller must be the owner."""
    await _require_ownership(db, room_id, current_user)

    await _call_room_management(
        db,
        "UPDATE",
        room_id=room_id,
        owner_id=int(current_user["user_id"]),
        room_title=room_data.roomTitle,
        capacity=room_data.capacity,
    )
    await db.commit()

    result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    row = result.mappings().first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return dict(row)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Remove a room. Caller must be the owner."""
    await _require_ownership(db, room_id, current_user)

    await _call_room_management(db, "DELETE", room_id=room_id, owner_id=int(current_user["user_id"]))
    await db.commit()
    return


@router.post("/{room_id}/join", status_code=status.HTTP_200_OK)
async def join_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Bumps the room's active_users counter (capped at capacity by the
    procedure). Caller must already have a role in the room."""
    await _require_membership(db, room_id, current_user)

    result = await _call_room_management(db, "JOIN", room_id=room_id)
    row = result.mappings().first()
    await db.commit()
    return dict(row)


@router.post("/{room_id}/leave", status_code=status.HTTP_200_OK)
async def leave_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    result = await _call_room_management(db, "LEAVE", room_id=room_id)
    row = result.mappings().first()
    await db.commit()
    return dict(row)


async def _require_ownership(db: AsyncSession, room_id: str, current_user: dict):
    """Raises 404/403 unless current_user owns this room (rooms.owner_id --
    'owner' is not a valid sp_room_permissions.permission_level value)."""
    result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    room = result.mappings().first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if room["owner_id"] != int(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room owner can do that",
        )


async def _require_membership(db: AsyncSession, room_id: str, current_user: dict):
    """Raises 403 unless current_user owns the room or holds a
    rooms_permission row for it (i.e. has been explicitly invited)."""
    result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    room = result.mappings().first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if room["owner_id"] == int(current_user["user_id"]):
        return

    from routes.permission_routes import _call_room_permissions

    perm_result = await _call_room_permissions(db, "CHECK", room_id, int(current_user["user_id"]))
    if perm_result.mappings().first() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to do that in this room",
        )