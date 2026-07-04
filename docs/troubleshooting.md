# Troubleshooting & Best Practices

---

## Common Errors

### Android SDK

---

#### `QUEUE_NOT_FOUND`

**Cause:** The queue ID entered in the app does not exist in the database.

**Fix:**
1. Log into the Admin Portal
2. Copy the Queue ID using the **⎘** button in the Queue Status table or the sidebar
3. Paste the full ID (24 hex characters) into the Android app

The Queue ID is a MongoDB ObjectId. It looks like: `6650a2f3b3c4d5e6f7a8b9c0`

---

#### `QUEUE_CLOSED`

**Cause:** The queue's status is `paused` or `closed`. The SDK returns this error from `joinQueue()`.

**Fix:** In the Admin Portal, open the Queue Detail view and click **Reopen**. Only `open` queues accept new customers.

---

#### `ALREADY_IN_QUEUE`

**Cause:** The customer's device (identified by the Customer ID persisted in SharedPreferences) already has an active ticket (`waiting` or `called`) in this queue.

**Fix:** The customer must leave the queue first by calling `SmartQueueSDK.leaveQueue()`, or the admin must call next until the customer's ticket becomes `served`.

For testing, you can clear the stored Customer ID by uninstalling the app or clearing the app's data in device settings.

---

#### `NETWORK_ERROR`

**Cause:** The device cannot reach the backend. This wraps any `IOException`.

**Possible causes:**
- Backend is not running (`uvicorn` process has stopped)
- Wrong base URL in `SmartQueueConfig`
- Using `http://10.0.2.2:8000/` on a physical device instead of the host machine's local IP
- Missing `<uses-permission android:name="android.permission.INTERNET" />` in `AndroidManifest.xml`
- Missing `android:usesCleartextTraffic="true"` when connecting to HTTP (non-HTTPS) backend

---

#### `SmartQueueSDK not initialized`

**Cause:** A method was called before `SmartQueueSDK.init()`.

**Fix:** Ensure `SmartQueueSDK.init()` is called in `Application.onCreate()`, not in an `Activity` or `Fragment`.

---

### Backend

---

#### `uvicorn` fails to start — `Connection refused` to MongoDB

**Cause:** The MongoDB Atlas connection string in `.env` is wrong or the cluster is unreachable.

**Fix:**
1. Verify `MONGO_URL` in `.env` has the correct username, password, and cluster hostname
2. Confirm the cluster is not paused (free Atlas clusters pause after 60 days of inactivity)
3. Confirm `0.0.0.0/0` is in Network Access in the Atlas dashboard

---

#### `422 Unprocessable Entity` on API requests

**Cause:** The request body does not match the expected Pydantic model (missing required field, wrong type).

**Fix:** Check the interactive docs at `http://localhost:8000/docs` for the exact expected schema.

---

#### `401 Unauthorized` from admin endpoints

**Cause:** The `X-Admin-Secret` header is missing or does not match `settings.admin_secret`.

**Fix:** Ensure the header value exactly matches `ADMIN_SECRET` in `.env`. The Admin Portal stores the secret in memory — logging out and back in with the correct secret will fix it.

---

#### Tests fail with connection errors

**Cause:** `MONGO_TEST_URL` in `.env` is incorrect, or the test database user does not have write permission.

**Fix:** Use the same Atlas cluster for tests (just a different `TEST_DB_NAME`). The test database is dropped and recreated by `conftest.py` on each run, so it must not be a production database.

---

### Admin Portal

---

#### KPI cards show `—` for Served Today / Avg Wait / Abandonment Rate

**Cause:** The analytics endpoint returned an error (likely because the backend is not running or the admin secret is wrong).

**Fix:** Verify the backend is running at `http://localhost:8000` and that you are logged in with the correct admin secret.

---

#### Queue list does not update after a customer joins

**Cause:** The portal polls every 10 seconds. Wait up to 10 seconds after the customer joins from the Android app.

