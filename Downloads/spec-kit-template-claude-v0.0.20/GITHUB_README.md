# Research Study Management System

🏥 **Mount Sinai Health System** - Clinical Research Platform

## Overview

A comprehensive research study management system for IRB submission tracking, participant enrollment, and clinical trial management. Built with TypeScript, Node.js, and PostgreSQL following Test-Driven Development principles.

## 🚀 Features

- **Study Management**: Create and manage multi-site clinical trials
- **IRB Workflow**: Track submissions through approval process
- **Participant Enrollment**: Electronic consent and enrollment tracking
- **Document Management**: Version-controlled protocol documents
- **Team Management**: Role-based assignments with effort tracking
- **Budget Tracking**: Financial management with line items
- **Audit Trail**: Complete HIPAA-compliant audit logging
- **Task Management**: Protocol-driven task generation

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Researcher     │────▶│   API Gateway   │────▶│  Study Service  │
│   Portal        │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                         │
                                │                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Participant    │────▶│     Auth        │────▶│   PostgreSQL    │
│    Portal       │     │    Service      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                         │
                                ▼                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │     Redis       │     │   File Storage  │
                        │    (Cache)      │     │                 │
                        └─────────────────┘     └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: Node.js 18+, TypeScript 5.9
- **Database**: PostgreSQL 15, Redis
- **API**: REST with OpenAPI/Swagger
- **Authentication**: JWT with refresh tokens
- **Testing**: Jest, Supertest (TDD approach)
- **Validation**: Zod schemas
- **Logging**: Winston
- **Container**: Docker & Docker Compose

## 📦 Project Structure

```
research-study-management/
├── packages/
│   └── shared/           # Shared types, validators, utilities
├── services/
│   ├── study-management/ # Core study service
│   └── participant/      # Participant enrollment
├── apps/
│   └── researcher-portal/ # Frontend application
├── specs/                # Feature specifications
├── architecture/         # System design documents
└── scripts/             # Automation scripts
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 15 (via Docker)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/research-study-management.git
cd research-study-management

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start databases
docker-compose up -d

# Run migrations
npm run db:migrate

# Seed with Mount Sinai sample data
npm run db:seed

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- --testPathPattern=auth

# Run contract tests only
npm test -- --testPathPattern=contract
```

## 🔐 API Documentation

The API follows REST principles with OpenAPI documentation.

### Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "researcher@mountsinai.org",
  "password": "securePassword123"
}
```

### Create Study

```http
POST /api/v1/studies
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "COVID-19 Long-term Effects Study",
  "type": "OBSERVATIONAL",
  "protocolNumber": "MSH-2024-001",
  "principalInvestigatorId": "uuid"
}
```

### Enroll Participant

```http
POST /api/v1/studies/{studyId}/participants
Authorization: Bearer <token>
Content-Type: application/json

{
  "participantId": "MSH-001-0001",
  "consentVersion": "1.0",
  "consentDate": "2025-01-15"
}
```

## 🧪 Test-Driven Development

This project follows strict TDD principles:

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code while keeping tests green

Current test coverage target: **80%**

## 📊 Sample Data

The system includes Mount Sinai Health System sample data:

### Test Users
- **Dr. Sarah Chen** (PI) - sarah.chen@mountsinai.org
- **Emily Johnson** (Coordinator) - emily.johnson@mountsinai.org
- **David Kim** (IRB) - david.kim@mountsinai.org

### Sample Studies
- COVID-19 Long-term Effects Study (250 participants)
- Novel Cancer Immunotherapy Trial (45 participants)
- Diabetes Prevention Program (In IRB review)

## 🔒 Security & Compliance

- **HIPAA Compliance**: PHI encryption, audit trails
- **21 CFR Part 11**: Electronic signatures support
- **RBAC**: Role-based access control
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Audit Logging**: Immutable audit trail

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
docker build -t research-study-mgmt .
```

### Google Cloud Deployment (Future)
```bash
gcloud app deploy
```

## 📈 Performance

- Page load: < 1.5 seconds
- API response: < 200ms (95th percentile)
- File uploads: Up to 100MB
- Concurrent users: 10,000+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD)
4. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Commit Convention

We use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Maintenance

## 📝 License

Proprietary - Mount Sinai Health System

## 👥 Team

Mount Sinai Health System - Research IT Department

## 🆘 Support

- Email: research-it@mountsinai.org
- Documentation: [Internal Wiki]
- Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/research-study-management/issues)

---

**Mount Sinai Health System** - *Advancing Medicine Through Research*

🏥 New York, NY | ✉️ research@mountsinai.org