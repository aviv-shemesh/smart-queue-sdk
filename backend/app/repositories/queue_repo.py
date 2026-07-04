import secrets
import string
from datetime import datetime, timezone

_ALPHABET = string.ascii_uppercase + string.digits  # A-Z0-9 — 36 chars, 36^8 ≈ 2.8 trillion combinations


def _new_id() -> str:
    return ''.join(secrets.choice(_ALPHABET) for _ in range(8))


def _to_dict(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


async def create_queue(db, name: str, avg_service_time: int) -> dict:
    base = {
        "name": name,
        "status": "open",
        "now_serving": 0,
        "next_ticket_number": 0,
        "average_service_time_seconds": avg_service_time,
        "served_count": 0,
        "created_at": datetime.now(timezone.utc),
        "closed_at": None,
    }
    # Retry loop handles the astronomically rare duplicate-key collision
    for _ in range(5):
        queue_id = _new_id()
        doc = {**base, "_id": queue_id}
        try:
            await db.queues.insert_one(doc)
            doc["id"] = queue_id
            doc.pop("_id", None)
            return doc
        except Exception as e:
            if "duplicate key" in str(e).lower():
                continue
            raise
    raise RuntimeError("Failed to generate a unique queue ID after 5 attempts")


async def get_queue(db, queue_id: str) -> dict | None:
    doc = await db.queues.find_one({"_id": queue_id})
    return _to_dict(doc) if doc else None


async def get_all_open_queues(db) -> list[dict]:
    cursor = db.queues.find({"status": {"$ne": "closed"}})
    return [_to_dict(doc) async for doc in cursor]


async def update_queue_status(db, queue_id: str, status: str) -> dict | None:
    update = {"$set": {"status": status}}
    if status == "closed":
        update["$set"]["closed_at"] = datetime.now(timezone.utc)
    doc = await db.queues.find_one_and_update(
        {"_id": queue_id},
        update,
        return_document=True,
    )
    return _to_dict(doc) if doc else None


async def increment_ticket_counter(db, queue_id: str) -> int:
    result = await db.queues.find_one_and_update(
        {"_id": queue_id},
        {"$inc": {"next_ticket_number": 1}},
        return_document=True,
    )
    return result["next_ticket_number"]


async def update_now_serving(db, queue_id: str, ticket_number: int) -> None:
    await db.queues.update_one(
        {"_id": queue_id},
        {"$set": {"now_serving": ticket_number}},
    )


async def update_rolling_average(db, queue_id: str, service_duration_seconds: int) -> None:
    queue = await db.queues.find_one({"_id": queue_id})
    if not queue:
        return
    old_avg = queue["average_service_time_seconds"]
    served_count = queue["served_count"]
    new_avg = int((old_avg * served_count + service_duration_seconds) / (served_count + 1))
    await db.queues.update_one(
        {"_id": queue_id},
        {"$set": {"average_service_time_seconds": new_avg}, "$inc": {"served_count": 1}},
    )
