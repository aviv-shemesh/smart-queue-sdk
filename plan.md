# Smart Queue SDK — Implementation Checklist

**Version:** MVP (v4 — No Docker)  
**Updated:** 2026-06-16

---

## How to use this document

Work through the phases in order. Each task is a checkbox. Check it off as you complete it.  
At the end of each phase there is a **Verify** section — do not move to the next phase until every verification step passes.

---

## Phase 1 — Environment & Folder Structure

**Goal:** All tools installed, project folders exist, MongoDB Atlas is connected.

### 1.1 Install prerequisites

- [x] ~~Install Docker Desktop~~ — not required
- [x] Python 3.12.1 — already installed
- [x] Android Studio — already installed
- [x] Node.js v26 — already installed
- [x] Git 2.50.1 — already installed
- [ ] Create a MongoDB Atlas account (free) at [https://cloud.mongodb.com](https://cloud.mongodb.com)

### 1.2 Create the top-level folder structure

Run these commands from the project root:

```
mkdir backend
mkdir sdk
mkdir demo-app
mkdir admin-portal
mkdir docs
```

The final layout will be:

```
smart-queue-sdk/
├── backend/
├── sdk/
├── demo-app/
├── admin-portal/
├── docs/
└── README.md
```

### 1.3 Set up Python virtual environment

Run from the project root. You will activate this venv every time you work on the backend.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

Your terminal prompt should now show `(venv)`. To deactivate later: `deactivate`.

### 1.4 Set up MongoDB Atlas

MongoDB Atlas is a free cloud database — no local installation needed.

**Step 1 — Create a free cluster:**
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up / log in
2. Click **"Create"** → choose **M0 (Free)** → pick any region → click **"Create Deployment"**
3. When prompted, create a **database user**: pick a username and password, save both somewhere

**Step 2 — Allow network access:**
1. In the left sidebar click **"Network Access"**
2. Click **"Add IP Address"** → click **"Allow Access from Anywhere"** (0.0.0.0/0) → Confirm
   *(For a real production app you would restrict this — fine for MVP development)*

**Step 3 — Get the connection string:**
1. In the left sidebar click **"Database"** → click **"Connect"** on your cluster
2. Choose **"Drivers"** → Driver: Python, Version: 3.12 or later
3. Copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with the credentials you created in Step 1

**Step 4 — Verify the connection:**

Install `pymongo` temporarily just for this check:
```bash
pip install pymongo[srv]
python3 -c "
import pymongo
client = pymongo.MongoClient('YOUR_CONNECTION_STRING_HERE')
client.admin.command('ping')
print('Connected to MongoDB Atlas successfully')
client.close()
"
```

### Verify Phase 1 complete

- [ ] `source venv/bin/activate` shows `(venv)` in the prompt
- [ ] Python connection test prints `Connected to MongoDB Atlas successfully`
- [ ] All project folders exist (`backend/`, `sdk/`, `demo-app/`, `admin-portal/`, `docs/`)

---

## Phase 2 — FastAPI Backend: Project Setup

**Goal:** FastAPI project runs, `/health` endpoint returns 200, MongoDB connected.

### 2.1 Create the backend folder structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── database.py
├── tests/
│   └── __init__.py
├── requirements.txt
└── .env
```

Create each folder and empty `__init__.py` files.

### 2.2 Create `backend/requirements.txt`

```
fastapi==0.110.0
uvicorn[standard]==0.29.0
motor==3.4.0
pydantic==2.7.0
pydantic-settings==2.2.1
python-dotenv==1.0.1
pytest==8.1.1
pytest-asyncio==0.23.6
httpx==0.27.0
```

### 2.3 Create `backend/.env`

Paste your Atlas connection string from Phase 1.4 as `MONGO_URL`.  
For tests, use the same Atlas cluster but a different database name so test data never touches your real data.

```
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_TEST_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=smartqueue
TEST_DB_NAME=smartqueue_test
ADMIN_SECRET=dev-admin-secret-change-in-prod
DEFAULT_SERVICE_TIME_SECONDS=300
```

Create `backend/.env.example` with placeholder values (safe to commit — never commit `.env` itself):

```
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_TEST_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=smartqueue
TEST_DB_NAME=smartqueue_test
ADMIN_SECRET=change-this-secret
DEFAULT_SERVICE_TIME_SECONDS=300
```

Add `.env` to `.gitignore`:

```bash
echo ".env" >> ../.gitignore
echo "venv/" >> ../.gitignore
```

### 2.4 Create `backend/app/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongo_url: str
    mongo_test_url: str
    db_name: str = "smartqueue"
    test_db_name: str = "smartqueue_test"
    admin_secret: str
    default_service_time_seconds: int = 300

    class Config:
        env_file = ".env"

settings = Settings()
```

### 2.5 Create `backend/app/database.py`

```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None

def get_client() -> AsyncIOMotorClient:
    return client

def get_db():
    return client[settings.db_name]

async def connect():
    global client
    client = AsyncIOMotorClient(settings.mongo_url)

async def disconnect():
    client.close()
```

### 2.6 Create `backend/app/main.py`

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import connect, disconnect

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    yield
    await disconnect()

app = FastAPI(title="Smart Queue API", version="1.0.0", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### 2.7 Install dependencies and start the backend

Make sure your venv is active (`source venv/bin/activate`), then:

```bash
cd backend
pip install -r requirements.txt
```

Start the backend with auto-reload (restarts automatically when you save a file):

```bash
uvicorn app.main:app --reload --port 8000
```

Leave this terminal open while you work. The output should end with:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Open a second terminal for all other commands going forward.

### Verify Phase 2 complete

- [ ] `uvicorn app.main:app --reload --port 8000` starts with no errors
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] `http://localhost:8000/docs` opens the Swagger UI in a browser
- [ ] Backend terminal shows a `GET /health` log line after the curl call

---

## Phase 3 — MongoDB Indexes & Pydantic Models

**Goal:** Database indexes are in place; all Pydantic request/response models are defined.

### 3.1 Create MongoDB indexes

Create `backend/app/database.py` — add an `init_indexes()` function and call it during startup.

Add to `database.py`:

```python
async def init_indexes():
    db = get_db()
    # tickets indexes
    await db.tickets.create_index([("queue_id", 1), ("status", 1)])
    await db.tickets.create_index([("queue_id", 1), ("customer_id", 1), ("status", 1)])
    await db.tickets.create_index([("queue_id", 1), ("ticket_number", 1)])
    # queues index
    await db.queues.create_index([("status", 1)])
```

Update the `lifespan` function in `main.py` to call `await init_indexes()` after `await connect()`.

### 3.2 Create queue Pydantic models

Create `backend/app/models/queue.py`:

```
backend/app/models/
├── __init__.py
├── queue.py
└── ticket.py
```

`queue.py` must define:

- `QueueCreate` — request body for creating a queue
  - `name: str`
  - `average_service_time_seconds: int = 300`

- `QueueResponse` — returned by all queue endpoints
  - `id: str`
  - `name: str`
  - `status: str`  (`"open"` | `"paused"` | `"closed"`)
  - `now_serving: int`
  - `waiting_count: int`
  - `average_service_time_seconds: int`
  - `created_at: datetime`

- `QueueStatusUpdate` — request body for PATCH status
  - `status: str`

- `ErrorResponse`
  - `error: str`
  - `message: str`

Use `model_config = ConfigDict(populate_by_name=True)` and map `_id` → `id` using a validator or `alias`.

### 3.3 Create ticket Pydantic models

`ticket.py` must define:

- `JoinRequest`
  - `customer_id: str`
  - `customer_name: str`

- `LeaveRequest`
  - `customer_id: str`

- `TicketResponse` — returned by join and polling
  - `ticket_id: str`
  - `ticket_number: int`
  - `status: str`  (`"waiting"` | `"called"` | `"served"` | `"cancelled"`)
  - `position: int`
  - `estimated_wait_seconds: int`

- `WaitingTicketSummary` — used in admin waiting-list
  - `ticket_number: int`
  - `customer_name: str`
  - `position: int`
  - `waited_seconds: int`

- `CallNextResponse`
  - `called_ticket_number: int`
  - `customer_name: str`
  - `remaining_waiting: int`

### Verify Phase 3 complete

- [ ] `from app.models.queue import QueueCreate, QueueResponse` imports without error
- [ ] `from app.models.ticket import JoinRequest, TicketResponse` imports without error
- [ ] Run this one-liner to confirm indexes exist (venv active, from `backend/`):
  ```bash
  python3 -c "
  import asyncio, motor.motor_asyncio
  from app.config import settings
  async def check():
      c = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_url)
      idx = await c[settings.db_name].tickets.index_information()
      print(list(idx.keys()))
      c.close()
  asyncio.run(check())
  "
  ```
  Output should show 4 entries (1 default `_id` index + 3 created indexes)
- [ ] Swagger UI at `/docs` still loads

---

## Phase 4 — Backend Repository Layer

**Goal:** All direct MongoDB operations are implemented as async functions in repository modules.

### 4.1 Create the repository folder

```
backend/app/repositories/
├── __init__.py
├── queue_repo.py
└── ticket_repo.py
```

### 4.2 Implement `queue_repo.py`

This file contains only database access — no business logic.

Functions to implement:

```python
async def create_queue(db, name: str, avg_service_time: int) -> dict:
    # Insert a new queue document
    # Initial values: status="open", now_serving=0, next_ticket_number=0,
    #                 served_count=0, average_service_time_seconds=avg_service_time
    # Return the inserted document (with _id as string)

async def get_queue(db, queue_id: str) -> dict | None:
    # Find queue by ObjectId, return None if not found

async def get_all_open_queues(db) -> list[dict]:
    # Find all queues where status != "closed"

async def update_queue_status(db, queue_id: str, status: str) -> dict | None:
    # Set queue.status to the new value, return updated document

async def increment_ticket_counter(db, queue_id: str) -> int:
    # Atomic $inc on next_ticket_number
    # Return the NEW next_ticket_number value (this becomes the new ticket's number)

async def update_now_serving(db, queue_id: str, ticket_number: int) -> None:
    # Set queue.now_serving = ticket_number

async def update_rolling_average(db, queue_id: str, service_duration_seconds: int) -> None:
    # Recalculate average_service_time_seconds using served_count
    # Formula: new_avg = (old_avg * served_count + duration) / (served_count + 1)
    # Also increment served_count by 1
```

### 4.3 Implement `ticket_repo.py`

Functions to implement:

```python
async def create_ticket(db, queue_id: str, customer_id: str,
                        customer_name: str, ticket_number: int) -> dict:
    # Insert ticket with status="waiting", joined_at=datetime.utcnow()
    # Return inserted document

async def get_active_ticket(db, queue_id: str, customer_id: str) -> dict | None:
    # Find ticket where queue_id matches, customer_id matches,
    # and status in ("waiting", "called")

async def get_ticket_by_id(db, ticket_id: str) -> dict | None:
    # Find by _id

async def cancel_ticket(db, ticket_id: str) -> None:
    # Set status="cancelled", cancelled_at=datetime.utcnow()

async def count_tickets_ahead(db, queue_id: str, ticket_number: int) -> int:
    # COUNT where queue_id=queue_id, status="waiting", ticket_number < given number

async def get_next_waiting_ticket(db, queue_id: str) -> dict | None:
    # Find ticket with status="waiting", lowest ticket_number
    # Sort by ticket_number ascending, limit 1

async def mark_ticket_called(db, ticket_id: str) -> None:
    # Set status="called", called_at=datetime.utcnow()

async def mark_ticket_served(db, ticket_id: str) -> None:
    # Set status="served", served_at=datetime.utcnow()

async def get_waiting_tickets(db, queue_id: str, limit: int = 20) -> list[dict]:
    # Find all waiting tickets for queue, sorted by ticket_number asc

async def get_currently_called_ticket(db, queue_id: str) -> dict | None:
    # Find ticket with status="called" for this queue
```

### Verify Phase 4 complete

- [ ] Both repo files import without error
- [ ] Manually test from a Python shell (venv active, from `backend/`) that `create_queue` inserts a document and `get_queue` retrieves it:
  ```bash
  python3 -c "
  import asyncio
  from app.config import settings
  from app.database import connect, get_db
  from app.repositories.queue_repo import create_queue, get_queue
  async def test():
      await connect()
      db = get_db()
      q = await create_queue(db, 'Test Queue', 300)
      print('Created:', q)
      fetched = await get_queue(db, q['id'])
      print('Fetched:', fetched)
  asyncio.run(test())
  "
  ```
- [ ] No raw MongoDB calls exist outside of `repositories/` — all other code calls repo functions

---

## Phase 5 — Backend Service Layer

**Goal:** Business logic is encapsulated in service functions. Services call repositories, calculate positions and wait times, and enforce rules.

### 5.1 Create the services folder

```
backend/app/services/
├── __init__.py
├── queue_service.py
└── ticket_service.py
```

### 5.2 Implement `queue_service.py`

```python
# queue_service.py
# All functions take (db) as first arg and return Pydantic models or raise HTTPException

async def create_queue(db, name: str, avg_service_time: int) -> QueueResponse:
    # Call queue_repo.create_queue
    # Return QueueResponse

async def get_queue_status(db, queue_id: str) -> QueueResponse:
    # Call queue_repo.get_queue — raise 404 if not found
    # Count waiting tickets via ticket_repo.get_waiting_tickets and len()
    # Return QueueResponse with waiting_count filled in

async def list_open_queues(db) -> list[QueueResponse]:
    # Call queue_repo.get_all_open_queues
    # For each queue, fetch waiting count
    # Return list of QueueResponse

async def update_status(db, queue_id: str, new_status: str) -> QueueResponse:
    # Validate new_status is one of "open", "paused", "closed"
    # Call queue_repo.update_queue_status — raise 404 if not found
    # Return updated QueueResponse
```

### 5.3 Implement `ticket_service.py`

This is the most important service. Implement carefully.

```python
async def join_queue(db, queue_id: str, customer_id: str, customer_name: str) -> TicketResponse:
    # 1. Get queue — raise 404 if not found
    # 2. If queue.status != "open" — raise 409 with error code "QUEUE_CLOSED"
    # 3. Check if customer already has active ticket — raise 409 with "ALREADY_IN_QUEUE"
    # 4. Get new ticket_number via queue_repo.increment_ticket_counter
    # 5. Create ticket via ticket_repo.create_ticket
    # 6. Calculate position: count_tickets_ahead (will be 0 if first to join, after increment)
    #    NOTE: position = number of waiting tickets with ticket_number < new ticket_number
    # 7. Calculate estimated_wait = position * queue.average_service_time_seconds
    # 8. Return TicketResponse

async def leave_queue(db, queue_id: str, customer_id: str) -> None:
    # 1. Find active ticket for this customer in this queue
    # 2. If not found — raise 404 with "NO_ACTIVE_TICKET"
    # 3. Cancel it via ticket_repo.cancel_ticket

async def get_my_ticket(db, queue_id: str, customer_id: str) -> TicketResponse:
    # 1. Get queue — raise 404 if not found
    # 2. Find active ticket — raise 404 with "NO_ACTIVE_TICKET" if not found
    # 3. Calculate current position via count_tickets_ahead
    # 4. Calculate estimated_wait = position * queue.average_service_time_seconds
    # 5. Return TicketResponse (this is the polling endpoint — called every 10s by SDK)

async def call_next(db, queue_id: str) -> CallNextResponse:
    # 1. Get queue — raise 404 if not found
    # 2. Find the currently called ticket (if any) — mark it as served
    #    Calculate how long it was in "called" state → pass to queue_repo.update_rolling_average
    # 3. Find next waiting ticket via ticket_repo.get_next_waiting_ticket
    #    If none — raise 404 with "NO_WAITING_TICKETS"
    # 4. Mark it as called via ticket_repo.mark_ticket_called
    # 5. Update queue.now_serving via queue_repo.update_now_serving
    # 6. Count remaining waiting tickets
    # 7. Return CallNextResponse

async def get_waiting_list(db, queue_id: str) -> list[WaitingTicketSummary]:
    # 1. Get all waiting tickets for queue (ordered by ticket_number)
    # 2. For each ticket, calculate:
    #    - position (its index in the list + 1)
    #    - waited_seconds = (utcnow - ticket.joined_at).seconds
    # 3. Return list of WaitingTicketSummary
```

### Verify Phase 5 complete

- [ ] `from app.services.queue_service import create_queue` imports without error
- [ ] `from app.services.ticket_service import join_queue` imports without error
- [ ] Business logic functions do not import from `motor` directly — only from repositories
- [ ] Edge cases handled: joining closed queue raises `HTTPException`, joining twice raises `HTTPException`

---

## Phase 6 — REST API Routes

**Goal:** All endpoints from the API contract are wired up and reachable via HTTP.

### 6.1 Create router files

```
backend/app/routers/
├── __init__.py
├── queues.py
└── admin.py
```

### 6.2 Create `backend/app/middleware/admin_auth.py`

```
backend/app/middleware/
├── __init__.py
└── admin_auth.py
```

`admin_auth.py` implements a FastAPI dependency:

```python
from fastapi import Header, HTTPException
from app.config import settings

async def require_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=401, detail={"error": "UNAUTHORIZED", "message": "Invalid admin secret"})
```

### 6.3 Implement `routers/queues.py`

Register an `APIRouter` with prefix `/api/v1`. Implement:

```
GET  /queues/{queue_id}
     → calls queue_service.get_queue_status
     → returns QueueResponse

POST /queues/{queue_id}/join
     → body: JoinRequest
     → calls ticket_service.join_queue
     → returns TicketResponse  (HTTP 201)

DELETE /queues/{queue_id}/leave
     → body: LeaveRequest
     → calls ticket_service.leave_queue
     → returns {"success": True}

GET  /queues/{queue_id}/my-ticket?customer_id={uuid}
     → calls ticket_service.get_my_ticket
     → returns TicketResponse
```

Each route must:
- Get `db` via `Depends(get_db)`
- Wrap service call in try/except and re-raise `HTTPException` as-is
- Use the `ErrorResponse` Pydantic model in `responses={409: {"model": ErrorResponse}}`

### 6.4 Implement `routers/admin.py`

All routes use `Depends(require_admin)`. Implement:

```
POST  /admin/queues
      → body: QueueCreate
      → calls queue_service.create_queue
      → returns QueueResponse  (HTTP 201)

GET   /admin/queues
      → calls queue_service.list_open_queues
      → returns list[QueueResponse]

PATCH /admin/queues/{queue_id}/status
      → body: QueueStatusUpdate
      → calls queue_service.update_status
      → returns QueueResponse

POST  /admin/queues/{queue_id}/call-next
      → calls ticket_service.call_next
      → returns CallNextResponse

GET   /admin/queues/{queue_id}/waiting-list
      → calls ticket_service.get_waiting_list
      → returns list[WaitingTicketSummary]
```

### 6.5 Register routers in `main.py`

```python
from app.routers import queues, admin

app.include_router(queues.router)
app.include_router(admin.router)
```

### Verify Phase 6 complete

Test each endpoint with `curl`. Replace `<queue_id>` with the actual ID returned by create.

```bash
# Create a queue (admin)
curl -X POST http://localhost:8000/api/v1/admin/queues \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: dev-admin-secret-change-in-prod" \
  -d '{"name": "Test Queue", "average_service_time_seconds": 120}'
# Expected: 201 with id, name, status="open"

# Get queue status (public)
curl http://localhost:8000/api/v1/queues/<queue_id>
# Expected: 200 with waiting_count=0

# Join the queue
curl -X POST http://localhost:8000/api/v1/queues/<queue_id>/join \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "test-uuid-001", "customer_name": "Alice"}'
# Expected: 201 with ticket_number=1, position=0

# Join again with same customer (should fail)
curl -X POST http://localhost:8000/api/v1/queues/<queue_id>/join \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "test-uuid-001", "customer_name": "Alice"}'
# Expected: 409 with error="ALREADY_IN_QUEUE"

# Poll my ticket position
curl "http://localhost:8000/api/v1/queues/<queue_id>/my-ticket?customer_id=test-uuid-001"
# Expected: 200 with position=0, status="waiting"

# Get waiting list (admin)
curl http://localhost:8000/api/v1/admin/queues/<queue_id>/waiting-list \
  -H "X-Admin-Secret: dev-admin-secret-change-in-prod"
# Expected: list with 1 ticket

# Call next (admin)
curl -X POST http://localhost:8000/api/v1/admin/queues/<queue_id>/call-next \
  -H "X-Admin-Secret: dev-admin-secret-change-in-prod"
# Expected: called_ticket_number=1, remaining_waiting=0

# Poll again — status should now be "called"
curl "http://localhost:8000/api/v1/queues/<queue_id>/my-ticket?customer_id=test-uuid-001"
# Expected: status="called", position=0

# Leave the queue
curl -X DELETE http://localhost:8000/api/v1/queues/<queue_id>/leave \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "test-uuid-002"}'
# Expected: 404 (test-uuid-002 has no ticket — correct behavior)
```

- [ ] All curl commands above return the expected responses
- [ ] Swagger UI at `/docs` shows all routes

---

## Phase 7 — Backend Tests

**Goal:** Automated tests confirm every endpoint works correctly.

### 7.1 Create `backend/tests/conftest.py`

```python
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
from app.main import app
from app.config import settings
import app.database as db_module

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    db_module.client = AsyncIOMotorClient(settings.mongo_test_url)
    db = db_module.client[settings.test_db_name]
    yield db
    await db_module.client.drop_database(settings.test_db_name)
    db_module.client.close()

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
def admin_headers():
    return {"X-Admin-Secret": settings.admin_secret}
```

### 7.2 Create `backend/tests/test_queues.py`

Write tests for:

- `test_create_queue_success` — POST `/admin/queues` with valid body returns 201 and queue id
- `test_create_queue_unauthorized` — POST `/admin/queues` without secret returns 401
- `test_get_queue_not_found` — GET `/queues/nonexistent` returns 404
- `test_get_queue_returns_waiting_count` — create queue, join, get queue → waiting_count=1
- `test_update_status_to_paused` — PATCH status returns updated status

### 7.3 Create `backend/tests/test_tickets.py`

Write tests for:

- `test_join_queue_success` — returns ticket_number=1, position=0
- `test_join_closed_queue` — returns 409 QUEUE_CLOSED
- `test_join_twice_same_customer` — returns 409 ALREADY_IN_QUEUE
- `test_leave_queue_success` — join then leave, then poll returns 404
- `test_leave_queue_no_ticket` — leave without joining returns 404
- `test_poll_position_updates` — join two customers, poll second customer → position=1
- `test_poll_no_ticket` — GET my-ticket without joining returns 404

### 7.4 Create `backend/tests/test_admin.py`

Write tests for:

- `test_call_next_success` — join, call-next → called_ticket_number=1
- `test_call_next_empty_queue` — call-next on empty queue returns 404
- `test_waiting_list_order` — join 3 customers, waiting-list returns them in order
- `test_waiting_list_excludes_called` — call-next then get waiting-list → only remaining

### 7.5 Run the tests

Make sure your venv is active and you are in the `backend/` folder:

```bash
source venv/bin/activate   # if not already active
cd backend
pytest tests/ -v
```

Tests connect to `MONGO_TEST_URL` and use the `smartqueue_test` database, which is dropped and recreated automatically between test runs by the `conftest.py` fixture. Your real `smartqueue` database is never touched by tests.

### Verify Phase 7 complete

- [ ] `pytest tests/ -v` runs with no failures
- [ ] All 15+ test functions pass (green)
- [ ] Test output shows no deprecation warnings

---

## Phase 8 — Android SDK: Project Setup

**Goal:** Android library module builds to `.aar` with all dependencies available.

### 8.1 Create the Android SDK project

1. Open Android Studio
2. Create a new project: **No Activity**, package `com.smartqueue.sdk`, language Kotlin, min SDK 26
3. When the project is created, the default `app/` module will be present — **rename it** to `sdk`:
   - In `settings.gradle.kts` change `include(":app")` to `include(":sdk", ":demo-app")`
   - Rename the `app/` folder to `sdk/`
4. Create a second module `demo-app` as an **Empty Views Activity** (for Phase 10)

### 8.2 Create the SDK folder structure

```
sdk/src/main/kotlin/com/smartqueue/sdk/
├── SmartQueueSDK.kt
├── SmartQueueConfig.kt
├── api/
│   ├── SmartQueueApiService.kt
│   ├── NetworkClient.kt
│   └── dto/
│       ├── QueueStatusDto.kt
│       ├── JoinRequestDto.kt
│       ├── JoinResponseDto.kt
│       ├── LeaveRequestDto.kt
│       ├── TicketResponseDto.kt
│       └── SuccessResponseDto.kt
├── models/
│   ├── QueueStatus.kt
│   ├── QueueTicket.kt
│   └── SmartQueueResult.kt
└── internal/
    ├── CustomerIdManager.kt
    └── ErrorMapper.kt
```

Create each folder and empty `.kt` files for now.

### 8.3 Configure `sdk/build.gradle.kts`

```kotlin
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.23"
}

android {
    namespace = "com.smartqueue.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 26
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release { isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("io.mockk:mockk:1.13.10")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
}
```

Create `sdk/consumer-rules.pro` (can be empty for MVP).

### Verify Phase 8 complete

- [ ] `./gradlew :sdk:assembleDebug` completes with `BUILD SUCCESSFUL`
- [ ] No unresolved dependency errors
- [ ] The `sdk/` module appears in Android Studio's project view

---

## Phase 9 — SDK: Models

**Goal:** All public-facing Kotlin data classes and sealed classes are defined.

### 9.1 Implement `SmartQueueConfig.kt`

```kotlin
package com.smartqueue.sdk

data class SmartQueueConfig(
    val baseUrl: String,
    val customerId: String? = null,   // null = auto-generate on first launch
    val enableLogging: Boolean = false
)
```

### 9.2 Implement `models/SmartQueueResult.kt`

```kotlin
package com.smartqueue.sdk.models

sealed class SmartQueueResult<out T> {
    data class Success<T>(val data: T) : SmartQueueResult<T>()
    data class Error(val code: String, val message: String) : SmartQueueResult<Nothing>()
}
```

### 9.3 Implement `models/QueueStatus.kt`

```kotlin
package com.smartqueue.sdk.models

data class QueueStatus(
    val id: String,
    val name: String,
    val status: String,       // "open" | "paused" | "closed"
    val nowServing: Int,
    val waitingCount: Int,
    val averageServiceTimeSeconds: Int
)
```

### 9.4 Implement `models/QueueTicket.kt`

```kotlin
package com.smartqueue.sdk.models

data class QueueTicket(
    val ticketId: String,
    val ticketNumber: Int,
    val status: String,             // "waiting" | "called" | "served" | "cancelled"
    val position: Int,
    val estimatedWaitSeconds: Int
)
```

### 9.5 Implement DTO classes under `api/dto/`

Each DTO mirrors a JSON response from the backend. Use `@SerializedName` (Gson):

- `QueueStatusDto` — matches `QueueResponse` JSON shape
- `JoinRequestDto(customer_id, customer_name)`
- `JoinResponseDto(ticket_id, ticket_number, position, estimated_wait_seconds)`
- `LeaveRequestDto(customer_id)`
- `TicketResponseDto(ticket_id, ticket_number, status, position, estimated_wait_seconds)`
- `SuccessResponseDto(success: Boolean)`

### Verify Phase 9 complete

- [ ] `./gradlew :sdk:compileDebugKotlin` completes with no errors
- [ ] All model files are in the `com.smartqueue.sdk.models` package
- [ ] All DTO files are in the `com.smartqueue.sdk.api.dto` package

---

## Phase 10 — SDK: Network Layer

**Goal:** Retrofit interface defined; HTTP calls can be made to the backend.

### 10.1 Implement `api/SmartQueueApiService.kt`

```kotlin
package com.smartqueue.sdk.api

import com.smartqueue.sdk.api.dto.*
import retrofit2.http.*

interface SmartQueueApiService {

    @GET("api/v1/queues/{queueId}")
    suspend fun getQueueStatus(
        @Path("queueId") queueId: String
    ): QueueStatusDto

    @POST("api/v1/queues/{queueId}/join")
    suspend fun joinQueue(
        @Path("queueId") queueId: String,
        @Body body: JoinRequestDto
    ): JoinResponseDto

    @HTTP(method = "DELETE", path = "api/v1/queues/{queueId}/leave", hasBody = true)
    suspend fun leaveQueue(
        @Path("queueId") queueId: String,
        @Body body: LeaveRequestDto
    ): SuccessResponseDto

    @GET("api/v1/queues/{queueId}/my-ticket")
    suspend fun getMyTicket(
        @Path("queueId") queueId: String,
        @Query("customer_id") customerId: String
    ): TicketResponseDto
}
```

### 10.2 Implement `api/NetworkClient.kt`

```kotlin
package com.smartqueue.sdk.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

internal object NetworkClient {

    private var retrofit: Retrofit? = null

    fun init(baseUrl: String, enableLogging: Boolean) {
        val logging = HttpLoggingInterceptor().apply {
            level = if (enableLogging)
                HttpLoggingInterceptor.Level.BODY
            else
                HttpLoggingInterceptor.Level.NONE
        }
        val okHttp = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttp)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun api(): SmartQueueApiService {
        return retrofit?.create(SmartQueueApiService::class.java)
            ?: error("SmartQueueSDK not initialized. Call SmartQueueSDK.init() first.")
    }
}
```

### Verify Phase 10 complete

- [ ] `./gradlew :sdk:compileDebugKotlin` passes with no errors
- [ ] `NetworkClient.api()` returns a non-null instance when `init()` has been called

---

## Phase 11 — SDK: Internal Utilities

**Goal:** Customer ID persistence and HTTP error mapping are implemented.

### 11.1 Implement `internal/CustomerIdManager.kt`

```kotlin
package com.smartqueue.sdk.internal

import android.content.Context
import java.util.UUID

internal object CustomerIdManager {

    private const val PREF_NAME = "smartqueue_prefs"
    private const val KEY_CUSTOMER_ID = "customer_id"

    fun getOrCreate(context: Context): String {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_CUSTOMER_ID, null)
        if (existing != null) return existing
        val new = UUID.randomUUID().toString()
        prefs.edit().putString(KEY_CUSTOMER_ID, new).apply()
        return new
    }
}
```

### 11.2 Implement `internal/ErrorMapper.kt`

```kotlin
package com.smartqueue.sdk.internal

import com.smartqueue.sdk.models.SmartQueueResult
import retrofit2.HttpException
import java.io.IOException

internal object ErrorMapper {

    fun <T> map(e: Throwable): SmartQueueResult.Error {
        return when (e) {
            is HttpException -> {
                val code = parseErrorCode(e)
                SmartQueueResult.Error(code, e.message())
            }
            is IOException -> SmartQueueResult.Error("NETWORK_ERROR", "Check your internet connection.")
            else -> SmartQueueResult.Error("UNKNOWN_ERROR", e.message ?: "Unknown error")
        }
    }

    private fun parseErrorCode(e: HttpException): String {
        return try {
            // Try to parse {"error": "CODE", "message": "..."} from response body
            val body = e.response()?.errorBody()?.string() ?: return "HTTP_${e.code()}"
            val regex = """"error"\s*:\s*"([^"]+)"""".toRegex()
            regex.find(body)?.groupValues?.get(1) ?: "HTTP_${e.code()}"
        } catch (_: Exception) {
            "HTTP_${e.code()}"
        }
    }
}
```

### Verify Phase 11 complete

- [ ] `./gradlew :sdk:compileDebugKotlin` passes
- [ ] `CustomerIdManager.getOrCreate(context)` returns a UUID string

---

## Phase 12 — SDK: Public API

**Goal:** `SmartQueueSDK` object exposes all public functions. Polling is working.

### 12.1 Implement `SmartQueueSDK.kt`

```kotlin
package com.smartqueue.sdk

import android.content.Context
import com.smartqueue.sdk.api.NetworkClient
import com.smartqueue.sdk.api.dto.JoinRequestDto
import com.smartqueue.sdk.api.dto.LeaveRequestDto
import com.smartqueue.sdk.internal.CustomerIdManager
import com.smartqueue.sdk.internal.ErrorMapper
import com.smartqueue.sdk.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

object SmartQueueSDK {

    private var customerId: String = ""

    fun init(context: Context, config: SmartQueueConfig) {
        NetworkClient.init(config.baseUrl, config.enableLogging)
        customerId = config.customerId ?: CustomerIdManager.getOrCreate(context)
    }

    fun getCustomerId(): String = customerId

    suspend fun joinQueue(
        queueId: String,
        customerName: String
    ): SmartQueueResult<QueueTicket> {
        return try {
            val dto = NetworkClient.api().joinQueue(
                queueId,
                JoinRequestDto(customer_id = customerId, customer_name = customerName)
            )
            SmartQueueResult.Success(
                QueueTicket(
                    ticketId = dto.ticket_id,
                    ticketNumber = dto.ticket_number,
                    status = "waiting",
                    position = dto.position,
                    estimatedWaitSeconds = dto.estimated_wait_seconds
                )
            )
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }

    suspend fun leaveQueue(queueId: String): SmartQueueResult<Unit> {
        return try {
            NetworkClient.api().leaveQueue(queueId, LeaveRequestDto(customer_id = customerId))
            SmartQueueResult.Success(Unit)
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }

    fun observePosition(
        queueId: String,
        intervalSeconds: Int = 10
    ): Flow<SmartQueueResult<QueueTicket>> = flow {
        while (true) {
            emit(fetchMyTicket(queueId))
            delay(intervalSeconds * 1000L)
        }
    }.flowOn(Dispatchers.IO)

    suspend fun getQueueStatus(queueId: String): SmartQueueResult<QueueStatus> {
        return try {
            val dto = NetworkClient.api().getQueueStatus(queueId)
            SmartQueueResult.Success(
                QueueStatus(
                    id = dto.id,
                    name = dto.name,
                    status = dto.status,
                    nowServing = dto.now_serving,
                    waitingCount = dto.waiting_count,
                    averageServiceTimeSeconds = dto.average_service_time_seconds
                )
            )
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }

    private suspend fun fetchMyTicket(queueId: String): SmartQueueResult<QueueTicket> {
        return try {
            val dto = NetworkClient.api().getMyTicket(queueId, customerId)
            SmartQueueResult.Success(
                QueueTicket(
                    ticketId = dto.ticket_id,
                    ticketNumber = dto.ticket_number,
                    status = dto.status,
                    position = dto.position,
                    estimatedWaitSeconds = dto.estimated_wait_seconds
                )
            )
        } catch (e: Exception) {
            ErrorMapper.map(e)
        }
    }
}
```

### 12.2 Write SDK unit tests

Create `sdk/src/test/kotlin/com/smartqueue/sdk/SmartQueueSDKTest.kt`.

Mock `SmartQueueApiService` with MockK. Test:

- `joinQueue` → on API success returns `SmartQueueResult.Success` with correct position
- `joinQueue` → on HTTP 409 returns `SmartQueueResult.Error` with code `ALREADY_IN_QUEUE`
- `leaveQueue` → on success returns `SmartQueueResult.Success(Unit)`
- `observePosition` → emits 3 values with 1-second interval in test (use `TestCoroutineScheduler`)
- `getQueueStatus` → maps DTO fields correctly

### Verify Phase 12 complete

- [ ] `./gradlew :sdk:assembleDebug` succeeds — `.aar` file produced
- [ ] `./gradlew :sdk:testDebugUnitTest` — all tests pass
- [ ] `SmartQueueSDK` is the only non-internal entry point visible to developers

---

## Phase 13 — Demo Android App

**Goal:** A working Android app that demonstrates the full queue flow using only the SDK.

### 13.1 Configure `demo-app/build.gradle.kts`

Add the SDK module as a dependency:

```kotlin
dependencies {
    implementation(project(":sdk"))

    // ViewModel and Fragment
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.fragment:fragment-ktx:1.6.2")
    implementation("androidx.navigation:navigation-fragment-ktx:2.7.7")
    implementation("androidx.navigation:navigation-ui-ktx:2.7.7")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

### 13.2 Set the backend URL

In `demo-app/src/main/res/values/strings.xml`:

```xml
<string name="backend_base_url">http://10.0.2.2:8000/</string>
```

`10.0.2.2` is the Android emulator's address for `localhost` on the host machine.  
If testing on a physical device, replace with your computer's local IP address.

### 13.3 Initialize the SDK in `Application`

Create `demo-app/src/main/kotlin/com/smartqueue/demo/DemoApp.kt`:

```kotlin
class DemoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SmartQueueSDK.init(
            context = this,
            config = SmartQueueConfig(
                baseUrl = getString(R.string.backend_base_url),
                enableLogging = BuildConfig.DEBUG
            )
        )
    }
}
```

Register it in `AndroidManifest.xml`: `android:name=".DemoApp"`.  
Add internet permission: `<uses-permission android:name="android.permission.INTERNET" />`.

### 13.4 Create the four screens

**Screen 1 — HomeFragment**

Layout has:
- `EditText` for Queue ID input
- `Button` "Join Queue" → calls `SmartQueueSDK.joinQueue(queueId, "Demo User")`
- `Button` "View Queue Status"
- `TextView` for error messages

`HomeViewModel` has:
- `joinQueue(queueId)` — suspending, calls SDK, posts result to `LiveData<SmartQueueResult<QueueTicket>>`
- On `Success` → navigate to `MyTicketFragment` passing `queueId`
- On `Error` → show error text

---

**Screen 2 — MyTicketFragment**

Layout has:
- `TextView` ticket number (large, e.g. "#17")
- `TextView` position (e.g. "Position: 3")
- `TextView` estimated wait (e.g. "~8 min")
- `TextView` status banner (changes to "Almost your turn!" when position ≤ 1)
- `Button` "Leave Queue"

`MyTicketViewModel` has:
- `startObserving(queueId)` — collects `SmartQueueSDK.observePosition(queueId)` in `viewModelScope`
- Posts each `SmartQueueResult<QueueTicket>` to `LiveData`
- On `Success` where `status == "called"` → navigate to `YourTurnFragment`
- `leaveQueue(queueId)` — calls SDK, navigates back to Home on success

---

**Screen 3 — YourTurnFragment**

Layout has:
- Large `TextView` "It's your turn!"
- `TextView` showing ticket number
- `Button` "Done" → navigate back to Home

---

**Screen 4 — QueueStatusFragment**

Layout has:
- `TextView` for each status field: name, status, now serving, waiting count
- `Button` "Refresh" → calls `SmartQueueSDK.getQueueStatus(queueId)` again

`QueueStatusViewModel` has:
- `loadStatus(queueId)` — calls SDK, posts result to `LiveData`

---

### 13.5 Set up navigation

Create `demo-app/src/main/res/navigation/nav_graph.xml` with:
- `HomeFragment` as start destination
- Action: Home → MyTicket (pass `queueId` as argument)
- Action: MyTicket → YourTurn
- Action: YourTurn → Home (pop back stack)
- Action: Home → QueueStatus (pass `queueId`)

### 13.6 Add `cleartext` for local development

In `demo-app/src/main/AndroidManifest.xml`:

```xml
android:usesCleartextTraffic="true"
```

(HTTP is needed to reach the local backend. Remove before production.)

### Verify Phase 13 complete

- [ ] App installs on emulator with no build errors
- [ ] Hardcode a real queue ID (created via curl in Phase 6) → app shows queue status
- [ ] `joinQueue` call succeeds and navigates to MyTicket screen
- [ ] MyTicket screen shows correct position and estimated wait
- [ ] After waiting 10 seconds, the position counter refreshes (visible in logcat)
- [ ] `leaveQueue` returns to Home screen

---

## Phase 14 — Admin Web UI

**Goal:** Minimal React app lets an operator create queues, call next, and monitor who is waiting.

### 14.1 Scaffold the React project

```bash
cd admin-portal
npm create vite@latest . -- --template react
npm install
npm install axios
```

### 14.2 Create the API client

Create `admin-portal/src/api/client.js`:

```javascript
import axios from 'axios'

