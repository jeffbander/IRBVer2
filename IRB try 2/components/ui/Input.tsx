import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-status-error ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full h-11 px-4 py-2.5 text-base
          bg-white border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-status-error focus:ring-status-error focus:border-status-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-status-error flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

// Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  required,
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-status-error ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full min-h-[120px] px-4 py-2.5 text-base
          bg-white border border-gray-300 rounded-md resize-y
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-status-error focus:ring-status-error focus:border-status-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-status-error flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

// Select Component
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  required,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-status-error ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full h-11 px-4 py-2.5 text-base
          bg-white border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-status-error focus:ring-status-error focus:border-status-error' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-sm text-status-error flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

// Checkbox Component
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={checkboxId}
        className={`
          w-5 h-5 text-brand-primary border-gray-300 rounded
          focus:ring-2 focus:ring-brand-primary focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      <label
        htmlFor={checkboxId}
        className="ml-2 text-base text-gray-800 cursor-pointer"
      >
        {label}
      </label>
    </div>
  );
};
