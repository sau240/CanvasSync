from typing import Optional

from fastapi import (
    APIRouter,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from logger import logger
from middleware.auth import get_current_user_ws
from routes.connection_manager import manager
from routes.permission_routes import _call_room_permissions
from routes.room_routes import _call_room_management, _personal_room_id

ws_router = APIRouter()

VALID_OPERATION_TYPES = {
    "CREATE",
    "UPDATE",
    "DELETE",
    "CLEAR",
    "REORDER",
    "PAGE_CREATE",
    "PAGE_UPDATE",
    "PAGE_DELETE",
    "PAGE_REORDER",
    "PAGES_SYNC",
}


async def _fetch_user_public(db: AsyncSession, user_id: int) -> dict:
    """Display info for the room-presence list, via the same
    sp_manage_user('GET_BY_ID', ...) op GET /auth/me already uses."""
    result = await db.execute(
        text("CALL sp_manage_user(:op, :uid, :username, :email, :pwd)"),
        {"op": "GET_BY_ID", "uid": user_id, "username": None, "email": None, "pwd": None},
    )
    row = result.mappings().first()
    if row is None:
        return {"user_id": user_id, "username": None, "email": None}
    return {"user_id": row["id"], "username": row["username"], "email": row["email"]}


async def _ensure_room_access(db: AsyncSession, room_id: str, user_id: int) -> None:
    """Enforces strict room isolation: only the owner and explicitly
    permitted users can connect via WebSocket.

    Unlike the previous auto-grant model, simply knowing the room URL
    is no longer sufficient. The room owner must explicitly grant access
    via POST /permissions/grant before another user can join.

    Raises HTTPException(404) if the room doesn't exist.
    Raises HTTPException(403) if the user lacks access.
    """
    # If this is the user's personal private workspace, grant access and ensure created
    if room_id == _personal_room_id(user_id):
        room_result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
        room = room_result.mappings().first()
        if room is None:
            try:
                await _call_room_management(
                    db,
                    "CREATE",
                    room_id=room_id,
                    owner_id=user_id,
                    room_title="My Workspace",
                    capacity=1,
                )
                await db.commit()
            except Exception:
                await db.rollback()
        return

    room_result = await _call_room_management(db, "GET_BY_ID", room_id=room_id)
    room = room_result.mappings().first()
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    if room["owner_id"] == user_id:
        return

    perm_result = await _call_room_permissions(db, "CHECK", room_id, user_id)
    if perm_result.mappings().first() is not None:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have access to this room. Ask the owner to invite you.",
    )


@ws_router.websocket("/ws/rooms/{room_id}")
async def canvas_room_ws(websocket: WebSocket, room_id: str, token: str):
    """Real-time collaborative canvas socket, isolated per room."""
    await websocket.accept()

    # Authenticate the user via websocket auth middleware
    try:
        current_user = await get_current_user_ws(websocket, token)
    except (WebSocketException, HTTPException) as exc:
        logger.error(f"WS authentication failed: {exc}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return
    except Exception as e:
        logger.error(f"WebSocket auth error in room {room_id}: {e}")
        await websocket.close(code=1011)
        return

    user_id = int(current_user["user_id"])

    # Verify access permission to the specified room
    async with AsyncSessionLocal() as db:
        try:
            await _ensure_room_access(db, room_id, user_id)
        except HTTPException as exc:
            logger.error(
                f"WS join rejected: room {room_id} for user {user_id} "
                f"({exc.status_code} {exc.detail})"
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=exc.detail)
            return
        my_info = await _fetch_user_public(db, user_id)

    # Register socket connection with manager
    await manager.connect(room_id, websocket, user_info=my_info)
    manager.set_user_info(room_id, websocket, my_info)

    # Broadcast presence updates
    await websocket.send_json(
        {"type": "room_users", "users": manager.room_user_info(room_id, exclude=websocket)}
    )
    # Send isolated room canvas state snapshot to the connecting client
    await websocket.send_json(
        {"type": "room_state", "shapes": manager.get_room_shapes(room_id)}
    )
    await manager.broadcast(room_id, {"type": "user_joined", "user": my_info}, exclude=websocket)

    # Main WebSocket loop to process incoming operations
    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")

            if msg_type == "canvas_operation":
                operation = payload.get("operation") or {}
                if operation.get("operation_type") not in VALID_OPERATION_TYPES:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "detail": f"operation.operation_type must be one of {sorted(VALID_OPERATION_TYPES)}",
                        }
                    )
                    continue

                # Apply change directly to the room's isolated state
                manager.apply_canvas_operation(room_id, operation)

                # Relay live operational changes to connected participants in this room only
                await manager.broadcast(
                    room_id,
                    {"type": "canvas_operation", "operation": operation},
                    exclude=websocket,
                )
            elif msg_type == "sync_canvas":
                # Explicit state synchronization / bulk seed from client
                new_shapes = payload.get("shapes", [])
                if isinstance(new_shapes, list):
                    manager.set_room_shapes(room_id, new_shapes)
                    await manager.broadcast(
                        room_id,
                        {"type": "room_state", "shapes": new_shapes},
                        exclude=websocket,
                    )
            elif msg_type == "request_room_state":
                await websocket.send_json(
                    {"type": "room_state", "shapes": manager.get_room_shapes(room_id)}
                )
            elif msg_type in ("join_room", "leave_room"):
                continue
            else:
                await websocket.send_json(
                    {"type": "error", "detail": f"unknown message type: {msg_type!r}"}
                )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket unexpected error in room {room_id}: {e}")
    finally:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, {"type": "user_left", "user_id": user_id})