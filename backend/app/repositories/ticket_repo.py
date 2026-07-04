from datetime import datetime, timezone
from bson import ObjectId


def _to_dict(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


async def create_ticket(
    db,
    queue_id: str,
    customer_id: str,
    customer_name: str,
    ticket_number: int,
) -> dict:
    doc = {
        "queue_id": queue_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "ticket_number": ticket_number,
        "status": "waiting",
        "joined_at": datetime.now(timezone.utc),
        "called_at": None,
        "served_at": None,
        "cancelled_at": None,
    }
    result = await db.tickets.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


async def get_active_ticket(db, queue_id: str, customer_id: str) -> dict | None:
    doc = await db.tickets.find_one({
        "queue_id": queue_id,
        "customer_id": customer_id,
        "status": {"$in": ["waiting", "called"]},
    })
    return _to_dict(doc) if doc else None


async def get_ticket_by_id(db, ticket_id: str) -> dict | None:
    try:
        doc = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    except Exception:
        return None
    return _to_dict(doc) if doc else None


async def cancel_ticket(db, ticket_id: str) -> None:
    await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}},
    )


async def count_tickets_ahead(db, queue_id: str, ticket_number: int) -> int:
    return await db.tickets.count_documents({
        "queue_id": queue_id,
        "status": "waiting",
        "ticket_number": {"$lt": ticket_number},
    })


async def get_next_waiting_ticket(db, queue_id: str) -> dict | None:
    doc = await db.tickets.find_one(
        {"queue_id": queue_id, "status": "waiting"},
        sort=[("ticket_number", 1)],
    )
    return _to_dict(doc) if doc else None


async def mark_ticket_called(db, ticket_id: str) -> None:
    await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {"status": "called", "called_at": datetime.now(timezone.utc)}},
    )


async def mark_ticket_served(db, ticket_id: str) -> None:
    await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {"status": "served", "served_at": datetime.now(timezone.utc)}},
    )


async def get_waiting_tickets(db, queue_id: str, limit: int = 20) -> list[dict]:
    cursor = db.tickets.find(
        {"queue_id": queue_id, "status": "waiting"},
        sort=[("ticket_number", 1)],
        limit=limit,
    )
    return [_to_dict(doc) async for doc in cursor]


async def get_currently_called_ticket(db, queue_id: str) -> dict | None:
    doc = await db.tickets.find_one({"queue_id": queue_id, "status": "called"})
    return _to_dict(doc) if doc else None
