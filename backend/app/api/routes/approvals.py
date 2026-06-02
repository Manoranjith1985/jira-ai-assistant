from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.approval import ApprovalRequest
from app.models.user import User

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("/")
def list_approvals(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    approvals = db.query(ApprovalRequest).order_by(ApprovalRequest.created_at.desc()).all()
    return [{
        "id": a.id,
        "requester": a.requester.full_name,
        "type": a.request_type,
        "details": a.details,
        "status": a.status,
        "created_at": str(a.created_at),
    } for a in approvals]


@router.get("/token/{token}")
def get_approval_by_token(token: str, db: Session = Depends(get_db)):
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.token == token).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return {
        "id": approval.id,
        "type": approval.request_type,
        "details": approval.details,
        "status": approval.status,
        "requester": approval.requester.full_name,
    }


@router.post("/token/{token}/action")
def process_approval_by_token(token: str, action: str, db: Session = Depends(get_db)):
    """Called when admin clicks Approve/Reject in email."""
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.token == token).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Not found")
    if approval.status != "pending":
        return {"status": approval.status, "message": "Already processed"}
    approval.status = "approved" if action == "approve" else "rejected"
    approval.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": approval.status, "message": f"Request {approval.status}"}


@router.put("/{approval_id}")
def update_approval(
    approval_id: int,
    action: str,
    note: str = "",
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    approval = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Not found")
    approval.status = "approved" if action == "approve" else "rejected"
    approval.admin_note = note
    approval.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": approval.status}
