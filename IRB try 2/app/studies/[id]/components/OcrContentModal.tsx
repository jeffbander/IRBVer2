'use client';

import { useState } from 'react';

interface OcrContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    name: string;
    ocrContent: string | null;
    ocrStatus: string | null;
    ocrError: string | null;
    ocrModel: string | null;
    ocrProcessedAt: Date | null;
  };
  onRetry?: () => void;
}

export function OcrContentModal({
  isOpen,
  onClose,
  document,
  onRetry,
}: OcrContentModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (document.ocrContent) {
      await navigator.clipboard.writeText(document.ocrContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const wordCount = document.ocrContent
    ? document.ocrContent.split(/\s+/).length
    : 0;
  const charCount = document.ocrContent?.length || 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              OCR Extracted Content
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {document.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-600">Model:</span>
              <span className="ml-2 font-medium text-gray-900">
                {document.ocrModel || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Words:</span>
              <span className="ml-2 font-medium text-gray-900">
                {wordCount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Characters:</span>
              <span className="ml-2 font-medium text-gray-900">
                {charCount.toLocaleString()}
              </span>
            </div>
            {document.ocrProcessedAt && (
              <div>
                <span className="text-gray-600">Processed:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(document.ocrProcessedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Text</span>
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {document.ocrStatus === 'completed' && document.ocrContent ? (
            <div
              className="prose prose-sm max-w-none"
              role="region"
              aria-label="OCR extracted text"
            >
              <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                {document.ocrContent}
              </pre>
            </div>
          ) : document.ocrStatus === 'failed' ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                OCR Processing Failed
              </h3>
              <p className="text-gray-600 mb-4">
                {document.ocrError || 'An error occurred during OCR processing'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Retry OCR Processing
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                OCR Processing...
              </h3>
              <p className="text-gray-600">
                Please wait while we extract text from your document
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
