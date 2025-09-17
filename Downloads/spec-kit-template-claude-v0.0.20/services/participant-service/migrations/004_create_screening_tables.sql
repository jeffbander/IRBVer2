-- Migration: Create screening and eligibility tables
-- Created: 2025-09-16
-- Description: Create tables for participant screening questionnaires and eligibility evaluation

-- Create enum types for screening
CREATE TYPE answer_type AS ENUM (
    'TEXT',
    'NUMBER',
    'BOOLEAN',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'DATE',
    'SCALE'
);

-- Create screening questionnaires table
CREATE TABLE IF NOT EXISTS screening_questionnaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    questions JSONB NOT NULL, -- Array of question objects
    eligibility_criteria JSONB NOT NULL, -- Criteria for eligibility determination

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID
);

-- Create screening responses table
CREATE TABLE IF NOT EXISTS screening_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    questionnaire_id UUID NOT NULL REFERENCES screening_questionnaires(id),
    responses JSONB NOT NULL, -- Array of answer objects
    eligibility_result JSONB NOT NULL, -- Eligibility evaluation result
    completed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Review tracking
    reviewed_by UUID,
    reviewed_date TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create eligibility criteria table for structured criteria definition
CREATE TABLE IF NOT EXISTS eligibility_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionnaire_id UUID NOT NULL REFERENCES screening_questionnaires(id) ON DELETE CASCADE,
    criteria_order INTEGER NOT NULL,
    question_id VARCHAR(50) NOT NULL,
    criteria_type VARCHAR(50) NOT NULL, -- 'INCLUSION', 'EXCLUSION'
    operator VARCHAR(20) NOT NULL, -- 'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', etc.
    expected_value JSONB NOT NULL,
    required BOOLEAN NOT NULL DEFAULT true,
    description TEXT NOT NULL,
    failure_message TEXT,

    -- Scoring (optional)
    points INTEGER DEFAULT 0,
    weight DECIMAL(3,2) DEFAULT 1.0,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for screening questionnaires
CREATE INDEX idx_questionnaires_study_id ON screening_questionnaires(study_id);
CREATE INDEX idx_questionnaires_active ON screening_questionnaires(active);
CREATE INDEX idx_questionnaires_version ON screening_questionnaires(version);
CREATE INDEX idx_questionnaires_study_active ON screening_questionnaires(study_id, active);

-- Create indexes for screening responses
CREATE INDEX idx_responses_participant_id ON screening_responses(participant_id);
CREATE INDEX idx_responses_questionnaire_id ON screening_responses(questionnaire_id);
CREATE INDEX idx_responses_completed_date ON screening_responses(completed_date);
CREATE INDEX idx_responses_reviewed_by ON screening_responses(reviewed_by);
CREATE INDEX idx_responses_participant_completed ON screening_responses(participant_id, completed_date DESC);

-- Create indexes for eligibility criteria
CREATE INDEX idx_criteria_questionnaire_id ON eligibility_criteria(questionnaire_id);
CREATE INDEX idx_criteria_question_id ON eligibility_criteria(question_id);
CREATE INDEX idx_criteria_type ON eligibility_criteria(criteria_type);
CREATE INDEX idx_criteria_required ON eligibility_criteria(required);
CREATE INDEX idx_criteria_order ON eligibility_criteria(questionnaire_id, criteria_order);

-- Add constraints
ALTER TABLE screening_questionnaires ADD CONSTRAINT chk_questionnaires_name_length
    CHECK (length(name) > 0);

ALTER TABLE screening_questionnaires ADD CONSTRAINT chk_questionnaires_version_format
    CHECK (version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

ALTER TABLE screening_responses ADD CONSTRAINT chk_responses_completed_before_review
    CHECK (reviewed_date IS NULL OR reviewed_date >= completed_date);

ALTER TABLE eligibility_criteria ADD CONSTRAINT chk_criteria_criteria_type
    CHECK (criteria_type IN ('INCLUSION', 'EXCLUSION'));

ALTER TABLE eligibility_criteria ADD CONSTRAINT chk_criteria_operator
    CHECK (operator IN ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
                       'GREATER_EQUAL', 'LESS_EQUAL', 'CONTAINS', 'NOT_CONTAINS',
                       'IN', 'NOT_IN', 'REGEX', 'IS_NULL', 'IS_NOT_NULL'));

ALTER TABLE eligibility_criteria ADD CONSTRAINT chk_criteria_points_range
    CHECK (points >= -100 AND points <= 100);

ALTER TABLE eligibility_criteria ADD CONSTRAINT chk_criteria_weight_range
    CHECK (weight >= 0.0 AND weight <= 10.0);

-- Unique constraints
CREATE UNIQUE INDEX idx_questionnaires_study_name_version
    ON screening_questionnaires(study_id, name, version);

CREATE UNIQUE INDEX idx_responses_participant_questionnaire
    ON screening_responses(participant_id, questionnaire_id);

CREATE UNIQUE INDEX idx_criteria_questionnaire_order
    ON eligibility_criteria(questionnaire_id, criteria_order);

-- Create triggers for updated_at
CREATE TRIGGER update_questionnaires_updated_at
    BEFORE UPDATE ON screening_questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
    BEFORE UPDATE ON screening_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criteria_updated_at
    BEFORE UPDATE ON eligibility_criteria
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to evaluate eligibility based on responses
CREATE OR REPLACE FUNCTION evaluate_eligibility(
    p_questionnaire_id UUID,
    p_responses JSONB
) RETURNS JSONB AS $$
DECLARE
    criteria_record RECORD;
    response_value JSONB;
    criteria_met BOOLEAN;
    eligibility_result JSONB;
    criteria_results JSONB[] := '{}';
    total_score INTEGER := 0;
    max_score INTEGER := 0;
    overall_eligible BOOLEAN := true;
    review_required BOOLEAN := false;
