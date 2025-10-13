Research Study Management System
A comprehensive platform for managing clinical trials and academic research studies with HIPAA compliance and regulatory support.

Project Structure
├── apps/                   # Frontend applications
│   └── researcher-portal/  # Web app for researchers
├── services/              # Backend microservices
│   ├── study-management/  # Study protocol management
│   └── participant-service/ # Participant management
├── packages/              # Shared libraries
│   └── shared/           # Common types, validators, utilities
├── architecture/          # System design documentation
├── specs/                # Feature specifications
└── memory/               # Project constitution and guidelines
Quick Start
Prerequisites
Node.js >= 18.0.0
npm >= 9.0.0
Installation
npm install
Development
# Run all services in development mode
npm run dev

# Run specific service
cd services/study-management
npm run dev
Testing
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
Building
# Build all packages
npm run build
Code Quality
# Run linter
npm run lint

# Type checking
npm run typecheck
Architecture
The system follows a microservices architecture with:

Domain-driven design principles
Event-driven communication
CQRS pattern for complex domains
Comprehensive audit logging
HIPAA-compliant data handling
See architecture/system-design.md for detailed architecture documentation.

Constitution
Development follows strict TDD principles and compliance requirements. See memory/constitution.md for development standards and governance.

Features
Study Management: Create and manage multi-site clinical trials
Participant Enrollment: Electronic consent and enrollment workflows
Data Collection: Configurable forms with validation and branching logic
Compliance: HIPAA, 21 CFR Part 11, GCP compliance
Audit Trail: Complete audit logging of all operations
Reporting: Real-time dashboards and regulatory reports
Security
Encryption at rest and in transit
Role-based access control (RBAC)
Multi-factor authentication
Regular security audits
Zero-trust security model
License
UNLICENSED - Proprietary software
