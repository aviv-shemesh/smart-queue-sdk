# Android SDK Reference

Package: `com.smartqueue.sdk`
Minimum SDK: API 26 (Android 8.0)

---

## SmartQueueSDK

The single entry point for all SDK functionality. This is a Kotlin `object` (singleton) — call `init()` once before using any other method.

### `init`

```kotlin
fun init(context: Context, config: SmartQueueConfig)
```

Initializes the SDK. Must be called before any other method, typically in `Application.onCreate()`.

| Parameter | Type | Description |
|---|---|---|
| `context` | `Context` | Application context, used to persist the customer ID |
| `config` | `SmartQueueConfig` | Configuration object (see below) |

**Example:**
```kotlin
SmartQueueSDK.init(
    context = this,
    config = SmartQueueConfig(
        baseUrl = "https://api.yourdomain.com/",
        enableLogging = BuildConfig.DEBUG
    )
)
```

---

### `getCustomerId`

```kotlin
fun getCustomerId(): String
```

Returns the current customer ID. This is either the ID supplied in `SmartQueueConfig.customerId`, or the UUID auto-generated and persisted on first launch.

---

### `joinQueue`

```kotlin
suspend fun joinQueue(
    queueId: String,
    customerName: String
): SmartQueueResult<QueueTicket>
```

Joins the specified queue. Issues a ticket to the customer.

| Parameter | Type | Description |
|---|---|---|
| `queueId` | `String` | The queue's MongoDB ObjectId string |
| `customerName` | `String` | Display name shown in the admin waiting list |

**Returns:** `SmartQueueResult.Success<QueueTicket>` on success, or `SmartQueueResult.Error` with one of the error codes below.

**Error codes:**
| Code | HTTP | Meaning |
|---|---|---|
| `QUEUE_NOT_FOUND` | 404 | No queue exists with this ID |
| `QUEUE_CLOSED` | 409 | Queue status is `paused` or `closed` |
| `ALREADY_IN_QUEUE` | 409 | This customer already has an active ticket |
| `NETWORK_ERROR` | — | No internet connection |

**Example:**
```kotlin
viewModelScope.launch {
    when (val result = SmartQueueSDK.joinQueue(queueId, "Alice")) {
        is SmartQueueResult.Success -> {
            val ticket = result.data
            println("Ticket #${ticket.ticketNumber}, position ${ticket.position}")
        }
        is SmartQueueResult.Error -> {
            println("Error ${result.code}: ${result.message}")
        }
    }
}
```

---

### `leaveQueue`

```kotlin
suspend fun leaveQueue(queueId: String): SmartQueueResult<Unit>
```

Cancels the customer's active ticket in the specified queue.

| Parameter | Type | Description |
|---|---|---|
| `queueId` | `String` | The queue to leave |

**Error codes:**
| Code | HTTP | Meaning |
|---|---|---|
| `QUEUE_NOT_FOUND` | 404 | No queue exists with this ID |
| `NO_ACTIVE_TICKET` | 404 | This customer has no active ticket in this queue |
| `NETWORK_ERROR` | — | No internet connection |

---

### `observePosition`

```kotlin
fun observePosition(
    queueId: String,
    intervalSeconds: Int = 10
): Flow<SmartQueueResult<QueueTicket>>
```

Returns a `Flow` that polls the backend every `intervalSeconds` seconds and emits the customer's current ticket state. The flow runs on `Dispatchers.IO` and emits indefinitely until cancelled.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `queueId` | `String` | — | Queue to observe |
| `intervalSeconds` | `Int` | `10` | Polling interval in seconds |

**Typical usage pattern:** Collect in `viewModelScope`, cancel the coroutine when the customer is called or leaves.

**Example:**
```kotlin
viewModelScope.launch {
    SmartQueueSDK.observePosition(queueId).collect { result ->
        when (result) {
            is SmartQueueResult.Success -> {
                val ticket = result.data
                updateUI(ticket.position, ticket.estimatedWaitSeconds)
                if (ticket.status == "called") {
                    // Navigate to "Your Turn" screen
                    cancel()
                }
            }
            is SmartQueueResult.Error -> showError(result.message)
        }
    }
}
```

---

### `getQueueStatus`

```kotlin
suspend fun getQueueStatus(queueId: String): SmartQueueResult<QueueStatus>
```

