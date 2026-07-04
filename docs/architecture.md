# System Architecture

## Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Customer Device                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Android Application                        │   │
│   │                                                         │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │           SmartQueue SDK (AAR library)          │   │   │
│   │   │                                                 │   │   │
│   │   │  SmartQueueSDK  ←→  NetworkClient (Retrofit)   │   │   │
│   │   │        ↓                                        │   │   │
│   │   │  CustomerIdManager (SharedPreferences)          │   │   │
│   │   │  ErrorMapper (HTTP → SmartQueueResult)          │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP/JSON (REST)
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      FastAPI Backend                            │
│                                                                 │
│   ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐   │
│   │ Routers  │ → │   Services   │ → │    Repositories       │   │
│   │          │   │              │   │                       │   │
│   │ queues   │   │queue_service │   │  queue_repo           │   │
│   │ admin    │   │ticket_service│   │  ticket_repo          │   │
│   │ analytics│   └──────────────┘   └──────────┬────────────┘   │
│   └──────────┘                                 │  Motor (async) │
└────────────────────────────────────────────────┼────────────────┘
                                                 │
┌────────────────────────────────────────────────▼────────────────┐
│                     MongoDB Atlas (Cloud)                       │
│                                                                 │
│   Collections: queues, tickets                                  │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │  HTTP/JSON (REST + Admin Secret)
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                 Admin Portal (React/Vite)                       │
│                                                                 │
│   Views: LoginView, DashboardView, QueueDetailView             │
│   Polling: usePolling hook, every 10 seconds                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Layers

The backend uses a strict three-layer architecture. No layer can skip another.

```
HTTP Request
    │
    ▼
┌──────────┐
│  Router  │  Validates HTTP shape, applies auth, delegates to service
└────┬─────┘
     │
     ▼
┌──────────┐
│  Service │  Business logic: rules, ordering, calculated fields
└────┬─────┘
     │
     ▼
┌────────────┐
│ Repository │  Raw MongoDB operations only; no business logic
└────┬───────┘
     │
     ▼
  MongoDB
```

**Routers** (`app/routers/`) handle HTTP concerns: path parameters, request body parsing, response model selection, status codes, and authentication via `Depends(require_admin)`.

**Services** (`app/services/`) own business rules: "can this customer join?", "what is the customer's position?", "what ticket comes next?". Services call repositories and raise `HTTPException` when a rule is violated.

**Repositories** (`app/repositories/`) contain only Motor (async MongoDB) calls. They never raise HTTP exceptions. All direct MongoDB operations are centralized here.

---

## SDK Layers

```
Application Code
    │
    ▼
SmartQueueSDK          ← Public API. Converts DTOs to domain models.
    │                    Wraps all exceptions into SmartQueueResult.
    ▼
NetworkClient          ← Initializes Retrofit + OkHttp. Single instance.
    │
    ▼
SmartQueueApiService   ← Retrofit interface. Suspend functions map to HTTP calls.
    │
    ▼
OkHttpClient           ← Connection pooling, logging interceptor.
```

**Domain models** (`models/`) are what the app sees: `QueueTicket`, `QueueStatus`, `SmartQueueResult`.

**DTO classes** (`api/dto/`) mirror the JSON wire format from the backend. They are never exposed to the application layer.

**Internal utilities** (`internal/`) are not part of the public API:
- `CustomerIdManager` — UUID generation and SharedPreferences persistence
- `ErrorMapper` — converts `HttpException` and `IOException` to `SmartQueueResult.Error`, parsing the backend's `{"error": "CODE"}` body

---

## Data Flow: Customer Joins a Queue

```
App                SDK               Backend              MongoDB
 │                  │                   │                    │
 │  joinQueue()     │                   │                    │
 │─────────────────▶│                   │                    │
 │                  │  POST /join       │                    │
 │                  │──────────────────▶│                    │
 │                  │                   │  get_queue()       │
 │                  │                   │───────────────────▶│
 │                  │                   │◀───────────────────│
 │                  │                   │  get_active_ticket()
 │                  │                   │───────────────────▶│
 │                  │                   │◀── null ───────────│
 │                  │                   │  increment_counter()
 │                  │                   │───────────────────▶│
 │                  │                   │◀── ticket_number ──│
 │                  │                   │  create_ticket()   │
 │                  │                   │───────────────────▶│
 │                  │                   │  count_ahead()     │
 │                  │                   │───────────────────▶│
 │                  │                   │◀─────── position ──│
 │                  │◀── 201 JSON ──────│                    │
 │◀── Success ──────│                   │                    │
```

---

## Data Flow: Real-Time Position Updates (Polling)

```
App (every 10s)    SDK               Backend              MongoDB
 │                  │                   │                    │
 │  observePosition │                   │                    │
 │─────────────────▶│ (returns Flow)    │                    │
 │                  │                   │                    │
 │  [collect]       │  GET /my-ticket   │                    │
 │                  │──────────────────▶│                    │
 │                  │                   │  get_active_ticket()
 │                  │                   │───────────────────▶│
 │                  │                   │  count_ahead()     │
 │                  │                   │───────────────────▶│
 │◀── emit(Success) │◀── 200 JSON ──────│                    │
 │                  │   [delay 10s]     │                    │
 │                  │  GET /my-ticket   │                    │
 │                  │──────────────────▶│  ...               │
```

When `ticket.status == "called"`, the app navigates to the "Your Turn" screen and cancels the collection.

---

## Data Flow: Admin Calls Next

```
Admin Portal        Backend              MongoDB
     │                 │                    │
     │  POST /call-next│                    │
     │────────────────▶│                    │
     │                 │  get_currently_called_ticket()
     │                 │───────────────────▶│
     │                 │  mark_ticket_served()
     │                 │───────────────────▶│
     │                 │  update_rolling_average()
     │                 │───────────────────▶│
     │                 │  get_next_waiting_ticket()
     │                 │───────────────────▶│
     │                 │  mark_ticket_called()
     │                 │───────────────────▶│
     │                 │  update_now_serving()
     │                 │───────────────────▶│
     │◀── 200 JSON ────│                    │
```

The customer's next `observePosition` poll will see `status: "called"` and trigger the notification.

---

## Rolling Average Service Time

The queue's `average_service_time_seconds` field is updated automatically each time "Call Next" is used. The formula:

```
new_avg = (old_avg × served_count + actual_duration) / (served_count + 1)
```

This running average drives the `estimated_wait_seconds` returned to customers, so estimates improve in real time as the operator works through the queue.

---

## Admin Authentication

The admin secret is a plain string sent in the `X-Admin-Secret` HTTP header. The backend middleware (`app/middleware/admin_auth.py`) compares it to `settings.admin_secret`. On mismatch it returns HTTP 401.

This is a simple shared secret appropriate for a development/internal tool. For production, replace with JWT or API keys scoped per operator.

---

## Tech Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Android SDK | Kotlin | 1.9 |
| HTTP client | Retrofit2 + OkHttp | 2.11 / 4.12 |
| Async (Android) | Kotlin Coroutines + Flow | 1.8 |
| Backend runtime | Python | 3.12 |
| Backend framework | FastAPI | 0.110 |
| ASGI server | Uvicorn | 0.29 |
| Async MongoDB driver | Motor | 3.4 |
| Data validation | Pydantic v2 | 2.7 |
| Database | MongoDB Atlas | M0 Free |
| Admin UI framework | React | 19 |
| Admin UI bundler | Vite | 8 |
| Admin UI charts | Recharts | 3 |
