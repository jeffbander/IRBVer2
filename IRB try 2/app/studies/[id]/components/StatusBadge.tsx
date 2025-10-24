'use client';

interface StatusBadgeProps {
  type: 'ocr' | 'aigents';
  status: string | null | undefined;
  contentLength?: number;
  onClick?: () => void;
}

export default function StatusBadge({ type, status, contentLength, onClick }: StatusBadgeProps) {
  if (!status) return null;

  const configs: Record<string, Record<string, { bg: string; text: string; label: string; icon: string }>> = {
    ocr: {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'OCR Queued', icon: '⏱️' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'OCR Processing', icon: '⚡' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'OCR Complete', icon: '✓' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'OCR Failed', icon: '✗' },
      not_supported: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Supported', icon: '—' },
    },
    aigents: {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'AI Queued', icon: '🔄' },
      processing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'AI Analyzing', icon: '🤖' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'AI Complete', icon: '✨' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'AI Failed', icon: '⚠️' },
    },
  };

  const config = configs[type][status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: status,
    icon: '?',
  };

  const isClickable = onClick && status === 'completed';
  const BadgeContent = (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${
        isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
    >
      {config.icon} {config.label}
      {status === 'completed' && contentLength && (
        <span className="text-xs opacity-75">
          ({type === 'ocr' ? `${Math.round(contentLength / 1000)}k` : 'view'})
        </span>
      )}
    </span>
  );

  if (isClickable) {
    return (
      <button onClick={onClick} className="text-left">
        {BadgeContent}
      </button>
    );
  }

  return BadgeContent;
}
