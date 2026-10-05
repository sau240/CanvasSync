import asyncio
import os
import sys

# Add project root to PYTHONPATH so imports work
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(project_root)

from backend.database import engine

async def test_connection():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: None)
        print("✅ Database connection successful!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
