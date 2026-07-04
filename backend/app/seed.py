"""
Auto-seed the database with realistic demo data on first startup.
Skips silently if any queues already exist.
"""
import random
from datetime import datetime, timezone, timedelta
from app.repositories import queue_repo

_NAMES = [
    "Alice Johnson",   "Bob Smith",       "Carol Davis",    "David Wilson",
    "Emma Brown",      "Frank Miller",    "Grace Taylor",   "Henry Anderson",
    "Iris Martinez",   "Jack Thompson",   "Kate Robinson",  "Liam Jackson",
    "Mia White",       "Noah Harris",     "Olivia Clark",   "Peter Lewis",
    "Quinn Walker",    "Rachel Hall",     "Samuel Young",   "Tina King",
    "Uma Scott",       "Victor Green",    "Wendy Adams",    "Xavier Baker",
    "Yara Nelson",     "Zoe Carter",      "Aaron Mitchell", "Bella Perez",
    "Carlos Roberts",  "Diana Turner",    "Ethan Moore",    "Fiona Evans",
    "George Hall",     "Hannah White",    "Ivan Cruz",      "Julia Scott",
    "Kevin Adams",     "Laura Nelson",    "Martin Baker",   "Nina Carter",
]

# Each queue has its own character:
#   avg_service   – average time to serve one customer (seconds)
#   min_wait/max_wait – realistic wait-time range for this type of venue (seconds)
#   served        – customers already served today
#   waiting       – customers currently in the waiting list
#   cancelled     – customers who left without being served today
#   history_hours – spread served tickets across this many past hours
_QUEUES = [
    {
        "name":          "Health Clinic",
        "avg_service":   600,    # 10 min per patient
        "min_wait":      480,    # 8 min minimum queue wait
        "max_wait":      2700,   # up to 45 min queue wait
        "served":        15,
        "waiting":       9,
        "cancelled":     2,
        "history_hours": 7,
    },
    {
        "name":          "Restaurant",
        "avg_service":   180,    # 3 min table allocation
        "min_wait":      90,     # 1.5 min minimum
        "max_wait":      900,    # up to 15 min during lunch rush
        "served":        22,
        "waiting":       6,
        "cancelled":     3,
        "history_hours": 4,
    },
    {
        "name":          "Coffee Shop",
        "avg_service":   90,     # 1.5 min per order
        "min_wait":      20,     # near-instant on quiet times
        "max_wait":      420,    # up to 7 min during morning rush
        "served":        31,
        "waiting":       2,
        "cancelled":     5,
        "history_hours": 6,
    },
    {
        "name":          "International Bank",
        "avg_service":   1200,   # 20 min per transaction
        "min_wait":      900,    # 15 min minimum
        "max_wait":      4800,   # up to 80 min
        "served":        5,
        "waiting":       3,
        "cancelled":     0,
        "history_hours": 8,
    },
    {
        "name":          "Pharmacy",
        "avg_service":   300,    # 5 min per prescription
        "min_wait":      120,    # 2 min minimum
        "max_wait":      1500,   # up to 25 min
        "served":        12,
        "waiting":       5,
        "cancelled":     2,
        "history_hours": 5,
    },
    {
        "name":          "Petah Tikva Municipality",
        "avg_service":   840,    # 14 min per resident — paperwork-heavy
        "min_wait":      1200,   # 20 min minimum (government pace)
        "max_wait":      5400,   # up to 90 min on busy days
        "served":        8,
        "waiting":       7,
        "cancelled":     3,
        "history_hours": 8,
    },
    {
        "name":          "Pilates Studio",
        "avg_service":   210,    # 3.5 min check-in / class booking
        "min_wait":      45,     # 45 sec minimum (quick desk)
        "max_wait":      720,    # up to 12 min before a popular class
        "served":        9,
        "waiting":       3,
        "cancelled":     1,
        "history_hours": 3,
    },
]


def _vary(seconds: int, pct: float = 0.2) -> int:
    d = max(5, int(seconds * pct))
    return max(10, seconds + random.randint(-d, d))


