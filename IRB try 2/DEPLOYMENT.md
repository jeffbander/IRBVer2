# IRB Management System - Deployment Guide

This guide covers deploying the IRB Management System to production environments using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Docker** 20.10+ and Docker Compose 2.0+
- **Node.js** 18+ (for local development)
- **PostgreSQL** 14+ (for production) or SQLite (for development)
- Git (for version control)
- At least 2GB RAM and 10GB disk space

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/irb_db"  # Production
# DATABASE_URL="file:./dev.db"  # Development (SQLite)

# JWT Configuration
JWT_SECRET="your-super-secure-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Application Configuration
NODE_ENV="production"
PORT=3000

# Optional: Upload Configuration
MAX_UPLOAD_SIZE="10485760"  # 10MB in bytes
ALLOWED_FILE_TYPES=".pdf,.doc,.docx,.jpg,.png"
```

### Security Best Practices

1. **JWT_SECRET**: Generate a strong random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Database Password**: Use strong passwords (20+ characters, mixed case, numbers, symbols)

3. **Environment Files**: Never commit `.env` files to version control

## Database Setup

### Option 1: PostgreSQL (Production)

1. Install PostgreSQL:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib

   # macOS (via Homebrew)
   brew install postgresql
   ```

2. Create database and user:
   ```sql
   CREATE DATABASE irb_db;
   CREATE USER irb_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE irb_db TO irb_user;
   ```

3. Update `.env` with connection string:
   ```bash
   DATABASE_URL="postgresql://irb_user:your_secure_password@localhost:5432/irb_db"
   ```

### Option 2: SQLite (Development Only)

SQLite is pre-configured for development. No additional setup required.

```bash
DATABASE_URL="file:./dev.db"
```

### Run Migrations

Apply database schema:

```bash
npx prisma migrate deploy
```

### Seed Database (Optional)

Create initial admin user and sample data:

```bash
npm run seed
```

**Default Admin Credentials:**
- Email: `admin@irb.local`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the admin password immediately after first login in production!

## Docker Deployment

### Build Docker Image

```bash
docker build -t irb-system:latest .
```

### Run with Docker Compose

#### Production Mode

```bash
docker-compose up -d
```

This starts:
- `app`: Next.js application on port 3000
- `init-db`: Database migration and seeding

#### Development Mode

```bash
docker-compose --profile dev up
```

This starts the development server with hot-reload on port 3001.

### Verify Deployment

Check container status:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs -f app
```

## Local Development

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Run Database Migrations

```bash
npx prisma migrate dev
```

### Seed Database

```bash
npm run seed
```

### Start Development Server

```bash
npm run dev
```

Application available at: `http://localhost:3000`

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests
npx playwright test

# Test coverage
npm run test:coverage
```

## Production Deployment

### 1. Prepare Production Environment

```bash
# Clone repository
git clone https://github.com/your-org/irb-system.git
cd irb-system

# Checkout stable branch
git checkout main

# Copy environment template
cp .env.example .env

# Edit .env with production values
nano .env
```

### 2. Build and Deploy

```bash
# Build production image
docker build -t irb-system:prod -f Dockerfile .

# Start services
docker-compose up -d

# Verify health
curl http://localhost:3000/api/health
```

### 3. Configure Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/irb-system`:

```nginx
server {
    listen 80;
    server_name irb.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/irb-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Configure SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d irb.yourdomain.com
```

### 5. Set Up Automatic Backups

Create backup script `/opt/scripts/backup-irb.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/irb"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL database
docker exec irb-postgres pg_dump -U irb_user irb_db > "$BACKUP_DIR/db_$DATE.sql"

# Backup uploaded files
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /path/to/uploads

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
```

Add to crontab:

```bash
# Backup daily at 2 AM
0 2 * * * /opt/scripts/backup-irb.sh
```

## Health Checks

The application provides built-in health check endpoints:

### Application Health

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T06:30:00.000Z"
}
```

### Docker Health Check

Docker automatically monitors container health:

```bash
docker inspect --format='{{.State.Health.Status}}' irb-app
```

## Monitoring

### View Application Logs

```bash
# All logs
docker-compose logs -f

# Application logs only
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### Monitor Resource Usage

```bash
docker stats irb-app
```

### Database Monitoring

```bash
# Open Prisma Studio (development only)
npx prisma studio

# Check database connections
docker exec irb-postgres psql -U irb_user -d irb_db -c "SELECT count(*) FROM pg_stat_activity;"
```

## Troubleshooting

### Issue: Container Won't Start

**Check logs:**
```bash
docker-compose logs app
```

**Common causes:**
- Missing environment variables
- Database connection failure
- Port already in use

**Solution:**
```bash
# Check environment
cat .env

# Test database connection
docker exec irb-postgres psql -U irb_user -d irb_db -c "SELECT 1;"

# Check port availability
lsof -i :3000
```

### Issue: Database Migration Failures

**Reset database (development only):**
```bash
npx prisma migrate reset
npx prisma migrate deploy
npm run seed
```

**Production migration:**
```bash
# Create backup first
docker exec irb-postgres pg_dump -U irb_user irb_db > backup.sql

# Run migration
docker-compose run --rm init-db
```

### Issue: Permission Denied Errors

**Fix file permissions:**
```bash
# For uploads directory
sudo chown -R 1001:1001 uploads/

# For database files (SQLite)
sudo chown -R 1001:1001 prisma/
```

### Issue: Out of Memory

**Increase Docker memory limit:**

Edit `docker-compose.yml`:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Issue: Build Fails in Docker

**Clear Docker cache:**
```bash
docker system prune -a
docker-compose build --no-cache
```

### Issue: Tests Failing in CI

**Check GitHub Actions logs:**
```bash
# View workflow runs
gh run list

# View specific run
gh run view <run-id>
```

**Common fixes:**
- Update dependencies: `npm update`
- Clear test database: `rm -f test.db`
- Regenerate Prisma client: `npx prisma generate`

## Performance Optimization

### Enable Next.js Caching

In production, Next.js automatically caches pages. To clear cache:

```bash
docker exec irb-app rm -rf .next/cache
docker-compose restart app
```

### Database Connection Pooling

Update Prisma schema for connection pooling:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pooling
  connectionLimit = 10
}
```

### Optimize Docker Image Size

Current image size: ~200MB (multi-stage build)

To reduce further:
- Use `node:18-alpine` (already implemented)
- Remove development dependencies in production
- Compress static assets

## Scaling

### Horizontal Scaling

Run multiple instances behind a load balancer:

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
```

### Database Scaling

For high-traffic deployments:
1. Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. Enable read replicas
3. Implement Redis caching

## Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET
- [ ] Use HTTPS in production
- [ ] Set up firewall rules
- [ ] Enable CORS only for trusted domains
- [ ] Regular security updates: `npm audit fix`
- [ ] Implement rate limiting
- [ ] Regular database backups
- [ ] Monitor error logs for suspicious activity

## Support

For issues and questions:
- **GitHub Issues:** https://github.com/your-org/irb-system/issues
- **Documentation:** https://docs.your-domain.com
- **Email:** support@your-domain.com

## License

[Your License Here]
