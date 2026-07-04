# Getting Started

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 18+ | Admin portal |
| Android Studio | Hedgehog+ | SDK and demo app |
| MongoDB Atlas | Free tier | Cloud database |

---

## Backend Setup

### 1. Create and activate the virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_TEST_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=smartqueue
TEST_DB_NAME=smartqueue_test
ADMIN_SECRET=dev-admin-secret-change-in-prod
DEFAULT_SERVICE_TIME_SECONDS=300
```

> **Never commit `.env` to version control.** It contains your database credentials.

### 3. Start the server

```bash
uvicorn app.main:app --reload --port 8000
```

The server starts at `http://localhost:8000`. Interactive API docs are available at `http://localhost:8000/docs`.

On startup the server:
1. Connects to MongoDB Atlas
2. Creates all required indexes on the `tickets` and `queues` collections
3. Begins accepting requests

### 4. Verify

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### 5. Run backend tests

```bash
cd backend
pytest tests/ -v
```

Tests run against `MONGO_TEST_URL` and use the `smartqueue_test` database, which is dropped and recreated automatically. Your production data is never touched.

---

## Admin Portal Setup

```bash
cd admin-portal
npm install
npm run dev
# Available at http://localhost:5173
```

Log in with the `ADMIN_SECRET` value from your `.env` file.

---

## Android SDK Integration

The SDK is an Android library module (`sdk/`). To use it in your own app:

### Option A — Local module dependency

Add the `sdk` module to your project's `settings.gradle.kts`:

```kotlin
include(":sdk")
project(":sdk").projectDir = file("../path/to/sdk")
```

Then add the dependency in your app's `build.gradle.kts`:

```kotlin
dependencies {
    implementation(project(":sdk"))
}
```

### Option B — AAR file

Build the AAR:

```bash
./gradlew :sdk:assembleRelease
```

The output is at `sdk/build/outputs/aar/sdk-release.aar`. Copy it into your project's `libs/` folder and add:

```kotlin
dependencies {
    implementation(files("libs/sdk-release.aar"))
    // Required transitive dependencies:
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

### Required permissions

Add to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

For local development against a non-HTTPS backend:

```xml
<application android:usesCleartextTraffic="true" ...>
```

> Remove `usesCleartextTraffic` before releasing to production. Use HTTPS in production.

### Minimum SDK

The SDK requires **Android API 26** (Android 8.0 Oreo) or higher.

---

## Initializing the SDK

Initialize the SDK once, in your `Application.onCreate()`:

```kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SmartQueueSDK.init(
            context = this,
            config = SmartQueueConfig(
                baseUrl = "http://10.0.2.2:8000/",  // emulator → localhost
                enableLogging = BuildConfig.DEBUG
            )
        )
    }
}
```

Register your `Application` subclass in `AndroidManifest.xml`:

```xml
<application android:name=".MyApp" ...>
```

> `10.0.2.2` is the Android emulator's alias for the host machine's `localhost`. For a physical device, replace this with your computer's local IP address (e.g., `http://192.168.1.100:8000/`).

---

## MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with a username and password
3. Under **Network Access**, add `0.0.0.0/0` to allow connections from anywhere
4. Get the connection string: **Database → Connect → Drivers → Python 3.12**
5. Paste the string into your `.env` as `MONGO_URL`, replacing `<username>` and `<password>`
