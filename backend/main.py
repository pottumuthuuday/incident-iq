"""
IncidentIQ FastAPI analysis backend.

Endpoints:
  GET  /health   → service + LLM availability (no secrets)
  POST /analyze  → the full analysis agent

The agent receives the incident AND the Hindsight memories recalled by the
Next.js server (Hindsight remains the long-term memory layer — this service
never stores or fakes memories). Every analysis cites what it used.

If the LLM call fails for any reason, the response falls back to a
deterministic signal-based heuristic analysis (generatedBy: "heuristic") so
the workflow degrades honestly instead of crashing.
"""

from __future__ import annotations

import re
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analyzer import (
    AnalyzeRequest,
    AnalyzeResponse,
    EvidenceItem,
    Hypothesis,
    ResolutionStep,
    RunbookRecommendation,
    SimilarIncidentReasoning,
    build_prompt,
    call_llm,
    llm_config,
)

app = FastAPI(title="IncidentIQ Analysis API", version="1.0.0")

# The Next.js server (not the browser) calls this service; CORS stays tight.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    cfg = llm_config()
    return {
        "status": "ok",
        "service": "incidentiq-analysis",
        "llm": {
            "provider": cfg["provider"],
            "model": cfg["model"],
            # Availability only — never the key itself.
            "apiKeyConfigured": bool(cfg["apiKey"]),
        },
    }


# ---------------------------------------------------------------------------
# Heuristic analyzer — deterministic, signal-based, honest fallback
# ---------------------------------------------------------------------------

_SEVERITY_BASE = {"critical": 70, "high": 55, "medium": 40, "low": 25}

_SIGNAL_PATTERNS: list[tuple[str, str, int]] = [
    (r"pool exhaust|connection pool|maxclients|max number of clients", "Resource saturation (pool/client limit)", 25),
    (r"timeout|timed out|deadline exceeded", "Timeout signature", 15),
    (r"502|503|504", "Gateway/upstream availability error", 15),
    (r"oom|out of memory|memory limit", "Memory exhaustion", 20),
    (r"jwks|jwt|token|auth|signature", "Authentication/key subsystem", 15),
    (r"redis|cache", "Cache/Redis layer", 12),
    (r"deploy|release|rollout|canary|migration", "Recent change (deploy/migration) correlation", 20),
    (r"retry storm|retries", "Retry amplification", 12),
    (r"latency|p99|slow query|seq scan", "Latency/query-plan regression", 12),
]


def _matches(text: str) -> list[tuple[str, str, int]]:
    lower = text.lower()
    return [(pat, label, bump) for pat, label, bump in _SIGNAL_PATTERNS if re.search(pat, lower)]


def _heuristic_analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    signals = _matches(f"{req.errorMessage} {req.description} {' '.join(req.logs)}")
    signal_labels = [label for _, label, _ in signals]
    total_bump = min(25, sum(bump for _, _, bump in signals))

    hypotheses: list[Hypothesis] = []
    evidence: list[EvidenceItem] = []

    # Memory-driven hypothesis — the top recalled memory is real signal.
    if req.memories:
        top = max(req.memories, key=lambda m: m.relevance)
        conf = min(92, _SEVERITY_BASE.get(req.severity.lower(), 40) + total_bump + 10)
        ev: list[str] = []
        if top.rootCause:
            ev.append(f"Top recalled memory ({top.incidentId or top.memoryId}, {top.relevance}% match) recorded root cause: {top.rootCause}")
        if top.resolution:
            ev.append(f"That incident resolved via: {top.resolution}")
        ev.append(f"Error signature overlaps the retained incident pattern ({top.relevance}% Hindsight relevance).")
        hypotheses.append(
            Hypothesis(
                id="hyp-memory",
                statement=(f"Same failure mode as {top.incidentId or 'a previously retained incident'}: {top.rootCause or top.text[:140]}"),
                confidence=conf,
                evidence=ev,
            )
        )
        evidence.append(
            EvidenceItem(
                id="ev-memory",
                label=f"Memory match: {top.incidentId or top.memoryId} ({top.relevance}%)",
                source="Hindsight recall (incidentiq memory bank)",
                detail=(top.rootCause or top.text[:200]),
            )
        )

    # Signal-driven hypothesis from logs/error text.
    if signal_labels:
        conf = min(85, _SEVERITY_BASE.get(req.severity.lower(), 40) + total_bump)
        ev = [f"Error signature matches: {label}" for label in signal_labels[:4]]
        if req.logs:
            ev.append(f"{len(req.logs)} log lines provided; first: {req.logs[0][:120]}")
        hypotheses.append(
            Hypothesis(
                id="hyp-signals",
                statement=f"{' + '.join(signal_labels[:3])} driving the {req.service} failure.",
                confidence=conf,
                evidence=ev,
            )
        )
        evidence.append(
            EvidenceItem(
                id="ev-error",
                label="Error signature analysis",
                source="incident error message + logs",
                detail=req.errorMessage[:200] or req.description[:200],
            )
        )
    elif not hypotheses:
        hypotheses.append(
            Hypothesis(
                id="hyp-insufficient",
                statement="Insufficient signal for a confident root cause — manual investigation required.",
                confidence=10,
                evidence=["No recalled memories matched and no known error signatures were found in the provided inputs."],
            )
        )

    # Resolution steps: derive from the memory's recorded resolution when available.
    steps: list[ResolutionStep] = []
    if req.memories and req.memories[0].resolution:
        steps.append(
            ResolutionStep(
                id="step-1",
                order=1,
                action=f"Apply the resolution recorded for {req.memories[0].incidentId or 'the matching incident'}",
                detail=req.memories[0].resolution,
            )
        )
    order = len(steps) + 1
    for _, label, _ in signals[:3]:
        steps.append(
            ResolutionStep(
                id=f"step-{order}",
                order=order,
                action=f"Mitigate: {label.lower()}",
                detail=f"Address the observed '{label}' signal on {req.service}, then verify recovery with service-level metrics.",
            )
        )
        order += 1
    steps.append(
        ResolutionStep(
            id=f"step-{order}",
            order=order,
            action="Validate recovery and capture learnings",
            detail="Watch error rate/latency for 10 minutes post-mitigation, then document the post-mortem and retain it to Hindsight.",
        )
    )

    # Runbook: straight from the best memory when it carries one.
    runbook: RunbookRecommendation | None = None
    mem_with_runbook = next((m for m in req.memories if m.runbook), None)
    if mem_with_runbook:
        rb_text = mem_with_runbook.runbook or ""
        m = re.match(r"\s*(RB-\d+)", rb_text)
        runbook = RunbookRecommendation(
            id=(m.group(1).lower() if m else "rb-recalled"),
            name=rb_text,
            matchedIncident=mem_with_runbook.incidentId,
            lastUsed=None,
            successRate=0,
            steps=["Follow the runbook recorded in the matching retained incident."],
        )

    similar = [
        SimilarIncidentReasoning(
            incidentId=m.incidentId,
            title=(m.text.split(".")[0][:100] if m.text else f"Retained memory {m.memoryId or ''}"),
            reasoning=f"Hindsight scored this retained incident at {m.relevance}% relevance for the current {req.service} incident"
            + (f"; its recorded root cause was: {m.rootCause}" if m.rootCause else "."),
        )
        for m in req.memories[:3]
    ]

    return AnalyzeResponse(
        incidentId=req.incidentId,
        summary=(
            f"Signal-based analysis for {req.service} ({req.severity}). "
            + (f"{len(req.memories)} Hindsight memories recalled; top match at {max(m.relevance for m in req.memories)}% relevance. " if req.memories else "No matching Hindsight memories. ")
            + (f"Detected signatures: {'; '.join(signal_labels[:3])}." if signal_labels else "No known error signatures detected in the provided inputs.")
        ),
        hypotheses=hypotheses,
        resolutionSteps=steps,
        runbook=runbook,
        similarIncidentReasoning=similar,
        evidence=evidence,
        generatedBy="heuristic",
        llmUsed=False,
    )


