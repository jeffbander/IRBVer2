-- PostgreSQL initialization script
-- This script is executed when the PostgreSQL container starts for the first time

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For faster text search

-- Create database if it doesn't exist (handled by Docker)
-- The database is created by the POSTGRES_DB environment variable

-- Set default timezone
SET timezone = 'UTC';

-- Create application user if needed (optional, handled by environment)
-- The user is created by POSTGRES_USER and POSTGRES_PASSWORD

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE irb_production TO irbuser;

-- Performance tuning (adjust based on your server specs)
-- These are conservative settings for a small to medium deployment
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost = '1.1'; -- For SSD storage
ALTER SYSTEM SET effective_io_concurrency = '200'; -- For SSD storage
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Connection pooling settings
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Logging for monitoring
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET logging_collector = 'on';
ALTER SYSTEM SET log_directory = 'log';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_rotation_age = '1d';
ALTER SYSTEM SET log_rotation_size = '100MB';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log queries taking more than 1 second
ALTER SYSTEM SET log_statement = 'ddl'; -- Log DDL statements

-- Note: Restart PostgreSQL for system-level changes to take effect
-- In production, these settings should be carefully tuned based on actual workload
