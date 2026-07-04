from pydantic import BaseModel, field_validator


class JoinRequest(BaseModel):
    customer_id: str
    customer_name: str

    @field_validator('customer_name')
    @classmethod
    def customer_name_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Customer name cannot be empty')
        if len(v) > 100:
            raise ValueError('Customer name must be 100 characters or fewer')
        return v


class LeaveRequest(BaseModel):
    customer_id: str


class TicketResponse(BaseModel):
    ticket_id: str
    ticket_number: int
    status: str                  # "waiting" | "called" | "served" | "cancelled"
    position: int
    estimated_wait_seconds: int


class WaitingTicketSummary(BaseModel):
    ticket_number: int
    customer_name: str
    position: int
    waited_seconds: int


class CallNextResponse(BaseModel):
    called_ticket_number: int
    customer_name: str
    remaining_waiting: int
