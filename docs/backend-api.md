# Backend REST API Reference

Base URL: `http://localhost:8000`  
API prefix: `/api/v1`  
Interactive docs: `http://localhost:8000/docs`

All request and response bodies use `application/json`.

---

## Authentication

Admin endpoints require the `X-Admin-Secret` HTTP header:

```
X-Admin-Secret: dev-admin-secret-change-in-prod
```

The value is set via the `ADMIN_SECRET` environment variable in `.env`. Public endpoints do not require any authentication.

---

## Public Endpoints

These endpoints are used by the Android SDK and require no authentication.

---

### GET `/api/v1/queues/{queue_id}`

Get the current status of a queue.

**Path parameters:**
| Parameter | Type | Description |
|---|---|---|
| `queue_id` | string | MongoDB ObjectId of the queue |

**Response 200:**
```json
{
  "id": "6650a2f3b3c4d5e6f7a8b9c0",
  "name": "Test Queue",
  "status": "open",
  "now_serving": 3,
  "waiting_count": 2,
  "average_service_time_seconds": 300,
  "created_at": "2026-07-03T08:00:00Z"
}
```

**Errors:**
| Status | Error code | Description |
|---|---|---|
| 404 | `QUEUE_NOT_FOUND` | No queue with this ID exists |

---

### POST `/api/v1/queues/{queue_id}/join`

Join the queue. Issues a new ticket to the customer.

**Path parameters:**
| Parameter | Type | Description |
|---|---|---|
| `queue_id` | string | ID of the queue to join |

