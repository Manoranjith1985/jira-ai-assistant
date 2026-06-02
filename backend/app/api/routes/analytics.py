"""Analytics routes — workload, velocity, burndown, dashboards."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.settings import UserSettings
from app.services.jira_service import JiraService
from app.services.ai_service import AIService
from app.core.config import settings

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _services(user_settings):
    ai_key = (user_settings and user_settings.openai_api_key) or settings.OPENAI_API_KEY
    jira_ok = user_settings and user_settings.jira_base_url and user_settings.jira_api_token
    ai = AIService(ai_key) if ai_key else None
    jira = JiraService(user_settings.jira_base_url, user_settings.jira_email, user_settings.jira_api_token) if jira_ok else None
    return ai, jira


@router.get("/workload")
def get_workload(project_key: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    us = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _services(us)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    issues = jira.search_issues(f"project = {project_key} AND assignee is not EMPTY AND statusCategory != Done")
    workload = {}
    for issue in issues.get("issues", []):
        assignee = issue["fields"].get("assignee")
        if assignee:
            name = assignee.get("displayName", "Unknown")
            workload[name] = workload.get(name, 0) + 1
    labels = list(workload.keys())
    data = list(workload.values())
    return {
        "chart_type": "bar",
        "title": f"Workload Distribution — {project_key}",
        "data": {
            "labels": labels,
            "datasets": [{"label": "Open Issues", "data": data, "backgroundColor": "#6366f1"}],
        },
    }


@router.get("/velocity/{board_id}")
def get_velocity(board_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    us = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _services(us)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    raw = jira.get_velocity(board_id)
    sprints = raw.get("sprints", [])
    velocities = raw.get("velocityStatEntries", {})
    labels = [s.get("name", f"Sprint {s.get('id')}") for s in sprints]
    completed = [velocities.get(str(s["id"]), {}).get("completed", {}).get("value", 0) for s in sprints]
    estimated = [velocities.get(str(s["id"]), {}).get("estimated", {}).get("value", 0) for s in sprints]
    return {
        "chart_type": "bar",
        "title": "Velocity Chart",
        "data": {
            "labels": labels,
            "datasets": [
                {"label": "Estimated", "data": estimated, "backgroundColor": "#a5b4fc"},
                {"label": "Completed", "data": completed, "backgroundColor": "#6366f1"},
            ],
        },
    }


@router.get("/burndown/{board_id}/{sprint_id}")
def get_burndown(board_id: int, sprint_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    us = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _services(us)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    raw = jira.get_burndown(board_id, sprint_id)
    changes = raw.get("changes", {})
    labels = sorted(changes.keys())
    values = [sum(v.get("column", {}).values()) for k in labels for v in [changes[k]]]
    return {
        "chart_type": "line",
        "title": "Burndown Chart",
        "data": {
            "labels": labels,
            "datasets": [{"label": "Remaining Points", "data": values, "borderColor": "#6366f1", "fill": False}],
        },
    }


@router.get("/dashboards")
def list_dashboards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    us = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _services(us)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    return jira.get_dashboards()


class CreateDashboardRequest(BaseModel):
    name: str
    description: str = ""


@router.post("/dashboards")
def create_dashboard(req: CreateDashboardRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    us = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _services(us)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    return jira.create_dashboard(req.name, req.description)
