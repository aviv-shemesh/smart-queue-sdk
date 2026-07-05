from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from app.database import get_db
from app.middleware.admin_auth import require_admin

router = APIRouter(
    prefix="/api/v1/admin",
    dependencies=[Depends(require_admin)],
)


@router.get("/analytics/summary")
async def analytics_summary(db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    served_tickets = await db.tickets.find(
        {"status": "served", "served_at": {"$gte": today_start}}
    ).to_list(length=None)

    served_today = len(served_tickets)

    wait_times = []
    for t in served_tickets:
        if t.get("called_at") and t.get("joined_at"):
            secs = (t["called_at"] - t["joined_at"]).total_seconds()
            if secs >= 0:
                wait_times.append(secs)

    avg_wait_seconds = round(sum(wait_times) / len(wait_times)) if wait_times else 0
    peak_wait_seconds = round(max(wait_times)) if wait_times else 0

    cancelled_today = await db.tickets.count_documents(
        {"status": "cancelled", "cancelled_at": {"$gte": today_start}}
    )
    waiting_now = await db.tickets.count_documents({"status": "waiting"})
    total = served_today + cancelled_today + waiting_now
    abandonment_rate = round((cancelled_today / total) * 100, 1) if total > 0 else 0.0

    return {
        "served_today": served_today,
        "avg_wait_seconds": avg_wait_seconds,
        "peak_wait_seconds": peak_wait_seconds,
        "abandonment_rate_pct": abandonment_rate,
    }


@router.get("/queues/{queue_id}/analytics/hourly")
async def queue_hourly_analytics(queue_id: str, db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    tickets = await db.tickets.find({
        "queue_id": queue_id,
        "joined_at": {"$gte": today_start},
    }).to_list(length=None)

    # Fall back to the last 7 days if there is no data for today
    # (covers demo / seeded data that was inserted on a previous calendar day)
    if not tickets:
        window_start = now - timedelta(days=7)
        tickets = await db.tickets.find({
            "queue_id": queue_id,
            "joined_at": {"$gte": window_start},
        }).to_list(length=None)

    if not tickets:
        return []

    waiting_by_hour: defaultdict[int, int] = defaultdict(int)
    wait_secs_by_hour: defaultdict[int, list] = defaultdict(list)

    for t in tickets:
        h = t["joined_at"].hour
        waiting_by_hour[h] += 1
        if t.get("status") == "served" and t.get("called_at"):
            secs = (t["called_at"] - t["joined_at"]).total_seconds()
            if secs >= 0:
                wait_secs_by_hour[h].append(secs)

    rows = []
    for h in sorted(waiting_by_hour.keys()):
        wt = wait_secs_by_hour[h]
        rows.append({
            "hour": f"{h:02d}:00",
            "waiting": waiting_by_hour[h],
            "waitTime": round(sum(wt) / len(wt) / 60) if wt else 0,
        })

    return rows
