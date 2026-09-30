import os
import re
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from logger import logger
from chat_bot import router as chat_router
from routes import auth_routes, device_router, permission_routes, room_routes, sync_routes, ws_routes

load_dotenv()

app = FastAPI(
    title="CanvasSync Collaborative Real-Time Canvas API",
    version="2.4.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Parse allowed origins from environment variable or default to standard development origins
raw_origins = os.getenv("CORS_ORIGINS", "")
custom_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

ALLOWED_ORIGINS = custom_origins or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:5000",
]

# Regex to permit any preview or production deployment on Vercel or Netlify
ALLOWED_ORIGIN_REGEX = r"^https:\/\/.*(vercel\.app|netlify\.app|onrender\.com)$"


def is_origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
        return True
    return bool(re.match(ALLOWED_ORIGIN_REGEX, origin))


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
    if is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin or "*"
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(room_routes.router, prefix="/api/v1")
app.include_router(permission_routes.router, prefix="/api/v1")
app.include_router(device_router.router, prefix="/api/v1")
app.include_router(sync_routes.router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api")
app.include_router(ws_routes.ws_router)


@app.get("/")
async def read_root():
    return {
        "status": "online",
        "service": "CanvasSync Real-Time API",
        "version": "2.4.0",
        "docs": "/api/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CanvasSync API"}