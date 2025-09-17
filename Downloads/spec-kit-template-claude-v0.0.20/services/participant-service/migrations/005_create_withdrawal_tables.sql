-- Migration: Create withdrawal management tables
-- Created: 2025-09-16
-- Description: Create tables for participant withdrawal requests and processing

-- Create enum types for withdrawal
CREATE TYPE withdrawal_reason AS ENUM (
    'ADVERSE_EVENT',
    'PERSONAL_REASONS',
    'LACK_OF_EFFICACY',
    'PROTOCOL_VIOLATION',
    'LOST_TO_FOLLOWUP',
    'INVESTIGATOR_DECISION',
    'SPONSOR_DECISION',
    'DEATH',
    'OTHER'
);

CREATE TYPE data_retention_option AS ENUM (
    'DELETE_ALL',
    'RETAIN_ANONYMIZED',
    'RETAIN_ALL'
);

CREATE TYPE withdrawal_status AS ENUM (
    'REQUESTED',
    'UNDER_REVIEW',
    'APPROVED',
    'PROCESSED',
    'REJECTED'
);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    study_id UUID NOT NULL,

    -- Request details
    request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason withdrawal_reason NOT NULL,
    custom_reason TEXT, -- Required when reason is 'OTHER'

    -- Data handling preferences
    data_retention data_retention_option NOT NULL,
    future_contact BOOLEAN NOT NULL DEFAULT false,
    notifications BOOLEAN NOT NULL DEFAULT true,

    -- Request processing
    requested_by UUID NOT NULL, -- User who submitted the request
    processed_by UUID, -- User who processed the request
    processed_date TIMESTAMP WITH TIME ZONE,
    status withdrawal_status NOT NULL DEFAULT 'REQUESTED',
    review_notes TEXT,

    -- Additional information
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of document references

    -- HIPAA compliance tracking
    phi_retention_reviewed BOOLEAN DEFAULT false,
    phi_retention_approved_by UUID,
    phi_retention_approved_date TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create enrollment history table for audit trail
