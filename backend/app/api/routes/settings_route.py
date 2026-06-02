from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.settings import UserSettings
from app.services.jira_service import JiraService
from app.services.ai_service import AIService

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdateRequest(BaseModel):
    jira_base_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None
    openai_api_key: Optional[str] = None
    ai_model: Optional[str] = None


@router.get("/")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not s:
        return {}
    return {
        "jira_base_url": s.jira_base_url or "",
        "jira_email": s.jira_email or "",
        "jira_api_token": "***" if s.jira_api_token else "",
        "openai_api_key": "***" if s.openai_api_key else "",
        "ai_model": s.ai_model or "gpt-4o",
    }


@router.put("/")
def update_settings(req: SettingsUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not s:
        s = UserSettings(user_id=current_user.id)
        db.add(s)

    if req.jira_base_url is not None:
        s.jira_base_url = req.jira_base_url
    if req.jira_email is not None:
        s.jira_email = req.jira_email
    if req.jira_api_token and req.jira_api_token != "***":
        s.jira_api_token = req.jira_api_token
    if req.openai_api_key and req.openai_api_key != "***":
        s.openai_api_key = req.openai_api_key
    if req.ai_model is not None:
        s.ai_model = req.ai_model

    db.commit()
    return {"status": "saved"}


class TestJiraRequest(BaseModel):
    jira_base_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_api_token: Optional[str] = None


@router.post("/test-jira")
def test_jira_connection(
    req: TestJiraRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    # Prefer credentials passed in request body; fall back to saved ones
    base_url = (req and req.jira_base_url) or (s and s.jira_base_url)
    email = (req and req.jira_email) or (s and s.jira_email) or ""
    token = (req and req.jira_api_token and req.jira_api_token != "***" and req.jira_api_token) \
            or (s and s.jira_api_token)

    if not base_url or not token:
        raise HTTPException(status_code=400, detail="JIRA credentials not configured. Fill in all fields and try again.")
    try:
        jira = JiraService(base_url, email, token)
        me = jira.get_myself()
        return {"status": "connected", "user": me.get("displayName"), "email": me.get("emailAddress")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")
