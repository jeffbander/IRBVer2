import { describe, it, expect } from 'vitest';
import { validators, validate, validateForm } from '@/lib/validation';

describe('Validators', () => {
  describe('required', () => {
    it('should pass for non-empty values', () => {
      expect(validators.required('test')).toBeNull();
      expect(validators.required(123)).toBeNull();
      expect(validators.required(true)).toBeNull();
      expect(validators.required(0)).toBeNull();
    });

    it('should fail for empty values', () => {
      expect(validators.required('')).toBe('This field is required');
      expect(validators.required(null)).toBe('This field is required');
      expect(validators.required(undefined)).toBe('This field is required');
    });
  });

  describe('email', () => {
    it('should pass for valid emails', () => {
      expect(validators.email('test@example.com')).toBeNull();
      expect(validators.email('user.name@domain.co.uk')).toBeNull();
      expect(validators.email('admin+tag@test.org')).toBeNull();
    });

    it('should fail for invalid emails', () => {
      expect(validators.email('invalid')).toBe('Please enter a valid email address');
      expect(validators.email('no@domain')).toBe('Please enter a valid email address');
      expect(validators.email('@nodomain.com')).toBe('Please enter a valid email address');
      expect(validators.email('no-at-sign.com')).toBe('Please enter a valid email address');
    });

    it('should pass for empty string', () => {
      expect(validators.email('')).toBeNull();
    });
  });

  describe('minLength', () => {
    it('should pass for strings meeting minimum length', () => {
      const validator = validators.minLength(5);
      expect(validator('12345')).toBeNull();
      expect(validator('123456')).toBeNull();
    });

    it('should fail for strings below minimum length', () => {
      const validator = validators.minLength(5);
      expect(validator('1234')).toBe('Must be at least 5 characters');
      expect(validator('123')).toBe('Must be at least 5 characters');
    });

    it('should pass for empty string', () => {
      const validator = validators.minLength(5);
      expect(validator('')).toBeNull();
    });
  });

  describe('maxLength', () => {
    it('should pass for strings within maximum length', () => {
      const validator = validators.maxLength(10);
      expect(validator('12345')).toBeNull();
      expect(validator('1234567890')).toBeNull();
    });

    it('should fail for strings exceeding maximum length', () => {
      const validator = validators.maxLength(10);
      expect(validator('12345678901')).toBe('Must be no more than 10 characters');
    });
  });

  describe('pattern', () => {
    it('should pass for matching patterns', () => {
      const validator = validators.pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters');
      expect(validator('ABC')).toBeNull();
      expect(validator('XYZ')).toBeNull();
    });

    it('should fail for non-matching patterns', () => {
      const validator = validators.pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters');
      expect(validator('abc')).toBe('Must be 3 uppercase letters');
      expect(validator('AB')).toBe('Must be 3 uppercase letters');
      expect(validator('A1C')).toBe('Must be 3 uppercase letters');
    });
  });

  describe('protocolNumber', () => {
    it('should pass for valid protocol numbers', () => {
      expect(validators.protocolNumber('ABC-1234')).toBeNull();
      expect(validators.protocolNumber('TEST-ABC123')).toBeNull();
      expect(validators.protocolNumber('AB-ABC')).toBeNull();
    });

    it('should fail for invalid protocol numbers', () => {
      expect(validators.protocolNumber('ABC1234')).toBe(
        'Protocol number must be in format: ABC-1234 or TEST-ABC123'
      );
      expect(validators.protocolNumber('A-12')).toBe(
        'Protocol number must be in format: ABC-1234 or TEST-ABC123'
      );
      expect(validators.protocolNumber('abc-123')).toBe(
        'Protocol number must be in format: ABC-1234 or TEST-ABC123'
      );
    });
  });

  describe('subjectId', () => {
    it('should pass for valid subject IDs', () => {
      expect(validators.subjectId('SUBJ-001')).toBeNull();
      expect(validators.subjectId('SUBJ-12345')).toBeNull();
      expect(validators.subjectId('SUBJ-999999')).toBeNull();
    });

    it('should fail for invalid subject IDs', () => {
      expect(validators.subjectId('SUBJ-12')).toBe(
        'Subject ID must be in format: SUBJ-001 to SUBJ-999999'
      );
      expect(validators.subjectId('SUB-123')).toBe(
        'Subject ID must be in format: SUBJ-001 to SUBJ-999999'
      );
      expect(validators.subjectId('SUBJ-ABC')).toBe(
        'Subject ID must be in format: SUBJ-001 to SUBJ-999999'
      );
    });
  });

  describe('date', () => {
    it('should pass for valid dates', () => {
      expect(validators.date('2024-01-01')).toBeNull();
      expect(validators.date('2024-12-31')).toBeNull();
      expect(validators.date(new Date().toISOString())).toBeNull();
    });

    it('should fail for invalid dates', () => {
      expect(validators.date('invalid-date')).toBe('Please enter a valid date');
      expect(validators.date('2024-13-01')).toBe('Please enter a valid date');
      expect(validators.date('not a date')).toBe('Please enter a valid date');
    });
  });

  describe('futureDate', () => {
    it('should pass for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validators.futureDate(tomorrow.toISOString())).toBeNull();

      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      expect(validators.futureDate(nextYear.toISOString())).toBeNull();
    });

    it('should fail for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validators.futureDate(yesterday.toISOString())).toBe('Date must be in the future');

      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      expect(validators.futureDate(lastYear.toISOString())).toBe('Date must be in the future');
    });
  });

  describe('pastDate', () => {
    it('should pass for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validators.pastDate(yesterday.toISOString())).toBeNull();

      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      expect(validators.pastDate(lastYear.toISOString())).toBeNull();
    });

    it('should fail for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validators.pastDate(tomorrow.toISOString())).toBe('Date must be in the past');
    });
  });

  describe('number', () => {
    it('should pass for valid numbers', () => {
      expect(validators.number('123')).toBeNull();
      expect(validators.number(456)).toBeNull();
      expect(validators.number('0')).toBeNull();
      expect(validators.number('-123')).toBeNull();
    });

    it('should fail for non-numbers', () => {
      expect(validators.number('abc')).toBe('Must be a valid number');
      expect(validators.number('12abc')).toBe('Must be a valid number');
    });
  });

  describe('positiveNumber', () => {
    it('should pass for positive numbers', () => {
      expect(validators.positiveNumber('123')).toBeNull();
      expect(validators.positiveNumber(456)).toBeNull();
      expect(validators.positiveNumber('0.01')).toBeNull();
    });

    it('should fail for zero and negative numbers', () => {
      expect(validators.positiveNumber('0')).toBe('Must be a positive number');
      expect(validators.positiveNumber('-1')).toBe('Must be a positive number');
      expect(validators.positiveNumber(-123)).toBe('Must be a positive number');
    });
  });

  describe('range', () => {
    it('should pass for numbers within range', () => {
      const validator = validators.range(1, 100);
      expect(validator('50')).toBeNull();
      expect(validator(1)).toBeNull();
      expect(validator(100)).toBeNull();
    });

    it('should fail for numbers outside range', () => {
      const validator = validators.range(1, 100);
      expect(validator('0')).toBe('Must be between 1 and 100');
      expect(validator('101')).toBe('Must be between 1 and 100');
      expect(validator(-5)).toBe('Must be between 1 and 100');
    });
  });
});

