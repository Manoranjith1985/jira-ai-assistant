"""
OpenAI GPT-4o service for chat, project generation, and analytics.
"""
import json
from typing import List, Dict, Optional, AsyncGenerator
from openai import AsyncOpenAI


SYSTEM_PROMPT = """You are a JIRA AI Assistant — an expert at Atlassian JIRA project management.
You help users:
- Query and manage JIRA projects, epics, stories, tasks, sub-tasks
- Create complete project structures from descriptions
- Assign tickets and manage team workloads
- Generate analytics and insights (velocity, burndown, workload)
- Request JIRA access or dashboard creation (triggers approval workflow)

When users ask to CREATE something in JIRA, respond with a JSON block wrapped in ```json ``` with:
- "action": one of [create_project, create_issues, assign_issue, transition_issue, request_access, create_dashboard]
- "payload": the data needed

When users ask ANALYTICS questions (velocity, burndown, workload), respond with a JSON block:
- "action": "chart"
- "chart_type": one of [bar, line, pie, burndown]
- "title": chart title
- "data": chart data

For all other queries, respond naturally in markdown.

Always be concise and professional. If you need more information, ask one focused question.
"""


class AIService:
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def chat(
        self,
        messages: List[Dict],
        system_context: Optional[str] = None,
    ) -> str:
        system = SYSTEM_PROMPT
        if system_context:
            system += f"\n\nCurrent JIRA context:\n{system_context}"

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system}] + messages,
            temperature=0.3,
            max_tokens=2048,
        )
        return response.choices[0].message.content

    async def generate_project_structure(self, description: str) -> Dict:
        """Generate a full JIRA project structure from a description."""
        prompt = f"""Generate a complete JIRA project structure for the following project description.
Return ONLY a valid JSON object with this exact structure:

{{
  "project_name": "...",
  "project_key": "ABBR",  // 2-5 uppercase letters
  "description": "...",
  "epics": [
    {{
      "name": "Epic name",
      "description": "...",
      "stories": [
        {{
          "name": "Story name",
          "description": "As a user, I want...",
          "story_points": 3,
          "tasks": [
            {{
              "name": "Task name",
              "description": "...",
              "subtasks": ["Subtask 1", "Subtask 2"]
            }}
          ]
        }}
      ]
    }}
  ]
}}

Project description: {description}
"""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    async def parse_chat_intent(self, message: str, context: str = "") -> Dict:
        """Parse the intent of a chat message and extract structured actions."""
        prompt = f"""Analyze this JIRA assistant message and return a JSON with:
{{
  "intent": "query|create|assign|transition|analytics|access_request|dashboard_request|general",
  "entities": {{
    "project_key": "...",
    "issue_key": "...",
    "user_name": "...",
    "status": "...",
    "chart_type": "..."
  }},
  "requires_jira": true/false,
  "jira_jql": "JQL query if needed, else null"
}}

Message: {message}
Context: {context}
"""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    async def summarize_jira_data(self, data: Dict, question: str) -> str:
        """Summarize raw JIRA API data into a helpful response."""
        prompt = f"""Given this JIRA data, answer the user's question clearly and concisely.
Format nicely using markdown tables or lists where appropriate.

User question: {question}

JIRA data:
{json.dumps(data, indent=2)[:4000]}
"""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return response.choices[0].message.content

    async def generate_chart_data(self, jira_data: Dict, chart_type: str, title: str) -> Dict:
        """Transform JIRA data into Chart.js compatible chart data."""
        prompt = f"""Transform this JIRA data into Chart.js compatible data for a {chart_type} chart titled "{title}".
Return ONLY valid JSON:
{{
  "labels": [...],
  "datasets": [
    {{
      "label": "...",
      "data": [...],
      "backgroundColor": [...]
    }}
  ]
}}

JIRA data: {json.dumps(jira_data, indent=2)[:3000]}
"""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
