import { useState, useCallback } from 'react';
import { validateForm } from '@/lib/validation';

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationSchema: Record<string, Array<(val: any) => string | null>>
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      // Validate on blur
      if (validationSchema[name]) {
        const validators = validationSchema[name];
        for (const validator of validators) {
          const error = validator(values[name]);
          if (error) {
            setErrors((prev) => ({ ...prev, [name]: error }));
            break;
          }
        }
      }
    },
    [validationSchema, values]
  );

  const validate = useCallback(() => {
    const result = validateForm(values, validationSchema);
    setErrors(result.errors);
    return result.isValid;
  }, [values, validationSchema]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValue,
    setValues,
  };
};
