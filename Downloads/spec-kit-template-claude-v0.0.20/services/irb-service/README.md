# IRB Service

A comprehensive IRB (Institutional Review Board) workflow and compliance management service for research studies.

## Features

### Core IRB Workflow
- **IRB Submission Management**: Complete workflow from draft to approval
- **Review Assignment**: Automated and manual reviewer assignment
- **Meeting Management**: IRB meeting scheduling and agenda management
- **Decision Tracking**: Approval, rejection, and conditional approval workflows
- **Amendment Handling**: Protocol amendments and continuing reviews

### Safety Reporting
- **Adverse Event Reporting**: SAE and SUSAR tracking with automated escalation
- **Protocol Deviation Management**: Severity assessment and corrective actions
- **Regulatory Compliance**: FDA, sponsor, and IRB reporting requirements
- **Timeline Monitoring**: Automated compliance checking and alerts

### Document Management
- **Version Control**: Complete document lifecycle management
- **Electronic Signatures**: 21 CFR Part 11 compliant signatures
- **Access Control**: Role-based document access and permissions
- **Audit Trail**: Complete document history and change tracking

### Compliance Monitoring
- **Real-time Metrics**: Compliance dashboards and KPI tracking
- **Automated Alerts**: Proactive notification of compliance issues
- **Audit Support**: Complete audit trail and reporting capabilities
- **Risk Assessment**: Automated risk scoring and mitigation

### Notification System
- **Email Notifications**: Automated email alerts for critical events
- **Scheduled Reminders**: Continuing review and deadline reminders
- **Escalation Workflows**: Automatic escalation of overdue items
- **Custom Templates**: Configurable notification templates

## Database Schema

The service uses PostgreSQL with comprehensive tables for:
- IRB submissions and reviews
- Adverse events and hospitalizations
- Protocol deviations and corrective actions
- Document management and versioning
- Compliance metrics and audit logs

## API Endpoints

### IRB Submissions
- `POST /api/irb/submissions` - Create new submission
- `GET /api/irb/submissions/:id` - Get submission details
- `POST /api/irb/submissions/:id/submit` - Submit for review
- `POST /api/irb/submissions/:id/assign-reviewers` - Assign reviewers
- `POST /api/irb/submissions/:id/decision` - Make IRB decision

### Adverse Events
- `POST /api/adverse-events` - Report new adverse event
- `GET /api/adverse-events/:id` - Get adverse event details
- `POST /api/adverse-events/:id/submit` - Submit for regulatory reporting
- `POST /api/adverse-events/:id/hospitalization` - Add hospitalization
- `GET /api/adverse-events/studies/:studyId/dashboard` - SAE dashboard

### Protocol Deviations
- `POST /api/protocol-deviations` - Report protocol deviation
- `GET /api/protocol-deviations/:id` - Get deviation details
- `POST /api/protocol-deviations/:id/corrective-action` - Add corrective action
- `GET /api/protocol-deviations/studies/:studyId/dashboard` - Deviation dashboard

## Authentication & Authorization

The service uses JWT-based authentication with role-based access control:
- **ADMIN**: Full system access
- **PRINCIPAL_INVESTIGATOR**: Study management and submissions
- **STUDY_COORDINATOR**: Data entry and monitoring
- **IRB_MEMBER**: Review access and voting
- **MONITOR**: Read-only monitoring access

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=research_study
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password

# Service
IRB_SERVICE_PORT=3003
```

## Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migration:run

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Testing

The service includes comprehensive tests for:
- Unit tests for all services and controllers
- Integration tests for workflows
- API endpoint tests
- Database integration tests

Run tests with coverage:
```bash
npm run test:coverage
```

## Compliance & Security

- **21 CFR Part 11**: Electronic signature compliance
- **GCP Guidelines**: Good Clinical Practice adherence
- **HIPAA**: Protected health information security
- **Audit Trail**: Complete user action logging
- **Data Encryption**: At-rest and in-transit encryption

## Monitoring & Alerts

The service provides comprehensive monitoring:
- Real-time compliance metrics
- Automated deadline tracking
- Escalation workflows
- Performance monitoring
- Security event logging

## Integration

The IRB service integrates with:
- **Study Management Service**: Protocol and participant data
- **Document Service**: File storage and versioning
- **Notification Service**: Multi-channel alerting
- **User Service**: Authentication and authorization
- **Audit Service**: Comprehensive logging

## Development

### Code Structure
```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── workflows/       # State machines and processes
├── repositories/    # Data access layer
├── middleware/      # Authentication, validation
├── notifications/   # Alert and notification systems
├── utils/          # Shared utilities
└── types/          # TypeScript type definitions
```

### Contributing

1. Create feature branch from `main`
2. Implement features with tests
3. Ensure >80% test coverage
4. Submit pull request with description

## License

Proprietary - Mount Sinai Health System