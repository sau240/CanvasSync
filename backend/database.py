import os
from typing import AsyncGenerator
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

load_dotenv()

DB_USER = os.getenv("DATABASE_USER", "root")
DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
DB_HOST = os.getenv("DATABASE_HOST", "127.0.0.1")
DB_PORT = os.getenv("DATABASE_PORT", "3306")
# Must match the database name created in schema.sql exactly (MySQL DB names
# are case-sensitive on Linux). The schema creates "sync_in_realtime".
DB_NAME = os.getenv("DATABASE_NAME", "sync_in_realtime")

ENCODED_USER = quote_plus(DB_USER)
ENCODED_PASSWORD = quote_plus(DB_PASSWORD)

DATABASE_URL = f"mysql+aiomysql://{ENCODED_USER}:{ENCODED_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_async_engine(
    DATABASE_URL,
    echo=True,          # Set to False in production
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def db_connect() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to yield an async database session for FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session