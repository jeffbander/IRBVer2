// Validation utilities for forms
export const validators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (min: number) => (value: string) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  pattern: (regex: RegExp, message: string) => (value: string) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  protocolNumber: (value: string) => {
    if (!value) return null;
    const protocolRegex = /^[A-Z0-9]{2,10}-[A-Z0-9]{3,10}$/;
    if (!protocolRegex.test(value)) {
      return 'Protocol number must be in format: ABC-1234 or TEST-ABC123';
    }
    return null;
  },

  subjectId: (value: string) => {
    if (!value) return null;
    const subjectRegex = /^SUBJ-\d{3,6}$/;
    if (!subjectRegex.test(value)) {
      return 'Subject ID must be in format: SUBJ-001 to SUBJ-999999';
    }
    return null;
  },

  date: (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    return null;
  },

  futureDate: (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return 'Date must be in the future';
    }
    return null;
  },

  pastDate: (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      return 'Date must be in the past';
    }
    return null;
  },

  number: (value: any) => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return 'Must be a valid number';
    }
    return null;
  },

  positiveNumber: (value: any) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return 'Must be a positive number';
    }
    return null;
  },

  range: (min: number, max: number) => (value: any) => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return `Must be between ${min} and ${max}`;
    }
    return null;
  },
};

// Combine multiple validators
export const validate = (value: any, validatorFns: Array<(val: any) => string | null>) => {
  for (const validator of validatorFns) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
};

// Validate entire form object
export const validateForm = (
  formData: Record<string, any>,
  schema: Record<string, Array<(val: any) => string | null>>
) => {
  const errors: Record<string, string> = {};

  for (const [field, validatorFns] of Object.entries(schema)) {
    const error = validate(formData[field], validatorFns);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Study validation schemas
export const studyValidationSchema = {
  title: [validators.required, validators.minLength(5), validators.maxLength(200)],
  protocolNumber: [validators.required, validators.protocolNumber],
  description: [validators.required, validators.minLength(20), validators.maxLength(2000)],
  type: [validators.required],
  riskLevel: [validators.required],
  // targetEnrollment, startDate, and endDate are optional
};

// Participant validation schemas
export const participantValidationSchema = {
  subjectId: [validators.required, validators.subjectId],
  consentDate: [validators.required, validators.date, validators.pastDate],
  enrollmentDate: [validators.required, validators.date, validators.pastDate],
  status: [validators.required],
};

// User validation schemas
export const userValidationSchema = {
  email: [validators.required, validators.email],
  password: [validators.required, validators.minLength(8)],
  firstName: [validators.required, validators.minLength(2), validators.maxLength(50)],
  lastName: [validators.required, validators.minLength(2), validators.maxLength(50)],
  roleId: [validators.required],
};

// Document validation
export const documentValidationSchema = {
  name: [validators.required, validators.minLength(3), validators.maxLength(100)],
  type: [validators.required],
  version: [validators.required, validators.pattern(/^\d+\.\d+$/, 'Version must be in format: 1.0')],
};
