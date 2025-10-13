# IRB Management System - Validation Requirements

This document outlines all validation requirements across the application to help users understand what data formats are expected.

## Study Management

### Creating/Editing Studies

#### Protocol Number
- **Format**: `ABC-1234` or `TEST-ABC123`
- **Pattern**: Letters followed by hyphen and numbers
- **Examples**:
  - ✅ `IRB-2024-001`
  - ✅ `TEST-123`
  - ✅ `CARDIO-2025`
  - ❌ `123-ABC` (numbers first)
  - ❌ `STUDY_001` (underscore instead of hyphen)

#### Study Title
- **Required**: Yes
- **Min Length**: 1 character
- **No specific format requirements**

#### Description
- **Required**: Yes
- **Min Length**: 20 characters
- **Tip**: Provide detailed information about objectives, methodology, and expected outcomes

#### Study Type
- **Options**:
  - Interventional
  - Observational
  - Registry
  - Survey
  - Other

#### Risk Level
- **Options**:
  - Minimal
  - Moderate
  - High

#### Target Enrollment
- **Type**: Number
- **Min**: 1 (if provided)
- **Optional**: Yes

#### Dates
- **Start Date**: Optional, any valid date
- **End Date**: Optional, any valid date

---

## Participant Enrollment

### Enrolling Participants

#### Subject ID
- **Format**: `SUBJ-###` to `SUBJ-######`
- **Pattern**: SUBJ- followed by 3 to 6 digits
- **Examples**:
  - ✅ `SUBJ-001`
  - ✅ `SUBJ-123456`
  - ✅ `SUBJ-999`
  - ❌ `SUBJ-01` (only 2 digits)
  - ❌ `SUB-001` (wrong prefix)
  - ❌ `SUBJ001` (missing hyphen)

#### Consent Date
- **Required**: Yes
- **Must be**: In the past (cannot be a future date)
- **Format**: Standard date format (YYYY-MM-DD in form)

#### Enrollment Date
- **Required**: Yes
- **Can be**: Any valid date
- **Default**: Today's date

#### Initial Status
- **Options**:
  - Screened
  - Enrolled

#### Group Assignment
- **Optional**: Yes
- **Examples**: "Treatment A", "Placebo", "Control Group"

---

## Document Upload

### Uploading Study Documents

#### Document Name
- **Required**: Yes
- **No specific length requirements**

#### Document Type
- **Required**: Yes
- **Options**:
  - Protocol
  - Consent Form
  - IRB Approval
  - Amendment
  - Progress Report
  - Other

#### Version
- **Required**: Yes
- **Format**: Version number (e.g., "1.0", "2.1")
- **Default**: "1.0"

#### Description
- **Optional**: Yes
- **Recommended**: Brief description of document contents

#### File
- **Required**: Yes
- **Supported formats**: PDF, DOC, DOCX (check system documentation for complete list)

---

## User Management

### Creating Users

#### Email
- **Required**: Yes
- **Format**: Valid email address
- **Examples**:
  - ✅ `user@example.com`
  - ✅ `researcher.name@university.edu`
  - ❌ `invalid-email` (not an email)
  - ❌ `user@` (incomplete)

#### Password
- **Required**: Yes
- **Min Length**: 8 characters
- **Recommended**: Use combination of uppercase, lowercase, numbers, and special characters

#### First Name
- **Required**: Yes
- **Min Length**: 2 characters
- **Max Length**: 50 characters

#### Last Name
- **Required**: Yes
- **Min Length**: 2 characters
- **Max Length**: 50 characters

#### Role
- **Required**: Yes
- **Options**:
  - Admin (full system access)
  - Reviewer (can review and approve studies)
  - Researcher (can create and manage own studies)
  - Coordinator (can manage participants)

---

## Tips for Success

### General Guidelines

1. **Watch for validation hints**: All form fields now show format requirements below the input
2. **Character counters**: Fields with minimum lengths show real-time character counts
3. **Error messages**: Specific error messages will appear in red below each field when validation fails
4. **Required fields**: Look for the asterisk (*) next to field labels
5. **Color coding**:
   - Red border and background = validation error
   - Green text = requirement met (e.g., character count)
   - Gray text = helpful hints

### Common Issues

**"Validation failed"**
- Check each field for red borders
- Read the specific error message below each field
- Ensure all required fields are filled

**Protocol Number Errors**
- Must include letters, a hyphen, and numbers
- Examples: IRB-2024, TEST-001, STUDY-123

**Subject ID Errors**
- Must start with "SUBJ-"
- Must have 3-6 digits after the hyphen
- Example: SUBJ-001, not SUB-001 or SUBJ-1

**Date Errors**
- Consent dates must be in the past
- Check that you haven't selected a future date

**Description Too Short**
- Minimum 20 characters required
- Character counter shows your progress
- Add more detail about your study

---

## Getting Help

If you encounter validation issues not covered here:
1. Check the error message displayed below the field
2. Review the format hint (gray text) below the input
3. Ensure your data matches the examples provided
4. Contact system administrator if issues persist

---

**Last Updated**: October 2025
**Version**: 1.0
