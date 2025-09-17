-- Migration: Create participants table
-- Created: 2025-09-16
-- Description: Create the main participants table for enrollment tracking

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for participant status
CREATE TYPE participant_status AS ENUM (
    'PRESCREENING',
    'SCREENING',
    'SCREEN_FAILURE',
    'ELIGIBLE',
    'ENROLLED',
    'ACTIVE',
    'COMPLETED',
    'WITHDRAWN',
    'LOST_TO_FOLLOWUP',
    'DISCONTINUED',
    'TERMINATED'
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_id UUID NOT NULL,
    external_id VARCHAR(50) NOT NULL, -- Study-specific participant ID (e.g., MSH-001-0001)
    status participant_status NOT NULL DEFAULT 'PRESCREENING',
    enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    completion_date TIMESTAMP WITH TIME ZONE,
    screening_number VARCHAR(50),
    randomization_code VARCHAR(50),
    site_id UUID,

    -- Audit and compliance
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- HIPAA compliance tracking
    data_encryption_key_id VARCHAR(255), -- Reference to encryption key
    phi_access_log JSONB DEFAULT '[]'::jsonb -- Track PHI access
);

-- Create indexes for performance
CREATE INDEX idx_participants_study_id ON participants(study_id);
CREATE INDEX idx_participants_external_id ON participants(external_id);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_enrollment_date ON participants(enrollment_date);
CREATE INDEX idx_participants_screening_number ON participants(screening_number);
CREATE INDEX idx_participants_site_id ON participants(site_id);
CREATE INDEX idx_participants_created_at ON participants(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_participants_study_status ON participants(study_id, status);
CREATE INDEX idx_participants_site_status ON participants(site_id, status);
CREATE INDEX idx_participants_study_enrollment_date ON participants(study_id, enrollment_date DESC);

-- Unique constraint to prevent duplicate participant IDs within the same study
CREATE UNIQUE INDEX idx_participants_study_external_id ON participants(study_id, external_id);

-- Add constraints
ALTER TABLE participants ADD CONSTRAINT chk_participants_external_id_format
    CHECK (external_id ~ '^[A-Z0-9\-]+$');

ALTER TABLE participants ADD CONSTRAINT chk_participants_withdrawal_logic
    CHECK (
        (status = 'WITHDRAWN' AND withdrawal_date IS NOT NULL AND withdrawal_reason IS NOT NULL) OR
        (status != 'WITHDRAWN' AND withdrawal_date IS NULL)
    );

ALTER TABLE participants ADD CONSTRAINT chk_participants_completion_logic
    CHECK (
        (status = 'COMPLETED' AND completion_date IS NOT NULL) OR
        (status != 'COMPLETED')
    );

ALTER TABLE participants ADD CONSTRAINT chk_participants_dates_logic
    CHECK (
        withdrawal_date IS NULL OR withdrawal_date >= enrollment_date
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_participant_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transitions JSONB;
BEGIN
    -- Define valid status transitions
    valid_transitions := '{
        "PRESCREENING": ["SCREENING", "SCREEN_FAILURE", "WITHDRAWN"],
        "SCREENING": ["ELIGIBLE", "SCREEN_FAILURE", "WITHDRAWN"],
        "SCREEN_FAILURE": [],
        "ELIGIBLE": ["ENROLLED", "WITHDRAWN"],
        "ENROLLED": ["ACTIVE", "WITHDRAWN", "DISCONTINUED"],
        "ACTIVE": ["COMPLETED", "WITHDRAWN", "LOST_TO_FOLLOWUP", "DISCONTINUED", "TERMINATED"],
        "COMPLETED": [],
        "WITHDRAWN": [],
        "LOST_TO_FOLLOWUP": ["ACTIVE", "WITHDRAWN", "DISCONTINUED"],
        "DISCONTINUED": [],
        "TERMINATED": []
    }'::jsonb;

    -- Skip validation for new records
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Check if status transition is valid
    IF OLD.status != NEW.status THEN
        IF NOT (valid_transitions->OLD.status::text ? NEW.status::text) THEN
            RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for status transition validation
CREATE TRIGGER validate_participant_status_transition
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION validate_participant_status_transition();

-- Add comments for documentation
COMMENT ON TABLE participants IS 'Participant enrollment and status tracking table';
COMMENT ON COLUMN participants.id IS 'Unique identifier for the participant';
COMMENT ON COLUMN participants.study_id IS 'Reference to the study the participant is enrolled in';
COMMENT ON COLUMN participants.external_id IS 'Study-specific participant identifier (e.g., MSH-001-0001)';
COMMENT ON COLUMN participants.status IS 'Current enrollment status of the participant';
COMMENT ON COLUMN participants.enrollment_date IS 'Date when participant was initially enrolled';
COMMENT ON COLUMN participants.withdrawal_date IS 'Date when participant withdrew from study';
COMMENT ON COLUMN participants.withdrawal_reason IS 'Reason for withdrawal from study';
COMMENT ON COLUMN participants.completion_date IS 'Date when participant completed the study';
COMMENT ON COLUMN participants.screening_number IS 'Screening identification number';
COMMENT ON COLUMN participants.randomization_code IS 'Randomization assignment code';
COMMENT ON COLUMN participants.site_id IS 'Site where participant is enrolled';
COMMENT ON COLUMN participants.data_encryption_key_id IS 'Reference to encryption key for HIPAA compliance';
COMMENT ON COLUMN participants.phi_access_log IS 'Log of PHI access for audit trail';