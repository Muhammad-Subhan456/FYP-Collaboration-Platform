# FOASIS

**Final Year Project Orchestration & Academic Supervision Information System**

FOASIS is a full-stack platform for digitizing the Final Year Project (FYP) lifecycle. The **active** stack is a [modular monolith](docs/MODULAR-MONOLITH-MIGRATION.md) backend (`apps/foasis-backend`) with a Next.js frontend. Legacy microservice folders remain in the repo for reference only — see [apps/LEGACY.md](apps/LEGACY.md).

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [System Overview](#4-system-overview)
5. [Features](#5-features)
6. [Detailed Workflows](#6-detailed-workflows)
7. [Database Design](#7-database-design)
8. [Authentication and Authorization](#8-authentication-and-authorization)
9. [File Management](#9-file-management)
10. [Notification System](#10-notification-system)
11. [API Overview](#11-api-overview)
12. [Technology Stack](#12-technology-stack)
13. [Installation Guide](#13-installation-guide)
14. [Environment Variables](#14-environment-variables)
15. [Project Structure](#15-project-structure)
16. [Security Considerations](#16-security-considerations)
17. [Future Enhancements](#17-future-enhancements)
18. [Screenshots](#18-screenshots)
19. [Contributors](#19-contributors)
20. [Conclusion](#20-conclusion)

---

## 1. Project Introduction

### Project Name

**FOASIS** — *Final Year Project Orchestration & Academic Supervision Information System*

### Purpose

FOASIS provides a centralized digital environment where FYP stakeholders can collaborate, submit work, track progress, receive feedback, and manage evaluations without relying on fragmented manual processes (email chains, spreadsheets, paper forms, and ad-hoc messaging).

### Problem Being Solved

Universities struggle to manage hundreds of FYP teams across multiple departments. Without a unified system, proposal approvals, supervisor assignments, deliverable tracking, evaluation scheduling, and communication become inconsistent, error-prone, and difficult to audit.

### Why the System Is Needed

| Challenge | FOASIS Response |
|-----------|-----------------|
| Disconnected communication | In-app notifications with deep links |
| Unclear proposal status | Structured proposal lifecycle with status tracking |
| Manual supervisor matching | Request, invitation, and assignment workflows |
| Missed deadlines | Deliverables, milestones, reminders, and announcements |
| Limited oversight | Coordinator dashboards, analytics, and reporting |
| Evaluation chaos | Panel-based evaluation assignment and results management |

### Target Users and Stakeholders

| Stakeholder | Role in FOASIS |
|-------------|----------------|
| **Students** | Register, form teams, submit proposals, upload deliverables, track milestones |
| **Team Leaders** | Manage team membership, respond to supervisor invitations, resubmit proposals |
| **Supervisors** | Review proposals, assign supervision, manage deliverables, schedule meetings |
| **Coordinators** | Oversee users, teams, proposals, evaluations, announcements, and system health |
| **Evaluators** | Assigned via evaluation panels (typically faculty/supervisors) to assess teams |
| **Administrators** | Coordinators and platform operators manage access, roles, and monitoring |

---

## 2. Problem Statement

### Existing Challenges in FYP Management

Traditional FYP management relies heavily on manual coordination:

- **Students** struggle to find supervisors, track feedback, and understand submission requirements.
- **Supervisors** lack a single view of supervised teams, pending reviews, and deliverable status.
- **Coordinators** cannot easily monitor proposal pipelines, evaluation readiness, or department-wide progress.
- **Evaluators** receive inconsistent scheduling information and fragmented team context.

### Communication and Tracking Challenges

- Updates are scattered across email, WhatsApp, and physical notice boards.
- There is no authoritative record of who approved what and when.
- Students miss meetings, deadlines, and evaluation schedules due to poor visibility.
- Supervisors and coordinators duplicate effort chasing status updates.

### Proposal, Supervision, Evaluation, and Deliverable Problems

| Area | Traditional Pain Point |
|------|------------------------|
| **Proposals** | Unclear approval authority; lost feedback; no resubmission trail |
| **Supervision** | Informal matching; no invitation audit trail |
| **Deliverables** | Version confusion; late submissions; manual deadline extensions |
| **Evaluations** | Panel assignment done manually; results stored in spreadsheets |
| **Milestones** | No shared task board between supervisor and team |

FOASIS addresses these gaps with structured workflows, persisted state, and event-driven notifications.

---

## 3. Proposed Solution

FOASIS delivers an integrated academic operations platform with:

- **Centralized project management** — teams, proposals, deliverables, milestones, and evaluations in one system
- **Role-based access control (RBAC)** — each role sees only what they need
- **Workflow automation** — status transitions, assignment logic, and validation rules
- **Notification system** — actionable, deep-linked alerts for every major event
- **Team management** — creation, join requests, roles, and leader privileges
- **Evaluation management** — evaluations, panels, team assignments, and published results
- **Deliverable tracking** — supervisor-defined deliverables with submissions and reviews
- **Milestone management** — milestones and tasks with assignees and status
- **Announcement management** — supervisor and global coordinator announcements
- **Supervisor assignment workflows** — requests, invitations, acceptance, and rejection

---

## 4. System Overview

> **Architecture:** FOASIS runs as a **modular monolith** — one NestJS app (`apps/foasis-backend`) and one PostgreSQL database (`foasis_db`). Legacy microservice folders are archived; see [apps/LEGACY.md](apps/LEGACY.md) and [docs/MODULAR-MONOLITH-MIGRATION.md](docs/MODULAR-MONOLITH-MIGRATION.md).

FOASIS uses a **single backend API** with a modern React frontend.

### High-Level Architecture

```mermaid
flowchart TB
    subgraph Client
        FE[Next.js Frontend<br/>Port 3007]
    end

    subgraph Backend
        BE[foasis-backend<br/>Modular Monolith<br/>Port 3000]
    end

    subgraph Storage
        PG[(PostgreSQL<br/>foasis_db)]
        FS[Local File Storage<br/>/uploads]
    end

    FE -->|HTTPS / REST| BE
    BE --> PG
    BE --> FS
```

### Component Summary

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS | Role-based UI, dashboards, forms, notifications |
| **Backend** | NestJS 11 (`foasis-backend`) | Auth, profiles, teams, proposals, progress, notifications, uploads, dashboard |
| **Database** | PostgreSQL (`foasis_db`) | Single merged schema via Prisma |
| **File Storage** | Local disk (`uploads/`) | Profile images, submission documents |
| **Authentication** | JWT (Bearer tokens) | Stateless auth |

---

## 5. Features

### Student Features

| Feature | Description |
|---------|-------------|
| Registration & authentication | Email/password registration and JWT login |
| Profile management | Multi-step onboarding wizard with optional fields |
| Team participation | Join open teams, view members, team dashboard |
| Proposal submission | Create FYP proposal for team |
| Supervisor interaction | Request supervisors, view/respond to invitations (leader) |
| Deliverable submissions | Upload files against supervisor deliverables |
| Milestone tracking | View milestones and assigned tasks |
| Meeting management | View supervisor-scheduled meetings with join links |
| Notifications | Actionable notifications with deep links |
| Dashboard analytics | Team, proposal, submission, and activity overview |
| Evaluations & results | View assigned evaluations and published marks |

### Team Leader Features

| Feature | Description |
|---------|-------------|
| Team management | Approve/reject join requests |
| Role assignment | Assign team roles to members |
| Member profile viewing | View team member profiles |
| Supervisor interaction | Accept/decline supervisor invitations |
| Proposal resubmission | Revise and resubmit rejected proposals |
| Supervisor profile viewing | Read-only supervisor profile with supervision history |

### Supervisor Features

| Feature | Description |
|---------|-------------|
| Profile management | Faculty profile with research areas and office info |
| Proposal review | Accept or reject team proposals with mandatory feedback on rejection |
| Supervisor assignment | Auto-assigned upon proposal acceptance |
| Supervision requests | Accept/reject student supervision requests |
| Team invitations | Invite teams to accept supervision |
| Team supervision | View supervised teams and members |
| Deliverable management | Create deliverables with types and due dates |
| Deadline extension | Extend deliverable deadlines with audit trail |
| Submission review | Approve submissions or request changes with feedback |
| Meeting scheduling | Schedule meetings with links and locations |
| Announcements | Publish team-scoped announcements |
| Milestones & tasks | Create milestones and assign tasks to students |
| Evaluation panels | View panel assignments as evaluator |
| Notifications | Receive alerts for requests, submissions, and invitations |

### Coordinator Features

| Feature | Description |
|---------|-------------|
| User management | View users, update roles, enable/disable accounts |
| Team oversight | View all teams and members |
| Proposal oversight | Read-only monitoring of proposal statuses and supervisor decisions |
| Evaluation management | Create evaluations, panels, assign teams and evaluators |
| Global announcements | Publish institution-wide announcements |
| Results management | Global results overview with analytics charts |
| Analytics dashboard | Department-level statistics |
| System health | Monitor backend and database health |
| Profile viewing | View any user profile |

### Evaluator Features

Evaluators are assigned through **evaluation panels** (typically supervisors or faculty). There is no separate login role; evaluators use their assigned account (usually `SUPERVISOR`).

| Feature | Description |
|---------|-------------|
| Panel assignment | Assigned to evaluation panels by coordinator |
| Evaluation visibility | View assigned evaluations and teams |
| Results | Marks recorded by coordinator; evaluators notified via panels |

### Administrator / Platform Features

Coordinators act as primary administrators. Additional platform capabilities include:

| Feature | Description |
|---------|-------------|
| Role management | Promote users to supervisor or coordinator |
| Account status control | Activate/deactivate user accounts |
| System monitoring | Health endpoint aggregation |
| SaaS billing (demo) | Pricing, checkout, and organization subscription flow |

---

## 6. Detailed Workflows

### Student Registration Workflow

```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Frontend
    participant GW as API Gateway
    participant AUTH as Auth Service

    S->>FE: Fill registration form
    FE->>GW: POST /auth/register
    GW->>AUTH: Forward registration
    AUTH->>AUTH: Hash password, create User (STUDENT)
    AUTH-->>FE: Success + userId
    S->>FE: Login
    FE->>GW: POST /auth/login
    GW->>AUTH: Validate credentials
    AUTH-->>FE: JWT accessToken
    FE->>FE: Redirect to onboarding
```

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Student | Submits name, email, password |
| 2 | Auth Service | Validates uniqueness, stores hashed password |
| 3 | Student | Logs in with credentials |
| 4 | Frontend | Redirects to role-specific onboarding if no profile exists |

**Notifications:** None at registration (profile completion triggers notification).

---

### Profile Completion Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Student/Supervisor/Coordinator | Completes multi-step wizard |
| 2 | User Service | Creates `UserProfile` record |
| 3 | User Service | Logs activity + sends `PROFILE_COMPLETED` notification |
| 4 | Frontend | Refreshes profile, redirects to dashboard |
| 5 | Onboarding Guard | Prevents re-showing wizard if profile exists |

**Validation:** Required fields enforced per step; optional fields do not block completion.

---

### Team Creation Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Student | Creates team (name, domain, max members) |
| 2 | Team Service | Creates team with creator as `leaderId` |
| 3 | Team Service | Adds creator as first `TeamMember` |

**Status:** Team is open or closed based on `isOpen` flag.

---

### Team Member Invitation / Join Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Student | Requests to join open team |
| 2 | Team Service | Creates `JoinRequest` (PENDING) |
| 3 | Team Leader | Approves or rejects request |
| 4 | Team Service | On approve: adds member; notifies student |

**Notifications:**

| Event | Recipient | Type |
|-------|-----------|------|
| Join request received | Team leader | `JOIN_REQUEST_RECEIVED` |
| Join approved | Student | `JOIN_REQUEST_APPROVED` |
| Join rejected | Student | `JOIN_REQUEST_REJECTED` |

---

### Team Leader Role Assignment Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Team Leader | Assigns role label to member |
| 2 | Team Service | Updates `TeamMember.teamRole` |
| 3 | Notification Service | Notifies affected member |

**Notifications:** `TEAM_ROLE_ASSIGNED`, `TEAM_ROLE_UPDATED`, or `TEAM_ROLE_REMOVED`

---

### Proposal Submission Workflow

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Student creates proposal
    DRAFT --> PENDING_SUPERVISOR: Student requests supervisor
    DRAFT --> PENDING_SUPERVISOR: Supervisor sends invitation
    PENDING_SUPERVISOR --> SUPERVISOR_ASSIGNED: Supervision matched
    SUPERVISOR_ASSIGNED --> APPROVED: Supervisor accepts proposal
    SUPERVISOR_ASSIGNED --> REJECTED: Supervisor rejects with feedback
    REJECTED --> DRAFT: Team leader resubmits
    APPROVED --> [*]
```

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Student (team) | Submits title, domain, abstract |
| 2 | Proposal Service | Creates proposal (`DRAFT`) |
| 3 | Proposal Service | Notifies all team members |

**Notifications:** `PROPOSAL_SUBMITTED` → team members

---

### Proposal Acceptance / Rejection Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Supervisor | Reviews proposal in review queue |
| 2a | Supervisor (accept) | Status → `APPROVED`, supervisor assigned |
| 2b | Supervisor (reject) | Status → `REJECTED`, feedback stored in `reviewFeedback` |
| 3 | Notification Service | Notifies team (+ supervisor on accept) |
| 4 | Activity Log | Records acceptance/rejection event |

**Important:** Coordinators have **read-only oversight** — they do not approve or reject proposals.

**Notifications:**

| Event | Type |
|-------|------|
| Proposal accepted | `PROPOSAL_APPROVED` |
| Proposal rejected | `PROPOSAL_REJECTED` (includes feedback in message) |
| Proposal resubmitted | `PROPOSAL_RESUBMITTED` |

---

### Supervisor Assignment Workflow

Two paths lead to supervision:

1. **Student request** — student sends `SupervisorRequest` → supervisor accepts → `SUPERVISOR_ASSIGNED`
2. **Supervisor invitation** — supervisor invites team → team leader accepts → `SUPERVISOR_ASSIGNED`

Final assignment also occurs when supervisor **accepts the proposal** directly (status → `APPROVED`).

**Notifications:** `SUPERVISOR_REQUEST_RECEIVED`, `SUPERVISOR_INVITATION_RECEIVED`, `INVITATION_ACCEPTED`, `INVITATION_REJECTED`, `SUPERVISOR_REQUEST_ACCEPTED`

---

### Deliverable Submission Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Supervisor | Creates deliverable with type and due date |
| 2 | Student | Uploads file via `/uploads` |
| 3 | Student | Creates submission referencing `fileUrl` |
| 4 | Supervisor | Reviews submission (approve / changes required) |

**Notifications:** `DELIVERABLE_CREATED`, `NEW_SUBMISSION`, `SUBMISSION_REVIEWED`

---

### Deliverable Deadline Extension Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Supervisor | Extends deliverable due date with reason |
| 2 | Progress Service | Records `DeliverableDeadlineExtension` audit entry |
| 3 | Notification Service | Notifies team members |

**Notification:** `DELIVERABLE_DEADLINE_EXTENDED`

---

### Evaluation Assignment Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Coordinator | Creates evaluation (MID_VIVA / FINAL_VIVA) |
| 2 | Coordinator | Creates evaluation panel with room/schedule |
| 3 | Coordinator | Assigns evaluators to panel |
| 4 | Coordinator | Assigns teams to evaluation (optionally to panel) |
| 5 | Notification Service | Notifies students and evaluators |

**Notifications:** `EVALUATION_ASSIGNED`, `EVALUATION_PANEL_ASSIGNED`

---

### Evaluation Process Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Coordinator | Schedules evaluation event |
| 2 | Teams | View evaluation details on student dashboard |
| 3 | Coordinator | Publishes marks via evaluation results |
| 4 | Students | View results on results page |

**Notifications:** `RESULT_PUBLISHED`, `RESULT_UPDATED`

---

### Announcement Workflow

| Type | Creator | Scope |
|------|---------|-------|
| Team announcement | Supervisor | Supervised teams |
| Global announcement | Coordinator | All users |

**Notifications:** `ANNOUNCEMENT_PUBLISHED`, `GLOBAL_ANNOUNCEMENT`

---

### Notification Workflow

```mermaid
flowchart LR
    A[Domain Event] --> B[Service builds payload]
    B --> C[POST /notifications<br/>internal API key]
    C --> D[Notification Service]
    D --> E[Persist + isRead=false]
    E --> F[Frontend polls / fetches]
    F --> G[Deep link navigation]
```

Each notification includes optional metadata:

- `type` — event identifier
- `entityType` / `entityId` — linked resource
- `route` — frontend path for one-click navigation

---

### Meeting Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Supervisor | Creates meeting (type, date, link, location) |
| 2 | Progress Service | Stores meeting record |
| 3 | Students | View meetings on team meetings page |
| 4 | Students | Join via external meeting link |

**Notification:** `MEETING_CREATED`

---

### Milestone Workflow

| Step | Actor | System Action |
|------|-------|---------------|
| 1 | Supervisor | Creates milestone for proposal |
| 2 | Supervisor | Creates tasks under milestone |
| 3 | Student | Updates task status (TODO → IN_PROGRESS → DONE) |

**Notifications:** `MILESTONE_CREATED`, `MILESTONE_UPDATED`

---

## 7. Database Design

FOASIS uses a **single PostgreSQL database** (`foasis_db`) with a merged Prisma schema in `apps/foasis-backend`.

### Service Databases

| Service | Key Models |
|---------|------------|
| **auth-service** | `User`, `Organization` |
| **user-service** | `UserProfile` |
| **team-service** | `Team`, `TeamMember`, `JoinRequest` |
| **proposal-service** | `Proposal`, `SupervisorRequest`, `SupervisorInvitation` |
| **notification-service** | `Notification` |
| **progress-service** | `Deliverable`, `Submission`, `Milestone`, `Task`, `Meeting`, `Announcement`, `Evaluation`, `EvaluationPanel`, `EvaluationResult`, `ActivityLog`, `GlobalAnnouncement` |

### Entity Relationship Overview

```mermaid
erDiagram
    User ||--o| UserProfile : has
    User ||--o{ TeamMember : joins
    Team ||--|{ TeamMember : contains
    Team ||--o| Proposal : submits
    Proposal ||--o{ SupervisorRequest : receives
    Proposal ||--o{ SupervisorInvitation : receives
    Proposal ||--o{ Milestone : tracks
    Milestone ||--|{ Task : contains
    Deliverable ||--|{ Submission : receives
    Evaluation ||--|{ EvaluationAssignment : assigns
    Evaluation ||--|{ EvaluationPanel : organizes
    EvaluationPanel ||--|{ PanelEvaluator : includes
    User ||--o{ Notification : receives
```

### Major Model Descriptions

| Model | Description |
|-------|-------------|
| **User** | Auth account with email, role, password hash, active status |
| **UserProfile** | Extended profile (student, supervisor, or coordinator fields) |
| **Team** | FYP team with leader, domain, capacity |
| **TeamMember** | Links auth user to team with optional role label |
| **Proposal** | FYP proposal with status, supervisor, review feedback |
| **Deliverable** | Supervisor-defined submission requirement |
| **Submission** | Team file submission with version, status, feedback |
| **Milestone** | Project phase checkpoint |
| **Task** | Action item assigned to a student |
| **Meeting** | Scheduled supervisor meeting |
| **Notification** | User alert with deep-link metadata |
| **Evaluation** | Formal viva event |
| **EvaluationPanel** | Room/schedule grouping for evaluators |
| **EvaluationResult** | Published marks for a team |
| **Announcement** | Supervisor or global message |

### Proposal Status Enum

| Status | Meaning |
|--------|---------|
| `DRAFT` | Created, not yet under supervisor review |
| `PENDING_SUPERVISOR` | Awaiting supervisor matching |
| `SUPERVISOR_ASSIGNED` | Supervisor matched, awaiting proposal acceptance |
| `APPROVED` | Supervisor accepted the proposal |
| `REJECTED` | Supervisor rejected with feedback |

---

## 8. Authentication and Authorization

### JWT Authentication

1. User logs in via `POST /auth/login`
2. Auth service validates credentials with bcrypt
3. JWT issued with payload: `{ sub, email, role, exp }`
4. Frontend stores token (cookie + local storage)
5. All protected requests send `Authorization: Bearer <token>`

### Role-Based Access Control (RBAC)

| Role | Access Scope |
|------|--------------|
| `STUDENT` | Own team, proposal, submissions, student routes |
| `SUPERVISOR` | Supervised teams, deliverables, proposal review, supervisor routes |
| `COORDINATOR` | Institution-wide read/manage on coordinator routes |

Backend services enforce roles via `@Roles()` guards. The API gateway validates JWT; downstream services re-validate and enforce permissions.

### Protected Routes

Next.js middleware protects:

- `/student/*`
- `/supervisor/*`
- `/coordinator/*`
- `/auth/onboarding/*`

Unauthenticated users are redirected to `/auth/login`. Cross-role access is blocked (e.g., a student cannot open coordinator pages).

### Internal Service Authentication

Microservices communicate using `X-Internal-Api-Key` header for internal endpoints (activity logs, cross-service lookups).

### Session Handling

JWT-based **stateless** sessions. Token expiry is checked client-side; expired tokens trigger logout and redirect to login.

---

## 9. File Management

> **Note:** FOASIS currently uses **local disk storage** via the API gateway. Cloudinary integration is listed as a [future enhancement](#17-future-enhancements).

### Storage Architecture

| Component | Detail |
|-----------|--------|
| Upload endpoint | `POST /uploads` (JWT required) |
| Storage path | `uploads/` directory (configurable via `UPLOAD_DIR`) |
| Public access | Static files served at `/files/<filename>` |
| Max file size | 10 MB |

### Allowed File Types

`.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx`, `.zip`, `.png`, `.jpg`, `.jpeg`

### Upload Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant BE as foasis-backend
    participant FS as Local Storage

    U->>BE: POST /uploads (multipart file + JWT)
    BE->>BE: Validate extension & size
    BE->>FS: Save with unique filename
    BE-->>U: { fileUrl: "http://host/files/..." }
    U->>BE: Reference fileUrl in submission/profile
```

### File Retrieval

Files are accessed via the returned `fileUrl` (e.g., `http://localhost:3000/files/1781893854875-879210789.pdf`).

### Security Considerations

- JWT required for uploads
- Extension whitelist enforced
- Size limit enforced
- Unique filenames prevent collisions
- Files stored outside frontend build directory

---

## 10. Notification System

### Architecture

- Notifications are stored in `foasis_db` and created in-process by domain modules
- `NotificationDispatchService` creates records when significant events occur
- Payload includes deep-link fields for frontend navigation

### Event-Driven Notifications

Domain services dispatch notifications when significant events occur (proposal accepted, join request received, submission reviewed, etc.).

### Notification Record Schema

| Field | Purpose |
|-------|---------|
| `authUserId` | Recipient |
| `title` / `message` | Human-readable content |
| `type` | Event type constant |
| `entityType` / `entityId` | Linked resource |
| `route` | Frontend navigation path |
| `isRead` | Read/unread state |

### Activity Tracking

The progress service maintains `ActivityLog` entries for profile completion, proposal events, and other actions. Activity feeds appear on dashboards.

### Unread Notifications

- `GET /notifications/me` — list notifications
- `GET /notifications/unread-count` — badge count
- `PATCH /notifications/:id/read` — mark single as read
- `PATCH /notifications/read-all` — mark all as read

---

## 11. API Overview

### Architecture

All client requests go to **foasis-backend** (`http://localhost:3000`). The API contract matches the former gateway routes — see [apps/foasis-backend/docs/ROUTE-PARITY.md](apps/foasis-backend/docs/ROUTE-PARITY.md).

### Route Organization

| Prefix | Module |
|--------|--------|
| `/auth/*` | auth |
| `/profiles/*`, `/users/*` | users |
| `/teams/*` | teams |
| `/proposals/*` | proposals |
| `/notifications/*` | notifications |
| `/deliverables/*`, `/submissions/*`, `/milestones/*`, `/meetings/*`, `/evaluations/*`, etc. | progress |
| `/uploads`, `/files/*` | uploads (local disk) |
| `/health` | health |
| `/dashboard/*` | dashboard |

### Authentication Flow

```
Client → foasis-backend (JWT guard) → Domain service → Prisma → foasis_db
```

### Error Handling Strategy

| Layer | Behavior |
|-------|----------|
| Validation | `class-validator` returns 400 with field messages |
| Authorization | 403 Forbidden for role/ownership violations |
| Not found | 400/404 with descriptive message |
| Gateway proxy | N/A (monolith) |
| Frontend | `getErrorMessage()` extracts API error messages for toasts |

---

## 12. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | App Router, SSR/CSR hybrid |
| React | 19.x | UI components |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Radix UI | — | Accessible primitives |
| TanStack Query | 5.x | Server state management |
| React Hook Form + Zod | — | Form validation |
| Axios | — | HTTP client |
| Recharts | — | Analytics charts |
| Sonner | — | Toast notifications |

### Backend

| Technology | Purpose |
|------------|---------|
| NestJS 11 | Modular monolith framework |
| Prisma | ORM and migrations |
| PostgreSQL | Primary database |
| Passport + JWT | Authentication |
| bcrypt | Password hashing |
| Multer | File uploads |
| class-validator | DTO validation |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Linting |
| Prettier | Code formatting |
| Jest | Unit testing (services) |
| npm | Package management |

---

## 13. Installation Guide

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

### 1. Database

Create the monolith database:

```sql
CREATE DATABASE foasis_db;
```

### 2. Backend

```bash
cd apps/foasis-backend
npm install
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, CORS_ORIGIN=http://localhost:3007

npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Health: `GET http://localhost:3000/health`

**Migrating from microservices:** see [apps/foasis-backend/docs/DATA-CUTOVER.md](apps/foasis-backend/docs/DATA-CUTOVER.md).

### 3. Frontend

```bash
cd apps/frontend
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3007**.

### 4. Smoke test

```bash
cd apps/foasis-backend
# Set SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD in .env
npm run smoke-test
```

Full cutover checklist: [apps/foasis-backend/docs/PHASE-6-DECOMMISSION.md](apps/foasis-backend/docs/PHASE-6-DECOMMISSION.md).

---

## 14. Environment Variables

### foasis-backend (`apps/foasis-backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default `3000`) |
| `DATABASE_URL` | Yes | PostgreSQL connection for `foasis_db` |
| `JWT_SECRET` | Yes | Must match tokens issued during migration |
| `JWT_EXPIRES_IN` | No | Token TTL (default `8h`) |
| `CORS_ORIGIN` | Yes | Frontend origin (`http://localhost:3007`) |
| `UPLOAD_DIR` | No | File upload directory (default `../../uploads`) |
| `PUBLIC_URL` | No | Base URL for generated file links |

### frontend (`apps/frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend URL (default `http://localhost:3000`) |

---

## 15. Project Structure

```
FYP-Collaboration-Platform/
├── apps/
│   ├── foasis-backend/       # Active — modular monolith API (port 3000)
│   │   ├── prisma/           # Merged schema + migrations
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── teams/
│   │   │   ├── proposals/
│   │   │   ├── notifications/
│   │   │   ├── progress/
│   │   │   ├── dashboard/
│   │   │   ├── uploads/
│   │   │   └── health/
│   │   └── docs/
│   │
│   ├── frontend/             # Active — Next.js web application (port 3007)
│   │   └── src/
│   │       ├── app/          # App Router pages by role
│   │       ├── components/
│   │       ├── services/     # API client modules
│   │       └── lib/          # axios, auth utilities
│   │
│   ├── api-gateway/          # Legacy — see apps/LEGACY.md
│   ├── auth-service/         # Legacy
│   ├── user-service/         # Legacy
│   ├── team-service/         # Legacy
│   ├── proposal-service/     # Legacy
│   ├── notification-service/ # Legacy
│   └── progress-service/     # Legacy
│
├── uploads/                  # Local uploaded files (gitignored content)
├── docs/
│   └── MODULAR-MONOLITH-MIGRATION.md
└── README.md
```

## 17. Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Real-time notifications** | WebSocket or SSE for instant delivery |
| **Email integration** | SMTP notifications for critical events |
| **Mobile application** | React Native companion app |
| **Cloudinary / S3 storage** | Replace local disk uploads with cloud object storage |
| **Advanced analytics** | Predictive dashboards, department comparisons |
| **AI recommendations** | Supervisor-team matching suggestions |
| **Dedicated evaluator role** | Separate auth role with evaluator-specific UI |
| **Cloud scalability** | Docker + single-process deploy; extract modules only if needed |
| **Audit exports** | PDF/CSV reports for accreditation |

## 20. Conclusion

FOASIS transforms Final Year Project management from a fragmented, manual process into a structured, transparent, and auditable digital workflow. By connecting every stakeholder through role-based dashboards, automated notifications, and clearly defined lifecycles for proposals, supervision, deliverables, milestones, and evaluations, the platform reduces administrative overhead and improves academic outcomes.

Whether used for daily student-supervisor collaboration, coordinator oversight, or formal evaluation reporting, FOASIS provides a scalable foundation for modern FYP management — and a strong base for future enhancements in real-time communication, cloud storage, and institutional analytics.

---

<p align="center">
  <strong>FOASIS</strong> — Orchestrating Final Year Projects with clarity, accountability, and collaboration.
</p>

<p align="center">
  Built with NestJS · Next.js · PostgreSQL · Prisma
</p>
