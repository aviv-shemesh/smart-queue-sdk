from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from app.database import get_db
from app.middleware.admin_auth import require_admin

router = APIRouter(
    prefix="/api/v1/admin",
    dependencies=[Depends(require_admin)],
)

# Israel is UTC+3. All chart hours and "today" boundaries are expressed in
# local time so the dashboard matches the operator's clock.
_TZ_OFFSET = timedelta(hours=3)
# Any wait longer than this is a seed/testing artifact (ticket left waiting
# overnight, stale called_at from a restart, etc.) and is excluded from KPIs.
_MAX_PLAUSIBLE_WAIT_SECS = 7200   # 2 hours


@router.get("/analytics/summary")
async def analytics_summary(db=Depends(get_db)):
    now = datetime.now(timezone.utc)
    # "Today" in local time so the served-today count resets at local midnight.
    local_now = now + _TZ_OFFSET
    today_start_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_local - _TZ_OFFSET

    served_tickets = await db.tickets.find(
        {"status": "served", "served_at": {"$gte": today_start_utc}}
    ).to_list(length=None)

    served_today = len(served_tickets)

    wait_times = []
    for t in served_tickets:
        if t.get("called_at") and t.get("joined_at"):
            secs = (t["called_at"] - t["joined_at"]).total_seconds()
            # Skip negatives and multi-hour outliers caused by stale seed data
            # or tickets that sat in the queue overnight between test sessions.
            if 0 < secs <= _MAX_PLAUSIBLE_WAIT_SECS:
                wait_times.append(secs)

    avg_wait_seconds = round(sum(wait_times) / len(wait_times)) if wait_times else 0
    peak_wait_seconds = round(max(wait_times)) if wait_times else 0

    cancelled_today = await db.tickets.count_documents(
        {"status": "cancelled", "cancelled_at": {"$gte": today_start_utc}}
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


_BUSINESS_START_HOUR = 8   # charts start at 08:00 local time


@router.get("/queues/{queue_id}/analytics/hourly")
async def queue_hourly_analytics(queue_id: str, db=Depends(get_db)):
    now = datetime.now(timezone.utc)

    # Fixed 7-day window — never conditional. A conditional fallback was the
    # root cause of chart resets: switching from a larger window (7 days) to a
    # smaller one (24 h / today) the moment the first new ticket arrived caused
    # the dataset to shrink, collapsing the chart to a single point.
    # With a constant window, every join/leave/call-next only adds to existing
    # hour buckets; it can never remove them.
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
        # Convert UTC → local hour so chart labels match the operator's clock.
        local_h = (t["joined_at"] + _TZ_OFFSET).hour
        # Skip pre-business-hours buckets (seed artifacts and overnight tickets).
        if local_h < _BUSINESS_START_HOUR:
            continue
        waiting_by_hour[local_h] += 1
        if t.get("status") == "served" and t.get("called_at"):
            secs = (t["called_at"] - t["joined_at"]).total_seconds()
            if 0 < secs <= _MAX_PLAUSIBLE_WAIT_SECS:
                wait_secs_by_hour[local_h].append(secs)

    rows = []
    for h in sorted(waiting_by_hour.keys()):
        wt = wait_secs_by_hour[h]
        rows.append({
            "hour": f"{h:02d}:00",
            "waiting": waiting_by_hour[h],
            "waitTime": round(sum(wt) / len(wt) / 60) if wt else 0,
        })

    return rows
