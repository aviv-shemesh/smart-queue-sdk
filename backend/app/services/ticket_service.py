from datetime import datetime, timezone
from fastapi import HTTPException
from app.repositories import queue_repo, ticket_repo
from app.models.ticket import TicketResponse, CallNextResponse, WaitingTicketSummary


async def _build_ticket_response(db, ticket: dict, queue: dict) -> TicketResponse:
    position = await ticket_repo.count_tickets_ahead(db, ticket["queue_id"], ticket["ticket_number"])
    estimated_wait = position * queue["average_service_time_seconds"]
    return TicketResponse(
        ticket_id=ticket["id"],
        ticket_number=ticket["ticket_number"],
        status=ticket["status"],
        position=position,
        estimated_wait_seconds=estimated_wait,
    )


async def join_queue(db, queue_id: str, customer_id: str, customer_name: str) -> TicketResponse:
    queue = await queue_repo.get_queue(db, queue_id)
    if not queue:
        raise HTTPException(
            status_code=404,
            detail={"error": "QUEUE_NOT_FOUND", "message": "Queue not found."},
        )
    if queue["status"] != "open":
        raise HTTPException(
            status_code=409,
            detail={"error": "QUEUE_CLOSED", "message": "This queue is not accepting new tickets."},
        )
    existing = await ticket_repo.get_active_ticket(db, queue_id, customer_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": "ALREADY_IN_QUEUE", "message": "You already have an active ticket in this queue."},
        )
    ticket_number = await queue_repo.increment_ticket_counter(db, queue_id)
    ticket = await ticket_repo.create_ticket(db, queue_id, customer_id, customer_name, ticket_number)
    return await _build_ticket_response(db, ticket, queue)


async def leave_queue(db, queue_id: str, customer_id: str) -> None:
    ticket = await ticket_repo.get_active_ticket(db, queue_id, customer_id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail={"error": "NO_ACTIVE_TICKET", "message": "No active ticket found for this customer."},
        )
    await ticket_repo.cancel_ticket(db, ticket["id"])


async def get_my_ticket(db, queue_id: str, customer_id: str) -> TicketResponse:
    queue = await queue_repo.get_queue(db, queue_id)
    if not queue:
        raise HTTPException(
            status_code=404,
            detail={"error": "QUEUE_NOT_FOUND", "message": "Queue not found."},
        )
    ticket = await ticket_repo.get_active_ticket(db, queue_id, customer_id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail={"error": "NO_ACTIVE_TICKET", "message": "No active ticket found for this customer."},
        )
    return await _build_ticket_response(db, ticket, queue)


async def call_next(db, queue_id: str) -> CallNextResponse:
    queue = await queue_repo.get_queue(db, queue_id)
    if not queue:
        raise HTTPException(
            status_code=404,
            detail={"error": "QUEUE_NOT_FOUND", "message": "Queue not found."},
        )

    # Mark the previously called ticket as served and update the rolling average.
    # Guard: only include the duration when it falls within a plausible range.
    # Seed data creates a "called" ticket whose called_at is from server-startup
    # time; pressing Call Next hours (or days) later would feed an enormous
    # duration into the average and permanently corrupt it.  Any duration longer
    # than 5× the current average, or more than 1 hour, is treated as a stale
    # artefact and skipped — the ticket is still marked served.
    current_called = await ticket_repo.get_currently_called_ticket(db, queue_id)
    if current_called and current_called.get("called_at"):
        await ticket_repo.mark_ticket_served(db, current_called["id"])
        duration = int((datetime.now(timezone.utc) - current_called["called_at"]).total_seconds())
        max_plausible = max(queue["average_service_time_seconds"] * 5, 3600)
        if 0 < duration <= max_plausible:
            await queue_repo.update_rolling_average(db, queue_id, duration)

    # Get the next waiting ticket
    next_ticket = await ticket_repo.get_next_waiting_ticket(db, queue_id)
    if not next_ticket:
        raise HTTPException(
            status_code=404,
            detail={"error": "NO_WAITING_TICKETS", "message": "No customers are currently waiting."},
        )

    await ticket_repo.mark_ticket_called(db, next_ticket["id"])
    await queue_repo.update_now_serving(db, queue_id, next_ticket["ticket_number"])

    remaining = await db.tickets.count_documents({"queue_id": queue_id, "status": "waiting"})

    return CallNextResponse(
        called_ticket_number=next_ticket["ticket_number"],
        customer_name=next_ticket["customer_name"],
        remaining_waiting=remaining,
    )


async def get_waiting_list(db, queue_id: str) -> list[WaitingTicketSummary]:
    tickets = await ticket_repo.get_waiting_tickets(db, queue_id)
    now = datetime.now(timezone.utc)
    return [
        WaitingTicketSummary(
            ticket_number=t["ticket_number"],
            customer_name=t["customer_name"],
            position=i,
            waited_seconds=max(0, int((now - t["joined_at"]).total_seconds())),
        )
        for i, t in enumerate(tickets)
    ]
