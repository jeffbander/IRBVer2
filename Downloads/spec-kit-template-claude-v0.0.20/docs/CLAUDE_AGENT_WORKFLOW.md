# Claude Agent Parallel Development Workflow

## Overview
This document outlines the Git branching strategy and workflow for assigning Claude agents to develop different features of the Research Study Management System in parallel.

## Repository Structure
- **Main Branch**: `001-research-study-management`
- **GitHub Repository**: https://github.com/jeffbander/IRBVer2.git
- **Application Port**: 5000

## Feature Branches Created

### 1. Authentication Service (`feature/auth-service`)
**GitHub URL**: https://github.com/jeffbander/IRBVer2/tree/feature/auth-service
**Claude Agent Tasks**:
- JWT authentication implementation
- User login/logout endpoints
- Token refresh mechanism
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Session management with Redis

**Key Files to Work On**:
- `services/auth-service/` (new service)
- `packages/shared/src/types/auth.ts`
- `packages/shared/src/validators/auth.ts`

### 2. Study Management (`feature/study-management`)
**GitHub URL**: https://github.com/jeffbander/IRBVer2/tree/feature/study-management
**Claude Agent Tasks**:
- Study CRUD operations
- Protocol management
- Multi-site study support
- Study team assignments
- Study status workflows

**Key Files to Work On**:
- `services/study-management/src/routes/studies.ts`
- `services/study-management/src/models/study.ts`
- `services/study-management/src/controllers/studyController.ts`

### 3. Participant Enrollment (`feature/participant-enrollment`)
**GitHub URL**: https://github.com/jeffbander/IRBVer2/tree/feature/participant-enrollment
**Claude Agent Tasks**:
- Participant registration
- Eligibility screening
- Electronic informed consent
- Enrollment tracking
- Participant demographics

**Key Files to Work On**:
- `services/participant-service/` (new service)
- `packages/shared/src/types/participant.ts`
- `packages/shared/src/validators/participant.ts`

### 4. Data Collection (`feature/data-collection`)
**GitHub URL**: https://github.com/jeffbander/IRBVer2/tree/feature/data-collection
**Claude Agent Tasks**:
- Configurable data collection forms
- Visit scheduling and tracking
- Data validation and entry
- Form builder interface
- Data export functionality

**Key Files to Work On**:
- `services/data-collection-service/` (new service)
- `packages/shared/src/types/forms.ts`
- `packages/shared/src/validators/forms.ts`

### 5. IRB Workflow (`feature/irb-workflow`)
**GitHub URL**: https://github.com/jeffbander/IRBVer2/tree/feature/irb-workflow
**Claude Agent Tasks**:
- IRB submission tracking
- Protocol approval workflow
- Document versioning
- Compliance reporting
- Audit trail implementation

**Key Files to Work On**:
- `services/irb-service/` (new service)
- `packages/shared/src/types/irb.ts`
- `packages/shared/src/validators/irb.ts`

## Claude Agent Assignment Instructions

### For Each Agent:
1. **Clone the repository**:
   ```bash
   git clone https://github.com/jeffbander/IRBVer2.git
   cd "IRB ver2/IRBVer2/Downloads/spec-kit-template-claude-v0.0.20"
   ```

2. **Switch to assigned feature branch**:
   ```bash
   git checkout feature/[assigned-feature]
   ```

3. **Set up development environment**:
   ```bash
   npm install
   docker-compose up -d  # Start PostgreSQL and Redis
   npm run dev          # Start development server
   ```

4. **Development workflow**:
   - Follow TDD approach: Write tests first
   - Implement features according to the specification
   - Run tests: `npm test`
   - Run linting: `npm run lint`
   - Run type checking: `npm run typecheck`

5. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "feat: [description of changes]"
   git push origin feature/[assigned-feature]
   ```

6. **Create pull request** when feature is complete:
   - Target branch: `001-research-study-management`
   - Include comprehensive description
   - Add test results and screenshots

## Dependencies and Integration Points

### Shared Dependencies
- All features depend on `packages/shared` for types and validators
- Authentication service must be completed first for other services
- Database migrations should be coordinated

### Service Communication
- Services communicate via REST APIs
- Use environment variables for service URLs
- Implement proper error handling and logging

### Testing Strategy
- **Contract Tests**: Test API contracts between services
- **Integration Tests**: Test service interactions
- **Unit Tests**: Test individual components
- **E2E Tests**: Test complete user workflows

## Coordination Guidelines

### Daily Sync
- Each agent should update their branch daily
- Report progress and blockers
- Coordinate on shared components

### Conflict Resolution
- Merge conflicts should be resolved by rebasing
- Shared types/validators require coordination
- Database schema changes need approval

### Code Review Process
1. Create pull request with detailed description
2. Request review from team lead
3. Address feedback and update code
4. Merge after approval

## Environment Setup Details

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL client tools
- Git

### Configuration
- Application runs on port 5000
- PostgreSQL on port 5432
- Redis on port 6379
- Environment variables in `.env` file

### Database Setup
```bash
npm run db:migrate     # Run migrations
npm run db:seed        # Seed with Mount Sinai data
```

## Success Criteria

Each feature branch should deliver:
- ✅ Complete API implementation
- ✅ Comprehensive test coverage (>80%)
- ✅ Type safety with TypeScript
- ✅ Proper error handling
- ✅ Documentation updates
- ✅ Integration with shared components

## Next Steps

1. Assign Claude agents to specific feature branches
2. Set up regular sync meetings
3. Begin parallel development
4. Monitor progress and coordinate integration
5. Merge completed features back to main branch

## Support and Resources

- **Specification**: `specs/001-research-study-management.md`
- **API Contracts**: `specs/001-research-study-management/contracts/`
- **Architecture**: `architecture/system-design.md`
- **Development Guide**: `CLAUDE.md`

---

**Note**: This workflow enables true parallel development where multiple Claude agents can work on different features simultaneously without conflicts, leading to faster delivery of the complete Research Study Management System.