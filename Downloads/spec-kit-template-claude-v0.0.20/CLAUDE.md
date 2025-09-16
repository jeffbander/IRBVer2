# Claude Code Context - Research Study Management System

## Project Overview
Research Study Management System for Mount Sinai Health System - IRB submission tracking, participant enrollment, and clinical trial management.

## Current Branch
`001-research-study-management`

## Tech Stack
- **Backend**: Node.js 18+, TypeScript 5.9, Express
- **Database**: PostgreSQL 15 (Docker), Redis (caching/sessions)
- **Auth**: JWT with refresh tokens
- **Testing**: Jest, Supertest, real PostgreSQL
- **Validation**: Zod schemas
- **Logging**: Winston
- **Organization**: Mount Sinai Health System, NYC

## Project Structure
```
/
├── services/           # Microservices
│   ├── study-management/
│   └── participant-service/
├── packages/          # Shared code
│   └── shared/       # Types, validators, constants
├── apps/             # Frontend apps (future)
├── specs/            # Specifications
└── architecture/     # Design docs
```

## Key Commands
```bash
npm run dev        # Start all services
npm test          # Run tests
npm run db:migrate # Run migrations
npm run db:seed   # Seed Mount Sinai data
docker-compose up # Start PostgreSQL/Redis
```

## Current Implementation Status
- ✅ Project setup and configuration
- ✅ Database architecture designed
- ✅ API contracts defined (OpenAPI)
- ✅ Data models specified
- 🔄 Authentication service (JWT)
- 🔄 Study CRUD operations
- 🔄 Participant enrollment
- ⏳ IRB submission workflow
- ⏳ Budget management
- ⏳ Task system

## Core Entities
- Study (research protocols)
- Person (users/team members)
- Assignment (team roles/effort)
- Document (versioned uploads)
- IRBSubmission (approval tracking)
- Participant (enrollment)
- Task (work items)
- Budget/BudgetLine
- AuditEvent (compliance)

## API Endpoints (REST)
- POST /auth/login
- GET/POST /studies
- GET/PATCH /studies/{id}
- POST /studies/{id}/submit-irb
- GET/POST /studies/{id}/documents
- GET/POST /studies/{id}/participants
- GET/POST /studies/{id}/team
- GET/POST /studies/{id}/tasks
- GET/POST /studies/{id}/budget

## Testing Approach
- TDD: Write tests first (RED-GREEN-Refactor)
- Order: Contract → Integration → E2E → Unit
- Real PostgreSQL via Docker
- 80% coverage minimum

## Environment Setup
```bash
cp .env.example .env
docker-compose up -d
npm install
npm run db:migrate
npm run dev
```

## Recent Changes
- Added Mount Sinai branding and seed data
- Configured monorepo with workspaces
- Designed IRB workflow state machine

## Next Tasks
1. Implement JWT authentication service
2. Create Study CRUD with validation
3. Build participant enrollment flow
4. Add document versioning system

## Important Notes
- HIPAA compliance structure (encryption ready)
- Role-based access control (RBAC)
- Comprehensive audit logging
- Mount Sinai institutional integration points

## Useful Files
- `/specs/001-research-study-management/spec.md` - Requirements
- `/specs/001-research-study-management/data-model.md` - Entities
- `/specs/001-research-study-management/contracts/api-spec.yaml` - API
- `/memory/constitution.md` - Dev principles