from datetime import datetime
from pydantic import BaseModel, field_validator


class QueueCreate(BaseModel):
    name: str
    average_service_time_seconds: int = 300

    @field_validator('name')
    @classmethod
    def name_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Queue name cannot be empty')
        if len(v) > 100:
            raise ValueError('Queue name must be 100 characters or fewer')
        return v


class QueueResponse(BaseModel):
    id: str
    name: str
    status: str                        # "open" | "paused" | "closed"
    now_serving: int
    waiting_count: int
    average_service_time_seconds: int
    created_at: datetime


class QueueStatusUpdate(BaseModel):
    status: str                        # "open" | "paused" | "closed"


class ErrorResponse(BaseModel):
    error: str
    message: str