CREATE TABLE IF NOT EXISTS enrollment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

    -- Status change details
    from_status participant_status NOT NULL,
    to_status participant_status NOT NULL,
    changed_by UUID NOT NULL,
    changed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL,
    notes TEXT,

    -- Request context (if related to withdrawal)
    withdrawal_request_id UUID REFERENCES withdrawal_requests(id),

    -- HIPAA audit trail
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    session_id VARCHAR(255),

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create data retention log table
CREATE TABLE IF NOT EXISTS data_retention_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL, -- May reference deleted participant
    withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id),

    -- Retention details
    retention_option data_retention_option NOT NULL,
    executed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    executed_by UUID NOT NULL,

    -- Data handling
    tables_affected TEXT[] NOT NULL,
    records_anonymized INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    backup_reference VARCHAR(255), -- Reference to backup if created

    -- Verification
    verification_hash VARCHAR(255), -- Hash to verify data integrity
    verification_status VARCHAR(50) DEFAULT 'PENDING',

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for withdrawal requests
CREATE INDEX idx_withdrawal_participant_id ON withdrawal_requests(participant_id);
CREATE INDEX idx_withdrawal_study_id ON withdrawal_requests(study_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_reason ON withdrawal_requests(reason);
CREATE INDEX idx_withdrawal_request_date ON withdrawal_requests(request_date);
CREATE INDEX idx_withdrawal_effective_date ON withdrawal_requests(effective_date);
CREATE INDEX idx_withdrawal_requested_by ON withdrawal_requests(requested_by);
CREATE INDEX idx_withdrawal_processed_by ON withdrawal_requests(processed_by);

-- Create indexes for enrollment history
CREATE INDEX idx_history_participant_id ON enrollment_history(participant_id);
CREATE INDEX idx_history_changed_by ON enrollment_history(changed_by);
CREATE INDEX idx_history_changed_date ON enrollment_history(changed_date);
CREATE INDEX idx_history_from_status ON enrollment_history(from_status);
CREATE INDEX idx_history_to_status ON enrollment_history(to_status);
CREATE INDEX idx_history_withdrawal_request ON enrollment_history(withdrawal_request_id);
CREATE INDEX idx_history_participant_date ON enrollment_history(participant_id, changed_date DESC);

-- Create indexes for data retention log
CREATE INDEX idx_retention_participant_id ON data_retention_log(participant_id);
CREATE INDEX idx_retention_withdrawal_request ON data_retention_log(withdrawal_request_id);
CREATE INDEX idx_retention_executed_date ON data_retention_log(executed_date);
CREATE INDEX idx_retention_executed_by ON data_retention_log(executed_by);
CREATE INDEX idx_retention_option ON data_retention_log(retention_option);

-- Add constraints
ALTER TABLE withdrawal_requests ADD CONSTRAINT chk_withdrawal_effective_after_request
    CHECK (effective_date >= request_date);

ALTER TABLE withdrawal_requests ADD CONSTRAINT chk_withdrawal_custom_reason
    CHECK (
        (reason = 'OTHER' AND custom_reason IS NOT NULL AND length(custom_reason) > 0) OR
        (reason != 'OTHER')
    );

ALTER TABLE withdrawal_requests ADD CONSTRAINT chk_withdrawal_processing_logic
    CHECK (
        (status IN ('PROCESSED', 'APPROVED') AND processed_by IS NOT NULL AND processed_date IS NOT NULL) OR
        (status NOT IN ('PROCESSED', 'APPROVED'))
    );

ALTER TABLE withdrawal_requests ADD CONSTRAINT chk_withdrawal_phi_retention_logic
    CHECK (
        (data_retention != 'DELETE_ALL' OR phi_retention_reviewed = true) AND
        (phi_retention_approved_by IS NULL OR phi_retention_approved_date IS NOT NULL)
    );

ALTER TABLE enrollment_history ADD CONSTRAINT chk_history_status_different
    CHECK (from_status != to_status);

ALTER TABLE data_retention_log ADD CONSTRAINT chk_retention_record_counts
    CHECK (records_anonymized >= 0 AND records_deleted >= 0);

-- Unique constraints
CREATE UNIQUE INDEX idx_withdrawal_participant_active
    ON withdrawal_requests(participant_id)
    WHERE status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED');

-- Create triggers for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create enrollment history
CREATE OR REPLACE FUNCTION create_enrollment_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history for status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO enrollment_history (
            participant_id,
            from_status,
            to_status,
            changed_by,
            changed_date,
            reason,
            notes,
            ip_address,
            user_agent
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(NEW.updated_by, NEW.created_by),
            NOW(),
            CASE
                WHEN NEW.status = 'WITHDRAWN' THEN 'Status changed to withdrawn'
                WHEN NEW.status = 'COMPLETED' THEN 'Study completed'
                ELSE 'Status updated'
            END,
            NULL,
            '0.0.0.0'::inet, -- This should be populated from application context
            'System' -- This should be populated from application context
        );
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic enrollment history
CREATE TRIGGER create_participant_enrollment_history
    AFTER UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION create_enrollment_history();

-- Function to process withdrawal request
CREATE OR REPLACE FUNCTION process_withdrawal_request(
    p_request_id UUID,
    p_processed_by UUID,
    p_status withdrawal_status,
    p_review_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    request_record RECORD;
    participant_record RECORD;
BEGIN
    -- Get the withdrawal request
    SELECT * INTO request_record
    FROM withdrawal_requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
    END IF;

    -- Update withdrawal request status
    UPDATE withdrawal_requests
    SET
        status = p_status,
        processed_by = p_processed_by,
        processed_date = NOW(),
        review_notes = p_review_notes,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- If approved, update participant status
    IF p_status = 'APPROVED' THEN
        UPDATE participants
        SET
            status = 'WITHDRAWN',
            withdrawal_date = request_record.effective_date,
            withdrawal_reason = request_record.reason::text ||
                CASE WHEN request_record.custom_reason IS NOT NULL
                     THEN ': ' || request_record.custom_reason
                     ELSE ''
                END,
            updated_by = p_processed_by,
            updated_at = NOW()
        WHERE id = request_record.participant_id;

        -- Process data retention if specified
        IF request_record.data_retention = 'DELETE_ALL' THEN
            PERFORM execute_data_deletion(p_request_id, p_processed_by);
        ELSIF request_record.data_retention = 'RETAIN_ANONYMIZED' THEN
            PERFORM execute_data_anonymization(p_request_id, p_processed_by);
        END IF;
    END IF;

    RETURN true;
END;
$$ language 'plpgsql';

-- Placeholder functions for data retention (to be implemented based on requirements)
CREATE OR REPLACE FUNCTION execute_data_deletion(
    p_request_id UUID,
    p_executed_by UUID
) RETURNS VOID AS $$
BEGIN
    -- This would implement actual data deletion logic
    -- For now, just log the action
    INSERT INTO data_retention_log (
        participant_id,
        withdrawal_request_id,
        retention_option,
        executed_by,
        tables_affected,
        records_deleted
    )
    SELECT
        wr.participant_id,
        p_request_id,
        'DELETE_ALL',
        p_executed_by,
        ARRAY['participants', 'participant_demographics', 'informed_consent'],
        0 -- Would be actual count
    FROM withdrawal_requests wr
    WHERE wr.id = p_request_id;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION execute_data_anonymization(
    p_request_id UUID,
    p_executed_by UUID
) RETURNS VOID AS $$
BEGIN
    -- This would implement actual data anonymization logic
    -- For now, just log the action
    INSERT INTO data_retention_log (
        participant_id,
        withdrawal_request_id,
        retention_option,
        executed_by,
        tables_affected,
        records_anonymized
    )
    SELECT
        wr.participant_id,
        p_request_id,
        'RETAIN_ANONYMIZED',
        p_executed_by,
        ARRAY['participant_demographics', 'informed_consent'],
        0 -- Would be actual count
    FROM withdrawal_requests wr
    WHERE wr.id = p_request_id;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE withdrawal_requests IS 'Participant withdrawal requests with data retention options';
COMMENT ON TABLE enrollment_history IS 'Audit trail of participant status changes';
COMMENT ON TABLE data_retention_log IS 'Log of data retention and deletion actions';

COMMENT ON COLUMN withdrawal_requests.data_retention IS 'Participant preference for data handling after withdrawal';
COMMENT ON COLUMN withdrawal_requests.future_contact IS 'Whether participant consents to future contact';
COMMENT ON COLUMN withdrawal_requests.phi_retention_reviewed IS 'Whether PHI retention has been reviewed by compliance';
COMMENT ON COLUMN enrollment_history.ip_address IS 'IP address of user making status change (audit trail)';
COMMENT ON COLUMN data_retention_log.verification_hash IS 'Hash for verifying data retention actions';
COMMENT ON COLUMN data_retention_log.backup_reference IS 'Reference to backup created before deletion/anonymization';