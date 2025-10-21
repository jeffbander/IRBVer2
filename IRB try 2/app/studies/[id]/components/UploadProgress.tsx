'use client';

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'processing-ocr' | 'completed' | 'error';
  error?: string;
}

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  error
}: UploadProgressProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'uploading':
        return {
          text: 'Uploading...',
          color: 'bg-blue-500',
          icon: '📤',
        };
      case 'processing-ocr':
        return {
          text: 'Processing OCR...',
          color: 'bg-amber-500',
          icon: '🔍',
        };
      case 'completed':
        return {
          text: 'Upload complete',
          color: 'bg-green-500',
          icon: '✓',
        };
      case 'error':
        return {
          text: 'Upload failed',
          color: 'bg-red-500',
          icon: '✗',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label={config.text}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <span className="text-xs text-gray-500 ml-2">
              {formatBytes(fileSize)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${config.color}`}
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              {config.text}
            </p>
            <span className="text-xs font-medium text-gray-900">
              {progress}%
            </span>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
