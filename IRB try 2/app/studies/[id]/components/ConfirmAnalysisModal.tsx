'use client';

import { getChainNameForDocumentType } from '@/lib/aigents';

interface Document {
  id: string;
  name: string;
  type: string;
  version: number;
  ocrContent?: string | null;
  ocrStatus?: string | null;
  aigentsStatus?: string | null;
}

interface ConfirmAnalysisModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
  onConfirm: (document: Document) => void;
  isLoading: boolean;
}

export default function ConfirmAnalysisModal({
  isOpen,
  document,
  onClose,
  onConfirm,
  isLoading,
}: ConfirmAnalysisModalProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold mb-4">🤖 AI Document Analysis</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Document: <span className="font-medium">{document.name}</span>
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Type: <span className="font-medium">{document.type.replace(/_/g, ' ')}</span>
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Version: <span className="font-medium">{document.version}</span>
          </p>
          <p className="text-sm text-gray-600">
            AI Chain: <span className="font-medium text-purple-600">{getChainNameForDocumentType(document.type)}</span>
          </p>
        </div>

        {document.ocrContent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              ✓ OCR content available - AI will analyze extracted text
            </p>
          </div>
        )}

        {document.ocrStatus === 'processing' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              ⚠️ OCR is still processing. Please wait for OCR to complete first.
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">
            <strong>How it works:</strong>
          </p>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>Document content is sent to Aigents AI for analysis</li>
            <li>Processing takes 15-30 seconds</li>
            <li>Results automatically appear when complete</li>
            <li>You can continue working while processing</li>
          </ol>
        </div>

        {document.aigentsStatus && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              ⚠️ This document was previously analyzed. Clicking &quot;Start Analysis&quot; will create a new AI analysis.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(document)}
            disabled={isLoading || document.ocrStatus === 'processing'}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? '🚀 Starting...' : '🚀 Start Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
