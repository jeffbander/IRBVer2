'use client';

import { useState, useEffect, useRef } from 'react';
import { getChainNameForDocumentType } from '@/lib/aigents';

interface Document {
  id: string;
  name: string;
  type: string;
  version: number;
  mimeType?: string;
  fileSize?: number;
  parentDocumentId?: string | null;
  isLatestVersion?: boolean;
  versionNotes?: string | null;

  // OCR fields
  ocrStatus?: string | null;
  ocrContent?: string | null;
  ocrError?: string | null;
  ocrModel?: string | null;
  isOcrSupported?: boolean;

  // Aigents fields
  aigentsStatus?: string | null;
  aigentsAnalysis?: string | null;
  aigentsChainName?: string | null;
  aigentsRunId?: string | null;
}

interface DocumentsListProps {
  documents: Document[];
  studyId: string;
  token: string;
  isPI: boolean;
  isReviewer: boolean;
  isAdmin: boolean;
  userPermissions: string[];
  onUploadClick: () => void;
  onDocumentUpdate: () => void;
}

export default function DocumentsList({
  documents,
  studyId,
  token,
  isPI,
  isReviewer,
  isAdmin,
  userPermissions,
  onUploadClick,
  onDocumentUpdate,
}: DocumentsListProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [sendingToAigents, setSendingToAigents] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDocument, setAnalysisDocument] = useState<Document | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrDocument, setOcrDocument] = useState<Document | null>(null);
  const [triggeringOcr, setTriggeringOcr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);

  // Track which documents are processing for polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for updates on processing documents every 10 seconds
  useEffect(() => {
    const processingDocs = documents.filter(
      doc => doc.aigentsStatus === 'processing' || doc.ocrStatus === 'processing'
    );

    if (processingDocs.length > 0) {
      console.log(`📡 Polling enabled for ${processingDocs.length} processing documents`);

      pollingIntervalRef.current = setInterval(() => {
        console.log('🔄 Polling for document updates...');
        onDocumentUpdate();
      }, 10000); // 10 seconds
    } else {
      if (pollingIntervalRef.current) {
        console.log('⏹️ Stopping polling (no processing documents)');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [documents, onDocumentUpdate]);

  const handleTriggerAnalysis = async (document: Document) => {
    setSendingToAigents(true);

    try {
      const response = await fetch(`/api/documents/${document.id}/aigents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to trigger AI analysis');
      }

      const result = await response.json();
      console.log('✅ AI Analysis triggered:', result);

      alert(
        `AI Analysis Started!\n\n` +
        `Chain: ${result.chainName}\n` +
        `Status: ${result.status}\n\n` +
        `${result.message}`
      );

      onDocumentUpdate();
      setShowConfirmModal(false);
      setSelectedDocument(null);
    } catch (error: any) {
      console.error('❌ Error triggering AI analysis:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSendingToAigents(false);
    }
  };

  const handleTriggerOcr = async (document: Document) => {
    setTriggeringOcr(true);

    try {
      const response = await fetch(`/api/documents/${document.id}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger OCR');
      }

      const result = await response.json();
      console.log('✅ OCR triggered:', result);

      alert(`OCR Processing Started!\n\nStatus: Processing\n\nResults will appear automatically when complete.`);
      onDocumentUpdate();
    } catch (error: any) {
      console.error('❌ Error triggering OCR:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setTriggeringOcr(false);
    }
  };

  const handleDeleteDocument = async (document: Document) => {
    try {
      const response = await fetch(`/api/studies/${studyId}/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete document');
      }

      alert(`Document "${document.name}" has been deleted.`);
      onDocumentUpdate();
      setShowDeleteConfirm(false);
      setDeletingDocument(null);
    } catch (error: any) {
      console.error('❌ Error deleting document:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const viewOcrContent = async (document: Document) => {
    setOcrDocument(document);
    setShowOcrModal(true);
  };

  const getOcrStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;

    const configs: Record<string, { bg: string; text: string; label: string; icon: string; animate?: boolean }> = {
      pending: { bg: 'bg-gradient-to-r from-yellow-400 to-orange-400', text: 'text-white', label: 'OCR Pending', icon: '⏱️', animate: false },
      processing: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', text: 'text-white', label: 'OCR Processing', icon: '⚡', animate: true },
      completed: { bg: 'bg-gradient-to-r from-green-500 to-emerald-600', text: 'text-white', label: 'OCR Complete', icon: '✓', animate: false },
      failed: { bg: 'bg-gradient-to-r from-red-500 to-rose-600', text: 'text-white', label: 'OCR Failed', icon: '✗', animate: false },
      not_supported: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Not Supported', icon: '—', animate: false },
    };

    const config = configs[status] || { bg: 'bg-gray-200', text: 'text-gray-800', label: `OCR: ${status}`, icon: '?', animate: false };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${config.bg} ${config.text} ${config.animate ? 'animate-pulse' : ''}`}>
        <span className={config.animate ? 'animate-spin' : ''}>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getAigentsStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;

    const configs: Record<string, { bg: string; text: string; label: string; icon: string; animate?: boolean }> = {
      pending: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-white', label: 'AI Pending', icon: '🔄', animate: false },
      processing: { bg: 'bg-gradient-to-r from-purple-500 to-pink-600', text: 'text-white', label: 'AI Analyzing', icon: '🤖', animate: true },
      completed: { bg: 'bg-gradient-to-r from-green-500 to-teal-600', text: 'text-white', label: 'AI Complete', icon: '✨', animate: false },
      failed: { bg: 'bg-gradient-to-r from-red-500 to-pink-600', text: 'text-white', label: 'AI Failed', icon: '⚠️', animate: false },
    };

    const config = configs[status] || { bg: 'bg-gray-200', text: 'text-gray-800', label: `AI: ${status}`, icon: '?', animate: false };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${config.bg} ${config.text} ${config.animate ? 'animate-pulse' : ''}`}>
        <span className={config.animate ? 'animate-bounce' : ''}>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const canDelete = isAdmin || userPermissions.includes('delete_documents');

  return (
    <>
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📄</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Documents</h3>
              <p className="text-xs text-gray-500">{documents.length} file{documents.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {(isPI || isReviewer) && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#003F6C] to-[#2E8B57] text-white rounded-lg hover:shadow-lg transition-all hover:scale-105 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload
            </button>
          )}
        </div>

        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="group relative bg-white border-2 border-gray-100 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm">📋</span>
                        </div>
                        <p className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{doc.name}</p>
                      </div>
                      {!doc.isLatestVersion && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 shadow-sm">
                          Old Version
                        </span>
                      )}
                      {getOcrStatusBadge(doc.ocrStatus)}
                      {getAigentsStatusBadge(doc.aigentsStatus)}
                    </div>
                    <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">{doc.type.replace(/_/g, ' ')}</span>
                      <span className="text-gray-400">•</span>
                      <span>Version {doc.version}</span>
                    </p>

                    {doc.versionNotes && (
                      <p className="text-xs text-gray-600 mt-1">
                        📝 {doc.versionNotes}
                      </p>
                    )}

                    {doc.aigentsChainName && (
                      <p className="text-xs text-gray-600 mt-1">
                        🤖 Analyzed with: {doc.aigentsChainName}
                      </p>
                    )}

                    {doc.ocrModel && doc.ocrStatus === 'completed' && (
                      <p className="text-xs text-gray-500 mt-1">
                        📄 OCR by {doc.ocrModel}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => window.open(`/api/studies/${studyId}/documents/${doc.id}?token=${token}`, '_blank')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 hover:shadow-md transition-all whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>

                    {/* OCR Actions */}
                    {doc.isOcrSupported && doc.ocrStatus === 'completed' && doc.ocrContent && (
                      <button
                        onClick={() => viewOcrContent(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 hover:shadow-md transition-all whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View OCR
                      </button>
                    )}

                    {doc.isOcrSupported && (doc.ocrStatus === 'pending' || doc.ocrStatus === 'failed') && (isPI || isReviewer) && (
                      <button
                        onClick={() => handleTriggerOcr(doc)}
                        disabled={triggeringOcr}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 hover:shadow-md transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{display: triggeringOcr ? 'block' : 'none'}}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {doc.ocrStatus === 'failed' ? 'Retry OCR' : 'Process OCR'}
                      </button>
                    )}

                    {/* AI Analysis Actions */}
                    {(isPI || isReviewer) && (
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowConfirmModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-medium rounded-lg hover:from-purple-600 hover:to-pink-700 hover:shadow-md transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={doc.aigentsStatus === 'processing'}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {doc.aigentsStatus === 'processing' ? 'Processing...' : doc.aigentsStatus ? 'Re-analyze' : 'Analyze AI'}
                      </button>
                    )}

                    {doc.aigentsAnalysis && doc.aigentsStatus === 'completed' && (
                      <button
                        onClick={() => {
                          setAnalysisDocument(doc);
                          setShowAnalysisModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-md transition-all whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View Analysis
                      </button>
                    )}

                    {doc.aigentsStatus === 'failed' && (
                      <button
                        onClick={() => {
                          setAnalysisDocument(doc);
                          setShowAnalysisModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-medium rounded-lg hover:from-red-600 hover:to-rose-700 hover:shadow-md transition-all whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        View Error
                      </button>
                    )}

                    {/* Delete Action (Admin Only) */}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setDeletingDocument(doc);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-medium rounded-lg hover:from-red-700 hover:to-red-800 hover:shadow-md transition-all whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No documents uploaded</p>
        )}
      </div>

      {/* Confirm AI Analysis Modal */}
      {showConfirmModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">🤖 AI Document Analysis</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Document: <span className="font-medium">{selectedDocument.name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Type: <span className="font-medium">{selectedDocument.type.replace(/_/g, ' ')}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Version: <span className="font-medium">{selectedDocument.version}</span>
              </p>
              <p className="text-sm text-gray-600">
                AI Chain: <span className="font-medium text-purple-600">{getChainNameForDocumentType(selectedDocument.type)}</span>
              </p>
            </div>

            {selectedDocument.ocrContent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  ✓ OCR content available - AI will analyze extracted text
                </p>
              </div>
            )}

            {selectedDocument.ocrStatus === 'processing' && (
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

            {selectedDocument.aigentsStatus && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ This document was previously analyzed. Clicking &quot;Start Analysis&quot; will create a new AI analysis.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedDocument(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={sendingToAigents}
              >
                Cancel
              </button>
              <button
                onClick={() => handleTriggerAnalysis(selectedDocument)}
                disabled={sendingToAigents || selectedDocument.ocrStatus === 'processing'}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {sendingToAigents ? '🚀 Starting...' : '🚀 Start Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Content Modal */}
      {showOcrModal && ocrDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  📄 OCR Extracted Text
                </h3>
                <p className="text-sm text-gray-600 mt-1">{ocrDocument.name} (v{ocrDocument.version})</p>
              </div>
              <button
                onClick={() => setShowOcrModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ocrDocument.ocrModel && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  Extracted by {ocrDocument.ocrModel}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  {ocrDocument.ocrContent?.length || 0} characters
                </span>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                {ocrDocument.ocrContent || 'No OCR content available'}
              </pre>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowOcrModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Display Modal */}
      {showAnalysisModal && analysisDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  {analysisDocument.aigentsStatus === 'completed' && '✅'}
                  {analysisDocument.aigentsStatus === 'failed' && '❌'}
                  AI Analysis {analysisDocument.aigentsStatus === 'failed' ? 'Error' : 'Results'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{analysisDocument.name} (v{analysisDocument.version})</p>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {analysisDocument.aigentsChainName && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                  🤖 {analysisDocument.aigentsChainName}
                </span>
                {analysisDocument.aigentsRunId && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                    ID: {analysisDocument.aigentsRunId}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  analysisDocument.aigentsStatus === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {analysisDocument.aigentsStatus?.toUpperCase()}
                </span>
              </div>
            )}

            {analysisDocument.aigentsStatus === 'failed' ? (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm font-medium text-red-900 mb-2">Error Details:</p>
                <pre className="whitespace-pre-wrap text-sm text-red-800 font-sans">
                  {analysisDocument.aigentsAnalysis || 'An unknown error occurred during AI analysis.'}
                </pre>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                  {analysisDocument.aigentsAnalysis}
                </pre>
              </div>
            )}

            <div className="mt-6 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {analysisDocument.aigentsStatus === 'completed' && '✓ Analysis completed successfully'}
                {analysisDocument.aigentsStatus === 'failed' && '✗ Analysis failed - you can try again'}
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-red-600">🗑️ Delete Document</h3>

            <p className="text-gray-700 mb-4">
              Are you sure you want to delete this document?
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{deletingDocument.name}</p>
              <p className="text-xs text-gray-600 mt-1">
                Version {deletingDocument.version} - {deletingDocument.type.replace(/_/g, ' ')}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Warning:</strong> This action cannot be undone. All associated data (OCR content, AI analysis, etc.) will also be removed.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingDocument(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(deletingDocument)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
