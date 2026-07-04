from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None


def get_db():
    return client[settings.db_name]


async def connect():
    global client
    client = AsyncIOMotorClient(settings.mongo_url, tz_aware=True)


async def connect_test():
    global client
    client = AsyncIOMotorClient(settings.mongo_test_url, tz_aware=True)


async def disconnect():
    client.close()


async def init_indexes():
    db = get_db()
    await db.tickets.create_index([("queue_id", 1), ("status", 1)])
    await db.tickets.create_index([("queue_id", 1), ("customer_id", 1), ("status", 1)])
    await db.tickets.create_index([("queue_id", 1), ("ticket_number", 1)])
    await db.queues.create_index([("status", 1)])
