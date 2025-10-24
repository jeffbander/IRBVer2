'use client';

interface Document {
  id: string;
  name: string;
  version: number;
  aigentsStatus?: string | null;
  aigentsAnalysis?: string | null;
  aigentsChainName?: string | null;
  aigentsRunId?: string | null;
}

interface AnalysisResultModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
}

export default function AnalysisResultModal({
  isOpen,
  document,
  onClose,
}: AnalysisResultModalProps) {
  if (!isOpen || !document) return null;

  const isFailed = document.aigentsStatus === 'failed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              {isFailed ? '❌' : '✅'}
              AI Analysis {isFailed ? 'Error' : 'Results'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{document.name} (v{document.version})</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {document.aigentsChainName && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
              🤖 {document.aigentsChainName}
            </span>
            {document.aigentsRunId && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                ID: {document.aigentsRunId}
              </span>
            )}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isFailed
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {document.aigentsStatus?.toUpperCase()}
            </span>
          </div>
        )}

        {isFailed ? (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm font-medium text-red-900 mb-2">Error Details:</p>
            <pre className="whitespace-pre-wrap text-sm text-red-800 font-sans">
              {document.aigentsAnalysis || 'An unknown error occurred during AI analysis.'}
            </pre>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
              {document.aigentsAnalysis}
            </pre>
          </div>
        )}

        <div className="mt-6 flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {isFailed ? '✗ Analysis failed - you can try again' : '✓ Analysis completed successfully'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
