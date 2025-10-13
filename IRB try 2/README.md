# Mount Sinai IRB Management System

A modern, AI-powered Institutional Review Board (IRB) management system built for Mount Sinai Health System. This application streamlines research protocol management, document review, and compliance tracking with integrated AI document analysis and official Mount Sinai branding.

![Mount Sinai Health System](https://img.shields.io/badge/Mount%20Sinai-Health%20System-06ABEB)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4)

## Features

### Core IRB Management
- **Study Management**: Create, review, and track clinical research studies
- **Participant Enrollment**: Manage participant enrollment across multiple studies
- **Document Management**: Upload and organize study-related documents
- **Workflow Automation**: Streamlined review and approval processes
- **Role-Based Access Control**: PI, Reviewer, Admin, and User roles with granular permissions
- **Audit Logging**: Complete audit trail of all system activities
- **Dashboard Analytics**: Real-time study statistics and insights

### 🤖 AI-Powered Features (Aigents Integration)
- **Mistral OCR**: Automatic text extraction from PDF documents (47-page protocols in seconds)
- **Automated Document Analysis**: Send documents to Aigents AI for intelligent analysis
- **Multiple AI Chains**: Different analysis workflows for protocols, consent forms, adverse events
- **Real-time Status Tracking**: Monitor AI analysis progress with status badges
- **Detailed Results**: View comprehensive AI-generated insights and recommendations
- **Webhook Integration**: Automatic updates when analysis completes via ngrok tunnel
- **Mock Mode**: Test locally without external API dependencies

### 🎨 Mount Sinai Design System
- **Official Branding**: Mount Sinai Health System colors and identity
  - Primary: #06ABEB (Vivid Cerulean)
  - Accent: #DC298D (Barbie Pink)
  - Heading: #212070 (St. Patrick's Blue)
  - Navy: #00002D (Cetacean Blue)
- **Component Library**: Reusable UI components
  - Buttons (4 variants, 3 sizes, loading states)
  - Cards (StatCard, ProtocolCard, StatusBadge)
  - Forms (Input, Textarea, Select, Checkbox)
  - Semantic status colors for workflows
- **Accessibility**: WCAG 2.1 AA compliant
- **Typography**: Inter font with professional scale
- **Responsive**: Mobile-first design approach

## Tech Stack

- **Frontend**: Next.js 14.2.5 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with Mount Sinai design tokens
- **State Management**: Zustand
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (production)
- **Authentication**: JWT-based authentication
- **Testing**: Playwright E2E tests
- **AI Integration**:
  - Mistral OCR for document text extraction
  - Aigents API for AI-powered document analysis
  - Ngrok for secure webhook tunneling

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IRB\ try\ 2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL` - Database connection string
   - `JWT_SECRET` - Secret for JWT tokens
   - `AIGENTS_API_URL` - Aigents API endpoint (optional)
   - `AIGENTS_EMAIL` - Email for Aigents notifications (optional)
   - `AIGENTS_WEBHOOK_SECRET` - Webhook secret (optional)
   - `USE_AIGENTS_MOCK` - Set to `true` for local development

4. **Initialize the database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

   This creates the database schema and seeds initial data:
   - Admin user: `admin@example.com` / `password123`
   - PI user: `pi@example.com` / `password123`
   - Reviewer user: `reviewer@example.com` / `password123`
   - Regular user: `user@example.com` / `password123`

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Access the application at `http://localhost:3001`

## Usage

### User Roles

- **Admin**: Full system access, user management
- **Principal Investigator (PI)**: Create studies, upload documents, enroll participants
- **Reviewer**: Review and approve/reject studies
- **User**: View assigned studies (read-only)

### Quick Start Workflow

1. **Login** with one of the seeded accounts
2. **Create a Study** (as PI)
   - Navigate to Studies → New Study
   - Fill in protocol details
   - Submit for review
3. **Review Study** (as Reviewer)
   - View pending studies
   - Approve or request revisions
4. **Upload Documents** (as PI)
   - Navigate to study details
   - Upload protocol, consent forms, etc.
   - **NEW**: Send documents to Aigents for AI analysis
5. **Enroll Participants** (as PI)
   - Active studies can enroll participants
   - Track enrollment progress

### Aigents AI Integration

#### Sending Documents for Analysis

1. Upload a document to a study
2. Click **"Send to Aigents"** on the document
3. Select the appropriate AI chain:
   - **Protocol Analyzer** - For research protocols
   - **Consent Form Reviewer** - For consent forms
   - **Adverse Event Analyzer** - For adverse event reports
   - **Document Analyzer** - General purpose
4. Click **"Send to Aigents"**
5. Monitor status badge (pending → processing → completed)
6. Click **"View Analysis"** to see results

#### Available AI Chains

- **Protocol Analyzer**: Extracts study objectives, duration, endpoints
- **Consent Form Reviewer**: Checks regulatory compliance and completeness
- **Adverse Event Analyzer**: Assesses severity and required actions
- **Document Analyzer**: General analysis for any document type

See [docs/AIGENTS_INTEGRATION.md](docs/AIGENTS_INTEGRATION.md) for complete documentation.

## Development

### Project Structure

```
.
├── app/                      # Next.js App Router pages and API routes
│   ├── api/                  # API endpoints
│   │   ├── auth/            # Authentication
│   │   ├── studies/         # Study CRUD operations
│   │   ├── documents/       # Document management & OCR
│   │   ├── participants/    # Participant enrollment
│   │   ├── dashboard/       # Dashboard statistics
│   │   └── webhooks/        # Aigents webhook receiver
│   ├── studies/             # Study pages
│   ├── dashboard/           # Dashboard page (Mount Sinai redesign)
│   ├── login/               # Login page (Mount Sinai branding)
│   └── layout.tsx           # Root layout
├── components/
│   └── ui/                  # Mount Sinai UI component library
│       ├── Button.tsx       # Button component (4 variants, 3 sizes)
│       ├── Card.tsx         # Card components (StatCard, ProtocolCard)
│       ├── Input.tsx        # Form components (Input, Textarea, Select, Checkbox)
│       └── index.ts         # Component exports
├── lib/                     # Shared utilities
│   ├── prisma.ts           # Prisma client
│   ├── auth.ts             # Authentication helpers
│   ├── aigents.ts          # Aigents integration service
│   ├── mistral.ts          # Mistral OCR integration
│   ├── middleware.ts       # API middleware
│   ├── validation.ts       # Input validation
│   └── state.ts            # Zustand store
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma       # Data models
│   ├── seed.ts             # Seed data
│   └── migrations/         # Database migrations
├── tests/                   # Playwright E2E tests
│   ├── aigents-integration.spec.ts
│   ├── participant-enrollment-simple.spec.ts
│   └── ...
├── docs/                    # Documentation
│   ├── AIGENTS_INTEGRATION.md
│   └── VALIDATION_REQUIREMENTS.md
├── uploads/                 # Document storage
├── tailwind.config.js       # Mount Sinai design tokens
└── public/                  # Static assets
```

### Database Schema

Key models:
- **User** - System users with role-based permissions
- **Role** - User roles (Admin, PI, Reviewer, User)
- **Study** - Clinical research studies
- **Document** - Study documents with Aigents integration fields
- **Participant** - Enrolled study participants
- **AuditLog** - Audit trail of all activities

### API Routes

#### Authentication
- `POST /api/auth?action=login` - Login
- `POST /api/auth?action=logout` - Logout

#### Studies
- `GET /api/studies` - List studies
- `POST /api/studies` - Create study
- `GET /api/studies/[id]` - Get study details
- `PUT /api/studies/[id]` - Update study
- `DELETE /api/studies/[id]` - Delete study
- `POST /api/studies/[id]/review` - Review study (approve/reject)

#### Documents
- `POST /api/studies/[id]/documents` - Upload document
- `GET /api/studies/[id]/documents/[documentId]` - Download document
- `POST /api/documents/[documentId]/aigents` - Send to Aigents
- `POST /api/webhooks/aigents` - Aigents webhook receiver

#### Participants
- `GET /api/studies/[id]/participants` - List participants
- `POST /api/studies/[id]/participants` - Enroll participant
- `PUT /api/participants/[id]` - Update participant
- `DELETE /api/participants/[id]` - Remove participant

#### Analytics
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/audit-logs` - Audit log entries

## Testing

### Running Tests

```bash
# Run all Playwright tests
npm run test

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test tests/aigents-integration.spec.ts

# Run tests with UI
npx playwright test --ui
```

### Test Coverage

- ✅ Authentication flow
- ✅ Study creation and management
- ✅ Document upload and download
- ✅ Participant enrollment
- ✅ Aigents integration (send to AI, view analysis)
- ✅ Role-based access control
- ✅ Validation error handling

## Production Deployment

### Environment Setup

1. Set production environment variables:
   ```bash
   NODE_ENV=production
   DATABASE_URL=postgresql://user:password@host:5432/irb_production
   JWT_SECRET=<strong-random-secret>
   AIGENTS_WEBHOOK_SECRET=<webhook-secret>
   USE_AIGENTS_MOCK=false
   ```

2. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Start production server:
   ```bash
   npm start
   ```

### Aigents Webhook Configuration

Configure your production webhook URL in Aigents dashboard:
```
https://your-domain.com/api/webhooks/aigents
```

See [docs/AIGENTS_INTEGRATION.md](docs/AIGENTS_INTEGRATION.md) for details.

## Documentation

- [Aigents Integration Guide](docs/AIGENTS_INTEGRATION.md) - Complete guide to AI-powered document analysis
- [Validation Requirements](docs/VALIDATION_REQUIREMENTS.md) - Input validation rules
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions

## Security Features

- JWT-based authentication with secure token handling
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection
- Rate limiting (configurable)
- Audit logging of all operations
- Webhook signature validation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Port 3000 already in use**
- The app will automatically use port 3001
- Or manually kill the process using port 3000

**Database errors**
- Reset database: `npx prisma migrate reset`
- Regenerate client: `npx prisma generate`

**Aigents integration not working**
- Enable mock mode: `USE_AIGENTS_MOCK=true`
- Check API URL configuration
- Verify webhook secret matches

**Permission denied errors**
- Check user role and permissions
- Refresh auth token (logout/login)
- Verify role configuration in database

See individual documentation files for feature-specific troubleshooting.

## License

[MIT License](LICENSE)

## Support

For issues or questions:
- Check the [documentation](docs/)
- Review [existing issues](https://github.com/your-org/irb-system/issues)
- Open a new issue with detailed description

---

## 🔄 Recent Updates

### v2.0 - Mount Sinai Design System (Latest - October 2025)
- ✨ Implemented official Mount Sinai Health System branding
- 🎨 Created reusable UI component library (Button, Card, Input components)
- 🔄 Redesigned dashboard with StatCards and Mount Sinai colors
- 📱 Enhanced studies page with brand colors and improved UX
- 🔐 Redesigned login page with beautiful gradient and branding
- ♿ Improved accessibility (WCAG 2.1 AA compliant)
- 📐 Added complete design token system in Tailwind config
- 🎯 Mobile-responsive design across all pages

### v1.5 - AI Integration (September 2025)
- 🤖 Mistral OCR implementation for PDF text extraction
- 🔗 Aigents webhook integration for automated document analysis
- 📊 Automated protocol analysis with AI chains
- 📝 Comprehensive audit logging for compliance
- 🔄 Real-time status tracking for AI analysis
- 📡 Ngrok tunnel setup for webhook callbacks

---

**Version**: 2.0.0
**Last Updated**: October 13, 2025
**License**: Proprietary - Mount Sinai Health System

Built with ❤️ for Mount Sinai Health System | Powered by Next.js, TypeScript, and AI
