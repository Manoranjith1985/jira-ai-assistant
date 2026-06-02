from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.routes import auth, chat, projects, users, settings_route, analytics, approvals

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered JIRA assistant with natural language interface",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(settings_route.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(approvals.router, prefix="/api")


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} v{settings.APP_VERSION}", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
