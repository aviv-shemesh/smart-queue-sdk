from fastapi import APIRouter, Depends, Query
from app.database import get_db
from app.services import queue_service, ticket_service
from app.models.queue import QueueResponse
from app.models.ticket import JoinRequest, LeaveRequest, TicketResponse

router = APIRouter(prefix="/api/v1")


@router.get("/queues/{queue_id}", response_model=QueueResponse)
async def get_queue_status(queue_id: str, db=Depends(get_db)):
    return await queue_service.get_queue_status(db, queue_id)


@router.post("/queues/{queue_id}/join", response_model=TicketResponse, status_code=201)
async def join_queue(queue_id: str, body: JoinRequest, db=Depends(get_db)):
    return await ticket_service.join_queue(db, queue_id, body.customer_id, body.customer_name)


@router.delete("/queues/{queue_id}/leave")
async def leave_queue(queue_id: str, body: LeaveRequest, db=Depends(get_db)):
    await ticket_service.leave_queue(db, queue_id, body.customer_id)
    return {"success": True}


@router.get("/queues/{queue_id}/my-ticket", response_model=TicketResponse)
async def get_my_ticket(
    queue_id: str,
    customer_id: str = Query(...),
    db=Depends(get_db),
):
    return await ticket_service.get_my_ticket(db, queue_id, customer_id)
