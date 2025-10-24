'use client';

interface Document {
  id: string;
  name: string;
  type: string;
  version: number;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
  onConfirm: (document: Document) => void;
}

export default function DeleteConfirmModal({
  isOpen,
  document,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold mb-4 text-red-600">🗑️ Delete Document</h3>

        <p className="text-gray-700 mb-4">
          Are you sure you want to delete this document?
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-gray-900">{document.name}</p>
          <p className="text-xs text-gray-600 mt-1">
            Version {document.version} - {document.type.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-800">
            ⚠️ <strong>Warning:</strong> This action cannot be undone. All associated data (OCR content, AI analysis, etc.) will also be removed.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(document)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Document
          </button>
        </div>
      </div>
    </div>
  );
}
