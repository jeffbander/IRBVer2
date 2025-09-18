'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Download, FileText, File, Image,
  Trash2, Eye, Edit2, Share2, Clock, CheckCircle,
  AlertCircle, Search, Filter, FolderOpen, FileCheck,
  FileX, Shield, Users, Calendar, MoreVertical
} from 'lucide-react';

interface Document {
  id: string;
  studyId: string;
  name: string;
  type: 'PROTOCOL' | 'CONSENT_FORM' | 'IRB_SUBMISSION' | 'IRB_APPROVAL' | 'AMENDMENT' | 'SAE_REPORT' | 'DATA_FORM' | 'OTHER';
  category: string;
  version: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  lastModified: string;
  approvedBy?: string;
  approvalDate?: string;
  description?: string;
  tags: string[];
  shareWith: string[];
}

export default function DocumentsPage() {
  const params = useParams();
  const studyId = params.id as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'PROTOCOL',
    category: 'primary',
    version: '1.0',
    description: '',
    tags: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadDocuments();
  }, [studyId]);

  const loadDocuments = async () => {
    try {
      // Mock data
      const mockDocuments: Document[] = [
        {
          id: 'd1',
          studyId,
          name: 'Study Protocol v2.1',
          type: 'PROTOCOL',
          category: 'Primary Documents',
          version: '2.1',
          status: 'APPROVED',
          fileSize: 2548000,
          fileType: 'application/pdf',
          uploadedBy: 'Dr. Sarah Chen',
          uploadedAt: '2024-01-15T10:30:00Z',
          lastModified: '2024-01-15T10:30:00Z',
          approvedBy: 'IRB Committee',
          approvalDate: '2024-01-20T14:00:00Z',
          description: 'Updated protocol with amended inclusion criteria',
          tags: ['protocol', 'version-2.1', 'approved'],
          shareWith: ['all-investigators'],
        },
        {
          id: 'd2',
          studyId,
          name: 'Informed Consent Form',
          type: 'CONSENT_FORM',
          category: 'Consent Documents',
          version: '1.3',
          status: 'APPROVED',
          fileSize: 524000,
          fileType: 'application/pdf',
          uploadedBy: 'Dr. Sarah Chen',
          uploadedAt: '2024-01-10T09:15:00Z',
          lastModified: '2024-01-10T09:15:00Z',
          approvedBy: 'IRB Committee',
          approvalDate: '2024-01-12T16:30:00Z',
          tags: ['consent', 'patient-facing', 'approved'],
          shareWith: ['all-staff'],
        },
        {
          id: 'd3',
          studyId,
          name: 'IRB Initial Submission',
          type: 'IRB_SUBMISSION',
          category: 'Regulatory',
          version: '1.0',
          status: 'APPROVED',
          fileSize: 8920000,
          fileType: 'application/zip',
          uploadedBy: 'Research Coordinator',
          uploadedAt: '2023-12-01T11:45:00Z',
          lastModified: '2023-12-01T11:45:00Z',
          approvedBy: 'IRB Committee',
          approvalDate: '2023-12-15T10:00:00Z',
          tags: ['irb', 'initial-submission', 'complete'],
          shareWith: ['investigators'],
        },
        {
          id: 'd4',
          studyId,
          name: 'Case Report Form Template',
          type: 'DATA_FORM',
          category: 'Data Collection',
          version: '1.0',
          status: 'DRAFT',
          fileSize: 156000,
          fileType: 'application/vnd.ms-excel',
          uploadedBy: 'Data Manager',
          uploadedAt: '2024-02-01T14:20:00Z',
          lastModified: '2024-02-05T16:45:00Z',
          tags: ['crf', 'data-collection', 'template'],
          shareWith: ['data-team'],
        },
        {
          id: 'd5',
          studyId,
          name: 'Safety Monitoring Plan',
          type: 'OTHER',
          category: 'Safety',
          version: '1.0',
          status: 'UNDER_REVIEW',
          fileSize: 892000,
          fileType: 'application/pdf',
          uploadedBy: 'Safety Officer',
          uploadedAt: '2024-02-10T10:00:00Z',
          lastModified: '2024-02-10T10:00:00Z',
          tags: ['safety', 'monitoring', 'dsmb'],
          shareWith: ['safety-committee'],
        },
      ];
      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) return;

    const newDoc: Document = {
      id: `d${Date.now()}`,
      studyId,
      name: uploadForm.name,
      type: uploadForm.type as Document['type'],
      category: uploadForm.category,
      version: uploadForm.version,
      status: 'DRAFT',
      fileSize: uploadForm.file.size,
      fileType: uploadForm.file.type,
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      description: uploadForm.description,
      tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      shareWith: ['all-staff'],
    };

    setDocuments([newDoc, ...documents]);
    setShowUploadModal(false);
    resetUploadForm();
  };

  const resetUploadForm = () => {
    setUploadForm({
      name: '',
      type: 'PROTOCOL',
      category: 'primary',
      version: '1.0',
      description: '',
      tags: '',
      file: null,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROTOCOL':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'CONSENT_FORM':
        return <FileCheck className="h-5 w-5 text-green-500" />;
      case 'IRB_SUBMISSION':
      case 'IRB_APPROVAL':
        return <Shield className="h-5 w-5 text-purple-500" />;
      case 'SAE_REPORT':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'DATA_FORM':
        return <File className="h-5 w-5 text-indigo-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-gray-200 text-gray-600',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/studies/${studyId}`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Study Documents</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage protocols, forms, and regulatory documents</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Documents</p>
            <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.status === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Under Review</p>
            <p className="text-2xl font-bold text-yellow-600">
              {documents.filter(d => d.status === 'UNDER_REVIEW').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Size</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatFileSize(documents.reduce((sum, d) => sum + d.fileSize, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="PROTOCOL">Protocol</option>
              <option value="CONSENT_FORM">Consent Form</option>
              <option value="IRB_SUBMISSION">IRB Submission</option>
              <option value="IRB_APPROVAL">IRB Approval</option>
              <option value="DATA_FORM">Data Form</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Documents by Category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {Object.entries(documentsByCategory).map(([category, docs]) => (
          <div key={category} className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-gray-400" />
                {category}
                <span className="text-sm text-gray-500 ml-2">({docs.length})</span>
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {docs.map((doc) => (
                <div key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getTypeIcon(doc.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900">{doc.name}</h4>
                          <span className="text-xs text-gray-500">v{doc.version}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(doc.status)}`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>Uploaded by {doc.uploadedBy}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          {doc.approvedBy && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">
                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                Approved by {doc.approvedBy}
                              </span>
                            </>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                        {doc.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDocument(doc)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Upload Document</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FileX className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">
                        {uploadForm.file ? uploadForm.file.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOC, DOCX, XLS, XLSX up to 10MB
                      </p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter document name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Type *
                    </label>
                    <select
                      value={uploadForm.type}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PROTOCOL">Protocol</option>
                      <option value="CONSENT_FORM">Consent Form</option>
                      <option value="IRB_SUBMISSION">IRB Submission</option>
                      <option value="IRB_APPROVAL">IRB Approval</option>
                      <option value="AMENDMENT">Amendment</option>
                      <option value="SAE_REPORT">SAE Report</option>
                      <option value="DATA_FORM">Data Form</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Version
                    </label>
                    <input
                      type="text"
                      value={uploadForm.version}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1.0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the document"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Comma-separated tags (e.g., protocol, version-2, approved)"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.file || !uploadForm.name}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400"
                >
                  Upload Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Document Details</h2>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FileX className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">{selectedDocument.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedDocument.type.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Version:</span>
                      <span className="ml-2 font-medium">{selectedDocument.version}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusBadge(selectedDocument.status)}`}>
                        {selectedDocument.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">File Size:</span>
                      <span className="ml-2 font-medium">{formatFileSize(selectedDocument.fileSize)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Uploaded By:</span>
                      <span className="ml-2 font-medium">{selectedDocument.uploadedBy}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Upload Date:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedDocument.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedDocument.approvedBy && (
                      <>
                        <div>
                          <span className="text-gray-600">Approved By:</span>
                          <span className="ml-2 font-medium">{selectedDocument.approvedBy}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Approval Date:</span>
                          <span className="ml-2 font-medium">
                            {selectedDocument.approvalDate && new Date(selectedDocument.approvalDate).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {selectedDocument.description && (
                    <div className="mt-4">
                      <span className="text-gray-600 text-sm">Description:</span>
                      <p className="mt-1 text-sm">{selectedDocument.description}</p>
                    </div>
                  )}
                  {selectedDocument.tags.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-600 text-sm">Tags:</span>
                      <div className="flex gap-1 mt-1">
                        {selectedDocument.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  <button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}