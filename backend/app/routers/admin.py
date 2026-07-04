from fastapi import APIRouter, Depends
from app.database import get_db
from app.middleware.admin_auth import require_admin
from app.services import queue_service, ticket_service
from app.models.queue import QueueCreate, QueueResponse, QueueStatusUpdate
from app.models.ticket import CallNextResponse, WaitingTicketSummary

router = APIRouter(
    prefix="/api/v1/admin",
    dependencies=[Depends(require_admin)],
)


@router.post("/queues", response_model=QueueResponse, status_code=201)
async def create_queue(body: QueueCreate, db=Depends(get_db)):
    return await queue_service.create_queue(db, body.name, body.average_service_time_seconds)


@router.get("/queues", response_model=list[QueueResponse])
async def list_queues(db=Depends(get_db)):
    return await queue_service.list_open_queues(db)


@router.patch("/queues/{queue_id}/status", response_model=QueueResponse)
async def update_status(queue_id: str, body: QueueStatusUpdate, db=Depends(get_db)):
    return await queue_service.update_status(db, queue_id, body.status)


@router.post("/queues/{queue_id}/call-next", response_model=CallNextResponse)
async def call_next(queue_id: str, db=Depends(get_db)):
    return await ticket_service.call_next(db, queue_id)


@router.get("/queues/{queue_id}/waiting-list", response_model=list[WaitingTicketSummary])
async def waiting_list(queue_id: str, db=Depends(get_db)):
    return await ticket_service.get_waiting_list(db, queue_id)
