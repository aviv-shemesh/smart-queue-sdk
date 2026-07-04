# Smart Queue SDK

A complete, production-ready virtual queue management system — Android SDK, FastAPI backend, React admin portal, and Android demo app.

![Smart Queue](icon.png)

---

## Overview

Smart Queue lets businesses manage customer queues digitally. Customers join via a mobile app and receive real-time position updates; staff manage queues through a web portal; the system handles ticket lifecycle, analytics, and notifications automatically.

---

## Components

| Component | Tech | Description |
|-----------|------|-------------|
| **`sdk/`** | Kotlin (Android AAR) | Client library — join queue, observe position, get status |
| **`backend/`** | Python 3.12 · FastAPI · MongoDB | REST API — queue management, ticket lifecycle, analytics |
| **`admin-portal/`** | React 19 · Vite · Recharts | Web dashboard — monitor queues, call next, view analytics |
| **`demo-app/`** | Android (Kotlin) | Sample app showcasing the SDK |

---

## Features

- **Real-time queue position** — polling-based Flow updates via `observePosition()`
- **Full ticket lifecycle** — `waiting → called → served | cancelled`
- **Queue lifecycle** — `open | paused | closed`
- **Per-queue analytics** — hourly waiting counts and average wait times
- **Admin portal** — live KPI cards, trend charts, waiting list with search
- **8-character short IDs** — human-readable queue IDs (e.g. `K3FT7Q2A`)
- **Timezone-aware** — all timestamps stored as UTC throughout

---

## Architecture

```
┌─────────────────────┐     HTTP/JSON      ┌──────────────────────────┐
│   Android App       │ ─────────────────► │   FastAPI Backend         │
│   (SDK + Demo)      │ ◄───────────────── │   Python 3.12             │
└─────────────────────┘                    │   Motor (async MongoDB)   │
                                           └──────────────┬───────────┘
┌─────────────────────┐     HTTP/JSON               │
│   Admin Portal      │ ─────────────────►          │
│   React 19 + Vite   │ ◄─────────────────     MongoDB Atlas
└─────────────────────┘
```

---

## Project Structure

```
smart-queue-sdk/
├── sdk/                        # Android SDK (AAR)
│   └── src/main/kotlin/com/smartqueue/sdk/
│       ├── SmartQueueSDK.kt    # Main entry point
│       ├── SmartQueueConfig.kt # Base URL, timeouts
│       ├── models/             # SmartQueueResult<T>, data classes
│       ├── api/                # Retrofit service interfaces
│       └── internal/           # Repository, polling logic
│
├── backend/                    # FastAPI REST API
│   ├── app/
│   │   ├── main.py             # App factory, lifespan, CORS
│   │   ├── database.py         # Motor client, index init
│   │   ├── seed.py             # Demo data seeding
│   │   ├── models/             # Pydantic request/response schemas
│   │   ├── repositories/       # DB access layer
│   │   ├── services/           # Business logic
│   │   └── routers/            # Route handlers (queues, tickets, analytics)
│   ├── requirements.txt
│   └── .env.example
│
├── admin-portal/               # React admin dashboard
│   └── src/
│       ├── App.jsx             # Root — routing, queue selection
│       ├── views/              # DashboardView, QueueDetailView
│       ├── components/         # KPICard, charts (Recharts v3)
│       ├── hooks/              # usePolling
│       └── api/                # Axios client
│
├── demo-app/                   # Android demo application
│   └── src/main/kotlin/com/smartqueue/demo/
│       └── ui/                 # home, ticket, status, yourturn fragments
│
└── docs/                       # Developer documentation
    ├── getting-started.md
    ├── sdk-reference.md
    ├── backend-api.md
    ├── architecture.md
    ├── admin-portal.md
    └── troubleshooting.md
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node 18+
- Android Studio (Hedgehog or later)
- MongoDB Atlas cluster (free tier works)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # fill in your MongoDB URL and admin secret
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. On first start it seeds 7 demo queues automatically.

### Admin Portal

```bash
cd admin-portal
npm install
npm run dev
```

Open `http://localhost:5173`. Use the `ADMIN_SECRET` value from your `.env` to authenticate.

### Android SDK

Add the SDK module to your project (see [docs/getting-started.md](docs/getting-started.md)), then initialize:

```kotlin
SmartQueueSDK.init(
    SmartQueueConfig(baseUrl = "https://your-backend-url")
)

// Join a queue
val result = SmartQueueSDK.joinQueue(queueId = "K3FT7Q2A", customerName = "Alice")

// Observe position updates
SmartQueueSDK.observePosition(queueId, ticketNumber)
    .collect { result ->
        when (result) {
            is SmartQueueResult.Success -> updateUI(result.data)
            is SmartQueueResult.Error   -> showError(result.message)
        }
    }
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/queues` | List all open queues |
| `GET` | `/queues/{id}` | Get queue details |
| `POST` | `/queues/{id}/join` | Join a queue |
| `GET` | `/queues/{id}/ticket/{n}` | Get ticket status |
| `POST` | `/admin/queues` | Create a queue *(admin)* |
| `POST` | `/admin/queues/{id}/call-next` | Call next customer *(admin)* |
| `PATCH` | `/admin/queues/{id}/status` | Change queue status *(admin)* |
| `GET` | `/admin/queues/{id}/waiting-list` | Get waiting list *(admin)* |
| `GET` | `/admin/queues/{id}/analytics/hourly` | Hourly analytics *(admin)* |

Admin endpoints require the `X-Admin-Secret` header.

Full reference: [docs/backend-api.md](docs/backend-api.md)

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/...
DB_NAME=smartqueue
ADMIN_SECRET=<strong-random-secret>
DEFAULT_SERVICE_TIME_SECONDS=300
```

**Never commit `.env` — it is excluded by `.gitignore`.**

---

## Documentation

- [Getting Started](docs/getting-started.md)
- [SDK Reference](docs/sdk-reference.md)
- [Backend API](docs/backend-api.md)
- [Architecture](docs/architecture.md)
- [Admin Portal](docs/admin-portal.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## Tech Stack

**Backend:** Python 3.12 · FastAPI 0.110 · Motor 3.4 (async MongoDB) · Pydantic v2 · MongoDB Atlas

**Admin Portal:** React 19 · Vite · Recharts 3.8 · Axios

**Android SDK:** Kotlin · Coroutines · Flow · Retrofit2 · OkHttp · Gson

**Demo App:** Android (minSdk 24) · Navigation Component · Material Components

---

## License

MIT
