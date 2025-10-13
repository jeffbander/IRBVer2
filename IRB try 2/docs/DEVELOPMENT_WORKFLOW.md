# Development Workflow After Deployment

This guide explains how to continue development after the production deployment is complete.

## Table of Contents

1. [Overview](#overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Branching Strategy](#branching-strategy)
4. [Local Development](#local-development)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Workflow](#deployment-workflow)
7. [Database Changes](#database-changes)
8. [Best Practices](#best-practices)

---

## Overview

The IRB Management System uses a multi-environment deployment strategy:

```
Local Development (SQLite)
          ↓
    Feature Branch
          ↓
    Pull Request + CI Tests
          ↓
    Develop Branch → Staging Environment (Auto-deploy)
          ↓
    Manual Approval
          ↓
    Main Branch → Production Environment
```

---

## Development Environment Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/irb-management-system.git
cd irb-management-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your local settings
nano .env
```

### 2. Configure Local Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 3. Start Development Server

```bash
# Start Next.js dev server
npm run dev

# Application runs at http://localhost:3001
```

### 4. Test the Application

```bash
# Run linting
npm run lint

# Run unit tests
npm run test

# Run E2E tests (requires dev server running)
npm run test:e2e
```

---

## Branching Strategy

### Branch Structure

- `main` - Production-ready code (protected)
- `develop` - Integration branch for staging (protected)
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency production fixes

### Creating a Feature Branch

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-participant-export

# Make your changes
# ... code ...

# Commit changes
git add .
git commit -m "feat: add participant export functionality"

# Push to remote
git push origin feature/add-participant-export
```

### Branch Naming Conventions

```bash
# Features
feature/add-user-notifications
feature/improve-dashboard-ui

# Bug fixes
bugfix/fix-participant-enrollment-validation
bugfix/resolve-document-upload-error

# Hotfixes (emergency production fixes)
hotfix/fix-authentication-bypass
hotfix/patch-sql-injection

# Chores (maintenance, dependencies)
chore/update-dependencies
chore/improve-documentation
```

---

## Local Development

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production build (test locally)
npm run build
npm run start
```

### Working with the Database

```bash
# Create a new migration
npx prisma migrate dev --name add_user_preferences

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (visual database editor)
npx prisma studio
```

### Docker Development (Optional)

```bash
# Test production Docker image locally
chmod +x scripts/local-docker-test.sh
./scripts/local-docker-test.sh

# Or manually:
docker-compose -f docker-compose.production.yml up
```

### Working with Cloud SQL Locally

To test against the staging database:

```bash
# Start Cloud SQL Proxy
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432

# Update .env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# Run application
npm run dev
```

---

## Testing Strategy

### Test Levels

1. **Unit Tests** - Test individual functions and components
2. **Integration Tests** - Test API routes and database interactions
3. **E2E Tests** - Test complete user workflows

### Running Tests

```bash
# All tests
npm run test

# With coverage
npm run test:coverage

# Watch mode (during development)
npm run test:watch

# E2E tests
npm run test:e2e

# E2E tests for specific browser
npx playwright test --project=chromium
```

### Writing Tests

#### Unit Test Example

```typescript
// __tests__/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from '@/utils/validation';

describe('validateEmail', () => {
  it('should validate correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

#### E2E Test Example

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Pre-commit Hooks

Tests run automatically before commits:

```bash
# Runs automatically on git commit
# - ESLint
# - Type checking
# - Unit tests (fast ones only)
```

To skip (not recommended):
```bash
git commit --no-verify -m "message"
```

---

## Deployment Workflow

### Standard Feature Deployment

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: implement new feature"

# 3. Push to GitHub
git push origin feature/new-feature

# 4. Create Pull Request
# - Go to GitHub
# - Create PR from feature/new-feature to develop
# - Wait for CI checks to pass
# - Request code review

# 5. Merge to develop (after approval)
# - Merging automatically deploys to staging

# 6. Test in staging
# Visit staging URL and test the feature

# 7. Merge develop to main (for production)
git checkout main
git pull origin main
git merge develop
git push origin main

# 8. Deploy to production (manual)
# - Go to GitHub Actions
# - Run "Deploy to Production" workflow
# - Type confirmation: deploy-to-production
```

### Hotfix Workflow

For emergency production fixes:

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Make minimal changes
# ... fix the bug ...

# 3. Test locally
npm run test
npm run build

# 4. Commit and push
git commit -m "hotfix: fix critical authentication bug"
git push origin hotfix/critical-bug-fix

# 5. Create PR to main
# - Request immediate review
# - Fast-track approval

# 6. Deploy to production
# - Use GitHub Actions workflow
# - Monitor closely

# 7. Merge back to develop
git checkout develop
git merge main
git push origin develop
```

---

## Database Changes

### Creating a Migration

```bash
# 1. Modify prisma/schema.prisma
# Add new model or field

# 2. Create migration
npx prisma migrate dev --name add_user_preferences

# 3. Test migration locally
# Check that application works with new schema

# 4. Commit migration files
git add prisma/migrations
git commit -m "feat: add user preferences schema"

# 5. Deploy
# Migration runs automatically during deployment
```

### Migration Best Practices

1. **Test migrations locally** before committing
2. **Make migrations backward compatible** when possible
3. **Use data migrations** for complex changes
4. **Backup database** before running migrations in production

### Handling Migration Failures

If a migration fails in production:

```bash
# 1. Check Cloud Run logs
gcloud run services logs read irb-system-production

# 2. Rollback deployment
./scripts/rollback.sh production

# 3. Fix migration locally
# 4. Test thoroughly
# 5. Redeploy
```

### Data Migrations

For complex data transformations:

```typescript
// scripts/data-migrations/001-migrate-user-roles.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  // Your data transformation logic
  await prisma.user.updateMany({
    where: { role: 'old_role' },
    data: { role: 'new_role' }
  });
}

migrate()
  .then(() => console.log('Migration complete'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run manually:
```bash
npx ts-node scripts/data-migrations/001-migrate-user-roles.ts
```

---

## Best Practices

### Code Quality

1. **Follow TypeScript conventions**
   - Use strong typing
   - Avoid `any` type
   - Define interfaces for data structures

2. **Write tests**
   - Unit tests for utilities
   - Integration tests for API routes
   - E2E tests for critical workflows

3. **Document your code**
   ```typescript
   /**
    * Enrolls a participant in a study
    * @param studyId - The ID of the study
    * @param participantData - Participant information
    * @returns Enrollment record
    * @throws Error if study is full or participant already enrolled
    */
   async function enrollParticipant(
     studyId: string,
     participantData: ParticipantData
   ): Promise<Enrollment> {
     // ...
   }
   ```

### Git Commit Messages

Follow conventional commits:

```bash
# Format: <type>(<scope>): <description>

# Types:
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting, etc.)
refactor: Code refactoring
test: Add or modify tests
chore: Maintenance tasks

# Examples:
git commit -m "feat(auth): add two-factor authentication"
git commit -m "fix(api): resolve participant enrollment validation"
git commit -m "docs: update deployment guide"
git commit -m "test: add E2E tests for document upload"
```

### Code Review

When reviewing pull requests:

1. **Check functionality** - Does it work as intended?
2. **Review tests** - Are there adequate tests?
3. **Check for security issues** - Any vulnerabilities?
4. **Review performance** - Any performance concerns?
5. **Check code style** - Follows project conventions?
6. **Review documentation** - Is it documented?

### Security Considerations

1. **Never commit secrets**
   - Use environment variables
   - Check `.gitignore` includes sensitive files

2. **Validate user input**
   - Sanitize inputs
   - Use Prisma parameterized queries
   - Validate on both client and server

3. **Authentication & Authorization**
   - Always check user permissions
   - Use JWT securely
   - Implement rate limiting

4. **Dependency Management**
   ```bash
   # Check for vulnerabilities
   npm audit

   # Fix automatically where possible
   npm audit fix
   ```

### Performance Optimization

1. **Database queries**
   - Use Prisma's `select` to limit fields
   - Add indexes for frequently queried fields
   - Use pagination for large datasets

2. **Next.js optimizations**
   - Use `getServerSideProps` for dynamic data
   - Use `getStaticProps` for static content
   - Optimize images with `next/image`

3. **Caching**
   - Cache static data
   - Use HTTP cache headers
   - Consider Redis for session storage

---

## Common Tasks

### Adding a New API Route

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Your logic here
    const data = await prisma.example.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate and create
    const result = await prisma.example.create({ data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Bad request' },
      { status: 400 }
    );
  }
}
```

### Adding a New Database Model

```prisma
// prisma/schema.prisma

model Example {
  id        String   @id @default(cuid())
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([name])
  @@map("examples")
}
```

Then:
```bash
npx prisma migrate dev --name add_example_model
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update all to latest minor versions
npm update

# Update to latest major versions (be careful!)
npm install package@latest

# Test after updates
npm run test
npm run build
```

---

## Troubleshooting Development Issues

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 PID
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma client
npx prisma generate

# If still issues, clear node_modules
rm -rf node_modules
npm install
```

### TypeScript Errors

```bash
# Check for errors
npx tsc --noEmit

# Restart TypeScript server in VS Code
# CMD/CTRL + Shift + P > "TypeScript: Restart TS Server"
```

---

## Getting Help

- **Documentation**: Check `/docs` folder
- **Code Examples**: Look at existing code patterns
- **Team Chat**: Ask in your team's communication channel
- **GitHub Issues**: Create an issue for bugs or feature requests

---

## Useful Commands Cheat Sheet

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run E2E tests
npm run lint               # Run ESLint

# Database
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create and apply migration
npx prisma generate        # Generate Prisma client

# Deployment
git push origin develop    # Deploy to staging
# GitHub Actions            # Deploy to production

# Monitoring
gcloud run services logs tail SERVICE_NAME
gcloud sql instances list
gcloud run services list
```