const BASE_URL = 'http://localhost:8000/api/v1'

let adminSecret = ''

export function setAdminSecret(secret) {
  adminSecret = secret
}

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  if (adminSecret) {
    config.headers['X-Admin-Secret'] = adminSecret
  }
  return config
})

export default api
```

### 14.3 Implement `App.jsx` — view switching

`App.jsx` manages three state variables:
- `view` — `"login"` | `"dashboard"` | `"detail"`
- `selectedQueueId` — ID of the queue being managed in detail view
- `adminSecret` — entered on login

```jsx
// App.jsx structure (implement the full logic):
// if view === "login" → render LoginView
// if view === "dashboard" → render DashboardView
// if view === "detail" → render QueueDetailView
```

### 14.4 Implement `LoginView.jsx`

- One `<input>` for the admin secret
- `<button>` "Enter" → calls `setAdminSecret(value)`, switches view to `"dashboard"`
- No validation needed for MVP — wrong secret will cause 401 errors later

### 14.5 Implement `DashboardView.jsx`

```
State:
  queues[]               ← from GET /admin/queues
  showCreateModal        ← boolean

On mount and every 10 seconds (use setInterval + clearInterval in useEffect):
  fetch GET /admin/queues → update queues state

Render:
  <button> "Create Queue" → set showCreateModal=true
  For each queue:
    <QueueCard queue={queue} onManage={() => { setSelectedQueueId(id); setView("detail") }} />
  If showCreateModal:
    <CreateQueueModal onClose={() => setShowCreateModal(false)} onCreated={() => refetch} />
