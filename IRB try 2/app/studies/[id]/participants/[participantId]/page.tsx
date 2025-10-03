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
  updatedAt: string;
}

export default function ParticipantDetailsPage({
  params,
}: {
  params: { id: string; participantId: string };
}) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchParticipant(token);
  }, [params.id, params.participantId, router, token]);

  const fetchParticipant = async (token: string) => {
    try {
      const response = await fetch(
        `/api/studies/${params.id}/participants/${params.participantId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setParticipant(data);
      }
    } catch (error) {
      console.error('Failed to fetch participant:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      SCREENED: { color: 'bg-yellow-100 text-yellow-800', label: 'Screened' },
      ENROLLED: { color: 'bg-green-100 text-green-800', label: 'Enrolled' },
      WITHDRAWN: { color: 'bg-red-100 text-red-800', label: 'Withdrawn' },
      COMPLETED: { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
      SCREEN_FAILED: { color: 'bg-gray-100 text-gray-800', label: 'Screen Failed' },
    };

    const config = statusConfig[status] || statusConfig.SCREENED;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003F6C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading participant details...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Participant not found</p>
          <button
            onClick={() => router.push(`/studies/${params.id}/participants`)}
            className="mt-4 text-[#003F6C] hover:underline"
          >
            Back to Participants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/studies/${params.id}/participants`)}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Participants
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Participant: {participant.subjectId}
              </h1>
              <p className="text-gray-600 mt-2">Detailed participant information</p>
            </div>
            {getStatusBadge(participant.status)}
          </div>
        </div>

        {/* Participant Details Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Enrollment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Subject ID</label>
              <p className="text-lg font-medium text-gray-900">{participant.subjectId}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              {getStatusBadge(participant.status)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Group Assignment
              </label>
              <p className="text-lg text-gray-900">
                {participant.groupAssignment || 'Not assigned'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Consent Date</label>
              <p className="text-lg text-gray-900">
                {new Date(participant.consentDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Enrollment Date
              </label>
              <p className="text-lg text-gray-900">
                {new Date(participant.enrollmentDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Enrolled On</label>
              <p className="text-lg text-gray-900">
                {new Date(participant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Section - Placeholder for future implementation */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Visit Timeline</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Visit tracking coming soon</p>
          </div>
        </div>

        {/* Documents Section - Placeholder for future implementation */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Documents</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Document management coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}