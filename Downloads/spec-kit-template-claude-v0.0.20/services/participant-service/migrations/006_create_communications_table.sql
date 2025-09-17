-- Migration: Create participant communications table
-- Created: 2025-09-16
-- Description: Create table for participant communication tracking and notification system

-- Create enum types for communications
CREATE TYPE communication_type AS ENUM (
    'WELCOME',
    'APPOINTMENT_REMINDER',
    'VISIT_CONFIRMATION',
    'FOLLOW_UP',
    'ADVERSE_EVENT_FOLLOW_UP',
    'STUDY_UPDATE',
    'WITHDRAWAL_CONFIRMATION',
    'COMPLETION_NOTICE',
    'GENERAL'
);

CREATE TYPE communication_status AS ENUM (
    'SCHEDULED',
    'PENDING',
    'SENT',
    'DELIVERED',
    'READ',
    'RESPONDED',
    'FAILED',
    'CANCELLED'
);

-- Create participant communications table
CREATE TABLE IF NOT EXISTS participant_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    study_id UUID NOT NULL,

    -- Communication details
    type communication_type NOT NULL,
    method contact_method NOT NULL,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,

    -- Scheduling
    scheduled_date TIMESTAMP WITH TIME ZONE,
    sent_date TIMESTAMP WITH TIME ZONE,
    delivered_date TIMESTAMP WITH TIME ZONE,
    read_date TIMESTAMP WITH TIME ZONE,
    response_date TIMESTAMP WITH TIME ZONE,

    -- Status and delivery
    status communication_status NOT NULL DEFAULT 'PENDING',
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_date TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,

    -- Template and personalization
    template_id UUID,
    template_version VARCHAR(20),
    personalization_data JSONB DEFAULT '{}'::jsonb,

    -- Response tracking
    response TEXT,
    response_required BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP WITH TIME ZONE,

    -- Delivery tracking (for email/SMS)
    external_message_id VARCHAR(255), -- External service message ID
    delivery_receipt JSONB, -- Full delivery receipt data
    open_tracking BOOLEAN DEFAULT false,
    click_tracking BOOLEAN DEFAULT false,
    opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,

    -- Consent and compliance
    consent_verified BOOLEAN DEFAULT false,
    opt_out_link_included BOOLEAN DEFAULT false,
    privacy_compliant BOOLEAN DEFAULT true,

    -- Audit fields
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create communication templates table
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_id UUID,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type communication_type NOT NULL,
    method contact_method NOT NULL,

    -- Template content
    subject_template VARCHAR(200) NOT NULL,
    content_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Available template variables

    -- Settings
    active BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_date TIMESTAMP WITH TIME ZONE,

    -- Personalization
    personalization_rules JSONB DEFAULT '{}'::jsonb,
    conditional_logic JSONB DEFAULT '{}'::jsonb,

    -- Compliance
    opt_out_required BOOLEAN DEFAULT true,
    consent_required BOOLEAN DEFAULT false,
    hipaa_compliant BOOLEAN DEFAULT true,

    -- Audit fields
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create communication preferences table
CREATE TABLE IF NOT EXISTS communication_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

    -- Method preferences
    preferred_method contact_method NOT NULL DEFAULT 'EMAIL',
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    phone_enabled BOOLEAN DEFAULT false,
    mail_enabled BOOLEAN DEFAULT false,
    portal_enabled BOOLEAN DEFAULT true,

    -- Type preferences
    appointment_reminders BOOLEAN DEFAULT true,
    study_updates BOOLEAN DEFAULT true,
    follow_up_communications BOOLEAN DEFAULT true,
    marketing_communications BOOLEAN DEFAULT false,
    research_opportunities BOOLEAN DEFAULT false,

    -- Timing preferences
    preferred_time_start TIME DEFAULT '09:00:00',
    preferred_time_end TIME DEFAULT '17:00:00',
    preferred_timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Monday, 7=Sunday

    -- Language and accessibility
    language_preference VARCHAR(10) DEFAULT 'en',
    large_print BOOLEAN DEFAULT false,
    audio_format BOOLEAN DEFAULT false,
    braille_format BOOLEAN DEFAULT false,

    -- Frequency limits
    max_daily_communications INTEGER DEFAULT 3,
    max_weekly_communications INTEGER DEFAULT 10,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for participant communications
CREATE INDEX idx_communications_participant_id ON participant_communications(participant_id);
CREATE INDEX idx_communications_study_id ON participant_communications(study_id);
CREATE INDEX idx_communications_type ON participant_communications(type);
CREATE INDEX idx_communications_method ON participant_communications(method);
CREATE INDEX idx_communications_status ON participant_communications(status);
CREATE INDEX idx_communications_scheduled_date ON participant_communications(scheduled_date);
CREATE INDEX idx_communications_sent_date ON participant_communications(sent_date);
CREATE INDEX idx_communications_template_id ON participant_communications(template_id);
CREATE INDEX idx_communications_created_by ON participant_communications(created_by);

