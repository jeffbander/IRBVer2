-- Migration: Create informed consent table
-- Created: 2025-09-16
-- Description: Create table for tracking informed consent with version control and audit trail

-- Create enum types for consent
CREATE TYPE consent_type AS ENUM (
    'MAIN_STUDY',
    'BIOSPECIMEN',
    'GENETIC_TESTING',
    'DATA_SHARING',
    'PHOTOGRAPHY',
    'FUTURE_CONTACT'
);

CREATE TYPE consent_status AS ENUM (
    'PENDING',
    'SIGNED',
    'WITHDRAWN',
    'EXPIRED',
    'SUPERSEDED'
);

-- Create informed consent table
CREATE TABLE IF NOT EXISTS informed_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    study_id UUID NOT NULL,
    version VARCHAR(20) NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    consent_type consent_type NOT NULL,
    status consent_status NOT NULL DEFAULT 'PENDING',

    -- Document and witness information
    document_id UUID, -- Reference to stored consent document
    witness_id UUID, -- Reference to witness user
    witness_name VARCHAR(200),

    -- Electronic signature and tracking (HIPAA compliant)
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    electronic_signature VARCHAR(500) NOT NULL,
    signature_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Withdrawal tracking
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    withdrawal_ip_address INET,
    withdrawal_user_agent TEXT,

    -- Audit and compliance
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Digital signature verification
    signature_hash VARCHAR(255), -- Hash of the signed content
    verification_status VARCHAR(50) DEFAULT 'VALID'
);

-- Create indexes for performance
CREATE INDEX idx_informed_consent_participant_id ON informed_consent(participant_id);
CREATE INDEX idx_informed_consent_study_id ON informed_consent(study_id);
CREATE INDEX idx_informed_consent_consent_type ON informed_consent(consent_type);
CREATE INDEX idx_informed_consent_status ON informed_consent(status);
CREATE INDEX idx_informed_consent_version ON informed_consent(version);
CREATE INDEX idx_informed_consent_consent_date ON informed_consent(consent_date);
CREATE INDEX idx_informed_consent_document_id ON informed_consent(document_id);

-- Composite indexes for common queries
CREATE INDEX idx_consent_participant_type ON informed_consent(participant_id, consent_type);
CREATE INDEX idx_consent_study_type_status ON informed_consent(study_id, consent_type, status);
CREATE INDEX idx_consent_participant_date ON informed_consent(participant_id, consent_date DESC);

-- Add constraints
ALTER TABLE informed_consent ADD CONSTRAINT chk_consent_withdrawal_logic
    CHECK (
        (status = 'WITHDRAWN' AND withdrawal_date IS NOT NULL AND withdrawal_reason IS NOT NULL) OR
        (status != 'WITHDRAWN' AND withdrawal_date IS NULL)
    );

ALTER TABLE informed_consent ADD CONSTRAINT chk_consent_dates_logic
    CHECK (
        withdrawal_date IS NULL OR withdrawal_date >= consent_date
    );

ALTER TABLE informed_consent ADD CONSTRAINT chk_consent_signature_required
    CHECK (
        (status = 'SIGNED' AND electronic_signature IS NOT NULL AND length(electronic_signature) > 0) OR
        (status != 'SIGNED')
    );

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_informed_consent_updated_at
    BEFORE UPDATE ON informed_consent
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to track consent version superseding
CREATE OR REPLACE FUNCTION supersede_previous_consent()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark previous consents of the same type as superseded
    IF NEW.status = 'SIGNED' THEN
        UPDATE informed_consent
        SET status = 'SUPERSEDED',
            updated_at = NOW()
        WHERE participant_id = NEW.participant_id
            AND consent_type = NEW.consent_type
            AND status = 'SIGNED'
            AND id != NEW.id
            AND consent_date < NEW.consent_date;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for consent superseding
CREATE TRIGGER supersede_previous_consent
    AFTER INSERT OR UPDATE ON informed_consent
    FOR EACH ROW
    EXECUTE FUNCTION supersede_previous_consent();

-- Function to log consent access for HIPAA compliance
CREATE OR REPLACE FUNCTION log_consent_access(
    p_consent_id UUID,
    p_user_id UUID,
    p_access_type VARCHAR(50),
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS VOID AS $$
BEGIN
    -- Update the PHI access log in the participants table
    UPDATE participants
    SET phi_access_log = phi_access_log || jsonb_build_object(
        'timestamp', NOW(),
        'user_id', p_user_id,
        'access_type', p_access_type,
        'resource_type', 'informed_consent',
        'resource_id', p_consent_id,
        'ip_address', p_ip_address,
        'user_agent', p_user_agent
    )
    WHERE id = (
        SELECT participant_id FROM informed_consent WHERE id = p_consent_id
    );
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE informed_consent IS 'Informed consent tracking with electronic signatures and audit trail';
COMMENT ON COLUMN informed_consent.id IS 'Unique identifier for the consent record';
COMMENT ON COLUMN informed_consent.participant_id IS 'Reference to the participant';
COMMENT ON COLUMN informed_consent.study_id IS 'Reference to the study';
COMMENT ON COLUMN informed_consent.version IS 'Version of the consent form';
COMMENT ON COLUMN informed_consent.consent_date IS 'Date and time when consent was given';
COMMENT ON COLUMN informed_consent.consent_type IS 'Type of consent (main study, biospecimen, etc.)';
COMMENT ON COLUMN informed_consent.status IS 'Current status of the consent';
COMMENT ON COLUMN informed_consent.document_id IS 'Reference to the stored consent document';
COMMENT ON COLUMN informed_consent.witness_id IS 'User ID of the witness';
COMMENT ON COLUMN informed_consent.witness_name IS 'Name of the witness';
COMMENT ON COLUMN informed_consent.ip_address IS 'IP address when consent was signed';
COMMENT ON COLUMN informed_consent.user_agent IS 'Browser/device information when consent was signed';
COMMENT ON COLUMN informed_consent.electronic_signature IS 'Electronic signature of the participant';
COMMENT ON COLUMN informed_consent.signature_timestamp IS 'Exact timestamp of electronic signature';
COMMENT ON COLUMN informed_consent.withdrawal_date IS 'Date when consent was withdrawn';
COMMENT ON COLUMN informed_consent.withdrawal_reason IS 'Reason for consent withdrawal';
COMMENT ON COLUMN informed_consent.signature_hash IS 'Cryptographic hash for signature verification';
COMMENT ON COLUMN informed_consent.verification_status IS 'Status of signature verification';