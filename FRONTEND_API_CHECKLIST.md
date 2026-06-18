# Frontend API Integration Checklist

**Gateway base URL:** `http://localhost:3000`  
**Legend:** ✅ Implemented & tested · 🔧 Implemented · ⏳ Pending

---

## Phase 1 — Foundation & Auth

| Endpoint | Method | Page | Status |
|----------|--------|------|--------|
| `/auth/register` | POST | `/auth/register` | 🔧 |
| `/auth/login` | POST | `/auth/login` | 🔧 |
| `/profiles/me` | POST | `/auth/onboarding` | 🔧 |
| `/profiles/me` | GET | Profile pages (all roles) | 🔧 |
| `/profiles/me` | PATCH | Profile pages (all roles) | 🔧 |
| `/dashboard/student` | GET | `/student/dashboard` | 🔧 |
| `/dashboard/supervisor` | GET | `/supervisor/dashboard` | 🔧 |
| `/dashboard/coordinator` | GET | `/coordinator/dashboard` | 🔧 |
| `/notifications/unread-count` | GET | Dashboard header | 🔧 |

---

## Phase 2 — Student Module

| Endpoint | Method | Page | Status |
|----------|--------|------|--------|
| `/teams` | POST | `/student/team` | 🔧 |
| `/teams` | GET | `/student/team` | 🔧 |
| `/teams/search` | GET | `/student/team` | 🔧 |
| `/teams/my-team` | GET | `/student/team`, dashboard | 🔧 |
| `/teams/my-team/members` | GET | `/student/team`, dashboard | 🔧 |
| `/teams/:teamId/join` | POST | `/student/team` | 🔧 |
| `/teams/my-team/requests` | GET | `/student/team` | 🔧 |
| `/teams/requests/:id/approve` | POST | `/student/team` | 🔧 |
| `/teams/requests/:id/reject` | POST | `/student/team` | 🔧 |
| `/proposals` | POST | `/student/proposal` | 🔧 |
| `/proposals/my-proposal` | GET | `/student/proposal` | 🔧 |
| `/proposals/:id/request-supervisor` | POST | `/student/proposal` | 🔧 |
| `/auth/supervisors` | GET | `/student/proposal` | 🔧 |
| `/deliverables/for-my-team` | GET | `/student/deliverables` | 🔧 |
| `/submissions` | POST | `/student/submissions` | 🔧 |
| `/submissions/my` | GET | `/student/submissions` | 🔧 |
| `/submissions/:deliverableId/team/:teamId/history` | GET | `/student/submissions` | 🔧 |
| `/uploads` | POST | `/student/submissions` | 🔧 |
| `/evaluations/my` | GET | `/student/evaluations` | 🔧 |
| `/evaluation-results/my` | GET | `/student/results` | 🔧 |
| `/announcements/for-my-team` | GET | `/student/dashboard` | 🔧 |
| `/meetings/for-my-team` | GET | `/student/dashboard` | 🔧 |
| `/activity-logs/my` | GET | `/student/dashboard` | 🔧 |
| `/stats/student` | GET | `/student/dashboard` | 🔧 |
| `/notifications/me` | GET | `/student/notifications` | 🔧 |
| `/notifications/:id/read` | PATCH | `/student/notifications` | 🔧 |
| `/notifications/read-all` | PATCH | `/student/notifications` | 🔧 |

---

## Phase 3 — Supervisor Module

| Endpoint | Method | Page | Status |
|----------|--------|------|--------|
| `/proposals/supervisor/requests` | GET | `/supervisor/requests` | ⏳ |
| `/proposals/requests/:id/accept` | POST | `/supervisor/requests` | ⏳ |
| `/proposals/requests/:id/reject` | POST | `/supervisor/requests` | ⏳ |
| `/proposals/my-invitations` | GET | `/supervisor/invitations` | ⏳ |
| `/proposals/invitations/:id/accept` | POST | `/supervisor/invitations` | ⏳ |
| `/proposals/invitations/:id/reject` | POST | `/supervisor/invitations` | ⏳ |
| `/deliverables` | POST | `/supervisor/deliverables` | ⏳ |
| `/deliverables/my` | GET | `/supervisor/deliverables` | ⏳ |
| `/deliverables/:id` | PATCH | `/supervisor/deliverables` | ⏳ |
| `/submissions/deliverable/:id` | GET | `/supervisor/reviews` | ⏳ |
| `/submissions/:id/review` | PATCH | `/supervisor/reviews` | ⏳ |
| `/submissions/team/:teamId` | GET | `/supervisor/reviews` | ⏳ |
| `/announcements` | POST | `/supervisor/announcements` | ⏳ |
| `/announcements/my` | GET | `/supervisor/announcements` | ⏳ |
| `/meetings` | POST | `/supervisor/meetings` | ⏳ |
| `/meetings/my` | GET | `/supervisor/meetings` | ⏳ |
| `/milestones` | POST | `/supervisor/milestones` | ⏳ |
| `/milestones/:proposalId` | GET | `/supervisor/milestones` | ⏳ |
| `/milestones/:id/status` | PATCH | `/supervisor/milestones` | ⏳ |
| `/tasks` | POST | `/supervisor/milestones` | ⏳ |
| `/tasks/milestone/:id` | GET | `/supervisor/milestones` | ⏳ |
| `/tasks/:id/status` | PATCH | `/supervisor/milestones` | ⏳ |
| `/stats/supervisor` | GET | `/supervisor/dashboard` | ⏳ |
| `/evaluation-panels/my` | GET | `/supervisor/dashboard` (extend) | ⏳ |

