"""
Main chat endpoint — orchestrates AI + JIRA calls.
"""
import json
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.settings import UserSettings
from app.models.approval import ApprovalRequest
from app.services.ai_service import AIService
from app.services.jira_service import JiraService
from app.services.email_service import send_approval_email
from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageRequest(BaseModel):
    session_id: Optional[int] = None
    message: str


class SessionResponse(BaseModel):
    id: int
    title: str
    updated_at: str


def _get_jira(user_settings: UserSettings) -> Optional[JiraService]:
    if user_settings and user_settings.jira_base_url and user_settings.jira_api_token:
        return JiraService(
            user_settings.jira_base_url,
            user_settings.jira_email or "",
            user_settings.jira_api_token,
        )
    return None


def _get_ai(user_settings: UserSettings) -> Optional[AIService]:
    api_key = (user_settings and user_settings.openai_api_key) or settings.OPENAI_API_KEY
    if api_key:
        return AIService(api_key, model=getattr(user_settings, "ai_model", "gpt-4o") or "gpt-4o")
    return None


@router.get("/sessions", response_model=List[dict])
def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
        .all()
    )
    return [{"id": s.id, "title": s.title, "updated_at": str(s.updated_at)} for s in sessions]


@router.post("/sessions", response_model=dict)
def create_session(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = ChatSession(user_id=current_user.id, title="New Chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title}


@router.get("/sessions/{session_id}/messages", response_model=List[dict])
def get_messages(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [
        {"id": m.id, "role": m.role, "content": m.content, "metadata": m.metadata, "created_at": str(m.created_at)}
        for m in session.messages
    ]


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id, ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted"}


@router.post("/message")
async def send_message(
    req: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Get or create session
    if req.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == req.session_id, ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ChatSession(user_id=current_user.id, title=req.message[:50])
        db.add(session)
        db.flush()

    # Get user settings
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    ai = _get_ai(user_settings)
    jira = _get_jira(user_settings)

    if not ai:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured. Please add it in Settings.")

    # Save user message
    user_msg = ChatMessage(session_id=session.id, role="user", content=req.message)
    db.add(user_msg)

    # Build conversation history (last 20 messages)
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.desc()).limit(20).all()
    history.reverse()
    messages = [{"role": m.role, "content": m.content} for m in history]

    # Parse intent
    intent_data = await ai.parse_chat_intent(req.message)
    intent = intent_data.get("intent", "general")
    entities = intent_data.get("entities", {})
    jira_context = ""
    metadata = {}

    # ─── Handle intent ────────────────────────────────────────────────────────
    try:
        if intent in ("query",) and jira and intent_data.get("jira_jql"):
            jql = intent_data["jira_jql"]
            result = jira.search_issues(jql)
            jira_context = json.dumps(result, indent=2)[:3000]
            ai_response = await ai.summarize_jira_data(result, req.message)

        elif intent == "analytics" and jira:
            project_key = entities.get("project_key")
            chart_type = entities.get("chart_type", "bar")
            boards = jira.get_boards(project_key) if project_key else []
            if boards:
                board_id = boards[0]["id"]
                sprints = jira.get_sprints(board_id)
                if sprints:
                    sprint_id = sprints[0]["id"]
                    if "burndown" in req.message.lower():
                        raw_data = jira.get_burndown(board_id, sprint_id)
                    else:
                        raw_data = jira.get_velocity(board_id)
                    chart_data = await ai.generate_chart_data(raw_data, chart_type, req.message)
                    metadata = {"type": "chart", "chart_type": chart_type, "chart_data": chart_data, "title": req.message}
                    ai_response = f"Here's the {chart_type} chart for your query."
                else:
                    ai_response = "No active sprints found for this project."
            else:
                ai_response = "Could not find board for this project. Please specify the project key."

        elif intent == "access_request":
            token = secrets.token_urlsafe(32)
            approval = ApprovalRequest(
                requester_id=current_user.id,
                request_type="jira_access",
                details=req.message,
                token=token,
                status="pending",
            )
            db.add(approval)
            db.flush()
            if settings.ADMIN_EMAIL and settings.SMTP_USER:
                await send_approval_email(
                    settings.ADMIN_EMAIL,
                    current_user.full_name,
                    "jira_access",
                    req.message,
                    token,
                    settings.FRONTEND_URL,
                )
            ai_response = "✅ I've sent an approval request to the Admin team. You'll be notified once it's reviewed."

        elif intent == "dashboard_request":
            token = secrets.token_urlsafe(32)
            approval = ApprovalRequest(
                requester_id=current_user.id,
                request_type="dashboard_creation",
                details=req.message,
                token=token,
                status="pending",
            )
            db.add(approval)
            db.flush()
            if settings.ADMIN_EMAIL and settings.SMTP_USER:
                await send_approval_email(
                    settings.ADMIN_EMAIL,
                    current_user.full_name,
                    "dashboard_creation",
                    req.message,
                    token,
                    settings.FRONTEND_URL,
                )
            ai_response = "✅ Dashboard creation request sent to Admin. I'll create it once approved."

        else:
            # General conversation with optional JIRA context
            if jira and entities.get("issue_key"):
                try:
                    issue = jira.get_issue(entities["issue_key"])
                    jira_context = json.dumps(issue, indent=2)[:2000]
                except Exception:
                    pass
            ai_response = await ai.chat(messages + [{"role": "user", "content": req.message}], jira_context)

    except Exception as e:
        ai_response = f"I encountered an error processing your request: {str(e)}"

    # Auto-title session on first message
    if len(history) == 0:
        session.title = req.message[:60] + ("..." if len(req.message) > 60 else "")

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=ai_response,
        metadata=metadata if metadata else None,
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "session_id": session.id,
        "message": {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": ai_response,
            "metadata": metadata if metadata else None,
        },
    }
