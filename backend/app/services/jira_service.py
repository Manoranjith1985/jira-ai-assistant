"""
JIRA Cloud REST API v3 service.
All methods accept optional credentials so they can work with per-user settings.
"""
import httpx
from typing import Optional, List, Dict, Any
from fastapi import HTTPException


class JiraService:
    def __init__(self, base_url: str, email: str, api_token: str):
        self.base_url = base_url.rstrip("/")
        self.auth = (email, api_token)
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _client(self) -> httpx.Client:
        return httpx.Client(auth=self.auth, headers=self.headers, timeout=30)

    # ─── Projects ─────────────────────────────────────────────────────────────

    def get_projects(self) -> List[Dict]:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/project/search?maxResults=100")
            r.raise_for_status()
            return r.json().get("values", [])

    def get_project(self, project_key: str) -> Dict:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/project/{project_key}")
            r.raise_for_status()
            return r.json()

    def create_project(self, payload: Dict) -> Dict:
        with self._client() as c:
            r = c.post(f"{self.base_url}/rest/api/3/project", json=payload)
            if r.status_code not in (200, 201):
                raise HTTPException(status_code=r.status_code, detail=r.text)
            return r.json()

    # ─── Issues ───────────────────────────────────────────────────────────────

    def get_issue(self, issue_key: str) -> Dict:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/issue/{issue_key}")
            r.raise_for_status()
            return r.json()

    def create_issue(self, payload: Dict) -> Dict:
        with self._client() as c:
            r = c.post(f"{self.base_url}/rest/api/3/issue", json=payload)
            if r.status_code not in (200, 201):
                raise HTTPException(status_code=r.status_code, detail=r.text)
            return r.json()

    def update_issue(self, issue_key: str, payload: Dict) -> Dict:
        with self._client() as c:
            r = c.put(f"{self.base_url}/rest/api/3/issue/{issue_key}", json=payload)
            r.raise_for_status()
            return {"status": "updated", "key": issue_key}

    def assign_issue(self, issue_key: str, account_id: str) -> Dict:
        with self._client() as c:
            r = c.put(
                f"{self.base_url}/rest/api/3/issue/{issue_key}/assignee",
                json={"accountId": account_id},
            )
            r.raise_for_status()
            return {"status": "assigned"}

    def search_issues(self, jql: str, max_results: int = 50) -> Dict:
        """Search using the new /rest/api/3/search/jql endpoint (replaces deprecated /rest/api/3/issue/search)."""
        fields = "summary,status,assignee,priority,issuetype,project,created,updated"
        with self._client() as c:
            r = c.get(
                f"{self.base_url}/rest/api/3/search/jql",
                params={"jql": jql, "maxResults": max_results, "fields": fields},
            )
            if r.status_code >= 500:
                r.raise_for_status()
            body = r.json()
            if "errorMessages" in body or ("errors" in body and body.get("errors")):
                return {"total": 0, "issues": [], "startAt": 0, "maxResults": max_results}
            # New API uses isLast instead of total — compute total from issues length
            issues = body.get("issues", [])
            total = body.get("total", len(issues))
            return {"total": total, "issues": issues, "startAt": 0, "maxResults": max_results}

    def get_transitions(self, issue_key: str) -> List[Dict]:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions")
            r.raise_for_status()
            return r.json().get("transitions", [])

    def transition_issue(self, issue_key: str, transition_id: str) -> Dict:
        with self._client() as c:
            r = c.post(
                f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions",
                json={"transition": {"id": transition_id}},
            )
            r.raise_for_status()
            return {"status": "transitioned"}

    # ─── Users ────────────────────────────────────────────────────────────────

    def search_users(self, query: str) -> List[Dict]:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/user/search?query={query}")
            r.raise_for_status()
            return r.json()

    def get_myself(self) -> Dict:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/myself")
            r.raise_for_status()
            return r.json()

    # ─── Boards & Sprints ─────────────────────────────────────────────────────

    def get_boards(self, project_key: str) -> List[Dict]:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/agile/1.0/board?projectKeyOrId={project_key}")
            r.raise_for_status()
            return r.json().get("values", [])

    def get_sprints(self, board_id: int) -> List[Dict]:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/agile/1.0/board/{board_id}/sprint?state=active,future")
            r.raise_for_status()
            return r.json().get("values", [])

    def get_sprint_issues(self, sprint_id: int) -> Dict:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}/issue")
            r.raise_for_status()
            return r.json()

    # ─── Bulk Creation ────────────────────────────────────────────────────────

    def create_issue_bulk(self, issues: List[Dict]) -> List[Dict]:
        """Create multiple issues sequentially and return their keys."""
        created = []
        for issue_payload in issues:
            result = self.create_issue(issue_payload)
            created.append(result)
        return created

    # ─── Dashboards ───────────────────────────────────────────────────────────

    def get_dashboards(self) -> List[Dict]:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/api/3/dashboard?maxResults=50")
            r.raise_for_status()
            return r.json().get("dashboards", [])

    def create_dashboard(self, name: str, description: str = "") -> Dict:
        with self._client() as c:
            r = c.post(
                f"{self.base_url}/rest/api/3/dashboard",
                json={
                    "name": name,
                    "description": description,
                    "sharePermissions": [{"type": "loggedin"}],
                },
            )
            if r.status_code not in (200, 201):
                raise HTTPException(status_code=r.status_code, detail=r.text)
            return r.json()

    # ─── Velocity / Analytics ─────────────────────────────────────────────────

    def get_velocity(self, board_id: int) -> Dict:
        with self._client() as c:
            r = c.get(f"{self.base_url}/rest/greenhopper/1.0/rapid/charts/velocity?rapidViewId={board_id}")
            r.raise_for_status()
            return r.json()

    def get_burndown(self, board_id: int, sprint_id: int) -> Dict:
        with self._client() as c:
            r = c.get(
                f"{self.base_url}/rest/greenhopper/1.0/rapid/charts/scopechangeburndownchart"
                f"?rapidViewId={board_id}&sprintId={sprint_id}"
            )
            r.raise_for_status()
            return r.json()
