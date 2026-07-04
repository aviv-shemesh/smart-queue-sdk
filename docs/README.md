# SmartQueue SDK — Developer Documentation

SmartQueue is a virtual queue management system consisting of four components that work together: an Android SDK for customer-facing apps, a FastAPI backend, a React admin portal, and an Android demo app.

---

## System Components

| Component | Technology | Purpose |
|---|---|---|
| `sdk/` | Kotlin Android Library | Embeddable library for customer apps |
| `backend/` | Python / FastAPI / MongoDB | REST API and business logic |
| `admin-portal/` | React / Vite | Web UI for queue operators |
| `demo-app/` | Kotlin Android App | Reference app demonstrating the SDK |

---

## Quick Start

### 1. Start the backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 2. Start the admin portal

```bash
cd admin-portal
npm install
npm run dev
# Opens at http://localhost:5173
```

### 3. Log into the admin portal

Default secret: `dev-admin-secret-change-in-prod`

Create a queue and copy its ID.

### 4. Run the demo app

Open the project root in Android Studio, select the `demo-app` run configuration, and press Run. Enter the Queue ID you copied in step 3.

---

## Documentation Index

| File | Contents |
|---|---|
| [getting-started.md](getting-started.md) | Installation, prerequisites, project setup |
| [sdk-reference.md](sdk-reference.md) | Android SDK public API, models, error codes |
| [backend-api.md](backend-api.md) | REST API endpoints, request/response schemas |
| [architecture.md](architecture.md) | System design, data flow, component diagram |
| [admin-portal.md](admin-portal.md) | Admin portal usage guide |
| [troubleshooting.md](troubleshooting.md) | Common errors, FAQ, best practices |

---

## Key Concepts

**Queue** — A named virtual line managed by an operator. A queue has one of three statuses:
- `open` — accepting new customers
- `paused` — no new customers; existing customers stay
- `closed` — permanently closed; removed from the active list

**Ticket** — Issued to a customer when they join a queue. A ticket has one of four lifecycle statuses:
- `waiting` — customer is in line
- `called` — the operator has called this customer's number
- `served` — the customer was served; ticket is closed
- `cancelled` — the customer left the queue voluntarily

**Customer ID** — A UUID that uniquely identifies a device. The SDK auto-generates and persists this on first launch. One customer can have at most one active ticket per queue.

**Polling** — The SDK polls the backend every 10 seconds (configurable) via `observePosition()` to update the customer's position and detect when they are called.