Fetches the current public status of a queue without joining it. Useful for a "preview" screen before the customer decides to join.

**Error codes:**
| Code | HTTP | Meaning |
|---|---|---|
| `QUEUE_NOT_FOUND` | 404 | No queue exists with this ID |
| `NETWORK_ERROR` | — | No internet connection |

---

## SmartQueueConfig

```kotlin
data class SmartQueueConfig(
    val baseUrl: String,
    val customerId: String? = null,
    val enableLogging: Boolean = false
)
```

| Field | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | `String` | — | Base URL of the backend, including trailing slash. Example: `"https://api.yourdomain.com/"` |
| `customerId` | `String?` | `null` | Override the auto-generated customer ID. When `null`, a UUID is generated on first launch and persisted in SharedPreferences. |
| `enableLogging` | `Boolean` | `false` | Enables OkHttp request/response logging to Logcat. Set to `BuildConfig.DEBUG` in development. |

---

## Models

### `QueueTicket`

Represents a customer's position in a queue. Returned by `joinQueue()` and emitted by `observePosition()`.

```kotlin
data class QueueTicket(
    val ticketId: String,           // MongoDB ObjectId of the ticket document
    val ticketNumber: Int,          // Monotonically increasing number within the queue
    val status: String,             // "waiting" | "called" | "served" | "cancelled"
    val position: Int,              // Number of customers ahead (0 = next to be served)
    val estimatedWaitSeconds: Int   // position × queue.averageServiceTimeSeconds
)
```

**Status lifecycle:**
```
waiting → called → served
        ↘ cancelled  (customer left voluntarily)
```

---

### `QueueStatus`

Snapshot of a queue's public state. Returned by `getQueueStatus()`.

```kotlin
data class QueueStatus(
    val id: String,                         // Queue ID
    val name: String,                       // Display name
    val status: String,                     // "open" | "paused" | "closed"
    val nowServing: Int,                    // Ticket number currently being served
    val waitingCount: Int,                  // Number of customers currently waiting
    val averageServiceTimeSeconds: Int      // Rolling average used for wait estimates
)
```

---

### `SmartQueueResult<T>`

Sealed class wrapping every SDK response.

```kotlin
sealed class SmartQueueResult<out T> {
    data class Success<T>(val data: T) : SmartQueueResult<T>()
    data class Error(val code: String, val message: String) : SmartQueueResult<Nothing>()
}
```

Always pattern-match on both branches. Never assume success.

```kotlin
when (val result = SmartQueueSDK.joinQueue(queueId, name)) {
    is SmartQueueResult.Success -> { /* result.data: QueueTicket */ }
    is SmartQueueResult.Error   -> { /* result.code, result.message */ }
}
```

---

## Error Codes Reference

| Code | Source | Description |
|---|---|---|
| `QUEUE_NOT_FOUND` | Backend 404 | No queue with the given ID |
| `QUEUE_CLOSED` | Backend 409 | Queue is paused or closed |
| `ALREADY_IN_QUEUE` | Backend 409 | Customer already has an active ticket |
| `NO_ACTIVE_TICKET` | Backend 404 | No active ticket found for this customer |
| `NO_WAITING_TICKETS` | Backend 404 | Admin called next but queue is empty |
| `NETWORK_ERROR` | SDK | `IOException` — no connectivity or timeout |
| `HTTP_401` | Backend | Admin secret is missing or incorrect |
| `HTTP_500` | Backend | Unexpected server error |
| `UNKNOWN_ERROR` | SDK | Any other exception |

---

## Customer ID Persistence

When `SmartQueueConfig.customerId` is `null`, the SDK calls `CustomerIdManager.getOrCreate(context)` which:

1. Opens `SharedPreferences` named `smartqueue_prefs`
2. Reads the key `customer_id`
3. If missing, generates a `UUID.randomUUID()`, saves it, and returns it

The ID persists across app restarts. It is cleared only if the user uninstalls the app or clears app data.

---

## Threading

All `suspend fun` methods are safe to call from any coroutine context. Internally they run on `Dispatchers.IO`. The `observePosition` flow is also forced onto `Dispatchers.IO` via `.flowOn(Dispatchers.IO)`. You can safely collect it on `Dispatchers.Main` or within `viewModelScope`.
