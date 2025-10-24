'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { OcrContentModal } from './OcrContentModal';
import ConfirmAnalysisModal from './ConfirmAnalysisModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import AnalysisResultModal from './AnalysisResultModal';
import StatusBadge from './StatusBadge';

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
  ocrStatus?: string | null;
  ocrContent?: string | null;
  ocrError?: string | null;
  ocrModel?: string | null;
  ocrProcessedAt?: Date | null;
  isOcrSupported?: boolean;
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
  // State for modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [triggeringOcr, setTriggeringOcr] = useState(false);
  const [sendingToAigents, setSendingToAigents] = useState(false);

  // Polling for processing documents
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevDocumentsRef = useRef<Document[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // Poll for updates every 5 seconds
  useEffect(() => {
    const processingDocs = documents.filter(
      doc => doc.aigentsStatus === 'processing' || doc.ocrStatus === 'processing'
    );

    setIsPolling(processingDocs.length > 0);

    if (processingDocs.length > 0) {
      pollingIntervalRef.current = setInterval(() => {
        onDocumentUpdate();
      }, 5000);
    } else if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [documents, onDocumentUpdate]);

  // Show completion notifications
  useEffect(() => {
    const prevDocs = prevDocumentsRef.current;

    documents.forEach(doc => {
      const prevDoc = prevDocs.find(d => d.id === doc.id);
      if (!prevDoc) return;

      // OCR completed
      if (prevDoc.ocrStatus === 'processing' && doc.ocrStatus === 'completed') {
        toast.success('OCR Complete', {
          description: `${doc.name} - ${Math.round((doc.ocrContent?.length || 0) / 1000)}k characters extracted`,
          duration: 6000,
        });
      }

      // OCR failed
      if (prevDoc.ocrStatus === 'processing' && doc.ocrStatus === 'failed') {
        toast.error('OCR Failed', {
          description: `${doc.name} - ${doc.ocrError || 'Unknown error'}`,
        });
      }

      // AI completed
      if (prevDoc.aigentsStatus === 'processing' && doc.aigentsStatus === 'completed') {
        toast.success('AI Analysis Complete', {
          description: `${doc.name} - Analysis ready to view`,
          duration: 10000,
        });
      }

      // AI failed
      if (prevDoc.aigentsStatus === 'processing' && doc.aigentsStatus === 'failed') {
        toast.error('AI Analysis Failed', {
          description: `${doc.name} - Please try again`,
        });
      }
    });

    prevDocumentsRef.current = documents;
  }, [documents]);

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
      toast.success('AI Analysis Started', {
        description: `${result.chainName} - ${result.message}`,
        duration: 6000,
      });

      onDocumentUpdate();
      setShowConfirmModal(false);
      setSelectedDocument(null);
    } catch (error: any) {
      toast.error('Failed to start AI analysis', {
        description: error.message,
      });
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

      toast.success('OCR Processing Started', {
        description: 'Text extraction in progress.',
        duration: 5000,
      });
      onDocumentUpdate();
    } catch (error: any) {
      toast.error('Failed to start OCR', {
        description: error.message,
      });
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

      toast.success('Document deleted', {
        description: `"${document.name}" has been removed.`,
      });
      onDocumentUpdate();
      setShowDeleteConfirm(false);
      setSelectedDocument(null);
    } catch (error: any) {
      toast.error('Failed to delete document', {
        description: error.message,
      });
    }
  };

  const canDelete = isAdmin || userPermissions.includes('delete_documents');

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-h3 text-brand-heading">Documents</h3>
            <p className="text-sm text-gray-500 mt-1">{documents.length} file{documents.length !== 1 ? 's' : ''}</p>
          </div>
          {(isPI || isReviewer) && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-all font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload
            </button>
          )}
        </div>

        {/* Polling Indicator */}
        {isPolling && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">Processing documents...</p>
              <p className="text-xs text-blue-700">Page updates automatically every 5 seconds</p>
            </div>
          </div>
        )}

        {/* Documents List */}
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border-2 border-gray-100 rounded-lg p-4 hover:border-brand-primary hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <p className="text-base font-semibold text-gray-900">{doc.name}</p>
                      {!doc.isLatestVersion && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          Old Version
                        </span>
                      )}
                      <StatusBadge
                        type="ocr"
                        status={doc.ocrStatus}
                        contentLength={doc.ocrContent?.length}
                        onClick={doc.ocrStatus === 'completed' && doc.ocrContent ? () => {
                          setSelectedDocument(doc);
                          setShowOcrModal(true);
                        } : undefined}
                      />
                      <StatusBadge
                        type="aigents"
                        status={doc.aigentsStatus}
                      />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{doc.type.replace(/_/g, ' ')}</span>
                      <span className="text-gray-400">•</span>
                      <span>Version {doc.version}</span>
                    </p>
                    {doc.versionNotes && (
                      <p className="text-xs text-gray-600 mt-1">📝 {doc.versionNotes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Download */}
                    <button
                      onClick={() => window.open(`/api/studies/${studyId}/documents/${doc.id}?token=${token}`, '_blank')}
                      className="px-3 py-1.5 bg-brand-primary text-white text-xs font-medium rounded-lg hover:bg-brand-primary-hover transition-all"
                    >
                      Download
                    </button>

                    {/* OCR Actions */}
                    {doc.isOcrSupported && doc.ocrStatus === 'completed' && doc.ocrContent && (
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowOcrModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-all"
                      >
                        View OCR
                      </button>
                    )}

                    {doc.isOcrSupported && (doc.ocrStatus === 'pending' || doc.ocrStatus === 'failed') && (isPI || isReviewer) && (
                      <button
                        onClick={() => handleTriggerOcr(doc)}
                        disabled={triggeringOcr}
                        className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 transition-all disabled:opacity-50"
                      >
                        {doc.ocrStatus === 'failed' ? 'Retry OCR' : 'Process OCR'}
                      </button>
                    )}

                    {/* AI Actions */}
                    {(isPI || isReviewer) && (
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowConfirmModal(true);
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                        disabled={doc.aigentsStatus === 'processing'}
                      >
                        {doc.aigentsStatus === 'processing' ? 'Processing...' : doc.aigentsStatus ? 'Re-analyze' : 'Analyze AI'}
                      </button>
                    )}

                    {doc.aigentsAnalysis && doc.aigentsStatus === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowAnalysisModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-all"
                      >
                        View Results
                      </button>
                    )}

                    {doc.aigentsStatus === 'failed' && (
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowAnalysisModal(true);
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-all"
                      >
                        View Error
                      </button>
                    )}

                    {/* Delete */}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowDeleteConfirm(true);
                        }}
                        className="px-3 py-1.5 bg-red-700 text-white text-xs font-medium rounded-lg hover:bg-red-800 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">No documents uploaded</p>
        )}
      </div>

      {/* Modals */}
      <ConfirmAnalysisModal
        isOpen={showConfirmModal}
        document={selectedDocument}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedDocument(null);
        }}
        onConfirm={handleTriggerAnalysis}
        isLoading={sendingToAigents}
      />

      <AnalysisResultModal
        isOpen={showAnalysisModal}
        document={selectedDocument}
        onClose={() => {
          setShowAnalysisModal(false);
          setSelectedDocument(null);
        }}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        document={selectedDocument}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedDocument(null);
        }}
        onConfirm={handleDeleteDocument}
      />

      {showOcrModal && selectedDocument && (
        <OcrContentModal
          isOpen={showOcrModal}
          onClose={() => {
            setShowOcrModal(false);
            setSelectedDocument(null);
          }}
          documentData={{
            id: selectedDocument.id,
            name: selectedDocument.name,
            ocrContent: selectedDocument.ocrContent || null,
            ocrStatus: selectedDocument.ocrStatus || null,
            ocrError: selectedDocument.ocrError || null,
            ocrModel: selectedDocument.ocrModel || null,
            ocrProcessedAt: selectedDocument.ocrProcessedAt || null,
          }}
          onRetry={() => handleTriggerOcr(selectedDocument)}
        />
      )}
    </>
  );
}
