from sqlalchemy.orm import Session
from app.core.database import get_db
from fastapi import Depends


async def get_current_user(db: Session = Depends(get_db)):
    """Demo mode: no auth required. Returns the first user in the DB."""
    from app.models.user import User
    user = db.query(User).first()
    if not user:
        # Create a default demo user if none exists
        from app.models.settings import UserSettings
        from passlib.context import CryptContext
        pwd = CryptContext(schemes=["bcrypt"], deprecated="auto").hash("demo1234")
        user = User(
            email="demo@jiraai.com",
            full_name="Demo User",
            hashed_password=pwd,
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add(UserSettings(user_id=user.id))
        db.commit()
        db.refresh(user)
    return user


# Keep stubs so imports don't break
async def require_admin(current_user=Depends(get_current_user)):
    return current_user

async def require_pm_or_admin(current_user=Depends(get_current_user)):
    return current_user
