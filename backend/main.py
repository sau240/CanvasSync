import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes import auth_routes, room_routes, permission_routes, device_router, sync_routes, ws_routes
from logger import logger

app = FastAPI(title="Collaborative Real-Time Canvas API")

ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches any unhandled error anywhere in the app and writes it to
    logs/<today's-date>.log, instead of only crashing with a raw traceback."""
    logger.error(
        f"Unhandled error on {request.method} {request.url.path}: {exc}\n"
        f"{traceback.format_exc()}"
    )

    origin = request.headers.get("origin")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(room_routes.router, prefix="/api/v1")
app.include_router(permission_routes.router, prefix="/api/v1")
app.include_router(device_router.router, prefix="/api/v1")
app.include_router(sync_routes.router, prefix="/api/v1")
# No /api/v1 prefix here: RoomPage.tsx connects to
# `${VITE_WS_BASE_URL}/ws/rooms/{roomId}` with VITE_WS_BASE_URL defaulting
# to ws://localhost:8000 -- i.e. straight off the root.
app.include_router(ws_routes.ws_router)


@app.get("/")
async def read_root():
    return {
        "message": "FASTAPI server is running successfully"
    }