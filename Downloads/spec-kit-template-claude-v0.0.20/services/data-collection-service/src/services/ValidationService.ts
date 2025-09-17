import {
  Form,
  FormField,
  ConditionalExpression,
  ConditionalRule,
  ValidationRule,
  ValidationResult,
  ValidationSeverity,
  LogicalOperator,
  ComparisonOperator
} from '@research-study/shared';

export class ValidationService {

  async validateFormData(
    form: Form,
    data: Record<string, any>
  ): Promise<{
    isValid: boolean;
    errors: ValidationResult[];
  }> {
    const errors: ValidationResult[] = [];

    // Field-level validation
    for (const field of form.schema.fields) {
      const fieldErrors = this.validateField(field, data[field.id]);
      errors.push(...fieldErrors);
    }

    // Form-level validation rules
    for (const rule of form.validationRules) {
      const ruleErrors = await this.executeValidationRule(rule, data);
      errors.push(...ruleErrors);
    }

    // Cross-field validation
    const crossFieldErrors = this.validateCrossFields(form.schema.fields, data);
    errors.push(...crossFieldErrors);

    return {
      isValid: errors.filter(e => e.severity === ValidationSeverity.ERROR).length === 0,
      errors
    };
  }

  evaluateConditionalLogic(
    conditional: ConditionalExpression,
    data: Record<string, any>
  ): boolean {
    if (!conditional.rules || conditional.rules.length === 0) {
      return true;
    }

    const results = conditional.rules.map(rule => this.evaluateRule(rule, data));

    switch (conditional.condition) {
      case LogicalOperator.AND:
        return results.every(result => result);
      case LogicalOperator.OR:
        return results.some(result => result);
      case LogicalOperator.NOT:
        return !results.every(result => result);
      default:
        return true;
    }
  }

  private validateField(field: FormField, value: any): ValidationResult[] {
    const errors: ValidationResult[] = [];

    // Required field validation
    if (field.required && this.isEmpty(value)) {
      errors.push({
        fieldId: field.id,
        ruleId: 'required',
        ruleName: 'Required Field',
        severity: ValidationSeverity.ERROR,
        message: `${field.label} is required`,
        value,
        timestamp: new Date()
      });
      return errors; // Skip other validations if required field is empty
    }

    // Skip validation if field is empty and not required
    if (this.isEmpty(value)) {
      return errors;
    }

    // Type-specific validation
    const typeErrors = this.validateFieldType(field, value);
    errors.push(...typeErrors);

    // Custom validation rules
    if (field.validation) {
      const customErrors = this.validateFieldRules(field, value);
      errors.push(...customErrors);
    }

    return errors;
  }