def _build_tickets(cfg: dict, queue_id: str, now: datetime, today_start: datetime):
    """
    Returns (tickets, now_serving_number, last_ticket_number, served_count).
    All ticket numbers are 1-based sequential in join order.
    """
    avg          = cfg["avg_service"]
    min_wait     = cfg["min_wait"]
    max_wait     = cfg["max_wait"]
    n_served     = cfg["served"]
    n_waiting    = cfg["waiting"]
    n_cancelled  = cfg["cancelled"]
    history_hours = cfg["history_hours"]

    total = n_served + n_cancelled + 1 + n_waiting
    # Build a non-repeating name pool large enough for all tickets
    pool = (_NAMES * ((total // len(_NAMES)) + 2))[:total]
    random.shuffle(pool)
    names = iter(pool)

    # How many hours of today are available?
    hours_today = max(0.5, min(history_hours, (now - today_start).total_seconds() / 3600))

    tickets: list[dict] = []
    ticket_number = 0

    # ── SERVED tickets ──────────────────────────────────────────────────────────
    # Distribute join times evenly from (hours_today) hours ago → ~55 min ago.
    span_min  = max(30, int(hours_today * 60) - 55)
    step_min  = span_min / max(n_served, 1)

    for i in range(n_served):
        ticket_number += 1
        offset_min = int(hours_today * 60) - int(step_min * i) + random.randint(-3, 3)
        offset_min = max(offset_min, 60)   # always at least 60 min ago

        joined_at = max(now - timedelta(minutes=offset_min), today_start + timedelta(minutes=2))

        wait_sec  = random.randint(min_wait, max_wait)
        called_at = joined_at + timedelta(seconds=wait_sec)

        svc_sec   = _vary(avg, 0.2)
        served_at = called_at + timedelta(seconds=svc_sec)

        # Clamp: served_at must be in the past
        if served_at >= now:
            served_at = now - timedelta(minutes=random.randint(2, 12))
            called_at = served_at - timedelta(seconds=_vary(avg, 0.15))

        tickets.append({
            "queue_id":      queue_id,
            "customer_id":   f"demo_{queue_id}_{ticket_number}",
            "customer_name": next(names),
            "ticket_number": ticket_number,
            "status":        "served",
            "joined_at":     joined_at,
            "called_at":     called_at,
            "served_at":     served_at,
            "cancelled_at":  None,
        })

    # ── CANCELLED tickets ───────────────────────────────────────────────────────
    for _ in range(n_cancelled):
        ticket_number += 1
        offset_min  = random.randint(15, max(20, int(hours_today * 60) - 10))
        joined_at   = max(now - timedelta(minutes=offset_min), today_start + timedelta(minutes=2))
        cancelled_at = min(joined_at + timedelta(minutes=random.randint(3, 15)), now - timedelta(minutes=1))
        tickets.append({
            "queue_id":      queue_id,
            "customer_id":   f"demo_{queue_id}_{ticket_number}",
            "customer_name": next(names),
            "ticket_number": ticket_number,
            "status":        "cancelled",
            "joined_at":     joined_at,
            "called_at":     None,
            "served_at":     None,
            "cancelled_at":  cancelled_at,
        })

    # ── CALLED ticket (currently being served) ──────────────────────────────────
    ticket_number += 1
    now_serving    = ticket_number
    elapsed_sec    = random.randint(30, int(avg * 0.65))
    called_at      = now - timedelta(seconds=elapsed_sec)
    joined_at      = max(called_at - timedelta(seconds=random.randint(min_wait, max_wait)),
                         today_start + timedelta(minutes=1))
    tickets.append({
        "queue_id":      queue_id,
        "customer_id":   f"demo_{queue_id}_{ticket_number}",
        "customer_name": next(names),
        "ticket_number": ticket_number,
        "status":        "called",
        "joined_at":     joined_at,
        "called_at":     called_at,
        "served_at":     None,
        "cancelled_at":  None,
    })

    # ── WAITING tickets ─────────────────────────────────────────────────────────
    # Lowest ticket number = longest waiting (joined earliest).
    for i in range(n_waiting):
        ticket_number += 1
        pos        = n_waiting - i          # n_waiting = oldest, 1 = most recent
        wait_ahead = avg * pos              # rough estimate of wait still ahead
        offset_min = int(wait_ahead / 60) + random.randint(1, 6)
        joined_at  = max(now - timedelta(minutes=offset_min), today_start + timedelta(minutes=1))
        tickets.append({
            "queue_id":      queue_id,
            "customer_id":   f"demo_{queue_id}_{ticket_number}",
            "customer_name": next(names),
            "ticket_number": ticket_number,
            "status":        "waiting",
            "joined_at":     joined_at,
            "called_at":     None,
            "served_at":     None,
            "cancelled_at":  None,
        })

    return tickets, now_serving, ticket_number, n_served


async def seed_demo_data(db) -> None:
    if await db.queues.count_documents({}) > 0:
        return

    now         = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    for cfg in _QUEUES:
        queue = await queue_repo.create_queue(db, cfg["name"], cfg["avg_service"])
        qid   = queue["id"]

        tickets, now_serving, last_num, served_count = _build_tickets(
            cfg, qid, now, today_start
        )

        if tickets:
            await db.tickets.insert_many(tickets)

        await db.queues.update_one(
            {"_id": qid},
            {"$set": {
                "next_ticket_number": last_num,
                "now_serving":        now_serving,
                "served_count":       served_count,
            }},
        )
