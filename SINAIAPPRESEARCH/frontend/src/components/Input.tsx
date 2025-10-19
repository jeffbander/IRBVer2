import type { InputHTMLAttributes } from 'react';
import clsx from 'classnames';
import './Input.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export const Input = ({ label, hint, className, ...props }: InputProps) => {
  return (
    <label className="input-field">
      {label && <span className="input-label">{label}</span>}
      <input className={clsx('input-control', className)} {...props} />
      {hint && <span className="input-hint">{hint}</span>}
    </label>
  );
};
