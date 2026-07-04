# Admin Portal Guide

The Admin Portal is a React web application for queue operators. It polls the backend every 10 seconds to stay up to date automatically.

Start it with:

```bash
cd admin-portal
npm run dev
# Opens at http://localhost:5173
```

---

## Logging In

Enter the admin secret (default: `dev-admin-secret-change-in-prod`) and click **Enter** or press Return.

The secret is sent as the `X-Admin-Secret` header on every subsequent API request. To log out, click **Log out** at the bottom of the sidebar — this clears the secret from memory and returns to the login screen.

---

## Dashboard

The dashboard gives a real-time overview of all active queues.

### KPI Cards

| Card | Data source |
|---|---|
| Active Queues | Live count from database (queues where status ≠ closed) |
| Total Waiting | Sum of `waiting_count` across all active queues |
| Served Today | Count of tickets served since midnight UTC (from analytics endpoint) |
| Avg Wait Time | Mean of `(called_at − joined_at)` for tickets served today |
| Peak Wait Today | Maximum of `(called_at − joined_at)` for tickets served today |
| Avg Service | Mean of `average_service_time_seconds` across all active queues |
| Abandonment Rate | `cancelled / (served + cancelled + waiting) × 100` for today |

Served Today, Avg Wait Time, Peak Wait Today, and Abandonment Rate are pulled from the real backend analytics endpoint (`GET /admin/analytics/summary`). They show `—` until the backend responds.

### Charts

| Chart | What it shows |
|---|---|
| Waiting Customers Trend | Simulated hourly waiting count (bell-curve model, generated on page load) |
| Avg Wait Time Trend | Simulated hourly average wait time |
| Customers Served | Simulated hourly throughput |
| Queue Distribution | Pie chart of current waiting customers per queue |
| Queue Performance Comparison | Bar chart of waiting count vs avg service time per queue |

> The hourly trend charts currently use a bell-curve simulation since the backend does not yet store hourly snapshots. Distribution and Performance charts use live data.

### Queue Status Table

Lists all active queues with sortable columns. Features:

**Sortable columns:** Queue Name, Status, Waiting, Now Serving, Avg Service (click column header to sort; click again to reverse).

**Filter tabs:** All / Open / Paused / Closed

**Search:** Type to filter by queue name.

**Copyable Queue ID:** Each row shows the first 8 characters of the Queue ID. Click the **⎘** button to copy the full ID to clipboard. This is the value to enter in the Android demo app.

**Pause / Resume:** For open queues, a **Pause** button is shown. For paused queues, a **Resume** button is shown. Clicking either sends a PATCH request immediately and re-fetches the queue list.

**Manage →:** Opens the Queue Detail view for that queue.

---

## Creating a Queue

Click **+ New Queue** in the top-right of the dashboard. A modal appears with two fields:

| Field | Description |
|---|---|
| Queue Name | Display name (required) |
| Avg Service Time (min) | Initial estimate in minutes (converted to seconds). Default: 5 minutes. |

Click **Create** to submit. The queue immediately appears in the dashboard and sidebar. Click **Cancel** to dismiss without creating.

---

## Queue Detail View

Click **Manage →** in the table or a queue name in the sidebar to open the detail view.

### Header actions

- **← Back** — return to the dashboard
- **Status badges and action row:**
  - **Open / Paused / Closed** status pill
  - **Pause** — sets status to `paused` (no new joins allowed)
  - **Reopen** — sets status back to `open`
  - **Close** — permanently closes the queue (cannot be reopened via the portal)

### Call Next

The **Call Next** button calls the customer with the lowest ticket number who is still `waiting`. It:
1. Marks the previously called customer as `served`
2. Updates the rolling average service time
3. Promotes the next customer to `called`
4. Updates "Now Serving" in the queue

The waiting list refreshes immediately after calling next.

### Waiting List

Shows all customers currently in the `waiting` state, ordered by ticket number:

| Column | Description |
|---|---|
| Position | 0-indexed (0 = next to be served) |
| Ticket # | Sequential number within this queue |
| Customer Name | Name provided when the customer joined |
| Waited | Seconds since `joined_at` |

If the queue is empty, "No customers waiting" is displayed.

---

## Sidebar

The sidebar shows:
- **Dashboard** navigation link
- **All active queues** listed with:
  - Status dot (green = open, amber = paused, red = closed)
  - Queue name
  - Truncated Queue ID with copy button
  - Waiting count badge (hidden when 0)
- **System Online** indicator with a pulsing green dot
- **Log out** button

---

## Auto-Refresh

The dashboard and queue detail view poll the backend every 10 seconds automatically. When a customer joins via the Android app, the waiting count will update in the portal within 10 seconds without any manual refresh.

---

## Development

The admin portal is a standard Vite + React project.

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
npm run lint     # ESLint
```

The API client is in `src/api/client.js`. The backend base URL defaults to `http://localhost:8000/api/v1`. To point to a different backend, change `BASE_URL` in that file.