describe('validate', () => {
  it('should pass when all validators succeed', () => {
    const result = validate('test@example.com', [validators.required, validators.email]);
    expect(result).toBeNull();
  });

  it('should return first error when any validator fails', () => {
    const result = validate('', [validators.required, validators.email]);
    expect(result).toBe('This field is required');
  });

  it('should run validators in order', () => {
    const result = validate('abc', [validators.required, validators.minLength(5), validators.email]);
    expect(result).toBe('Must be at least 5 characters');
  });
});

describe('validateForm', () => {
  it('should validate entire form successfully', () => {
    const formData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const schema = {
      email: [validators.required, validators.email],
      password: [validators.required, validators.minLength(8)],
      firstName: [validators.required, validators.minLength(2)],
      lastName: [validators.required, validators.minLength(2)],
    };

    const result = validateForm(formData, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for invalid fields', () => {
    const formData = {
      email: 'invalid-email',
      password: '123',
      firstName: '',
      lastName: 'Doe',
    };

    const schema = {
      email: [validators.required, validators.email],
      password: [validators.required, validators.minLength(8)],
      firstName: [validators.required, validators.minLength(2)],
      lastName: [validators.required, validators.minLength(2)],
    };

    const result = validateForm(formData, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('Please enter a valid email address');
    expect(result.errors.password).toBe('Must be at least 8 characters');
    expect(result.errors.firstName).toBe('This field is required');
    expect(result.errors.lastName).toBeUndefined();
  });

  it('should handle empty form data', () => {
    const formData = {};
    const schema = {
      email: [validators.required],
    };

    const result = validateForm(formData, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('This field is required');
  });

  it('should validate complex form with multiple fields', () => {
    const formData = {
      title: 'Clinical Trial Study',
      protocolNumber: 'ABC-1234',
      description: 'This is a valid description that meets the minimum length requirement',
      type: 'CLINICAL_TRIAL',
      riskLevel: 'MINIMAL',
    };

    const schema = {
      title: [validators.required, validators.minLength(5)],
      protocolNumber: [validators.required, validators.protocolNumber],
      description: [validators.required, validators.minLength(20)],
      type: [validators.required],
      riskLevel: [validators.required],
    };

    const result = validateForm(formData, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
