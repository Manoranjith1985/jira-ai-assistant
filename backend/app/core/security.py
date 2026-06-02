from sqlalchemy.orm import Session
from app.core.database import get_db
from fastapi import Depends
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Keep these so existing imports in auth.py don't break
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta=None) -> str:
    return "demo-token"

def decode_token(token: str):
    return {"sub": "1"}


async def get_current_user(db: Session = Depends(get_db)):
    """Demo mode — no auth required. Returns first user, auto-creates if none."""
    from app.models.user import User
    user = db.query(User).first()
    if not user:
        from app.models.settings import UserSettings
        user = User(
            email="demo@jiraai.com",
            full_name="Demo User",
            hashed_password=hash_password("demo1234"),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add(UserSettings(user_id=user.id))
        db.commit()
        db.refresh(user)
    return user


async def require_admin(current_user=Depends(get_current_user)):
    return current_user

async def require_pm_or_admin(current_user=Depends(get_current_user)):
    return current_user
