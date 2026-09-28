from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from database import db_connect
from middleware.auth import get_current_user

router = APIRouter(prefix="/sync", tags=["Sync"])

VALID_ACTIONS = {"CREATE", "UPDATE", "DELETE"}


class RecordChangeRequest(BaseModel):
    room_id: str
    entity_id: int
    entity_type: str
    action: str
    source_device_id: Optional[str] = None


async def _call_canvas_sync(
    db: AsyncSession,
    op: str,
    user_id: int,
    room_id: str,
    entity_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    source_device_id: Optional[str] = None,
    last_sync_time: Optional[datetime] = None,
):
    return await db.execute(
        text(
            "CALL sp_canvas_sync(:op, :user_id, :room_id, :entity_id, :entity_type, "
            ":action, :source_device_id, :last_sync_time)"
        ),
        {
            "op": op,
            "user_id": user_id,
            "room_id": room_id,
            "entity_id": entity_id,
            "entity_type": entity_type,
            "action": action,
            "source_device_id": source_device_id,
            "last_sync_time": last_sync_time,
        },
    )


@router.post("/changes", status_code=status.HTTP_201_CREATED)
async def record_change(
    body: RecordChangeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Logs a canvas change via sp_canvas_sync's RECORD_CHANGE op.

    NOTE: this only appends to the sync_changes log -- there's no proc to
    upsert the entity's actual current state (sync_entities), so the old
    `payload` field had nowhere to go and has been dropped rather than
    silently swallowed. entity_id is also an INT here (per the proc's
    signature), not the string id the old code assumed.
    """
    if body.action not in VALID_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"action must be one of {sorted(VALID_ACTIONS)}",
        )

    try:
        result = await _call_canvas_sync(
            db,
            "RECORD_CHANGE",
            user_id=int(current_user["user_id"]),
            room_id=body.room_id,
            entity_id=body.entity_id,
            entity_type=body.entity_type,
            action=body.action,
            source_device_id=body.source_device_id,
        )
        row = result.mappings().first()
        await db.commit()
    except DBAPIError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not record change",
        )

    return dict(row)


@router.get("/changes", status_code=status.HTTP_200_OK)
async def get_changes_since(
    room_id: str,
    since: datetime,
    source_device_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """A reconnecting client calls this to catch up on a room via
    sp_canvas_sync's GET_CHANGES op.

    NOTE: the old version filtered by device_id + entity_type, but
    GET_CHANGES only accepts room_id + last_sync_time (+ source_device_id,
    to exclude the caller's own changes) -- there's no entity_type filter
    in this schema. There's also no sp_ack_sync procedure, so there's
    nowhere to durably store "this device is caught up to change N" --
    the closest thing available is devices.last_sync_time, updated by
    POST /devices/register.
    """
    result = await _call_canvas_sync(
        db,
        "GET_CHANGES",
        user_id=int(current_user["user_id"]),
        room_id=room_id,
        source_device_id=source_device_id,
        last_sync_time=since,
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]

# Real-time collaboration (WebSocket) lives in routes/ws_routes.py, mounted
# at /ws/rooms/{room_id} directly on the app (no /api/v1 prefix) to match
# what the frontend actually connects to.