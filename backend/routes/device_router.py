from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import db_connect
from middleware.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["Devices"])


class DeviceRegisterRequest(BaseModel):
    device_id: str
    device_type: str = "web"


@router.post("/register", status_code=status.HTTP_200_OK)
async def register_device(
    body: DeviceRegisterRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    """Registers a device for this user, or touches last_sync_time if it
    already exists. sp_device_management(op, user_id, device_id, device_type)
    -- not sp_register_device, which doesn't exist."""
    result = await db.execute(
        text("CALL sp_device_management(:op, :user_id, :device_id, :device_type)"),
        {
            "op": "REGISTER_OR_TOUCH",
            "user_id": int(current_user["user_id"]),
            "device_id": body.device_id,
            "device_type": body.device_type,
        },
    )
    row = result.mappings().first()
    await db.commit()
    return dict(row)


@router.get("/", status_code=status.HTTP_200_OK)
async def list_my_devices(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(db_connect),
):
    result = await db.execute(
        text("CALL sp_device_management(:op, :user_id, :device_id, :device_type)"),
        {
            "op": "GET_USER_DEVICES",
            "user_id": int(current_user["user_id"]),
            "device_id": None,
            "device_type": None,
        },
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]