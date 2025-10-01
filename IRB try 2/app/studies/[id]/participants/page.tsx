'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Participant {
  id: string;
  subjectId: string;
  consentDate: string;
  enrollmentDate: string;
  status: string;
  groupAssignment?: string;
  createdAt: string;
}

export default function ParticipantsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subjectId: '',
    consentDate: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    status: 'SCREENING',
    groupAssignment: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchParticipants(token);
  }, [params.id, router]);

  const fetchParticipants = async (token: string) => {
    try {
      const response = await fetch(`/api/studies/${params.id}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/studies/${params.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchParticipants(token!);
        setShowEnrollModal(false);
        setFormData({
          subjectId: '',
          consentDate: '',
          enrollmentDate: new Date().toISOString().split('T')[0],
          status: 'SCREENING',
          groupAssignment: '',
        });
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      SCREENING: { color: 'bg-yellow-100 text-yellow-800', label: 'Screening' },
      ENROLLED: { color: 'bg-green-100 text-green-800', label: 'Enrolled' },
      ACTIVE: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      WITHDRAWN: { color: 'bg-red-100 text-red-800', label: 'Withdrawn' },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
    };

    const config = statusConfig[status] || statusConfig.SCREENING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003F6C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <button
              onClick={() => router.push(`/studies/${params.id}`)}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Study
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Participant Management</h1>
            <p className="text-gray-600 mt-2">Enroll and manage study participants</p>
          </div>

          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-6 py-3 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Enroll Participant
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Total Enrolled</p>
            <p className="text-3xl font-bold text-gray-900">{participants.filter(p => p.status === 'ENROLLED').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Screening</p>
            <p className="text-3xl font-bold text-yellow-600">{participants.filter(p => p.status === 'SCREENING').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-3xl font-bold text-blue-600">{participants.filter(p => p.status === 'COMPLETED').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600">Withdrawn</p>
            <p className="text-3xl font-bold text-red-600">{participants.filter(p => p.status === 'WITHDRAWN').length}</p>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consent Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {participant.subjectId}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(participant.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {participant.groupAssignment || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(participant.consentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(participant.enrollmentDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/studies/${params.id}/participants/${participant.id}`)}
                      className="text-[#003F6C] hover:text-[#002D4F] font-medium text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {participants.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-2 text-gray-600">No participants enrolled yet</p>
              <button
                onClick={() => setShowEnrollModal(true)}
                className="mt-4 text-[#003F6C] font-medium hover:underline"
              >
                Enroll your first participant
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Enroll New Participant</h3>

            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject ID *
                </label>
                <input
                  type="text"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                  placeholder="e.g., SUBJ-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consent Date *
                </label>
                <input
                  type="date"
                  value={formData.consentDate}
                  onChange={(e) => setFormData({ ...formData, consentDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Date *
                </label>
                <input
                  type="date"
                  value={formData.enrollmentDate}
                  onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="SCREENED">Screened</option>
                  <option value="ENROLLED">Enrolled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Assignment (Optional)
                </label>
                <input
                  type="text"
                  value={formData.groupAssignment}
                  onChange={(e) => setFormData({ ...formData, groupAssignment: e.target.value })}
                  placeholder="e.g., Treatment A, Placebo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] disabled:opacity-50"
                >
                  {submitting ? 'Enrolling...' : 'Enroll Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}