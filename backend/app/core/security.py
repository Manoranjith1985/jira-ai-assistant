from sqlalchemy.orm import Session
from app.core.database import get_db
from fastapi import Depends
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta=None) -> str:
    return "demo-token"

def decode_token(token: str):
    return {"sub": "1"}


async def get_current_user(db: Session = Depends(get_db)):
    """Demo mode — no auth. Returns first user, auto-creates with env var credentials."""
    from app.models.user import User
    from app.models.settings import UserSettings
    from app.core.config import settings

    user = db.query(User).first()
    if not user:
        user = User(
            email=settings.JIRA_EMAIL or "demo@jiraai.com",
            full_name="Manoranjith Kumar",
            hashed_password=hash_password("demo1234"),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.flush()

        s = UserSettings(user_id=user.id)
        if settings.JIRA_BASE_URL:
            s.jira_base_url = settings.JIRA_BASE_URL
        if settings.JIRA_EMAIL:
            s.jira_email = settings.JIRA_EMAIL
        if settings.JIRA_API_TOKEN:
            s.jira_api_token = settings.JIRA_API_TOKEN
        if settings.OPENAI_API_KEY:
            s.openai_api_key = settings.OPENAI_API_KEY
        s.ai_model = "gpt-4o"
        db.add(s)
        db.commit()
        db.refresh(user)
    else:
        # Keep settings in sync with env vars if they're not set
        s = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if not s:
            s = UserSettings(user_id=user.id)
            db.add(s)
        changed = False
        if not s.jira_api_token and settings.JIRA_API_TOKEN:
            s.jira_base_url = settings.JIRA_BASE_URL
            s.jira_email = settings.JIRA_EMAIL
            s.jira_api_token = settings.JIRA_API_TOKEN
            changed = True
        if not s.openai_api_key and settings.OPENAI_API_KEY:
            s.openai_api_key = settings.OPENAI_API_KEY
            changed = True
        if changed:
            db.commit()

    return user


async def require_admin(current_user=Depends(get_current_user)):
    return current_user

async def require_pm_or_admin(current_user=Depends(get_current_user)):
    return current_user
