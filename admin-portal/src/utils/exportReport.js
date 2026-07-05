import { fmtSecs } from './formatTime'

const STATUS_STYLE = {
  open:   'background:#dcfce7;color:#166534',
  paused: 'background:#fef9c3;color:#854d0e',
  closed: 'background:#fee2e2;color:#991b1b',
}

function estRemaining(position, avgServiceSecs) {
  return fmtSecs(Math.max(0, position * avgServiceSecs))
}

function buildRows(waitingList, avgServiceSecs) {
  if (!waitingList.length) {
    return '<tr><td colspan="4" style="padding:24px;text-align:center;color:#94a3b8;font-style:italic;">No customers currently waiting</td></tr>'
  }
  return waitingList.map((t, i) => {
    const stripe = i % 2 === 1 ? 'background:#f8fafc;' : ''
    return `
      <tr style="${stripe}border-bottom:1px solid #f1f5f9;">
        <td style="padding:11px 16px;font-weight:700;color:#0f172a;">${t.position + 1}</td>
        <td style="padding:11px 16px;font-family:monospace;font-weight:600;color:#3b82f6;">#${t.ticket_number}</td>
        <td style="padding:11px 16px;font-weight:500;color:#334155;">${t.customer_name}</td>
        <td style="padding:11px 16px;text-align:right;color:#334155;">${estRemaining(t.position, avgServiceSecs)}</td>
      </tr>`
  }).join('')
}

export function exportReport(queue, waitingList) {
  const now = new Date()
  const exportedAt = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const statusStyle = STATUS_STYLE[queue.status] ?? 'background:#f1f5f9;color:#64748b'
  const rows = buildRows(waitingList, queue.average_service_time_seconds)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Queue Report — ${queue.name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      padding: 48px 56px;
      max-width: 860px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 32px;
    }
    .brand {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.15;
    }
    .report-subtitle {
      font-size: 14px;
      color: #64748b;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      ${statusStyle};
    }
    .report-meta {
      text-align: right;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.9;
    }
    .report-meta strong { color: #475569; }

    /* ── KPI summary ── */
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 32px;
    }
    .kpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .kpi-value { font-size: 20px; font-weight: 700; color: #0f172a; }

    /* ── Table ── */
    .table-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #0f172a; }
    thead th {
      padding: 11px 16px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #fff;
    }
    thead th:last-child { text-align: right; }
    tbody tr:last-child { border-bottom: none; }

    /* ── Footer ── */
    .report-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }

    /* ── Print ── */
    @media print {
      body { padding: 0; }
      @page { margin: 18mm 20mm; }
      thead tr,
      tbody tr:nth-child(even),
      .kpi-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="report-header">
    <div>
      <div class="brand">Smart Queue SDK · Administrative Report</div>
      <div class="report-title">${queue.name}</div>
      <div class="report-subtitle">
        Queue ID: <code>${queue.id ?? ''}</code>
        <span class="status-badge">${queue.status}</span>
      </div>
    </div>
    <div class="report-meta">
      <div><strong>Exported</strong></div>
      <div>${exportedAt}</div>
    </div>
  </div>

  <div class="summary">
    <div class="kpi-box">
      <div class="kpi-label">Now Waiting</div>
      <div class="kpi-value">${queue.waiting_count}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Now Serving</div>
      <div class="kpi-value">#${queue.now_serving}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Avg Service Time</div>
      <div class="kpi-value">${fmtSecs(queue.average_service_time_seconds)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">In Waiting List</div>
      <div class="kpi-value">${waitingList.length}</div>
    </div>
  </div>

  <div class="table-title">Waiting List</div>
  <table>
    <thead>
      <tr>
        <th style="width:12%">Position</th>
        <th style="width:15%">Ticket</th>
        <th>Customer</th>
        <th style="width:22%;text-align:right">Est. Remaining</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="report-footer">
    <span>Smart Queue SDK</span>
    <span>Generated ${exportedAt}</span>
  </div>

  <script>window.onload = function() { window.print() }</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
