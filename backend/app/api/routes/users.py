from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_admin, hash_password
from app.models.user import User
from app.models.project import ProjectTeam, TeamMember

router = APIRouter(prefix="/users", tags=["users"])


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "member"


# ─── User Management (Admin) ──────────────────────────────────────────────────

@router.get("/", response_model=List[dict])
def list_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "is_active": u.is_active, "created_at": str(u.created_at)} for u in users]


@router.post("/", response_model=dict)
def create_user(req: CreateUserRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}


@router.put("/{user_id}", response_model=dict)
def update_user(user_id: int, req: UpdateUserRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.full_name is not None:
        user.full_name = req.full_name
    if req.role is not None:
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active
    db.commit()
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "is_active": user.is_active}


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}


# ─── Teams ────────────────────────────────────────────────────────────────────

@router.get("/teams", response_model=List[dict])
def list_teams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    teams = db.query(ProjectTeam).all()
    return [{
        "id": t.id, "name": t.name, "jira_project_key": t.jira_project_key,
        "description": t.description, "member_count": len(t.members)
    } for t in teams]


class CreateTeamRequest(BaseModel):
    name: str
    jira_project_key: Optional[str] = None
    description: Optional[str] = None
    member_ids: List[int] = []


@router.post("/teams", response_model=dict)
def create_team(req: CreateTeamRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = ProjectTeam(
        name=req.name,
        jira_project_key=req.jira_project_key,
        description=req.description,
        created_by=current_user.id,
    )
    db.add(team)
    db.flush()
    for uid in req.member_ids:
        db.add(TeamMember(team_id=team.id, user_id=uid))
    db.commit()
    db.refresh(team)
    return {"id": team.id, "name": team.name, "message": "Team created"}


@router.get("/teams/{team_id}", response_model=dict)
def get_team(team_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    members = [{
        "id": m.user.id, "full_name": m.user.full_name,
        "email": m.user.email, "role_in_team": m.role_in_team
    } for m in team.members]
    return {"id": team.id, "name": team.name, "jira_project_key": team.jira_project_key, "members": members}


@router.post("/teams/{team_id}/members")
def add_team_member(team_id: int, user_id: int, role_in_team: str = "member", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = db.query(ProjectTeam).filter(ProjectTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    existing = db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in team")
    db.add(TeamMember(team_id=team_id, user_id=user_id, role_in_team=role_in_team))
    db.commit()
    return {"status": "added"}


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(team_id: int, user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"status": "removed"}
