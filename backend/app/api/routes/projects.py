"""
JIRA project management — create, query, AI-generate structure.
"""
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user, require_pm_or_admin
from app.models.user import User
from app.models.settings import UserSettings
from app.services.ai_service import AIService
from app.services.jira_service import JiraService
from app.core.config import settings

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_services(user_settings: UserSettings):
    ai_key = (user_settings and user_settings.openai_api_key) or settings.OPENAI_API_KEY
    jira_ok = user_settings and user_settings.jira_base_url and user_settings.jira_api_token
    ai = AIService(ai_key) if ai_key else None
    jira = JiraService(user_settings.jira_base_url, user_settings.jira_email, user_settings.jira_api_token) if jira_ok else None
    return ai, jira


class GenerateProjectRequest(BaseModel):
    description: str


class CreateProjectRequest(BaseModel):
    structure: dict  # AI-generated structure
    lead_account_id: str = ""


@router.get("/")
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _get_services(user_settings)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    return jira.get_projects()


@router.get("/{project_key}")
def get_project(project_key: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _get_services(user_settings)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    return jira.get_project(project_key)


@router.get("/{project_key}/issues")
def get_project_issues(
    project_key: str,
    jql: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _get_services(user_settings)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    query = jql or f"project = {project_key} ORDER BY created DESC"
    return jira.search_issues(query)


@router.post("/generate")
async def generate_project_structure(
    req: GenerateProjectRequest,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    """AI generates a project structure from a description (does NOT create in JIRA yet)."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    ai, _ = _get_services(user_settings)
    if not ai:
        raise HTTPException(status_code=400, detail="AI not configured")
    structure = await ai.generate_project_structure(req.description)
    return {"structure": structure}


@router.post("/create-from-structure")
async def create_from_structure(
    req: CreateProjectRequest,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    """Create JIRA project + all epics/stories/tasks from AI-generated structure."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _get_services(user_settings)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")

    structure = req.structure
    project_key = structure.get("project_key", "PROJ")

    # 1. Resolve project lead — use provided ID or fall back to current JIRA user
    lead_id = req.lead_account_id
    if not lead_id:
        try:
            myself = jira.get_myself()
            lead_id = myself.get("accountId", "")
        except Exception:
            pass

    project_payload = {
        "key": project_key,
        "name": structure.get("project_name", "New Project"),
        "description": structure.get("description", ""),
        "projectTypeKey": "software",
        "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-scrum-template",
        "leadAccountId": lead_id,
    }

    try:
        created_project = jira.create_project(project_payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Project creation failed: {str(e)}")

    created_issues = []
    for epic in structure.get("epics", []):
        # Create epic
        epic_issue = jira.create_issue({
            "fields": {
                "project": {"key": project_key},
                "summary": epic["name"],
                "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": epic.get("description", "")}]}]},
                "issuetype": {"name": "Epic"},
            }
        })
        epic_key = epic_issue.get("key")

        for story in epic.get("stories", []):
            story_issue = jira.create_issue({
                "fields": {
                    "project": {"key": project_key},
                    "summary": story["name"],
                    "description": {"type": "doc", "version": 1, "content": [{"type": "paragraph", "content": [{"type": "text", "text": story.get("description", "")}]}]},
                    "issuetype": {"name": "Story"},
                    # Epic link omitted — requires Premium plan
                }
            })
            story_key = story_issue.get("key")
            created_issues.append(story_key)

            for task in story.get("tasks", []):
                task_issue = jira.create_issue({
                    "fields": {
                        "project": {"key": project_key},
                        "summary": task["name"],
                        "issuetype": {"name": "Task"},
                        # parent omitted — requires Premium plan
                    }
                })
                task_key = task_issue.get("key")
                created_issues.append(task_key)

    return {
        "project": created_project,
        "issues_created": len(created_issues),
        "message": f"Project {project_key} created with full structure!",
    }


@router.get("/{project_key}/boards")
def get_boards(project_key: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    _, jira = _get_services(user_settings)
    if not jira:
        raise HTTPException(status_code=400, detail="JIRA not configured")
    return jira.get_boards(project_key)
