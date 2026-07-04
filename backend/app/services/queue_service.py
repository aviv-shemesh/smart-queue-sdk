from fastapi import HTTPException
from app.repositories import queue_repo, ticket_repo
from app.models.queue import QueueResponse


async def _build_response(db, queue: dict) -> QueueResponse:
    waiting_count = await db.tickets.count_documents({
        "queue_id": queue["id"],
        "status": "waiting",
    })
    return QueueResponse(
        id=queue["id"],
        name=queue["name"],
        status=queue["status"],
        now_serving=queue["now_serving"],
        waiting_count=waiting_count,
        average_service_time_seconds=queue["average_service_time_seconds"],
        created_at=queue["created_at"],
    )


async def create_queue(db, name: str, avg_service_time: int) -> QueueResponse:
    queue = await queue_repo.create_queue(db, name, avg_service_time)
    return await _build_response(db, queue)


async def get_queue_status(db, queue_id: str) -> QueueResponse:
    queue = await queue_repo.get_queue(db, queue_id)
    if not queue:
        raise HTTPException(
            status_code=404,
            detail={"error": "QUEUE_NOT_FOUND", "message": "Queue not found."},
        )
    return await _build_response(db, queue)


async def list_open_queues(db) -> list[QueueResponse]:
    queues = await queue_repo.get_all_open_queues(db)
    return [await _build_response(db, q) for q in queues]


async def update_status(db, queue_id: str, new_status: str) -> QueueResponse:
    if new_status not in ("open", "paused", "closed"):
        raise HTTPException(
            status_code=400,
            detail={"error": "INVALID_STATUS", "message": "Status must be open, paused, or closed."},
        )
    queue = await queue_repo.update_queue_status(db, queue_id, new_status)
    if not queue:
        raise HTTPException(
            status_code=404,
            detail={"error": "QUEUE_NOT_FOUND", "message": "Queue not found."},
        )
    return await _build_response(db, queue)
