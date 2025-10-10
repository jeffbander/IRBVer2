'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

interface Study {
  id: string;
  title: string;
  protocolNumber: string;
  description: string;
  type: string;
  riskLevel: string;
  status: string;
  targetEnrollment?: number;
  startDate?: string;
  endDate?: string;
}

export default function EditStudyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    protocolNumber: '',
    description: '',
    type: 'OBSERVATIONAL',
    riskLevel: 'MINIMAL',
    targetEnrollment: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchStudy(token);
  }, [params.id, router, token]);

  const fetchStudy = async (token: string) => {
    try {
      const response = await fetch(`/api/studies/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudy(data);
        setFormData({
          title: data.title,
          protocolNumber: data.protocolNumber,
          description: data.description,
          type: data.type,
          riskLevel: data.riskLevel,
          targetEnrollment: data.targetEnrollment?.toString() || '',
          startDate: data.startDate ? data.startDate.split('T')[0] : '',
          endDate: data.endDate ? data.endDate.split('T')[0] : ''
        });
      } else {
        router.push('/studies');
      }
    } catch (error) {
      console.error('Failed to fetch study:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await fetch(`/api/studies/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          targetEnrollment: formData.targetEnrollment ? parseInt(formData.targetEnrollment) : null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null
        }),
      });

      if (response.ok) {
        router.push(`/studies/${params.id}`);
      } else {
        const data = await response.json();

        // Handle validation errors with field-specific messages
        if (data.code === 'VALIDATION_ERROR' && data.details) {
          setFieldErrors(data.details);
          setError('Please fix the validation errors below');
        } else {
          setError(data.error || 'Failed to update study');
        }
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update study');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003F6C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading study...</p>
        </div>
      </div>
    );
  }

  if (!study) {
    return null;
  }

  // Only allow editing in DRAFT status
  if (study.status !== 'DRAFT') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cannot Edit Study</h2>
          <p className="text-gray-600 mb-6">
            Studies can only be edited in DRAFT status. This study is currently: {study.status}
          </p>
          <button
            onClick={() => router.push(`/studies/${params.id}`)}
            className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F]"
          >
            Back to Study
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push(`/studies/${params.id}`)}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cancel
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Study</h1>
          <p className="text-gray-600 mb-8">Update study information (Draft status only)</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Study Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protocol Number *
              </label>
              <input
                type="text"
                name="protocolNumber"
                value={formData.protocolNumber}
                onChange={(e) => setFormData({ ...formData, protocolNumber: e.target.value })}
                required
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                title="Protocol number cannot be changed after creation"
              />
              <p className="mt-1 text-sm text-gray-500">Protocol number cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={6}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent ${
                  fieldErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">Minimum 20 characters</p>
                <p className={`text-xs ${formData.description.length >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formData.description.length}/20
                </p>
              </div>
              {fieldErrors.description && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Study Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="OBSERVATIONAL">Observational</option>
                  <option value="INTERVENTIONAL">Interventional</option>
                  <option value="EXPANDED_ACCESS">Expanded Access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Level *
                </label>
                <select
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="MINIMAL">Minimal</option>
                  <option value="LOW">Low</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Enrollment
              </label>
              <input
                type="number"
                name="targetEnrollment"
                value={formData.targetEnrollment}
                onChange={(e) => setFormData({ ...formData, targetEnrollment: e.target.value })}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => router.push(`/studies/${params.id}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