def _llm_to_response(data: dict, req: AnalyzeRequest, provenance: str) -> AnalyzeResponse:
    def _hyps(raw: Any) -> list[Hypothesis]:
        out: list[Hypothesis] = []
        for i, h in enumerate(raw or [], start=1):
            if not isinstance(h, dict):
                continue
            try:
                conf = int(float(h.get("confidence", 0)))
            except (TypeError, ValueError):
                conf = 0
            out.append(
                Hypothesis(
                    id=f"hyp-{i}",
                    statement=str(h.get("statement", ""))[:500],
                    confidence=max(0, min(100, conf)),
                    evidence=[str(e)[:400] for e in (h.get("evidence") or []) if isinstance(e, str)],
                )
            )
        return out

    def _steps(raw: Any) -> list[ResolutionStep]:
        out: list[ResolutionStep] = []
        for i, s in enumerate(raw or [], start=1):
            if not isinstance(s, dict):
                continue
            out.append(
                ResolutionStep(
                    id=f"step-{i}",
                    order=i,
                    action=str(s.get("action", ""))[:300],
                    detail=str(s.get("detail", ""))[:600],
                )
            )
        return out

    raw_rb = data.get("runbook")
    runbook: RunbookRecommendation | None = None
    if isinstance(raw_rb, dict):
        try:
            rate = int(float(raw_rb.get("successRate", 0)))
        except (TypeError, ValueError):
            rate = 0
        runbook = RunbookRecommendation(
            id=str(raw_rb.get("id", "rb-llm")),
            name=str(raw_rb.get("name", ""))[:200],
            matchedIncident=raw_rb.get("matchedIncident"),
            lastUsed=raw_rb.get("lastUsed"),
            successRate=max(0, min(100, rate)),
            steps=[str(s)[:300] for s in (raw_rb.get("steps") or []) if isinstance(s, str)],
        )

    similar = [
        SimilarIncidentReasoning(
            incidentId=s.get("incidentId"),
            title=str(s.get("title", ""))[:200],
            reasoning=str(s.get("reasoning", ""))[:600],
        )
        for s in (data.get("similarIncidentReasoning") or [])
        if isinstance(s, dict)
    ]

    evidence = [
        EvidenceItem(
            id=f"ev-{i}",
            label=str(e.get("label", ""))[:200],
            source=str(e.get("source", ""))[:200],
            detail=str(e.get("detail", ""))[:600],
        )
        for i, e in enumerate(data.get("evidence") or [], start=1)
        if isinstance(e, dict)
    ]

    return AnalyzeResponse(
        incidentId=req.incidentId,
        summary=str(data.get("summary", ""))[:2000],
        hypotheses=_hyps(data.get("hypotheses")),
        resolutionSteps=_steps(data.get("resolutionSteps")),
        runbook=runbook,
        similarIncidentReasoning=similar,
        evidence=evidence,
        generatedBy=provenance,
        llmUsed=True,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    prompt = build_prompt(req)
    data, provenance = await call_llm(prompt)

    if data is not None:
        try:
            return _llm_to_response(data, req, provenance)
        except Exception:
            pass  # fall through to the honest heuristic fallback

    return _heuristic_analyze(req)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
