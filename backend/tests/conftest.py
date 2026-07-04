import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
from app.main import app
from app.config import settings
from app.database import get_db
import app.database as db_module


@pytest_asyncio.fixture(autouse=True)
async def test_db():
    db_module.client = AsyncIOMotorClient(settings.mongo_test_url)
    db = db_module.client[settings.test_db_name]
    # Clear before each test so isolation is guaranteed regardless of teardown timing
    await db.queues.delete_many({})
    await db.tickets.delete_many({})
    app.dependency_overrides[get_db] = lambda: db
    yield db
    app.dependency_overrides.clear()
    db_module.client.close()


@pytest_asyncio.fixture
async def client(test_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def queue(client, admin_headers):
    """Creates a fresh open queue and returns its JSON."""
    r = await client.post(
        "/api/v1/admin/queues",
        json={"name": "Test Queue", "average_service_time_seconds": 120},
        headers=admin_headers,
    )
    return r.json()


import pytest

@pytest.fixture
def admin_headers():
    return {"X-Admin-Secret": settings.admin_secret}
