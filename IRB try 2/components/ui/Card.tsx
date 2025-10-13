import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'standard' | 'stat' | 'protocol';
  gradient?: 'blue' | 'pink' | 'navy' | 'green';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'standard',
  gradient,
  onClick,
}) => {
  const baseStyles = 'rounded-lg transition-all duration-200';

  const variantStyles = {
    standard: 'bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md',
    stat: `${gradient ? getGradientStyles(gradient) : 'bg-gradient-to-r from-brand-primary to-brand-primary-hover'} text-white p-6 shadow-md hover:shadow-xl hover:scale-105`,
    protocol: 'bg-white border-l-4 p-6 shadow-sm hover:shadow-md',
  };

  const clickableStyles = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${clickableStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

function getGradientStyles(gradient: string): string {
  const gradients = {
    blue: 'bg-gradient-to-br from-brand-primary to-brand-primary-hover',
    pink: 'bg-gradient-to-br from-brand-accent to-pink-700',
    navy: 'bg-gradient-to-br from-brand-heading to-indigo-900',
    green: 'bg-gradient-to-br from-status-success to-emerald-700',
  };
  return gradients[gradient as keyof typeof gradients] || gradients.blue;
}

// Stat Card Component
export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  gradient?: 'blue' | 'pink' | 'navy' | 'green';
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  gradient = 'blue',
  subtitle,
}) => {
  return (
    <Card variant="stat" gradient={gradient}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-5xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-sm mt-1 opacity-70">{subtitle}</p>}
        </div>
        {icon && (
          <div className="bg-white bg-opacity-20 p-4 rounded-full">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

// Protocol Card Component
export interface ProtocolCardProps {
  title: string;
  protocolNumber: string;
  pi: string;
  piAvatar?: string;
  status: 'draft' | 'pending' | 'approved' | 'active' | 'rejected';
  lastModified: string;
  onClick?: () => void;
}

export const ProtocolCard: React.FC<ProtocolCardProps> = ({
  title,
  protocolNumber,
  pi,
  piAvatar,
  status,
  lastModified,
  onClick,
}) => {
  return (
    <Card variant="protocol" className={`border-l-${getStatusColor(status)}-500`} onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-gray-600 mb-2">Protocol: {protocolNumber}</p>
          <div className="flex items-center text-sm text-gray-500 mb-3">
            {piAvatar && (
              <img src={piAvatar} alt={pi} className="w-6 h-6 rounded-full mr-2" />
            )}
            <span>PI: {pi}</span>
          </div>
          <p className="text-xs text-gray-400">Last modified: {lastModified}</p>
        </div>
      </div>
    </Card>
  );
};

// Helper function for status colors
function getStatusColor(status: string): string {
  const colors = {
    draft: 'gray',
    pending: 'amber',
    approved: 'green',
    active: 'blue',
    rejected: 'red',
  };
  return colors[status as keyof typeof colors] || 'gray';
}

// Status Badge Component (used in ProtocolCard)
export interface StatusBadgeProps {
  status: 'draft' | 'pending' | 'approved' | 'active' | 'rejected';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles = {
    draft: 'bg-semantic-draft-bg text-semantic-draft-text',
    pending: 'bg-semantic-pending-bg text-semantic-pending-text',
    approved: 'bg-semantic-approved-bg text-semantic-approved-text',
    active: 'bg-semantic-active-bg text-semantic-active-text',
    rejected: 'bg-semantic-rejected-bg text-semantic-rejected-text',
  };

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-caption';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${styles[status]} ${sizeStyles}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
