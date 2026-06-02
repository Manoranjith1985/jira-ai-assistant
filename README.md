# JIRA AI Assistant

An intelligent conversational platform integrated with Atlassian JIRA — manage projects, assign tickets, generate analytics, and create dashboards through natural language.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python FastAPI |
| Database | PostgreSQL (SQLAlchemy) |
| AI | OpenAI GPT-4o |
| Charts | Chart.js + react-chartjs-2 |
| Deployment | Render.com |

## Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (or use Docker)

### Option A — Docker (recommended)
```bash
docker-compose up --build
```
App will be at http://localhost:5173

### Option B — Manual

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your values
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

1. **Register an account** at http://localhost:5173/register
2. Go to **Settings** → enter your JIRA credentials:
   - JIRA Base URL: `https://yourcompany.atlassian.net`
   - JIRA Email: your Atlassian email
   - JIRA API Token: from https://id.atlassian.com/manage-profile/security/api-tokens
3. Enter your **OpenAI API key** (from https://platform.openai.com/api-keys)
4. Click **Test JIRA Connection** to verify

## Features

- **AI Chat** — Natural language JIRA queries, ticket lookup, status updates
- **Project Creator** — AI generates full Epic → Story → Task → Sub-task structure
- **User Management** — RBAC (Admin, PM, Member)
- **Project Teams** — Team creation and member allocation
- **Analytics** — Velocity, burndown, workload charts
- **Approval Workflows** — Email-based admin approval for access/dashboard requests
- **Settings** — Encrypted credential storage per user

## Deployment (Render.com)

1. Push to GitHub
2. Go to https://render.com → New → Blueprint
3. Connect your repo — Render auto-reads `render.yaml`
4. Set environment variables as needed
5. Deploy!

## API Docs

Once running, visit: http://localhost:8000/docs (Swagger UI)