  private validateFieldType(field: FormField, value: any): ValidationResult[] {
    const errors: ValidationResult[] = [];

    switch (field.type) {
      case 'NUMBER':
        if (isNaN(Number(value))) {
          errors.push(this.createValidationError(
            field.id,
            'type_number',
            'Number Type',
            `${field.label} must be a valid number`,
            value
          ));
        }
        break;

      case 'EMAIL':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(this.createValidationError(
            field.id,
            'type_email',
            'Email Type',
            `${field.label} must be a valid email address`,
            value
          ));
        }
        break;

      case 'DATE':
        if (!this.isValidDate(value)) {
          errors.push(this.createValidationError(
            field.id,
            'type_date',
            'Date Type',
            `${field.label} must be a valid date`,
            value
          ));
        }
        break;

      case 'BOOLEAN':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(this.createValidationError(
            field.id,
            'type_boolean',
            'Boolean Type',
            `${field.label} must be true or false`,
            value
          ));
        }
        break;
    }

    return errors;
  }

  private validateFieldRules(field: FormField, value: any): ValidationResult[] {
    const errors: ValidationResult[] = [];
    const validation = field.validation!;

    // Numeric validations
    if (field.type === 'NUMBER' && !isNaN(Number(value))) {
      const numValue = Number(value);

      if (validation.min !== undefined && numValue < validation.min) {
        errors.push(this.createValidationError(
          field.id,
          'min_value',
          'Minimum Value',
          `${field.label} must be at least ${validation.min}`,
          value
        ));
      }

      if (validation.max !== undefined && numValue > validation.max) {
        errors.push(this.createValidationError(
          field.id,
          'max_value',
          'Maximum Value',
          `${field.label} must not exceed ${validation.max}`,
          value
        ));
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push(this.createValidationError(
          field.id,
          'min_length',
          'Minimum Length',
          `${field.label} must be at least ${validation.minLength} characters`,
          value
        ));
      }

      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push(this.createValidationError(
          field.id,
          'max_length',
          'Maximum Length',
          `${field.label} must not exceed ${validation.maxLength} characters`,
          value
        ));
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push(this.createValidationError(
            field.id,
            'pattern',
            'Pattern Match',
            `${field.label} format is invalid`,
            value
          ));
        }
      }
    }

    return errors;
  }

  private validateCrossFields(fields: FormField[], data: Record<string, any>): ValidationResult[] {
    const errors: ValidationResult[] = [];

    // Example: Date range validation
    const startDateField = fields.find(f => f.name.toLowerCase().includes('start'));
    const endDateField = fields.find(f => f.name.toLowerCase().includes('end'));

    if (startDateField && endDateField) {
      const startDate = data[startDateField.id];
      const endDate = data[endDateField.id];

      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        errors.push(this.createValidationError(
          endDateField.id,
          'date_range',
          'Date Range',
          'End date must be after start date',
          endDate
        ));
      }
    }

    return errors;
  }

  private async executeValidationRule(
    rule: ValidationRule,
    data: Record<string, any>
  ): Promise<ValidationResult[]> {
    const errors: ValidationResult[] = [];

    try {
      const result = this.evaluateExpression(rule.expression, data);
      if (!result) {
        errors.push({
          fieldId: undefined,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message,
          value: undefined,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`Error executing validation rule ${rule.id}:`, error);
      // Don't fail validation due to rule execution errors
    }

    return errors;
  }

  private evaluateRule(rule: ConditionalRule, data: Record<string, any>): boolean {
    const fieldValue = data[rule.fieldId];
    const ruleValue = rule.value;

    switch (rule.operator) {
      case ComparisonOperator.EQUALS:
        return fieldValue === ruleValue;
      case ComparisonOperator.NOT_EQUALS:
        return fieldValue !== ruleValue;
      case ComparisonOperator.GREATER_THAN:
        return Number(fieldValue) > Number(ruleValue);
      case ComparisonOperator.LESS_THAN:
        return Number(fieldValue) < Number(ruleValue);
      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return Number(fieldValue) >= Number(ruleValue);
      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return Number(fieldValue) <= Number(ruleValue);
      case ComparisonOperator.CONTAINS:
        return String(fieldValue).includes(String(ruleValue));
      case ComparisonOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(ruleValue));
      case ComparisonOperator.IN:
        return Array.isArray(ruleValue) && ruleValue.includes(fieldValue);
      case ComparisonOperator.NOT_IN:
        return Array.isArray(ruleValue) && !ruleValue.includes(fieldValue);
      case ComparisonOperator.IS_EMPTY:
        return this.isEmpty(fieldValue);
      case ComparisonOperator.IS_NOT_EMPTY:
        return !this.isEmpty(fieldValue);
      default:
        return true;
    }
  }

  private evaluateExpression(expression: string, data: Record<string, any>): boolean {
    // Simple expression evaluator
    // In production, use a more sophisticated expression parser
    try {
      let evalExpression = expression;

      // Replace field references with actual values
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        const safeValue = typeof value === 'string' ? `"${value}"` : value;
        evalExpression = evalExpression.replace(regex, String(safeValue));
      }

      // Basic safety check
      const allowedPattern = /^[a-zA-Z0-9_\s+\-*/.()>"'<=!&|]+$/;
      if (!allowedPattern.test(evalExpression)) {
        throw new Error('Invalid expression');
      }

      return eval(evalExpression);
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return true; // Default to valid if evaluation fails
    }
  }

  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' ||
           (Array.isArray(value) && value.length === 0);
  }

  private isValidDate(value: any): boolean {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private createValidationError(
    fieldId: string,
    ruleId: string,
    ruleName: string,
    message: string,
    value: any
  ): ValidationResult {
    return {
      fieldId,
      ruleId,
      ruleName,
      severity: ValidationSeverity.ERROR,
      message,
      value,
      timestamp: new Date()
    };
  }
}