---

## Best Practices

### SDK Integration

**Initialize once, use everywhere.** Call `SmartQueueSDK.init()` exactly once in `Application.onCreate()`. Do not call it in fragments or activities, as they can be recreated.

**Always handle `SmartQueueResult.Error`.** Never unwrap a result without checking its type. Network failures and business rule violations are returned as `Error`, not thrown as exceptions.

```kotlin
// Correct
when (val result = SmartQueueSDK.joinQueue(id, name)) {
    is SmartQueueResult.Success -> { /* use result.data */ }
    is SmartQueueResult.Error   -> { /* show result.message */ }
}

// Wrong — will crash on error
val ticket = (SmartQueueSDK.joinQueue(id, name) as SmartQueueResult.Success).data
```

**Cancel `observePosition` when you no longer need it.** The flow polls indefinitely. Cancel the collecting coroutine when the customer is called, leaves the queue, or the screen is destroyed.

```kotlin
// The viewModelScope cancels automatically when the ViewModel is cleared
private var pollingJob: Job? = null

fun startObserving(queueId: String) {
    if (pollingJob?.isActive == true) return   // don't start twice
    pollingJob = viewModelScope.launch {
        SmartQueueSDK.observePosition(queueId).collect { ... }
    }
}

override fun onCleared() {
    pollingJob?.cancel()
}
```

**Enable logging in debug builds only:**

```kotlin
SmartQueueConfig(
    baseUrl = "...",
    enableLogging = BuildConfig.DEBUG
)
```

### Backend

**Never commit `.env`.** It contains database credentials. Use `.env.example` with placeholder values for documentation.

**Change `ADMIN_SECRET` before any public or shared deployment.** The default `dev-admin-secret-change-in-prod` is intended for local development only.

**Do not use the same database for tests and production.** The test suite drops the entire `TEST_DB_NAME` database after each run. Keep `DB_NAME` and `TEST_DB_NAME` separate.

**Use HTTPS in production.** The current setup uses HTTP, which is only appropriate for local development. In production, place the backend behind an HTTPS reverse proxy (Nginx, Caddy, etc.) and remove `usesCleartextTraffic` from the Android manifest.

### Queue Operations

**Call Next marks the previous customer as served.** You do not need to manually close or confirm a customer's service. Pressing "Call Next" automatically:
1. Marks the previously called customer as `served`
2. Updates the rolling average with the actual service time
3. Calls the next customer

**Pause a queue to temporarily stop new joins** without closing it permanently. Paused queues still appear in `GET /admin/queues` and in the Admin Portal sidebar. Customers already in the queue remain.

**Close a queue when service is permanently done.** Closed queues are excluded from `GET /admin/queues` and will not appear in future portal sessions.

---

## FAQ

**Q: Can a customer be in multiple queues at the same time?**  
A: Yes. The unique constraint is one active ticket *per queue per customer*. A single Customer ID can hold tickets in different queues simultaneously.

**Q: What happens to a customer's ticket if the queue is paused?**  
A: Nothing. Their ticket remains `waiting`. The admin can still call next and serve customers in a paused queue. Only new joins are blocked.

**Q: What happens if the app is closed while a customer is waiting?**  
A: Their ticket remains `waiting` in the backend. When the app is reopened and `observePosition()` is restarted, it immediately polls and returns the current state. The customer will see their current position as if they never closed the app.

**Q: Can I override the Customer ID?**  
A: Yes. Pass a `customerId` value in `SmartQueueConfig`. If you provide one, the auto-generation step is skipped entirely. This is useful for apps that already have their own user identity system.

**Q: How accurate are the wait time estimates?**  
A: `estimated_wait_seconds = position × queue.average_service_time_seconds`. The average is initialized to `DEFAULT_SERVICE_TIME_SECONDS` (default 300 seconds / 5 minutes) and updates automatically with a rolling average each time a customer is served. Accuracy improves as more customers pass through the queue.
