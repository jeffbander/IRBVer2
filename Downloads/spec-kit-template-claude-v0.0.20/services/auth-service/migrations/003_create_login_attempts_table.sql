-- Migration: Create login_attempts table
-- Created: 2025-09-16
-- Description: Create table to track login attempts for security monitoring

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    user_id UUID,
    success BOOLEAN NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Failure details
    failure_reason VARCHAR(100),

    -- Risk assessment
    risk_score INTEGER DEFAULT 0,
    blocked BOOLEAN DEFAULT false,

    CONSTRAINT fk_login_attempts_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance and analysis
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts(timestamp);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);
CREATE INDEX idx_login_attempts_blocked ON login_attempts(blocked);

-- Composite indexes for security analysis
CREATE INDEX idx_login_attempts_email_timestamp ON login_attempts(email, timestamp DESC);
CREATE INDEX idx_login_attempts_ip_timestamp ON login_attempts(ip_address, timestamp DESC);
CREATE INDEX idx_login_attempts_failed_recent ON login_attempts(email, success, timestamp)
    WHERE success = false;

-- Add constraints
ALTER TABLE login_attempts ADD CONSTRAINT chk_login_attempts_risk_score
    CHECK (risk_score >= 0 AND risk_score <= 100);

-- Create function to cleanup old login attempts
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep login attempts for 90 days for security analysis
    DELETE FROM login_attempts
    WHERE timestamp < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    IF deleted_count > 0 THEN
        RAISE NOTICE 'Cleaned up % old login attempts', deleted_count;
    END IF;

    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Create function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION detect_suspicious_login_patterns(
    check_email VARCHAR(255),
    check_ip INET,
    time_window INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE(
    pattern_type VARCHAR(50),
    risk_level VARCHAR(20),
    details JSONB
) AS $$
BEGIN
    -- Multiple failed attempts from same email
    RETURN QUERY
    SELECT
        'REPEATED_FAILURES'::VARCHAR(50) as pattern_type,
        CASE
            WHEN count(*) >= 10 THEN 'HIGH'
            WHEN count(*) >= 5 THEN 'MEDIUM'
            ELSE 'LOW'
        END::VARCHAR(20) as risk_level,
        jsonb_build_object(
            'failed_attempts', count(*),
            'email', check_email,
            'time_window', time_window
        ) as details
    FROM login_attempts
    WHERE email = check_email
      AND success = false
      AND timestamp > NOW() - time_window
    GROUP BY email
    HAVING count(*) >= 3;

    -- Multiple attempts from same IP
    RETURN QUERY
    SELECT
        'IP_BRUTE_FORCE'::VARCHAR(50) as pattern_type,
        CASE
            WHEN count(DISTINCT email) >= 10 THEN 'HIGH'
            WHEN count(DISTINCT email) >= 5 THEN 'MEDIUM'
            ELSE 'LOW'
        END::VARCHAR(20) as risk_level,
        jsonb_build_object(
            'unique_emails', count(DISTINCT email),
            'total_attempts', count(*),
            'ip_address', check_ip,
            'time_window', time_window
        ) as details
    FROM login_attempts
    WHERE ip_address = check_ip
      AND success = false
      AND timestamp > NOW() - time_window
    GROUP BY ip_address
    HAVING count(DISTINCT email) >= 3;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE login_attempts IS 'Track all login attempts for security monitoring';
COMMENT ON COLUMN login_attempts.email IS 'Email address used in login attempt';
COMMENT ON COLUMN login_attempts.user_id IS 'User ID if user exists (NULL for non-existent users)';
COMMENT ON COLUMN login_attempts.success IS 'Whether the login attempt was successful';
COMMENT ON COLUMN login_attempts.failure_reason IS 'Reason for failure (invalid_password, account_locked, etc.)';
COMMENT ON COLUMN login_attempts.risk_score IS 'Calculated risk score (0-100)';
COMMENT ON FUNCTION cleanup_old_login_attempts() IS 'Remove login attempts older than 90 days';
COMMENT ON FUNCTION detect_suspicious_login_patterns(VARCHAR, INET, INTERVAL) IS 'Detect patterns indicating potential attacks';