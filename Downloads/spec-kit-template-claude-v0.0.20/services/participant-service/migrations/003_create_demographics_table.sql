-- Migration: Create participant demographics table (HIPAA compliant)
-- Created: 2025-09-16
-- Description: Create table for storing participant demographics with encryption support

-- Create enum types for demographics
CREATE TYPE gender_type AS ENUM (
    'MALE',
    'FEMALE',
    'NON_BINARY',
    'PREFER_NOT_TO_SAY',
    'OTHER'
);

CREATE TYPE race_type AS ENUM (
    'AMERICAN_INDIAN_ALASKA_NATIVE',
    'ASIAN',
    'BLACK_AFRICAN_AMERICAN',
    'NATIVE_HAWAIIAN_PACIFIC_ISLANDER',
    'WHITE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);

CREATE TYPE ethnicity_type AS ENUM (
    'HISPANIC_LATINO',
    'NOT_HISPANIC_LATINO',
    'PREFER_NOT_TO_SAY'
);

CREATE TYPE education_level AS ENUM (
    'LESS_THAN_HIGH_SCHOOL',
    'HIGH_SCHOOL_GED',
    'SOME_COLLEGE',
    'ASSOCIATES_DEGREE',
    'BACHELORS_DEGREE',
    'MASTERS_DEGREE',
    'DOCTORAL_DEGREE',
    'PREFER_NOT_TO_SAY'
);

CREATE TYPE marital_status AS ENUM (
    'SINGLE',
    'MARRIED',
    'DIVORCED',
    'WIDOWED',
    'SEPARATED',
    'DOMESTIC_PARTNERSHIP',
    'PREFER_NOT_TO_SAY'
);

CREATE TYPE employment_status AS ENUM (
    'EMPLOYED_FULL_TIME',
    'EMPLOYED_PART_TIME',
    'UNEMPLOYED',
    'RETIRED',
    'STUDENT',
    'DISABLED',
    'HOMEMAKER',
    'PREFER_NOT_TO_SAY'
);

CREATE TYPE insurance_type AS ENUM (
    'PRIVATE',
    'MEDICARE',
    'MEDICAID',
    'MILITARY',
    'UNINSURED',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);

CREATE TYPE contact_method AS ENUM (
    'EMAIL',
    'PHONE',
    'SMS',
    'MAIL',
    'PORTAL'
);

-- Create participant demographics table
CREATE TABLE IF NOT EXISTS participant_demographics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

    -- Basic demographics
    date_of_birth_encrypted BYTEA, -- Encrypted date of birth (PHI)
    gender gender_type NOT NULL,
    race race_type[] NOT NULL, -- Array to support multiple races
    ethnicity ethnicity_type NOT NULL,
    primary_language VARCHAR(50) NOT NULL,

    -- Optional demographics
    education_level education_level,
    marital_status marital_status,
    employment_status employment_status,
    insurance_type insurance_type,

    -- Address information (all encrypted for HIPAA)
    address_line1_encrypted BYTEA,
    address_line2_encrypted BYTEA,
    city_encrypted BYTEA,
    state_encrypted BYTEA,
    zip_code_encrypted BYTEA,
    country_encrypted BYTEA,

    -- Contact information (all encrypted for HIPAA)
    phone_number_encrypted BYTEA,
    email_encrypted BYTEA,
    emergency_contact_name_encrypted BYTEA,
    emergency_contact_phone_encrypted BYTEA,
    emergency_contact_relation_encrypted BYTEA,

    -- Privacy controls
    data_encrypted BOOLEAN NOT NULL DEFAULT true,
    consent_to_contact BOOLEAN NOT NULL DEFAULT false,
    preferred_contact_method contact_method NOT NULL,

    -- Encryption metadata
    encryption_key_id VARCHAR(255) NOT NULL,
    encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    encrypted_fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- List of encrypted field names

    -- Audit and compliance
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID
);

-- Create indexes for performance (exclude encrypted fields from indexing for security)
CREATE INDEX idx_demographics_participant_id ON participant_demographics(participant_id);
CREATE INDEX idx_demographics_gender ON participant_demographics(gender);
CREATE INDEX idx_demographics_race ON participant_demographics USING GIN(race);
CREATE INDEX idx_demographics_ethnicity ON participant_demographics(ethnicity);
CREATE INDEX idx_demographics_primary_language ON participant_demographics(primary_language);
CREATE INDEX idx_demographics_education_level ON participant_demographics(education_level);
CREATE INDEX idx_demographics_contact_method ON participant_demographics(preferred_contact_method);
CREATE INDEX idx_demographics_consent_to_contact ON participant_demographics(consent_to_contact);
CREATE INDEX idx_demographics_created_at ON participant_demographics(created_at);

