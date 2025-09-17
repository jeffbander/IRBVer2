import { FormModel } from '../../src/models/Form';
import { FormStatus, FieldType, CreateFormRequest } from '@research-study/shared';
import testDb from '../setup';

describe('FormModel', () => {
  let formModel: FormModel;

  beforeEach(() => {
    formModel = new FormModel(testDb);
  });

  describe('create', () => {
    it('should create a new form', async () => {
      const formData: CreateFormRequest = {
        studyId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test_form',
        title: 'Test Form',
        description: 'A test form',
        schema: {
          fields: [
            {
              id: 'field1',
              type: FieldType.TEXT,
              name: 'test_field',
              label: 'Test Field',
              required: true
            }
          ]
        },
        validationRules: []
      };

      const result = await formModel.create(formData, 'user123');

      expect(result).toMatchObject({
        studyId: formData.studyId,
        name: formData.name,
        title: formData.title,
        status: FormStatus.DRAFT,
        version: '1.0'
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should validate form data correctly', async () => {
      const form = {
        id: '123',
        studyId: '456',
        name: 'test',
        title: 'Test',
        version: '1.0',
        status: FormStatus.PUBLISHED,
        schema: {
          fields: [
            {
              id: 'required_field',
              type: FieldType.TEXT,
              name: 'required_field',
              label: 'Required Field',
              required: true
            },
            {
              id: 'email_field',
              type: FieldType.EMAIL,
              name: 'email_field',
              label: 'Email Field',
              required: false
            }
          ]
        },
        validationRules: [],
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Test valid data
      const validData = {
        required_field: 'test value',
        email_field: 'test@example.com'
      };

      const validResult = await formModel.validateFormData(form, validData);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid data
      const invalidData = {
        required_field: '', // Missing required field
        email_field: 'invalid-email' // Invalid email
      };

      const invalidResult = await formModel.validateFormData(form, invalidData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent form', async () => {
      const result = await formModel.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });
});