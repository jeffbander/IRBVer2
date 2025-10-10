'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

export default function NewStudyPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    protocolNumber: '',
    type: 'OBSERVATIONAL',
    description: '',
    riskLevel: 'MINIMAL',
    targetEnrollment: '',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/studies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          targetEnrollment: formData.targetEnrollment ? parseInt(formData.targetEnrollment) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        // Handle validation errors with field-specific messages
        if (data.code === 'VALIDATION_ERROR' && data.details) {
          setFieldErrors(data.details);
          setError('Please fix the validation errors below');
        } else {
          setError(data.error || 'Failed to create study');
        }
        return;
      }

      const study = await response.json();
      router.push(`/studies/${study.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Study</h1>
          <p className="text-gray-600 mt-2">Submit a new research protocol for IRB review</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 space-y-6">
          {/* Basic Information */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  placeholder="Enter the full title of your study"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Protocol Number *
                </label>
                <input
                  type="text"
                  name="protocolNumber"
                  value={formData.protocolNumber}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent ${
                    fieldErrors.protocolNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="e.g., IRB-2024-001"
                />
                <p className="text-xs text-gray-500 mt-1">Format: ABC-1234 or TEST-ABC123</p>
                {fieldErrors.protocolNumber && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.protocolNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="INTERVENTIONAL">Interventional</option>
                  <option value="OBSERVATIONAL">Observational</option>
                  <option value="REGISTRY">Registry</option>
                  <option value="SURVEY">Survey</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Level *
                </label>
                <select
                  name="riskLevel"
                  value={formData.riskLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="MINIMAL">Minimal Risk</option>
                  <option value="MODERATE">Moderate Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Enrollment
                </label>
                <input
                  type="number"
                  name="targetEnrollment"
                  value={formData.targetEnrollment}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                  placeholder="Number of participants"
                />
              </div>
            </div>
          </div>

          {/* Study Description */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Study Description</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent ${
                  fieldErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Provide a detailed description of your study, including objectives, methodology, and expected outcomes"
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
          </div>

          {/* Timeline */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anticipated Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anticipated End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <div className="space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 text-sm mb-3">
            Your study will be saved as a draft. You can submit it for review after adding all required documents.
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Protocol document</li>
            <li>• Informed consent form</li>
            <li>• Investigator qualifications</li>
            <li>• Budget justification (if applicable)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}