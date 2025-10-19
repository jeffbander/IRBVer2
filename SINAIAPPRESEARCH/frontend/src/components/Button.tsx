import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'classnames';
import './Button.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button = ({ variant = 'primary', children, className, ...props }: PropsWithChildren<ButtonProps>) => {
  return (
    <button className={clsx('btn', `btn-${variant}`, className)} {...props}>
      {children}
    </button>
  );
};