```

### 14.6 Implement `QueueCard.jsx`

Displays:
- Queue name
- Status badge (green = open, yellow = paused, red = closed)
- "Waiting: N" count
- "Now serving: #N"
- `<button>` "Manage"

### 14.7 Implement `QueueDetailView.jsx`

```
Props: queueId, onBack

State:
  waitingList[]          ← from GET /admin/queues/{id}/waiting-list
  queue                  ← from GET /admin/queues/{id}
  loading

On mount and every 10 seconds:
  fetch both endpoints above

Render:
  <button> "← Back"  → call onBack()
  Queue name + status badge
  <button> "Call Next"  → POST /admin/queues/{id}/call-next → immediately refetch
  Status buttons: "Pause" | "Reopen" | "Close" → PATCH /admin/queues/{id}/status
  Waiting list table:
    Columns: Position | Ticket # | Customer Name | Waited
    One row per ticket in waitingList
  If waitingList is empty: show "No customers waiting"
```

Show a simple browser `alert()` with the error message on any API failure.

### 14.8 Implement `CreateQueueModal.jsx`

A modal overlay (simple `position: fixed` div) with:
- `<input>` Queue name (required)
- `<input>` Average service time in minutes (converts to seconds before sending), default 5
- `<button>` "Create" → POST `/admin/queues` → call `onCreated()` and `onClose()`
- `<button>` "Cancel" → call `onClose()`

### 14.9 Add polling hook

Create `admin-portal/src/hooks/usePolling.js`:

```javascript
import { useEffect } from 'react'