**Request body:**
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "Alice"
}
```

**Response 201:**
```json
{
  "ticket_id": "6650a3b4c5d6e7f8a9b0c1d2",
  "ticket_number": 7,
  "status": "waiting",
  "position": 2,
  "estimated_wait_seconds": 600
}
```

> `position` is the number of customers ahead. `0` means the customer is next.  
> `estimated_wait_seconds` = `position × queue.average_service_time_seconds`

**Errors:**
| Status | Error code | Description |
|---|---|---|
| 404 | `QUEUE_NOT_FOUND` | No queue with this ID exists |
| 409 | `QUEUE_CLOSED` | Queue is `paused` or `closed` |
| 409 | `ALREADY_IN_QUEUE` | This `customer_id` already has an active ticket in this queue |

---

### DELETE `/api/v1/queues/{queue_id}/leave`

Leave the queue. Cancels the customer's active ticket.

**Request body:**
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 200:**
```json
{
  "success": true
}
```

**Errors:**
| Status | Error code | Description |
|---|---|---|
| 404 | `QUEUE_NOT_FOUND` | No queue with this ID exists |
| 404 | `NO_ACTIVE_TICKET` | This customer has no active ticket in this queue |

---

### GET `/api/v1/queues/{queue_id}/my-ticket`

Poll the customer's current ticket state. Called periodically by the SDK.

**Query parameters:**
| Parameter | Type | Description |
|---|---|---|
| `customer_id` | string | UUID of the customer |

**Response 200:**
```json
{
  "ticket_id": "6650a3b4c5d6e7f8a9b0c1d2",
  "ticket_number": 7,
  "status": "waiting",
  "position": 1,
  "estimated_wait_seconds": 300
}
```

When `status` becomes `"called"`, the customer should be directed to approach the service point.

**Errors:**
| Status | Error code | Description |
|---|---|---|
| 404 | `QUEUE_NOT_FOUND` | No queue with this ID |
| 404 | `NO_ACTIVE_TICKET` | No active ticket for this customer |

---

## Admin Endpoints

All admin endpoints require the `X-Admin-Secret` header.

---

### POST `/api/v1/admin/queues`

Create a new queue.

**Request body:**
```json
{
  "name": "Customer Support",
  "average_service_time_seconds": 300
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | required | Display name of the queue |
| `average_service_time_seconds` | integer | `300` | Initial average service time used for wait estimates. Updates automatically as customers are served. |

**Response 201:** Same shape as `GET /queues/{id}` (QueueResponse).

---

### GET `/api/v1/admin/queues`

List all non-closed queues.

**Response 200:** Array of QueueResponse objects.

```json
[
  {
    "id": "6650a2f3b3c4d5e6f7a8b9c0",
    "name": "Test Queue",
    "status": "open",
    "now_serving": 3,
    "waiting_count": 2,
    "average_service_time_seconds": 295,
    "created_at": "2026-07-03T08:00:00Z"
  }
]
```

> Closed queues are excluded. Queues with status `paused` are included.

---

### PATCH `/api/v1/admin/queues/{queue_id}/status`

Change a queue's status.

**Request body:**
```json
{
  "status": "paused"
}
```

Valid values: `"open"`, `"paused"`, `"closed"`

**Response 200:** Updated QueueResponse.

---

### POST `/api/v1/admin/queues/{queue_id}/call-next`

Call the next waiting customer. This action:
1. Marks the previously called ticket as `served`
2. Updates the queue's rolling average service time using the actual service duration
3. Finds the next `waiting` ticket (lowest ticket number)
4. Marks it as `called`
5. Updates `queue.now_serving`

**Response 200:**
```json
{
  "called_ticket_number": 8,
  "customer_name": "Bob",
  "remaining_waiting": 3
}
```

**Errors:**
| Status | Error code | Description |
|---|---|---|
| 404 | `QUEUE_NOT_FOUND` | No queue with this ID |
| 404 | `NO_WAITING_TICKETS` | No customers are currently waiting |

---

### GET `/api/v1/admin/queues/{queue_id}/waiting-list`

Get all waiting customers in order, with how long each has been waiting.

**Response 200:**
```json
[
  {
    "ticket_number": 9,
    "customer_name": "Carol",
    "position": 0,
    "waited_seconds": 120
  },
  {
    "ticket_number": 10,
    "customer_name": "Dave",
    "position": 1,
    "waited_seconds": 45
  }
]
```

Customers are ordered by ticket number (ascending). `position` starts at `0` for the next customer to be served.

---

### GET `/api/v1/admin/analytics/summary`

Daily analytics summary computed from actual ticket data.

**Response 200:**
```json
{
  "served_today": 42,
  "avg_wait_seconds": 187,
  "peak_wait_seconds": 480,
  "abandonment_rate_pct": 3.2
}
```

| Field | Description |
|---|---|
| `served_today` | Count of tickets with `status="served"` and `served_at >= today 00:00 UTC` |
| `avg_wait_seconds` | Mean of `(called_at − joined_at)` for tickets served today |
| `peak_wait_seconds` | Maximum of `(called_at − joined_at)` for tickets served today |
| `abandonment_rate_pct` | `cancelled / (served + cancelled + waiting) × 100` for today |

---

## Error Response Format

All errors follow this consistent shape:

```json
{
  "detail": {
    "error": "QUEUE_NOT_FOUND",
    "message": "Queue not found."
  }
}
```

The `error` field contains the machine-readable code. The `message` field contains a human-readable explanation. The Android SDK parses the `error` field and surfaces it as `SmartQueueResult.Error.code`.

---

## Health Check

```
GET /health
```

Returns `{"status": "ok"}` when the server is running. Does not check database connectivity.

---

## MongoDB Collections

| Collection | Key fields |
|---|---|
| `queues` | `_id`, `name`, `status`, `now_serving`, `next_ticket_number`, `served_count`, `average_service_time_seconds`, `created_at` |
| `tickets` | `_id`, `queue_id`, `customer_id`, `customer_name`, `ticket_number`, `status`, `joined_at`, `called_at`, `served_at`, `cancelled_at` |

**Indexes on `tickets`:**
- `(queue_id, status)` — used by all queue scoped queries
- `(queue_id, customer_id, status)` — used by join guard and my-ticket
- `(queue_id, ticket_number)` — used by call-next ordering

**Index on `queues`:**
- `(status)` — used by list-queues to exclude closed queues
