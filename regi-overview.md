# Regi — QA Assistant App
### Product Overview & Technical Specification

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Core Features](#2-core-features)
3. [User Personas](#3-user-personas)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Integrations](#6-integrations)
7. [Data Model](#7-data-model)
8. [API Design](#8-api-design)
9. [LLM Integration](#9-llm-integration)
10. [Security & Compliance](#10-security--compliance)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Development Workflow](#12-development-workflow)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Product Summary

**Regi** is an AI-powered QA Assistant application designed to accelerate test case creation for software quality assurance engineers. It bridges the gap between product requirements (sourced from Jira or manual input) and structured, exportable test cases — reducing the time QA engineers spend writing boilerplate test documentation and allowing them to focus on edge cases and quality.

### Problem Statement

QA engineers spend a significant portion of their time manually translating feature requirements into test cases. This process is repetitive, error-prone, and slows down the QA pipeline — especially when tickets move rapidly from development to QA.

### Solution

Regi automates test case generation by:
- Ingesting requirements from Jira tickets (via API or manual paste)
- Using an LLM to generate test cases in a project-defined template/style
- Allowing QA engineers to review, edit, and approve generated test cases
- Exporting finalized test cases to test case management tools (e.g. Zephyr Scale) or CSV

---

## 2. Core Features

### 2.1 Requirements Ingestion
- **Manual Input:** QA engineers can paste raw feature requirements or acceptance criteria into a text field
- **Jira Integration (API):** Automatically fetches ticket details when a Jira issue is transitioned to the `QA` column/status via webhook or polling
- **File Import:** Support for uploading Jira export files (JSON/CSV) for batch processing

### 2.2 Test Case Generation
- AI-generated test cases using an integrated LLM
- Generation follows a **project-specific template** (e.g. BDD Gherkin, step-by-step, exploratory)
- Each project can have a saved style configuration that guides generation
- Test cases include: title, preconditions, test steps, expected results, priority, and test type (positive, negative, edge case)

### 2.3 Review & Editing
- Generated test cases are presented in an editable, structured UI
- QA engineers can add, remove, or rewrite steps inline
- Version history per test case to track manual edits vs. AI-generated content
- Ability to regenerate specific test cases or request alternative variations

### 2.4 Export & Integration
- **Zephyr Scale (Jira):** Direct push of finalized test cases via API
- **CSV Export:** Standard comma-separated format compatible with most test management tools
- **Copy to Clipboard:** Quick-copy for pasting into any tool manually

### 2.5 Project & Template Management
- Multi-project support with isolated configurations
- Per-project test case style templates (custom fields, naming conventions, step formats)
- Admin controls for managing team members per project

---

## 3. User Personas

| Persona | Role | Primary Use |
|---|---|---|
| **QA Engineer** | Primary user | Generate, review, edit, and export test cases |
| **QA Lead** | Team manager | Configure project templates, manage team access |
| **Developer** | Secondary | View generated test cases linked to their tickets |
| **Admin** | System admin | Manage integrations, API keys, user accounts |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Client Layer                    │
│              React.js Single Page App               │
└───────────────────────┬─────────────────────────────┘
                        │ REST / WebSocket
┌───────────────────────▼─────────────────────────────┐
│                    API Gateway                      │
│         (Rate Limiting, Auth, Routing)              │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Node.js Backend                    │
│    Express.js · BullMQ (Job Queue) · JWT Auth       │
├──────────────┬────────────────────┬─────────────────┤
│  Jira Service│  LLM Orchestrator  │  Export Service │
│  (Webhooks,  │  (Prompt builder,  │  (Zephyr API,   │
│   REST API)  │   LLM API calls)   │   CSV generator)│
└──────┬───────┴────────────────────┴──────────┬──────┘
       │                                        │
┌──────▼──────────────┐          ┌──────────────▼──────┐
│      MySQL          │          │    External APIs     │
│  (Primary DB)       │          │  Jira · Zephyr · LLM │
│  Redis (Cache/Queue)│          └─────────────────────-┘
└─────────────────────┘
```

### Architecture Style
- **Monolithic backend** with clear service separation (suitable for initial release; can be split into microservices as scale demands)
- **RESTful API** with optional WebSocket support for real-time generation streaming
- **Job queue** (BullMQ + Redis) for async LLM calls and Jira polling to avoid blocking the main thread

---

## 5. Technology Stack

### Frontend
| Layer | Technology | Notes |
|---|---|---|
| Framework | React.js (v18+) | Component-based SPA |
| State Management | Redux Toolkit or Zustand | Global state for test cases, projects |
| UI Component Library | shadcn/ui or Ant Design | Accessible, composable components |
| Routing | React Router v6 | Client-side routing |
| Forms | React Hook Form + Zod | Validation and form management |
| Rich Text Editing | TipTap or Lexical | Inline editing of test case steps |
| HTTP Client | Axios | REST API calls |
| Real-time | Socket.IO (client) | Stream LLM token output |
| Build Tool | Vite | Fast dev server and bundling |
| Testing | Vitest + React Testing Library | Unit and integration tests |

### Backend
| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js (v20 LTS) | Server runtime |
| Framework | Express.js | Lightweight REST API framework |
| ORM | Prisma | Type-safe MySQL client |
| Job Queue | BullMQ | LLM and export job processing |
| Cache / Queue Broker | Redis | Session cache, BullMQ broker |
| Authentication | JWT + Refresh Tokens | Stateless auth |
| OAuth | Passport.js | Jira OAuth 2.0 integration |
| Validation | Zod | Runtime schema validation |
| Logging | Winston + Morgan | Structured logs |
| Testing | Jest + Supertest | Unit and API tests |

### Database
| Layer | Technology | Notes |
|---|---|---|
| Primary Database | MySQL 8.0+ | Relational data — projects, test cases, users |
| Cache | Redis 7+ | Rate limiting, session caching, job queues |
| File Storage | AWS S3 or local disk | Exported CSV/JSON files |

### Infrastructure & DevOps
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Containerization for local dev |
| GitHub Actions | CI/CD pipeline |
| AWS EC2 / DigitalOcean | Application hosting |
| AWS RDS | Managed MySQL |
| AWS ElastiCache | Managed Redis |
| Nginx | Reverse proxy, SSL termination |
| Let's Encrypt / ACM | TLS certificates |

---

## 6. Integrations

### 6.1 Jira Integration
- **OAuth 2.0** authentication via Atlassian Developer portal
- **Webhook Listener:** Jira sends a POST event to Regi's webhook endpoint when an issue transitions to the QA status
- **REST API Polling (fallback):** Periodic polling of Jira's issue search API for teams that cannot configure webhooks
- **Data Extracted:** Issue summary, description, acceptance criteria, labels, components, linked epics
- **Required Jira Scopes:** `read:jira-work`, `read:jira-user`

### 6.2 Zephyr Scale Integration
- Authentication via Zephyr Scale API token
- Endpoint: Zephyr Scale REST API v2
- Operations supported: Create test case, assign to test cycle, set status
- Field mapping: Regi test case fields → Zephyr Scale custom fields (configurable per project)

### 6.3 LLM Integration
- Provider-agnostic design using an abstraction layer to support multiple LLM providers:
  - **OpenAI** (GPT-4o, GPT-4 Turbo) — primary
  - **Anthropic** (Claude Sonnet/Opus) — alternative
  - **Azure OpenAI** — for enterprise deployments
- API key stored encrypted in the database, scoped per workspace
- See [Section 9](#9-llm-integration) for prompt design details

---

## 7. Data Model

### Core Entities

```
Workspace
  ├── id, name, slug, createdAt
  └── → many Projects, Users

User
  ├── id, email, name, passwordHash, role
  ├── → belongs to Workspace
  └── → many ProjectMemberships

Project
  ├── id, name, workspaceId, jiraProjectKey
  ├── templateConfig (JSON) — test case style per project
  └── → many TestSuites, JiraConnections

JiraConnection
  ├── id, projectId, accessToken, refreshToken
  ├── cloudId, jiraBaseUrl
  └── webhookSecret

Ticket (Requirement)
  ├── id, jiraIssueKey, summary, description
  ├── acceptanceCriteria, status, source (manual | jira_webhook | jira_api)
  └── → many TestCases

TestCase
  ├── id, ticketId, projectId, title, priority
  ├── preconditions, steps (JSON array), expectedResult
  ├── testType (positive | negative | edge | regression)
  ├── generatedBy (llm | manual), modelVersion
  ├── status (draft | approved | exported)
  └── → many TestCaseVersions

TestCaseVersion
  ├── id, testCaseId, content (JSON snapshot)
  └── editedBy, createdAt

ExportLog
  ├── id, projectId, destination (zephyr | csv)
  ├── status, exportedAt
  └── testCaseIds (JSON array)
```

---

## 8. API Design

### Base URL
```
https://api.regi.app/v1
```

### Authentication
All endpoints require a Bearer token in the `Authorization` header.

### Key Endpoints

```
POST   /auth/login                  — Email/password login
POST   /auth/refresh                — Refresh access token
GET    /auth/jira/connect           — Initiate Jira OAuth flow

GET    /projects                    — List all projects
POST   /projects                    — Create project
GET    /projects/:id/template       — Get test case template config
PUT    /projects/:id/template       — Update template config

POST   /tickets                     — Manually submit requirement text
GET    /tickets/:id                 — Get ticket + linked test cases

POST   /tickets/:id/generate        — Trigger LLM test case generation
GET    /tickets/:id/testcases       — List test cases for a ticket

GET    /testcases/:id               — Get a single test case
PUT    /testcases/:id               — Edit a test case
DELETE /testcases/:id               — Delete a test case
POST   /testcases/:id/regenerate    — Regenerate specific test case

POST   /export/csv                  — Export selected test cases as CSV
POST   /export/zephyr               — Push test cases to Zephyr Scale

POST   /webhooks/jira               — Jira webhook receiver endpoint
```

### Pagination
List endpoints use cursor-based pagination:
```json
{ "data": [...], "cursor": "abc123", "hasMore": true }
```

---

## 9. LLM Integration

### Prompt Architecture

Regi uses a layered prompt system to ensure generated test cases match the project's defined style.

```
System Prompt (fixed)
  └── Role definition: "You are a senior QA engineer..."
  └── Output format instruction (JSON schema)

Project Template Prompt (per project)
  └── Test case style: BDD Gherkin / step-by-step / exploratory
  └── Required fields, naming conventions, priority rules

User Prompt (per request)
  └── Jira ticket summary + description + acceptance criteria
  └── Number of test cases to generate
  └── Focus area (happy path, edge cases, negative scenarios)
```

### Output Schema (JSON)
```json
[
  {
    "title": "Verify user can log in with valid credentials",
    "priority": "High",
    "testType": "positive",
    "preconditions": "User account exists and is active",
    "steps": [
      { "step": 1, "action": "Navigate to login page", "expected": "Login form is displayed" },
      { "step": 2, "action": "Enter valid email and password", "expected": "Fields are populated" },
      { "step": 3, "action": "Click 'Login' button", "expected": "User is redirected to dashboard" }
    ],
    "expectedResult": "User is authenticated and lands on the home dashboard"
  }
]
```

### LLM Call Flow
1. Request received → Job added to BullMQ queue
2. Worker picks up job → Builds prompt from ticket + project template
3. LLM API called with streaming enabled
4. Tokens streamed to frontend via WebSocket
5. Complete response parsed, validated against schema
6. Test cases saved to database with `generatedBy: llm`

### Fallback & Error Handling
- If LLM API times out, job is retried up to 3 times with exponential backoff
- If response fails JSON schema validation, a corrective follow-up prompt is sent
- Users are notified in-app if generation fails after all retries

---

## 10. Security & Compliance

### Authentication & Authorization
- JWT access tokens (short-lived: 15 min) + HTTP-only cookie refresh tokens (7 days)
- Role-based access control (RBAC): Admin, QA Lead, QA Engineer, Viewer
- Workspace-level isolation — users cannot access data across workspaces

### Secrets & Credentials
- LLM API keys and Jira tokens stored encrypted at rest (AES-256)
- All secrets loaded via environment variables — never committed to source control
- `.env` files are gitignored; production secrets managed via AWS Secrets Manager or Vault

### Data Security
- All data in transit encrypted via TLS 1.2+
- MySQL data encrypted at rest (AWS RDS encryption enabled)
- Webhook payloads validated using HMAC signature verification (Jira webhook secret)
- Rate limiting on all API endpoints (express-rate-limit)

### Privacy
- No PII beyond user email and name is stored
- Jira issue content is stored only for active generation sessions; configurable retention policy
- GDPR-ready: user data deletion API endpoint available

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time (p95) | < 300ms for CRUD operations |
| LLM generation time | < 30s per ticket (streamed) |
| Uptime | 99.5% monthly |
| Concurrent users | 100+ per workspace |
| Test case export (CSV) | < 5s for up to 500 test cases |
| Database backup | Daily automated snapshots, 30-day retention |
| Mobile responsiveness | Tablet and desktop breakpoints (1024px+) |

---

## 12. Development Workflow

### Repository Structure
```
regi/
├── client/                 # React.js frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/          # State management
│   │   ├── hooks/
│   │   └── api/            # API client layer
│   └── vite.config.js
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── llm/        # LLM abstraction layer
│   │   │   ├── jira/       # Jira integration
│   │   │   └── export/     # CSV + Zephyr exporters
│   │   ├── workers/        # BullMQ job workers
│   │   ├── middleware/
│   │   └── prisma/         # Schema + migrations
│   └── package.json
│
├── docker-compose.yml      # Local dev environment
├── .env.example
└── README.md
```

### Local Development Setup
```bash
# Start dependencies (MySQL + Redis)
docker-compose up -d

# Install dependencies
cd server && npm install
cd ../client && npm install

# Run migrations
cd server && npx prisma migrate dev

# Start backend
npm run dev   # runs on :3001

# Start frontend
cd ../client && npm run dev   # runs on :5173
```

### Branch Strategy
- `main` — production-ready, protected
- `develop` — integration branch
- `feature/*` — individual features
- `fix/*` — bug fixes
- PRs required for merges to `develop` and `main`

### CI/CD Pipeline (GitHub Actions)
1. **On PR:** Lint → Unit tests → Build
2. **On merge to `develop`:** Deploy to staging environment
3. **On merge to `main`:** Deploy to production with smoke tests

---

## 13. Deployment & Infrastructure

### Environments
| Environment | URL | Purpose |
|---|---|---|
| Local | `localhost:5173` | Developer machines |
| Staging | `staging.regi.app` | QA and stakeholder review |
| Production | `app.regi.app` | Live users |

### Infrastructure Overview
```
Route 53 (DNS)
  └── CloudFront (CDN) → S3 (React static assets)
  └── ALB (Load Balancer)
        └── EC2 / ECS (Node.js containers)
              ├── RDS MySQL (Multi-AZ)
              ├── ElastiCache Redis
              └── S3 (export file storage)
```

### Environment Variables (required)
```env
# Server
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://user:pass@host:3306/regi
REDIS_URL=redis://host:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ENCRYPTION_KEY=...         # AES-256 key for stored secrets

# LLM
OPENAI_API_KEY=...
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4o

# Jira OAuth
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
JIRA_REDIRECT_URI=https://api.regi.app/v1/auth/jira/callback

# Zephyr
ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2

# Client
VITE_API_BASE_URL=https://api.regi.app/v1
VITE_WS_URL=wss://api.regi.app
```

---

## 14. Future Roadmap

| Phase | Feature |
|---|---|
| v1.1 | Support for additional requirement sources (Confluence, Linear, Notion) |
| v1.2 | Test case coverage analysis — detect gaps against acceptance criteria |
| v1.3 | Slack / Teams notifications when Jira tickets move to QA |
| v1.4 | Regression suite builder — group test cases by feature or sprint |
| v2.0 | TestRail and Xray export integration |
| v2.0 | Multi-language support for test case generation |
| v2.1 | Analytics dashboard — test case volume, coverage, export frequency |
| v2.2 | AI-suggested test case priority based on historical defect data |

---

*Document version: 1.0 | Last updated: April 2026 | Owner: Regi Engineering Team*