---

## Phase 4 — Coordinator Module

| Endpoint | Method | Page | Status |
|----------|--------|------|--------|
| `/teams/all` | GET | `/coordinator/teams` | ⏳ |
| `/teams/:teamId/members` | GET | `/coordinator/teams` | ⏳ |
| `/proposals/all` | GET | `/coordinator/proposals` | ⏳ |
| `/proposals/:id` | GET | `/coordinator/proposals` | ⏳ |
| `/proposals/:id/approve` | PATCH | `/coordinator/proposals` | ⏳ |
| `/proposals/:id/reject` | PATCH | `/coordinator/proposals` | ⏳ |
| `/proposals/stats` | GET | `/coordinator/dashboard` | ⏳ |
| `/global-announcements` | POST | `/coordinator/announcements` | ⏳ |
| `/global-announcements` | GET | `/coordinator/announcements` | ⏳ |
| `/evaluations` | POST | `/coordinator/evaluations` | ⏳ |
| `/evaluations` | GET | `/coordinator/evaluations` | ⏳ |
| `/evaluation-panels` | POST | `/coordinator/evaluations` | ⏳ |
| `/evaluation-panels/:id/evaluators` | POST | `/coordinator/evaluations` | ⏳ |
| `/evaluation-panels/evaluation/:evaluationId` | GET | `/coordinator/evaluations` | ⏳ |
| `/evaluations/:id/assign-team` | POST | `/coordinator/evaluations` | ⏳ |
| `/evaluation-results/:evaluationId` | POST | `/coordinator/results` | ⏳ |
| `/evaluation-results/team/:teamId` | GET | `/coordinator/results` | ⏳ |
| `/stats/coordinator` | GET | `/coordinator/dashboard` | ⏳ |
| `/auth/stats` | GET | `/coordinator/dashboard` | ⏳ |
| `/health` | GET | Optional admin | ⏳ |

---

## Phase 1 Testing Instructions

### Prerequisites
1. All 7 backend services running
2. `apps/frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:3000`
3. Run frontend: `cd apps/frontend && npm run dev`

### Test Cases

| # | Action | Expected |
|---|--------|----------|
| 1 | Visit `/` | Landing page with Sign in / Get started |
| 2 | Register as STUDENT | Success toast, redirect to login |
| 3 | Login as STUDENT | Redirect to `/auth/onboarding` if no profile |
| 4 | Complete onboarding | Redirect to `/student/dashboard` |
| 5 | Dashboard loads | KPI cards, team/proposal sections (or empty states) |
| 6 | Visit `/student/profile` | Profile form pre-filled, save works |
| 7 | Logout from header | Redirect to `/auth/login`, token cleared |
| 8 | Login as SUPERVISOR | `/supervisor/dashboard` with stats |
| 9 | Login as COORDINATOR | `/coordinator/dashboard` with charts |
| 10 | Try `/student/*` as supervisor | Redirect to supervisor dashboard |

---

## Folder Structure (Phase 1)

```
apps/frontend/src/
├── app/
│   ├── auth/          login, register, onboarding
│   ├── student/       dashboard + placeholders
│   ├── supervisor/    dashboard + placeholders
│   ├── coordinator/   dashboard + placeholders
│   ├── layout.tsx
│   ├── page.tsx       landing
│   └── globals.css
├── components/
│   ├── ui/            shadcn components
│   ├── common/        logo, states, profile
│   └── dashboard/     sidebar, header, shell
├── constants/         routes, navigation
├── lib/               axios, auth, utils
├── providers/         query, auth
├── services/          auth, profile, dashboard
├── types/
└── middleware.ts
```
