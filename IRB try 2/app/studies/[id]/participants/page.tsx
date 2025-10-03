'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

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
  const { token } = useAuthStore();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    if (!token) {
      router.push('/login');
      return;
    }

    fetchParticipants(token);
  }, [params.id, router, token]);

  const fetchParticipants = async (token: string) => {
    try {
      const response = await fetch(`/api/studies/${params.id}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
        setFilteredParticipants(data);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter participants based on search and status
  useEffect(() => {
    let filtered = participants;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.subjectId.toLowerCase().includes(term) ||
        p.groupAssignment?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredParticipants(filtered);
  }, [searchTerm, statusFilter, participants]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
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

  const handleExport = async () => {
    const searchParams = new URLSearchParams();
    if (statusFilter) searchParams.append('status', statusFilter);

    const response = await fetch(`/api/studies/${params.id}/participants/export?${searchParams}`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants-${params.id}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="search"
                  placeholder="Search by subject ID or group..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="SCREENING">Screening</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 text-[#003F6C] bg-white border border-[#003F6C] rounded-lg hover:bg-[#003F6C] hover:text-white transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </button>
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
              {filteredParticipants.map((participant) => (
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

          {filteredParticipants.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-2 text-gray-600">
                {searchTerm || statusFilter ? 'No participants match your search criteria' : 'No participants enrolled yet'}
              </p>
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