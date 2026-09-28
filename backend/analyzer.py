"""
IncidentIQ Analysis Agent — models and LLM client.

The analysis agent turns an incident + recalled Hindsight memories into a
structured investigation: root-cause hypotheses with confidence + evidence,
recommended resolution steps, a runbook recommendation and similar-incident
reasoning.

LLM configuration (all via environment — never hard-coded):
  LLM_PROVIDER   = "openai" (default) | "none"
  LLM_MODEL      = model name, default "gpt-4o-mini"
  OPENAI_API_KEY = secret, read from the environment at request time

No secret is ever logged or echoed back to a client. When no LLM key is
configured (LLM_PROVIDER=none), a deterministic heuristic analyzer produces a
genuine (non-faked) signal-based analysis so the workflow degrades honestly
instead of crashing.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Request / response models — the contract IncidentIQ consumes
# ---------------------------------------------------------------------------


class RecalledMemory(BaseModel):
    memoryId: str | None = None
    text: str = ""
    relevance: int = 0
    incidentId: str | None = None
    service: str | None = None
    severity: str | None = None
    rootCause: str | None = None
    resolution: str | None = None
    runbook: str | None = None
    outcome: str | None = None
    resolutionMinutes: int | None = None


class AnalyzeRequest(BaseModel):
    incidentId: str | None = None
    title: str
    service: str
    severity: str
    errorMessage: str = ""
    description: str = ""
    logs: list[str] = []
    detectedAt: str | None = None
    memories: list[RecalledMemory] = []


class Hypothesis(BaseModel):
    id: str
    statement: str
    confidence: int = Field(ge=0, le=100)
    evidence: list[str] = []


class ResolutionStep(BaseModel):
    id: str
    order: int
    action: str
    detail: str


class RunbookRecommendation(BaseModel):
    id: str
    name: str
    matchedIncident: str | None = None
    lastUsed: str | None = None
    successRate: int = Field(default=0, ge=0, le=100)
    steps: list[str] = []


class SimilarIncidentReasoning(BaseModel):
    incidentId: str | None = None
    title: str = ""
    reasoning: str = ""


class EvidenceItem(BaseModel):
    id: str
    label: str
    source: str
    detail: str


class AnalyzeResponse(BaseModel):
    incidentId: str | None = None
    summary: str
    hypotheses: list[Hypothesis]
    resolutionSteps: list[ResolutionStep]
    runbook: RunbookRecommendation | None
    similarIncidentReasoning: list[SimilarIncidentReasoning]
    evidence: list[EvidenceItem]
    generatedBy: str  # "llm:<provider>:<model>" or "heuristic" — honest provenance
    llmUsed: bool


# ---------------------------------------------------------------------------
# LLM configuration — environment only, never hard-coded
# ---------------------------------------------------------------------------


def llm_config() -> dict[str, Any]:
    provider = os.getenv("LLM_PROVIDER", "openai").strip().lower() or "openai"
    model = os.getenv("LLM_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    return {"provider": provider, "model": model, "apiKey": api_key}


def llm_available() -> bool:
    cfg = llm_config()
    return cfg["provider"] != "none" and bool(cfg["apiKey"])


# ---------------------------------------------------------------------------
# Prompt construction — memories are first-class grounding input
# ---------------------------------------------------------------------------


def build_prompt(req: AnalyzeRequest) -> str:
    memory_lines: list[str] = []
    for m in req.memories:
        parts = [f"- memory {m.memoryId or '?'}"]
        if m.incidentId:
            parts.append(f"incident {m.incidentId}")
        if m.service:
            parts.append(f"service {m.service}")
        if m.severity:
            parts.append(f"severity {m.severity}")
        parts.append(f"relevance {m.relevance}%")
        memory_lines.append(" ".join(parts))
        if m.text:
            memory_lines.append(f"  text: {m.text[:1200]}")
        if m.rootCause:
            memory_lines.append(f"  root cause: {m.rootCause}")
        if m.resolution:
            memory_lines.append(f"  resolution: {m.resolution}")
        if m.runbook:
            memory_lines.append(f"  runbook: {m.runbook}")
        if m.outcome:
            memory_lines.append(f"  outcome: {m.outcome}")

    logs = "\n".join(f"  {line}" for line in req.logs[:40]) or "  (none provided)"

    return f"""You are an SRE incident analysis agent for IncidentIQ.

Incident under investigation:
  id: {req.incidentId or "(new)"}
  title: {req.title}
  service: {req.service}
  severity: {req.severity}
  detected at: {req.detectedAt or "(unknown)"}
  error message: {req.errorMessage or "(none)"}
  description: {req.description or "(none)"}

Logs:
{logs}

Recalled Hindsight memories (long-term organizational memory — ground every
hypothesis in these where possible and cite the memory/incident ids):
{chr(10).join(memory_lines) if memory_lines else "  (no memories recalled)"}

Produce a grounded analysis. Rules:
- Confidence must reflect actual signal strength; do not inflate.
- Every hypothesis needs concrete evidence drawn from the logs, error message
  or memories. Cite memory/incident ids when used.
- Resolution steps must be ordered, specific and actionable.
- If memories contain a runbook that matches, recommend it.
- Never invent incidents or memories that are not listed above.

Return ONLY a JSON object with exactly this shape:
{{
  "summary": "one paragraph analysis summary",
  "hypotheses": [
    {{"statement": "...", "confidence": 0-100, "evidence": ["...", "..."]}}
  ],
  "resolutionSteps": [
    {{"action": "...", "detail": "..."}}
  ],
  "runbook": {{"id": "...", "name": "...", "matchedIncident": "...", "successRate": 0-100, "steps": ["..."]}} or null,
  "similarIncidentReasoning": [
    {{"incidentId": "...", "title": "...", "reasoning": "why this history matters here"}}
  ],
  "evidence": [
    {{"label": "...", "source": "log line / memory id / error message", "detail": "..."}}
  ]
}}"""


# ---------------------------------------------------------------------------
# LLM call — OpenAI-compatible chat completions via httpx
# ---------------------------------------------------------------------------

_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = httpx.Timeout(60.0)


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    """Best-effort JSON extraction from an LLM reply."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


async def call_llm(prompt: str) -> tuple[Optional[dict[str, Any]], str]:
    """Returns (parsed_json_or_None, provenance_string). Never raises."""
    cfg = llm_config()
    provenance = f"llm:{cfg['provider']}:{cfg['model']}"
    if cfg["provider"] != "openai" or not cfg["apiKey"]:
        return None, provenance

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            res = await client.post(
                _OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {cfg['apiKey']}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": cfg["model"],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a precise SRE incident analysis agent. Respond with JSON only.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return _extract_json(content), provenance
    except Exception:
        # Never leak exception details (could contain headers/secrets) to callers.
        return None, provenance
