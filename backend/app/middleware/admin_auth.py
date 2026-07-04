from fastapi import Header, HTTPException
from app.config import settings


async def require_admin(x_admin_secret: str = Header(default=None)):
    if x_admin_secret is None or x_admin_secret != settings.admin_secret:
        raise HTTPException(
            status_code=401,
            detail={"error": "UNAUTHORIZED", "message": "Invalid admin secret."},
        )
