import type { PropsWithChildren } from 'react';
import clsx from 'classnames';
import './SummaryStats.css';

type SummaryCardProps = PropsWithChildren<{
  label: string;
  value: string;
  tone?: 'info' | 'success' | 'warning' | 'neutral';
}>;

export const SummaryCard = ({ label, value, tone = 'neutral', children }: SummaryCardProps) => {
  return (
    <article className={clsx('summary-card', tone)}>
      <div className="summary-card__value">{value}</div>
      <div className="summary-card__label">{label}</div>
      {children && <div className="summary-card__extra">{children}</div>}
    </article>
  );
};

export const SummaryGrid = ({ children }: PropsWithChildren) => {
  return <div className="summary-grid">{children}</div>;
};
