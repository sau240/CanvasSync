from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import db_connect
from middleware.auth import get_current_user
from routes.room_routes import _call_room_management

router = APIRouter(prefix="/permissions", tags=["Permissions"])

VALID_PERMISSION_LEVELS = {"VIEWER", "EDITOR", "ADMIN"}

# Maps the API's uppercase levels onto the actual roles stored in the
# `rooms_permission.role` enum (owner/editor/viewer). ADMIN is treated as
# the owner-level role so the owner can grant full access.
_LEVEL_TO_DB_ROLE = {
    "VIEWER": "viewer",
    "EDITOR": "editor",
    "ADMIN": "owner",
}
_DB_ROLE_TO_LEVEL = {
    "viewer": "VIEWER",
    "editor": "EDITOR",
    "owner": "ADMIN",
}


class GrantPermissionRequest(BaseModel):
    room_id: str
    user_id: int
    permission_level: str


class RevokePermissionRequest(BaseModel):
    room_id: str
    user_id: int


async def _call_room_permissions(
    db: AsyncSession, op: str, room_id: str, user_id: int | None = None, permission_level: str | None = None
):
    """Directly manipulates the real `rooms_permission` table.

    NOTE: The old `sp_room_permissions` stored procedure referenced a
    `room_permissions` table with a `permission_level` column that does
    not exist -- the actual table is `rooms_permission` and its access
    column is `role`. So this helper uses plain SQL against the real
    table so the permission/isolation features actually work.
    """
    if op == "GRANT":
        role = _LEVEL_TO_DB_ROLE.get(permission_level or "", "editor")
        await db.execute(
            text(
                "INSERT INTO rooms_permission (room_id, user_id, role, granted_at) "
                "VALUES (:room_id, :user_id, :role, NOW()) "
                "ON DUPLICATE KEY UPDATE role = :role, granted_at = NOW()"
            ),
            {"room_id": room_id, "user_id": user_id, "role": role},
        )
        return None

    if op == "REVOKE":
        await db.execute(
            text("DELETE FROM rooms_permission WHERE room_id = :room_id AND user_id = :user_id"),
            {"room_id": room_id, "user_id": user_id},
        )
        return None

    if op == "CHECK":
        return await db.execute(
            text("SELECT room_id, user_id, role FROM rooms_permission WHERE room_id = :room_id AND user_id = :user_id"),
            {"room_id": room_id, "user_id": user_id},
        )

    if op == "LIST_MEMBERS":
        return await db.execute(
            text(
                "SELECT rp.room_id, rp.user_id, rp.role AS permission_level, "
                "u.username AS user_name, u.email "
                "FROM rooms_permission rp "
                "JOIN users u ON rp.user_id = u.id "
                "WHERE rp.room_id = :room_id"
            ),
            {"room_id": room_id},
        )

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"invalid permission op: {op}")


async def _require_owner(db: AsyncSession, room_id: str, current_user: dict):
    """Ownership is rooms.owner_id -- only the room owner can manage
    permissions (grant/revoke collaborators)."""
    result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    room = result.mappings().first()
    if room is None or room["owner_id"] != int(current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room owner can manage permissions",
        )


@router.post("/grant", status_code=status.HTTP_200_OK)
async def grant_permission(
    body: GrantPermissionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    if body.permission_level not in VALID_PERMISSION_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"permission_level must be one of {sorted(VALID_PERMISSION_LEVELS)}",
        )

    await _require_owner(db, body.room_id, current_user)

    await _call_room_permissions(db, "GRANT", body.room_id, body.user_id, body.permission_level)
    await db.commit()
    return {"message": "Permission granted/updated"}


@router.post("/revoke", status_code=status.HTTP_200_OK)
async def revoke_permission(
    body: RevokePermissionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    await _require_owner(db, body.room_id, current_user)

    await _call_room_permissions(db, "REVOKE", body.room_id, body.user_id)
    await db.commit()
    return {"message": "Permission revoked"}


@router.get("/check/{room_id}/{user_id}", status_code=status.HTTP_200_OK)
async def check_permission(
    room_id: str,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    result = await _call_room_permissions(db, "CHECK", room_id, user_id)
    row = result.mappings().first()
    return {
        "room_id": room_id,
        "user_id": user_id,
        "permission_level": _DB_ROLE_TO_LEVEL.get(row["role"]) if row else None,
    }


@router.get("/room/{room_id}", status_code=status.HTTP_200_OK)
async def list_room_permissions(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """The owner, or anyone with a permission row, can see who else has access."""
    room_result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    room = room_result.mappings().first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    is_owner = room["owner_id"] == int(current_user["user_id"])
    if not is_owner:
        perm_result = await _call_room_permissions(db, "CHECK", room_id, int(current_user["user_id"]))
        if perm_result.mappings().first() is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this room")

    result = await _call_room_permissions(db, "LIST_MEMBERS", room_id)
    rows = result.mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        d["permission_level"] = _DB_ROLE_TO_LEVEL.get(d.get("permission_level"))
        out.append(d)

    # Also include the owner at the top so collaborators see who owns the room.
    owner_user = await db.execute(
        text("CALL sp_manage_user(:op, :uid, :username, :email, :pwd)"),
        {"op": "GET_BY_ID", "uid": room["owner_id"], "username": None, "email": None, "pwd": None},
    )
    owner_row = owner_user.mappings().first()
    if owner_row:
        out.insert(
            0,
            {
                "room_id": room_id,
                "user_id": room["owner_id"],
                "user_name": owner_row["username"],
                "email": owner_row["email"],
                "permission_level": "OWNER",
            },
        )
    return out