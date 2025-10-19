import clsx from 'classnames';
import './StatusPill.css';

type StatusPillProps = {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
};

export const StatusPill = ({ label, tone = 'neutral' }: StatusPillProps) => {
  return <span className={clsx('status-pill', tone)}>{label}</span>;
};