-- Unique constraint - one demographics record per participant
CREATE UNIQUE INDEX idx_demographics_participant_unique ON participant_demographics(participant_id);

-- Add constraints
ALTER TABLE participant_demographics ADD CONSTRAINT chk_demographics_race_not_empty
    CHECK (array_length(race, 1) > 0);

ALTER TABLE participant_demographics ADD CONSTRAINT chk_demographics_primary_language
    CHECK (length(primary_language) > 0);

ALTER TABLE participant_demographics ADD CONSTRAINT chk_demographics_encryption_key
    CHECK (length(encryption_key_id) > 0);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_demographics_updated_at
    BEFORE UPDATE ON participant_demographics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log demographics access for HIPAA compliance
CREATE OR REPLACE FUNCTION log_demographics_access(
    p_participant_id UUID,
    p_user_id UUID,
    p_access_type VARCHAR(50),
    p_fields_accessed TEXT[],
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
        'resource_type', 'demographics',
        'fields_accessed', p_fields_accessed,
        'ip_address', p_ip_address,
        'user_agent', p_user_agent
    )
    WHERE id = p_participant_id;
END;
$$ language 'plpgsql';

-- Function to validate age based on encrypted date of birth
CREATE OR REPLACE FUNCTION validate_participant_age(
    encrypted_dob BYTEA,
    encryption_key VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
    decrypted_dob DATE;
    participant_age INTEGER;
BEGIN
    -- This is a placeholder for actual decryption logic
    -- In production, this would decrypt the date of birth and validate age
    -- For now, we'll assume valid age
    RETURN true;
END;
$$ language 'plpgsql';

-- Create view for demographics summary (non-PHI fields only)
CREATE OR REPLACE VIEW participant_demographics_summary AS
SELECT
    pd.id,
    pd.participant_id,
    pd.gender,
    pd.race,
    pd.ethnicity,
    pd.primary_language,
    pd.education_level,
    pd.marital_status,
    pd.employment_status,
    pd.insurance_type,
    pd.consent_to_contact,
    pd.preferred_contact_method,
    pd.data_encrypted,
    pd.created_at,
    pd.updated_at
FROM participant_demographics pd;

-- Add comments for documentation
COMMENT ON TABLE participant_demographics IS 'HIPAA-compliant participant demographics with encryption';
COMMENT ON COLUMN participant_demographics.id IS 'Unique identifier for demographics record';
COMMENT ON COLUMN participant_demographics.participant_id IS 'Reference to participant (unique)';
COMMENT ON COLUMN participant_demographics.date_of_birth_encrypted IS 'Encrypted date of birth (PHI)';
COMMENT ON COLUMN participant_demographics.gender IS 'Gender identity';
COMMENT ON COLUMN participant_demographics.race IS 'Race categories (can select multiple)';
COMMENT ON COLUMN participant_demographics.ethnicity IS 'Ethnicity category';
COMMENT ON COLUMN participant_demographics.primary_language IS 'Primary language spoken';
COMMENT ON COLUMN participant_demographics.address_line1_encrypted IS 'Encrypted address line 1 (PHI)';
COMMENT ON COLUMN participant_demographics.phone_number_encrypted IS 'Encrypted phone number (PHI)';
COMMENT ON COLUMN participant_demographics.email_encrypted IS 'Encrypted email address (PHI)';
COMMENT ON COLUMN participant_demographics.data_encrypted IS 'Flag indicating if PHI fields are encrypted';
COMMENT ON COLUMN participant_demographics.consent_to_contact IS 'Whether participant consents to be contacted';
COMMENT ON COLUMN participant_demographics.preferred_contact_method IS 'Preferred method of contact';
COMMENT ON COLUMN participant_demographics.encryption_key_id IS 'Reference to encryption key used';
COMMENT ON COLUMN participant_demographics.encrypted_fields IS 'List of field names that are encrypted';

COMMENT ON VIEW participant_demographics_summary IS 'Non-PHI demographics summary for general access';