export function usePolling(callback, intervalMs = 10000) {
  useEffect(() => {
    callback()
    const id = setInterval(callback, intervalMs)
    return () => clearInterval(id)
  }, [])
}
```

Use this hook in `DashboardView` and `QueueDetailView` to avoid duplicating the setInterval logic.

### 14.10 Run the admin portal

```bash
cd admin-portal
npm run dev
```

Opens at `http://localhost:5173`.

### Verify Phase 14 complete

- [ ] Login with `dev-admin-secret-change-in-prod` → dashboard loads
- [ ] "Create Queue" modal creates a queue visible in dashboard
- [ ] "Manage" opens Queue Detail with waiting list
- [ ] "Call Next" with a customer in the queue removes them from the waiting list
- [ ] "Close" changes the queue status badge to red
- [ ] Dashboard polls: join from demo app → waiting count increments in admin without refresh

---

## Phase 15 — End-to-End Integration

**Goal:** All four components work together in the full demo scenario. Every feature verified.

### 15.1 Start the full stack

Open **two terminals** side by side and leave both running:

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Admin Portal:**
```bash
cd admin-portal
npm run dev
```

MongoDB Atlas is already running in the cloud — nothing to start there.

### 15.2 Run the full demo flow

Perform each step and check the expected result:

- [ ] **Step 1:** Open admin portal (`http://localhost:5173`), log in
- [ ] **Step 2:** Create a queue named "Demo Queue", service time 2 minutes
- [ ] **Step 3:** Copy the queue ID from the dashboard
- [ ] **Step 4:** Open demo app on emulator, enter the queue ID, tap "Join Queue"
- [ ] **Step 5:** App navigates to "My Ticket" — shows ticket #1, position 0, estimated wait ~0 min
- [ ] **Step 6:** Join a second time from the emulator with a different app instance or direct curl:
  ```bash
  curl -X POST http://localhost:8000/api/v1/queues/<queue_id>/join \
    -H "Content-Type: application/json" \
    -d '{"customer_id": "second-customer", "customer_name": "Bob"}'
  ```