-- Composite indexes for common queries
CREATE INDEX idx_communications_participant_type ON participant_communications(participant_id, type);
CREATE INDEX idx_communications_participant_status ON participant_communications(participant_id, status);
CREATE INDEX idx_communications_status_scheduled ON participant_communications(status, scheduled_date);
CREATE INDEX idx_communications_study_type_status ON participant_communications(study_id, type, status);

-- Create indexes for communication templates
CREATE INDEX idx_templates_study_id ON communication_templates(study_id);
CREATE INDEX idx_templates_type ON communication_templates(type);
CREATE INDEX idx_templates_method ON communication_templates(method);
CREATE INDEX idx_templates_active ON communication_templates(active);
CREATE INDEX idx_templates_name ON communication_templates(name);

-- Create indexes for communication preferences
CREATE INDEX idx_preferences_participant_id ON communication_preferences(participant_id);
CREATE INDEX idx_preferences_preferred_method ON communication_preferences(preferred_method);
CREATE INDEX idx_preferences_language ON communication_preferences(language_preference);

-- Unique constraints
CREATE UNIQUE INDEX idx_communications_external_message
    ON participant_communications(external_message_id)
    WHERE external_message_id IS NOT NULL;

CREATE UNIQUE INDEX idx_templates_study_name_version
    ON communication_templates(study_id, name, version)
    WHERE study_id IS NOT NULL;

CREATE UNIQUE INDEX idx_templates_global_name_version
    ON communication_templates(name, version)
    WHERE study_id IS NULL;

CREATE UNIQUE INDEX idx_preferences_participant
    ON communication_preferences(participant_id);

-- Add constraints
ALTER TABLE participant_communications ADD CONSTRAINT chk_communications_subject_length
    CHECK (length(subject) > 0);

ALTER TABLE participant_communications ADD CONSTRAINT chk_communications_content_length
    CHECK (length(content) > 0);

ALTER TABLE participant_communications ADD CONSTRAINT chk_communications_delivery_attempts
    CHECK (delivery_attempts >= 0 AND delivery_attempts <= 10);

ALTER TABLE participant_communications ADD CONSTRAINT chk_communications_scheduled_logic
    CHECK (
        (status = 'SCHEDULED' AND scheduled_date IS NOT NULL) OR
        (status != 'SCHEDULED')
    );

ALTER TABLE participant_communications ADD CONSTRAINT chk_communications_sent_logic
    CHECK (
        (status IN ('SENT', 'DELIVERED', 'READ', 'RESPONDED') AND sent_date IS NOT NULL) OR
        (status NOT IN ('SENT', 'DELIVERED', 'READ', 'RESPONDED'))
    );

ALTER TABLE participant_communications ADD CONSTRAINT chk_communications_response_logic
    CHECK (
        (status = 'RESPONDED' AND response IS NOT NULL AND response_date IS NOT NULL) OR
        (status != 'RESPONDED')
    );

ALTER TABLE communication_templates ADD CONSTRAINT chk_templates_name_length
    CHECK (length(name) > 0);

ALTER TABLE communication_templates ADD CONSTRAINT chk_templates_content_length
    CHECK (length(content_template) > 0);

ALTER TABLE communication_preferences ADD CONSTRAINT chk_preferences_time_range
    CHECK (preferred_time_start < preferred_time_end);

ALTER TABLE communication_preferences ADD CONSTRAINT chk_preferences_daily_limit
    CHECK (max_daily_communications > 0 AND max_daily_communications <= 50);

ALTER TABLE communication_preferences ADD CONSTRAINT chk_preferences_weekly_limit
    CHECK (max_weekly_communications > 0 AND max_weekly_communications <= 200);

-- Create triggers for updated_at
CREATE TRIGGER update_communications_updated_at
    BEFORE UPDATE ON participant_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON communication_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
    BEFORE UPDATE ON communication_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check communication preferences before sending
