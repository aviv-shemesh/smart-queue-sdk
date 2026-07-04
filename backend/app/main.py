from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect, disconnect, get_db, init_indexes
from app.routers import queues, admin, analytics
from app.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    await init_indexes()
    await seed_demo_data(get_db())
    yield
    await disconnect()


app = FastAPI(title="Smart Queue API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(queues.router)
app.include_router(admin.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
