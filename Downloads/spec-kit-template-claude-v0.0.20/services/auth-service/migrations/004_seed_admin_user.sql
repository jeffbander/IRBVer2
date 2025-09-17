-- Migration: Seed admin user
-- Created: 2025-09-16
-- Description: Create initial admin user for the system

-- Insert default admin user
-- Password: AdminSecure123! (should be changed on first login)
-- This is a bcrypt hash with 10 rounds
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    active,
    is_email_verified,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'admin@mountsinai.org',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'System',
    'Administrator',
    'ADMIN',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert Mount Sinai test users for development
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    active,
    is_email_verified,
    created_at,
    updated_at
) VALUES
(
    uuid_generate_v4(),
    'principal.investigator@mountsinai.org',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'Dr. Sarah',
    'Johnson',
    'PRINCIPAL_INVESTIGATOR',
    true,
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'study.coordinator@mountsinai.org',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'Maria',
    'Rodriguez',
    'STUDY_COORDINATOR',
    true,
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'data.analyst@mountsinai.org',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'David',
    'Chen',
    'DATA_ANALYST',
    true,
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'site.coordinator@mountsinai.org',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'Emily',
    'Williams',
    'SITE_COORDINATOR',
    true,
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'monitor@mountsinai.org',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'Michael',
    'Brown',
    'MONITOR',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Create a test participant user (inactive by default)
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    active,
    is_email_verified,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'participant.test@example.com',
    '$2b$10$rQjZvXvyN8YK9w5X.5H.H.QmKhM4xvJ5xkZwUy.ZzGhJ4tGxGpJ2',
    'Test',
    'Participant',
    'PARTICIPANT',
    false,
    false,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Add comment about default password
COMMENT ON TABLE users IS 'Default password for all seeded users is: AdminSecure123! - CHANGE ON FIRST LOGIN';