CREATE OR REPLACE FUNCTION check_communication_allowed(
    p_participant_id UUID,
    p_type communication_type,
    p_method contact_method,
    p_scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
    prefs RECORD;
    daily_count INTEGER;
    weekly_count INTEGER;
    local_time TIME;
    local_dow INTEGER;
BEGIN
    -- Get participant preferences
    SELECT * INTO prefs
    FROM communication_preferences
    WHERE participant_id = p_participant_id;

    -- If no preferences found, use defaults (allow most communications)
    IF NOT FOUND THEN
        RETURN p_type IN ('APPOINTMENT_REMINDER', 'STUDY_UPDATE', 'FOLLOW_UP');
    END IF;

    -- Check method enabled
    CASE p_method
        WHEN 'EMAIL' THEN
            IF NOT prefs.email_enabled THEN RETURN false; END IF;
        WHEN 'SMS' THEN
            IF NOT prefs.sms_enabled THEN RETURN false; END IF;
        WHEN 'PHONE' THEN
            IF NOT prefs.phone_enabled THEN RETURN false; END IF;
        WHEN 'MAIL' THEN
            IF NOT prefs.mail_enabled THEN RETURN false; END IF;
        WHEN 'PORTAL' THEN
            IF NOT prefs.portal_enabled THEN RETURN false; END IF;
    END CASE;

    -- Check type preferences
    CASE p_type
        WHEN 'APPOINTMENT_REMINDER' THEN
            IF NOT prefs.appointment_reminders THEN RETURN false; END IF;
        WHEN 'STUDY_UPDATE' THEN
            IF NOT prefs.study_updates THEN RETURN false; END IF;
        WHEN 'FOLLOW_UP' THEN
            IF NOT prefs.follow_up_communications THEN RETURN false; END IF;
    END CASE;

    -- Check daily/weekly limits
    SELECT COUNT(*) INTO daily_count
    FROM participant_communications
    WHERE participant_id = p_participant_id
        AND sent_date >= date_trunc('day', p_scheduled_time)
        AND sent_date < date_trunc('day', p_scheduled_time) + INTERVAL '1 day';

    IF daily_count >= prefs.max_daily_communications THEN
        RETURN false;
    END IF;

    SELECT COUNT(*) INTO weekly_count
    FROM participant_communications
    WHERE participant_id = p_participant_id
        AND sent_date >= date_trunc('week', p_scheduled_time)
        AND sent_date < date_trunc('week', p_scheduled_time) + INTERVAL '1 week';

    IF weekly_count >= prefs.max_weekly_communications THEN
        RETURN false;
    END IF;

    -- Check time preferences (simplified - would need timezone conversion in real implementation)
    local_time := p_scheduled_time::time;
    local_dow := EXTRACT(dow FROM p_scheduled_time)::integer;
    local_dow := CASE WHEN local_dow = 0 THEN 7 ELSE local_dow END; -- Convert Sunday from 0 to 7

    -- Check if within preferred hours
    IF local_time < prefs.preferred_time_start OR local_time > prefs.preferred_time_end THEN
        RETURN false;
    END IF;

    -- Check if within quiet hours
    IF local_time >= prefs.quiet_hours_start OR local_time <= prefs.quiet_hours_end THEN
        RETURN false;
    END IF;

    -- Check if preferred day
    IF NOT (local_dow = ANY(prefs.preferred_days)) THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$ language 'plpgsql';

-- Function to render template with personalization
CREATE OR REPLACE FUNCTION render_communication_template(
    p_template_id UUID,
    p_participant_id UUID,
    p_personalization_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    template_record RECORD;
    participant_record RECORD;
    rendered_subject TEXT;
    rendered_content TEXT;
    variables JSONB;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM communication_templates
    WHERE id = p_template_id AND active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found or inactive: %', p_template_id;
    END IF;

    -- Get participant data for personalization
    SELECT * INTO participant_record
    FROM participants
    WHERE id = p_participant_id;

    -- Build variables for template rendering
    variables := jsonb_build_object(
        'participant_id', participant_record.external_id,
        'study_id', participant_record.study_id,
        'enrollment_date', participant_record.enrollment_date
    ) || p_personalization_data;

    -- Simple template rendering (in production, would use proper templating engine)
    rendered_subject := template_record.subject_template;
    rendered_content := template_record.content_template;

    -- Replace common variables (simplified)
    rendered_subject := replace(rendered_subject, '{{participant_id}}', participant_record.external_id);
    rendered_content := replace(rendered_content, '{{participant_id}}', participant_record.external_id);

    RETURN jsonb_build_object(
        'subject', rendered_subject,
        'content', rendered_content,
        'variables', variables
    );
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE participant_communications IS 'Participant communication tracking and delivery status';
COMMENT ON TABLE communication_templates IS 'Reusable communication templates with personalization';
COMMENT ON TABLE communication_preferences IS 'Participant communication preferences and consent';

COMMENT ON COLUMN participant_communications.external_message_id IS 'External service message ID for tracking';
COMMENT ON COLUMN participant_communications.delivery_receipt IS 'Full delivery receipt from external service';
COMMENT ON COLUMN participant_communications.personalization_data IS 'Data used for template personalization';
COMMENT ON COLUMN communication_templates.variables IS 'Available template variables for personalization';
COMMENT ON COLUMN communication_templates.conditional_logic IS 'Rules for conditional content display';
COMMENT ON COLUMN communication_preferences.preferred_days IS 'Array of preferred weekdays (1=Monday, 7=Sunday)';
COMMENT ON COLUMN communication_preferences.language_preference IS 'ISO language code (e.g., en, es, fr)';