- [ ] **Step 7:** Admin portal shows "Waiting: 2"
- [ ] **Step 8:** Admin taps "Call Next" — waiting list drops to 1
- [ ] **Step 9:** Within 10 seconds, demo app refreshes — ticket position updates (first customer's status becomes "called", second customer's position drops to 0)
- [ ] **Step 10:** Demo app shows the "It's your turn!" screen for the first customer
- [ ] **Step 11:** Tap "Leave Queue" for second customer — admin waiting list drops to 0
- [ ] **Step 12:** Admin closes the queue — demo app (if still polling) reflects "queue closed" in status view
- [ ] **Step 13:** Try to join a closed queue from the demo app — error message shown

### 15.3 Verify edge cases

- [ ] Join queue that does not exist → app shows error (404)
- [ ] Call next on empty queue → admin shows alert "No waiting tickets"
- [ ] Two different customers join → positions are 0 and 1 respectively on first poll

### 15.4 Check logs for errors

- [ ] Backend terminal (Terminal 1) shows no `500 Internal Server Error` lines
- [ ] All backend requests show `200` or `201` status codes in the uvicorn log
- [ ] No unhandled exceptions in Android Studio's Logcat on the demo app

---

## Done

When Phase 15 is complete, the MVP is working. The full end-to-end demo can be run and shown.

---

## What comes next (Phase 2)

These are fully designed but not built. Do not start them until the MVP demo is stable.

| Feature | Effort |
|---|---|
| WebSocket real-time updates (replace polling) | ~1 week |
| FCM push notifications | ~1 week |
| JWT + API key authentication | ~1 week |
| Room local cache in SDK | ~3 days |
| Statistics and analytics | ~1 week |
| Multi-tenant: businesses + branches | ~3 days |
| JitPack SDK publishing | ~2 days |
| Production deployment (Nginx, Docker) | ~3 days |
