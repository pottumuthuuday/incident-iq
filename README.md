# IncidentIQ — AI Incident Response Agent

**Remember Every Incident. Resolve the Next One Faster.**

IncidentIQ is an AI incident-response agent for engineering and DevOps/SRE teams. It accumulates
organizational memory of incidents — root causes, resolution steps and runbooks — and uses that
memory to suggest faster fixes for similar future incidents.

## Product workflow

```
NEW INCIDENT → ANALYZE → RECALL SIMILAR INCIDENTS → RECOMMEND ROOT CAUSE + FIX + RUNBOOK
     → RESOLVE → POST-MORTEM → RETAIN TO HINDSIGHT → LEARN FOR FUTURE INCIDENTS
```

The workflow is rendered in the app header on every page.

## Status: Real Hindsight integration

IncidentIQ is integrated with **Hindsight Cloud** (`https://api.hindsight.vectorize.io`, memory
bank `incidentiq`) via the official [`@vectorize-io/hindsight-client`](https://www.npmjs.com/package/@vectorize-io/hindsight-client)
SDK — real retain, recall and reflect, no mocks.

- Incident records shown in the UI are clearly-labeled **synthetic demo data** for demonstration.
- The **🧠 Hindsight Memory** section on each investigation page shows **real recall results**
  from the memory bank, and **AI recommendation** runs a real Hindsight `reflect` grounded in
  retained memory.
- The **"Retain to Hindsight"** button on post-mortems performs a **real Hindsight retain**.
- "No memories found" and "Hindsight connection failed / not configured" are always distinct,
  explicit states — failures never fall back to fake data.
- No API keys are included in the repository.

## Hindsight setup

```bash
cp .env.example .env.local
# then edit .env.local:
#   HINDSIGHT_API_KEY=<your key from https://ui.hindsight.vectorize.io/connect>
```

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `HINDSIGHT_API_KEY` | yes (for memory features) | — | Hindsight Cloud API key — **server-side only, never commit** |
| `HINDSIGHT_BASE_URL` | no | `https://api.hindsight.vectorize.io` | API endpoint |
| `HINDSIGHT_BANK_ID` | no | `incidentiq` | Memory bank ID |
| `NEXT_PUBLIC_API_BASE_URL` | no | — | Future FastAPI backend (incident CRUD) |

Without `HINDSIGHT_API_KEY` the app runs normally and every memory surface shows an explicit
"Hindsight not configured" state. The key is read exclusively by server code (`src/lib/hindsight.ts`
is guarded by `import "server-only"`); browsers only ever call the local route handlers under
`/api/hindsight/*`.

## Stack

- [Next.js](https://nextjs.org) 15 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Clean component architecture, prepared for a Python FastAPI backend (see below)

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # strict TypeScript check
```

## Architecture

```
src/
  app/
    api/hindsight/        Server-side route handlers — the ONLY place the API key is used
      status/route.ts     GET  → live connection status (getVersion, cached 30s)
      recall/route.ts     POST → recall similar incidents for an investigation
      recommendation/…    POST → Hindsight reflect recommendation grounded in memory
      retain/route.ts     POST → retain a completed post-mortem (idempotent)
    (pages)               Dashboard, Incidents, New Incident, Memory, Post-mortems
  components/
    hindsight/            HindsightInvestigation + HindsightRecallPanel (client)
    layout/               App shell: sidebar (live Hindsight status dot), workflow banner
    ui/                   Reusable primitives: Badge, Card, StatCard, Button, Timeline, LogViewer…
  lib/
    hindsight.ts          REAL Hindsight integration (server-only, SDK-based)
    useHindsightStatus.ts Client hook → /api/hindsight/status
    demo-data.ts          Clearly-labeled synthetic incident/post-mortem data
    api-client.ts         Frontend → FastAPI client stub (switches to real API when configured)
    types.ts              Domain types
```

## Backend (future step)

The UI never calls external services directly. All data access goes through `lib/api-client.ts`,
which is written so that when the Python **FastAPI** backend is available you only set:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

and the client switches from local demo data to the real API.

## How Retain and Recall work

**Retain (Post-mortem → Hindsight).** Clicking **Retain to Hindsight** posts the completed
post-mortem to `/api/hindsight/retain`. The route handler calls `client.retain("incidentiq", content)`
with a structured document containing: incident ID, service, severity, description, error details,
root cause, resolution steps, whether resolution succeeded, runbook used, resolution time, what
worked, what did not work, and lessons learned. The document is stored with `document_id:
incident-<ID>` so re-retaining is idempotent (replace, no duplicates), plus tags
(`incident:<id>`, `service:<name>`, `severity:<sev>`) and metadata used later for display.
Success shows **"Memory successfully retained in Hindsight."**

**Recall (Investigation → Hindsight).** Opening an investigation triggers the
**🧠 Hindsight Memory** section: `/api/hindsight/recall` sends the incident's title, service,
severity and error to `client.recall("incidentiq", …)` (types world/experience/observation,
`prefer_observations`, budget mid). Each result shows incident ID, relevance (`scores.final`),
service, root cause, resolution, runbook, outcome and resolution time when present in memory.

**Recommend (Reflect).** `/api/hindsight/recommendation` runs `client.reflect("incidentiq", …)`
with the current incident as context, so the recommendation considers retained historical
incidents, previous root causes, successful resolutions, runbooks and post-mortem lessons.

> **Note:** Demo incident content remains clearly labeled. Retained memory comes only from real
> Hindsight retains performed through the UI or API.
