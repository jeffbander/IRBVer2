-- Migration: Create refresh_tokens table
-- Created: 2025-09-16
-- Description: Create table to store JWT refresh tokens for session management

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Token metadata
    ip_address INET,
    user_agent TEXT,

    -- Revocation
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by_user_id UUID,
    revocation_reason VARCHAR(100),

    -- Family tracking (for token rotation)
    family_id UUID,

    CONSTRAINT fk_refresh_tokens_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_refresh_tokens_revoked_by
        FOREIGN KEY (revoked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id, is_revoked, expires_at);
CREATE INDEX idx_refresh_tokens_cleanup ON refresh_tokens(expires_at, is_revoked);

-- Add constraints
ALTER TABLE refresh_tokens ADD CONSTRAINT chk_refresh_tokens_expires_future
    CHECK (expires_at > created_at);

ALTER TABLE refresh_tokens ADD CONSTRAINT chk_refresh_tokens_revocation
    CHECK (
        (is_revoked = false AND revoked_at IS NULL AND revoked_by_user_id IS NULL) OR
        (is_revoked = true AND revoked_at IS NOT NULL)
    );

-- Create function to automatically cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup if any tokens were deleted
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Cleaned up % expired refresh tokens', deleted_count;
    END IF;

    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for session management';
COMMENT ON COLUMN refresh_tokens.id IS 'Unique identifier for the refresh token';
COMMENT ON COLUMN refresh_tokens.user_id IS 'User who owns this refresh token';
COMMENT ON COLUMN refresh_tokens.token IS 'The actual refresh token (hashed or encrypted)';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'When this token expires';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address where token was created';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User agent where token was created';
COMMENT ON COLUMN refresh_tokens.is_revoked IS 'Whether this token has been revoked';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Token family for rotation tracking';
COMMENT ON FUNCTION cleanup_expired_refresh_tokens() IS 'Function to remove old expired tokens';