import type { SelectHTMLAttributes } from 'react';
import clsx from 'classnames';
import './Select.css';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export const Select = ({ label, className, children, ...props }: SelectProps) => {
  return (
    <label className="select-field">
      {label && <span className="select-label">{label}</span>}
      <select className={clsx('select-control', className)} {...props}>
        {children}
      </select>
    </label>
  );
};
