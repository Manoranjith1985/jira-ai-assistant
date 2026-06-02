from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from cryptography.fernet import Fernet
import os, base64


def _get_fernet():
    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        # Generate a default key (in production this MUST come from env)
        key = base64.urlsafe_b64encode(b"jira-ai-assistant-default-key-32b")[:44]
    return Fernet(key if isinstance(key, bytes) else key.encode())


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Encrypted JIRA credentials
    _jira_base_url = Column("jira_base_url", Text, nullable=True)
    _jira_email = Column("jira_email", Text, nullable=True)
    _jira_api_token = Column("jira_api_token", Text, nullable=True)

    # Encrypted AI key
    _openai_api_key = Column("openai_api_key", Text, nullable=True)

    # AI model preference
    ai_model = Column(String, default="gpt-4o")

    user = relationship("User", back_populates="settings")

    def _encrypt(self, value: str) -> str:
        if not value:
            return value
        return _get_fernet().encrypt(value.encode()).decode()

    def _decrypt(self, value: str) -> str:
        if not value:
            return value
        try:
            return _get_fernet().decrypt(value.encode()).decode()
        except Exception:
            return value

    @property
    def jira_base_url(self):
        return self._decrypt(self._jira_base_url)

    @jira_base_url.setter
    def jira_base_url(self, v):
        self._jira_base_url = self._encrypt(v)

    @property
    def jira_email(self):
        return self._decrypt(self._jira_email)

    @jira_email.setter
    def jira_email(self, v):
        self._jira_email = self._encrypt(v)

    @property
    def jira_api_token(self):
        return self._decrypt(self._jira_api_token)

    @jira_api_token.setter
    def jira_api_token(self, v):
        self._jira_api_token = self._encrypt(v)

    @property
    def openai_api_key(self):
        return self._decrypt(self._openai_api_key)

    @openai_api_key.setter
    def openai_api_key(self, v):
        self._openai_api_key = self._encrypt(v)
