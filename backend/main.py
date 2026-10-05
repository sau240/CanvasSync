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

from database import engine

load_dotenv()

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    token_version INT NOT NULL DEFAULT 0,
    age INT DEFAULT NULL,
    designation VARCHAR(100) DEFAULT 'Member',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    room_id VARCHAR(36) PRIMARY KEY,
    room_title VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    capacity INT DEFAULT 10,
    active_users INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rooms_permission (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(20) DEFAULT 'VIEWER',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_room_user (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS canvas_pages (
    page_id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) DEFAULT 'Untitled Page',
    page_order INT DEFAULT 0,
    canvas_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);
"""

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
    "https://canvas-sync-one.vercel.app",
    "https://canvassync-l565.onrender.com",
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
    import traceback as _tb
    tb = _tb.format_exc()
    logger.error(
        f"Unhandled error on {request.method} {request.url.path}: {exc}\n{tb}"
    )

    origin = request.headers.get("origin")
    headers = {}
    if is_origin_allowed(origin):
        headers["Access-Control-Allow-Origin"] = origin or "*"
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
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


@app.on_event("startup")
async def create_tables():
    """Ensure all required tables exist and columns are up-to-date."""
    from sqlalchemy import text as _text
    try:
        async with engine.begin() as conn:
            # Create tables that don't exist yet
            for statement in CREATE_TABLES_SQL.strip().split(";\n\n"):
                stmt = statement.strip()
                if stmt:
                    await conn.execute(_text(stmt))

            # --- Column migrations for the users table ---
            cols_result = await conn.execute(_text(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
            ))
            existing_cols = {row[0].lower() for row in cols_result}
            logger.info(f"Users table columns found: {existing_cols}")

            # Rename 'password' -> 'hashed_password' if needed
            if "hashed_password" not in existing_cols and "password" in existing_cols:
                logger.info("Migrating: renaming 'password' -> 'hashed_password'")
                await conn.execute(_text(
                    "ALTER TABLE users CHANGE COLUMN `password` hashed_password VARCHAR(255) NOT NULL"
                ))
            # Rename 'password_hash' -> 'hashed_password' if needed
            elif "hashed_password" not in existing_cols and "password_hash" in existing_cols:
                logger.info("Migrating: renaming 'password_hash' -> 'hashed_password'")
                await conn.execute(_text(
                    "ALTER TABLE users CHANGE COLUMN password_hash hashed_password VARCHAR(255) NOT NULL"
                ))
            # If column is completely missing, add it
            elif "hashed_password" not in existing_cols:
                logger.info("Migrating: adding missing 'hashed_password' column")
                await conn.execute(_text(
                    "ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255) NOT NULL DEFAULT ''"
                ))

            # Add is_deleted if missing
            if "is_deleted" not in existing_cols:
                logger.info("Migrating: adding missing 'is_deleted' column")
                await conn.execute(_text(
                    "ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"
                ))

            # Add is_active if missing
            if "is_active" not in existing_cols:
                logger.info("Migrating: adding missing 'is_active' column")
                await conn.execute(_text(
                    "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"
                ))

        logger.info("✅ Database tables and columns verified / migrated.")
    except Exception as e:
        logger.error(f"❌ Startup DB migration failed: {e}", exc_info=True)


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


@app.get("/debug/schema")
async def debug_schema():
    """Returns the real column list for the users table directly from Aiven.
    DELETE THIS ENDPOINT before going to production."""
    from database import db_connect
    from sqlalchemy import text as _t
    async with engine.connect() as conn:
        result = await conn.execute(_t(
            "SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, EXTRA "
            "FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' "
            "ORDER BY ORDINAL_POSITION"
        ))
        cols = [dict(row._mapping) for row in result]
    return {"users_columns": cols}