BEGIN
    -- Initialize result structure
    eligibility_result := jsonb_build_object(
        'eligible', true,
        'score', 0,
        'criteria', '[]'::jsonb,
        'reason', '',
        'reviewRequired', false
    );

    -- Evaluate each criteria
    FOR criteria_record IN
        SELECT * FROM eligibility_criteria
        WHERE questionnaire_id = p_questionnaire_id
        ORDER BY criteria_order
    LOOP
        -- Get the response value for this question
        SELECT jsonb_path_query_first(p_responses, ('$ ? (@.questionId == "' || criteria_record.question_id || '").answer')::jsonpath)
        INTO response_value;

        -- Evaluate the criteria
        criteria_met := evaluate_single_criteria(
            criteria_record.operator,
            response_value,
            criteria_record.expected_value
        );

        -- Update scores
        IF criteria_met THEN
            total_score := total_score + criteria_record.points;
        END IF;
        max_score := max_score + GREATEST(criteria_record.points, 0);

        -- Check if this affects overall eligibility
        IF criteria_record.criteria_type = 'INCLUSION' AND criteria_record.required AND NOT criteria_met THEN
            overall_eligible := false;
        ELSIF criteria_record.criteria_type = 'EXCLUSION' AND criteria_met THEN
            overall_eligible := false;
        END IF;

        -- Determine if manual review is needed
        IF NOT criteria_met AND criteria_record.required THEN
            review_required := true;
        END IF;

        -- Add to criteria results
        criteria_results := criteria_results || jsonb_build_object(
            'criteriaId', criteria_record.id,
            'criteriaText', criteria_record.description,
            'required', criteria_record.required,
            'met', criteria_met,
            'value', response_value,
            'reason', CASE WHEN NOT criteria_met THEN criteria_record.failure_message END
        );
    END LOOP;

    -- Build final result
    eligibility_result := jsonb_build_object(
        'eligible', overall_eligible,
        'score', total_score,
        'maxScore', max_score,
        'criteria', criteria_results,
        'reason', CASE WHEN NOT overall_eligible THEN 'Failed required eligibility criteria' END,
        'reviewRequired', review_required
    );

    RETURN eligibility_result;
END;
$$ language 'plpgsql';

-- Helper function to evaluate individual criteria
CREATE OR REPLACE FUNCTION evaluate_single_criteria(
    p_operator VARCHAR(20),
    p_actual_value JSONB,
    p_expected_value JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    CASE p_operator
        WHEN 'EQUALS' THEN
            RETURN p_actual_value = p_expected_value;
        WHEN 'NOT_EQUALS' THEN
            RETURN p_actual_value != p_expected_value;
        WHEN 'GREATER_THAN' THEN
            RETURN (p_actual_value)::numeric > (p_expected_value)::numeric;
        WHEN 'LESS_THAN' THEN
            RETURN (p_actual_value)::numeric < (p_expected_value)::numeric;
        WHEN 'GREATER_EQUAL' THEN
            RETURN (p_actual_value)::numeric >= (p_expected_value)::numeric;
        WHEN 'LESS_EQUAL' THEN
            RETURN (p_actual_value)::numeric <= (p_expected_value)::numeric;
        WHEN 'CONTAINS' THEN
            RETURN p_actual_value ? (p_expected_value #>> '{}');
        WHEN 'NOT_CONTAINS' THEN
            RETURN NOT (p_actual_value ? (p_expected_value #>> '{}'));
        WHEN 'IN' THEN
            RETURN p_expected_value ? (p_actual_value #>> '{}');
        WHEN 'NOT_IN' THEN
            RETURN NOT (p_expected_value ? (p_actual_value #>> '{}'));
        WHEN 'IS_NULL' THEN
            RETURN p_actual_value IS NULL;
        WHEN 'IS_NOT_NULL' THEN
            RETURN p_actual_value IS NOT NULL;
        ELSE
            RETURN false;
    END CASE;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON TABLE screening_questionnaires IS 'Screening questionnaires for participant eligibility';
COMMENT ON TABLE screening_responses IS 'Participant responses to screening questionnaires';
COMMENT ON TABLE eligibility_criteria IS 'Structured eligibility criteria for questionnaires';

COMMENT ON COLUMN screening_questionnaires.questions IS 'JSON array of question objects with id, text, type, options, etc.';
COMMENT ON COLUMN screening_questionnaires.eligibility_criteria IS 'JSON object defining eligibility evaluation rules';
COMMENT ON COLUMN screening_responses.responses IS 'JSON array of participant answers';
COMMENT ON COLUMN screening_responses.eligibility_result IS 'JSON object with eligibility evaluation result';
COMMENT ON COLUMN eligibility_criteria.expected_value IS 'JSON value to compare against participant response';
COMMENT ON COLUMN eligibility_criteria.operator IS 'Comparison operator for eligibility evaluation';
COMMENT ON COLUMN eligibility_criteria.points IS 'Points awarded for meeting this criteria (can be negative)';
COMMENT ON COLUMN eligibility_criteria.weight IS 'Weight multiplier for this criteria in scoring';