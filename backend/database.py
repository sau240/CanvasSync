import os
import ssl
from typing import AsyncGenerator
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

load_dotenv()

DB_USER = os.getenv("DATABASE_USER", "root")
DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
DB_HOST = os.getenv("DATABASE_HOST", "127.0.0.1")
DB_PORT = os.getenv("DATABASE_PORT", "3306")
DB_NAME = os.getenv("DATABASE_NAME", "sync_in_realtime")
DB_SSL = os.getenv("DATABASE_SSL", "").strip().lower()

# Support full DATABASE_URL if provided
raw_database_url = os.getenv("DATABASE_URL")

if raw_database_url:
    if raw_database_url.startswith("mysql://"):
        DATABASE_URL = raw_database_url.replace("mysql://", "mysql+aiomysql://", 1)
    elif raw_database_url.startswith("mysql+pymysql://"):
        DATABASE_URL = raw_database_url.replace("mysql+pymysql://", "mysql+aiomysql://", 1)
    else:
        DATABASE_URL = raw_database_url
else:
    ENCODED_USER = quote_plus(DB_USER)
    ENCODED_PASSWORD = quote_plus(DB_PASSWORD)
    DATABASE_URL = f"mysql+aiomysql://{ENCODED_USER}:{ENCODED_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Build connect_args (Enable SSL automatically for cloud MySQL providers like Aiven, TiDB, etc.)
connect_args = {}
is_remote_host = DB_HOST not in ("127.0.0.1", "localhost", "0.0.0.0")
needs_ssl = (
    DB_SSL in ("true", "1", "required")
    or "aivencloud" in DB_HOST
    or "tidbcloud" in DB_HOST
    or "ssl-mode=REQUIRED" in (raw_database_url or "")
    or (is_remote_host and DB_SSL != "false")
)

if needs_ssl:
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def db_connect() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to yield an async database session for FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session