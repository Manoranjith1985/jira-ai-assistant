"""Email service for admin approval workflows."""
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


async def send_approval_email(
    to_email: str,
    requester_name: str,
    request_type: str,
    details: str,
    approval_token: str,
    frontend_url: str,
):
    approve_url = f"{frontend_url}/approve/{approval_token}?action=approve"
    reject_url = f"{frontend_url}/approve/{approval_token}?action=reject"

    html = f"""
    <h2>New {request_type.replace('_', ' ').title()} Request</h2>
    <p><strong>Requested by:</strong> {requester_name}</p>
    <p><strong>Details:</strong> {details}</p>
    <br>
    <a href="{approve_url}" style="background:#22c55e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-right:10px;">✅ Approve</a>
    <a href="{reject_url}" style="background:#ef4444;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">❌ Reject</a>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[JIRA AI] Approval Required: {request_type.replace('_', ' ').title()}"
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False
