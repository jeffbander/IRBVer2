'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

interface Study {
  id: string;
  title: string;
  protocolNumber: string;
  status: string;
  type: string;
  description: string;
  riskLevel: string;
  startDate?: string;
  endDate?: string;
  targetEnrollment?: number;
  currentEnrollment: number;
  irbApprovalDate?: string;
  irbExpirationDate?: string;
  principalInvestigator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  participants: any[];
  documents: any[];
  createdAt: string;
  updatedAt: string;
}

interface ReviewAction {
  id: string;
  action: string;
  createdAt: string;
  details?: any;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: { name: string };
  };
}

export default function StudyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [study, setStudy] = useState<Study | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState({
    participantId: '',
    consentDate: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    site: '',
    notes: ''
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    type: 'PROTOCOL',
    description: '',
    version: '1.0',
    file: null as File | null
  });

  useEffect(() => {
    if (!token || !user) {
      router.push('/login');
      return;
    }

    fetchStudy(token);
    fetchReviewHistory(token);
  }, [token, user, params.id, router]);

  const fetchStudy = async (token: string) => {
    try {
      const response = await fetch(`/api/studies/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudy(data);
      } else {
        router.push('/studies');
      }
    } catch (error) {
      console.error('Failed to fetch study:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewHistory = async (token: string) => {
    try {
      const response = await fetch(`/api/studies/${params.id}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReviewHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch review history:', error);
    }
  };

  const handleReviewAction = async () => {
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/studies/${params.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: reviewAction,
          comments: reviewComments,
        }),
      });

      if (response.ok) {
        await fetchStudy(token);
        await fetchReviewHistory(token);
        setShowReviewModal(false);
        setReviewComments('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to perform action');
      }
    } catch (error) {
      console.error('Review action failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollParticipant = async () => {
    if (!enrollmentData.participantId || !enrollmentData.consentDate) {
      alert('Participant ID and Consent Date are required');
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/studies/${params.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(enrollmentData),
      });

      if (response.ok) {
        await fetchStudy(token);
        setShowEnrollModal(false);
        setEnrollmentData({
          participantId: '',
          consentDate: '',
          enrollmentDate: new Date().toISOString().split('T')[0],
          site: '',
          notes: ''
        });
        alert('Participant enrolled successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to enroll participant');
      }
    } catch (error) {
      console.error('Enrollment failed:', error);
      alert('Failed to enroll participant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadData.name || !uploadData.type || !uploadData.file) {
      alert('Name, type, and file are required');
      return;
    }

    if (!token) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('name', uploadData.name);
      formData.append('type', uploadData.type);
      formData.append('description', uploadData.description);
      formData.append('version', uploadData.version);

      const response = await fetch(`/api/studies/${params.id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        await fetchStudy(token);
        setShowUploadModal(false);
        setUploadData({
          name: '',
          type: 'PROTOCOL',
          description: '',
          version: '1.0',
          file: null
        });
        alert('Document uploaded successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      PENDING_REVIEW: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
      APPROVED: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      ACTIVE: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      CLOSED: { color: 'bg-gray-100 text-gray-600', label: 'Closed' },
      COMPLETED: { color: 'bg-purple-100 text-purple-800', label: 'Completed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      SUBMIT_FOR_REVIEW: 'Submitted for Review',
      APPROVE_STUDY: 'Approved',
      REJECT_STUDY: 'Rejected',
      REQUEST_CHANGES: 'Changes Requested',
      ACTIVATE_STUDY: 'Activated',
    };
    return labels[action] || action;
  };

  if (loading || !study) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003F6C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading study details...</p>
        </div>
      </div>
    );
  }

  const isPI = study.principalInvestigator.id === user?.id;
  const isReviewer = user?.role?.permissions?.includes('review_studies');
  const canApprove = user?.role?.permissions?.includes('approve_studies');
  const isAdmin = user?.role?.name === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/studies')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Studies
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{study.title}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-gray-600">Protocol: {study.protocolNumber}</span>
                {getStatusBadge(study.status)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {(isPI || isAdmin) && study.status === 'DRAFT' && (
                <>
                  <button
                    onClick={() => router.push(`/studies/${study.id}/edit`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Edit Study
                  </button>
                  <button
                    onClick={() => {
                      setReviewAction('submit');
                      setShowReviewModal(true);
                    }}
                    className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F]"
                  >
                    Submit for Review
                  </button>
                </>
              )}

              {isReviewer && study.status === 'PENDING_REVIEW' && (
                <>
                  <button
                    onClick={() => {
                      setReviewAction('request_changes');
                      setShowReviewModal(true);
                    }}
                    className="px-4 py-2 border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50"
                  >
                    Request Changes
                  </button>
                  {canApprove && (
                    <>
                      <button
                        onClick={() => {
                          setReviewAction('reject');
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setReviewAction('approve');
                          setShowReviewModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve Study
                      </button>
                    </>
                  )}
                </>
              )}

              {study.status === 'APPROVED' && (isPI || canApprove || isAdmin) && (
                <button
                  onClick={() => {
                    setReviewAction('activate');
                    setShowReviewModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Activate Study
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Study Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Study Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Study Type</p>
                  <p className="font-medium">{study.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Risk Level</p>
                  <p className="font-medium">{study.riskLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Target Enrollment</p>
                  <p className="font-medium">{study.targetEnrollment || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Enrollment</p>
                  <p className="font-medium">{study.currentEnrollment}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">
                    {study.startDate ? new Date(study.startDate).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">
                    {study.endDate ? new Date(study.endDate).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">{study.description}</p>
              </div>
            </div>

            {/* IRB Approval */}
            {study.irbApprovalDate && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3">IRB Approval</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Approval Date</p>
                    <p className="font-medium text-green-900">
                      {new Date(study.irbApprovalDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700">Expiration Date</p>
                    <p className="font-medium text-green-900">
                      {new Date(study.irbExpirationDate!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Review History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Review History</h2>

              {reviewHistory.length > 0 ? (
                <div className="space-y-4">
                  {reviewHistory.map((action) => (
                    <div key={action.id} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getActionLabel(action.action)}
                          </p>
                          <p className="text-sm text-gray-600">
                            by {action.user.firstName} {action.user.lastName} ({action.user.role.name})
                          </p>
                          {action.details?.comments && (
                            <p className="mt-2 text-gray-700 italic">&quot;{action.details.comments}&quot;</p>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(action.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No review actions yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Research Team */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Research Team</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Principal Investigator</p>
                  <p className="font-medium">
                    {study.principalInvestigator.firstName} {study.principalInvestigator.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{study.principalInvestigator.email}</p>
                </div>

                {study.reviewer && (
                  <div>
                    <p className="text-sm text-gray-600">Reviewer</p>
                    <p className="font-medium">
                      {study.reviewer.firstName} {study.reviewer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{study.reviewer.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Documents</h3>
                {(isPI || isReviewer) && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="text-[#003F6C] text-sm hover:underline"
                  >
                    + Upload
                  </button>
                )}
              </div>

              {study.documents.length > 0 ? (
                <div className="space-y-2">
                  {study.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.type} - v{doc.version}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (token) {
                            window.open(`/api/studies/${params.id}/documents/${doc.id}?token=${token}`, '_blank');
                          }
                        }}
                        className="text-[#003F6C] text-sm hover:underline"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No documents uploaded</p>
              )}
            </div>

            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Participants</h3>
                {study.status === 'ACTIVE' && (
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="text-[#003F6C] text-sm hover:underline"
                  >
                    + Enroll
                  </button>
                )}
              </div>

              <div className="text-center py-4 cursor-pointer hover:bg-gray-50 rounded transition"
                   onClick={() => router.push(`/studies/${study.id}/participants`)}>
                <div className="text-3xl font-bold text-gray-900">
                  {study.participants.length}
                </div>
                <p className="text-sm text-gray-600">
                  of {study.targetEnrollment || '∞'} enrolled
                </p>
              </div>

              {study.targetEnrollment && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#003F6C] h-2 rounded-full"
                      style={{
                        width: `${Math.min((study.participants.length / study.targetEnrollment) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {study.status === 'ACTIVE' && (
                <button
                  onClick={() => router.push(`/studies/${study.id}/participants`)}
                  className="mt-4 w-full text-center text-[#003F6C] text-sm font-medium hover:underline"
                >
                  View All Participants →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Enroll Participant</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant ID / Subject Number *
                </label>
                <input
                  type="text"
                  value={enrollmentData.participantId}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, participantId: e.target.value })}
                  placeholder="SUBJ-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Informed Consent Date *
                </label>
                <input
                  type="date"
                  value={enrollmentData.consentDate}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, consentDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Date *
                </label>
                <input
                  type="date"
                  value={enrollmentData.enrollmentDate}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, enrollmentDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site / Location
                </label>
                <input
                  type="text"
                  value={enrollmentData.site}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, site: e.target.value })}
                  placeholder="Main Hospital - Cardiology Unit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={enrollmentData.notes}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, notes: e.target.value })}
                  placeholder="Additional enrollment notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollmentData({
                    participantId: '',
                    consentDate: '',
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    site: '',
                    notes: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollParticipant}
                disabled={submitting || !enrollmentData.participantId || !enrollmentData.consentDate}
                className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] disabled:opacity-50"
              >
                {submitting ? 'Enrolling...' : 'Enroll Participant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              {reviewAction === 'submit' && 'Submit for Review'}
              {reviewAction === 'approve' && 'Approve Study'}
              {reviewAction === 'reject' && 'Reject Study'}
              {reviewAction === 'request_changes' && 'Request Changes'}
              {reviewAction === 'activate' && 'Activate Study'}
            </h3>

            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder={
                reviewAction === 'submit'
                  ? 'Additional notes for reviewer (optional)'
                  : 'Comments (required)'
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
              rows={4}
              required={reviewAction !== 'submit'}
            />

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewComments('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewAction}
                disabled={submitting || (reviewAction !== 'submit' && !reviewComments)}
                className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Upload Document</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  placeholder="Protocol Document v2.0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={uploadData.type}
                  onChange={(e) => setUploadData({ ...uploadData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="PROTOCOL">Protocol</option>
                  <option value="CONSENT_FORM">Consent Form</option>
                  <option value="IRB_APPROVAL">IRB Approval</option>
                  <option value="AMENDMENT">Amendment</option>
                  <option value="SAE_REPORT">SAE Report</option>
                  <option value="PROGRESS_REPORT">Progress Report</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={uploadData.version}
                  onChange={(e) => setUploadData({ ...uploadData, version: e.target.value })}
                  placeholder="1.0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  placeholder="Optional description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File * (PDF, Word, Excel, Images - Max 10MB)
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  required
                />
                {uploadData.file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {uploadData.file.name} ({(uploadData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadData({
                    name: '',
                    type: 'PROTOCOL',
                    description: '',
                    version: '1.0',
                    file: null
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadDocument}
                disabled={submitting || !uploadData.name || !uploadData.type || !uploadData.file}
                className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] disabled:opacity-50"
              >
                {submitting ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}