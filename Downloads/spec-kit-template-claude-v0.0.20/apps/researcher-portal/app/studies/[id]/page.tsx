'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Study } from '@/lib/api';
import {
  ArrowLeft, Save, Edit2, X, Users, FileText,
  Calendar, DollarSign, Activity, Clock, CheckCircle,
  AlertCircle, BarChart, UserPlus, Download, Upload
} from 'lucide-react';

export default function StudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id as string;

  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [formData, setFormData] = useState({
    protocolNumber: '',
    title: '',
    description: '',
    type: '',
    phase: '',
    status: '',
    targetEnrollment: 0,
    currentEnrollment: 0,
    startDate: '',
    endDate: '',
    sponsorName: '',
    fundingAmount: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStudy();
  }, [studyId]);

  const loadStudy = async () => {
    try {
      const data = await api.getStudy(studyId);
      setStudy(data);
      setFormData({
        protocolNumber: data.protocolNumber,
        title: data.title,
        description: data.description,
        type: data.type,
        phase: data.phase || '',
        status: data.status,
        targetEnrollment: 100, // Would come from extended data
        currentEnrollment: 42, // Would come from participants count
        startDate: data.startDate.split('T')[0],
        endDate: '', // Would come from extended data
        sponsorName: 'Mount Sinai Health System',
        fundingAmount: 500000,
      });
    } catch (error) {
      console.error('Failed to load study:', error);
      if (error instanceof Error && error.message === 'Authentication required') {
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedStudy = await api.updateStudy(studyId, {
        protocolNumber: formData.protocolNumber,
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        phase: formData.phase as any,
        status: formData.status as any,
      });
      setStudy(updatedStudy);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update study:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update study' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (study) {
      setFormData({
        protocolNumber: study.protocolNumber,
        title: study.title,
        description: study.description,
        type: study.type,
        phase: study.phase || '',
        status: study.status,
        targetEnrollment: 100,
        currentEnrollment: 42,
        startDate: study.startDate.split('T')[0],
        endDate: '',
        sponsorName: 'Mount Sinai Health System',
        fundingAmount: 500000,
      });
    }
    setIsEditing(false);
    setErrors({});
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      ENROLLING: 'bg-purple-100 text-purple-800',
      ACTIVE: 'bg-indigo-100 text-indigo-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      TERMINATED: 'bg-red-200 text-red-900',
      COMPLETED: 'bg-gray-200 text-gray-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading study details...</p>
        </div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Study not found</p>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Study' : formData.protocolNumber}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">{formData.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(formData.status)}`}>
                  {formData.status.replace('_', ' ')}
                </span>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Study
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'participants', 'documents', 'team', 'budget', 'tasks'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Enrollment Progress</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formData.currentEnrollment}/{formData.targetEnrollment}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(formData.currentEnrollment / formData.targetEnrollment) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((formData.currentEnrollment / formData.targetEnrollment) * 100)}% complete
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Study Duration</p>
                    <p className="text-2xl font-bold text-gray-900">18 months</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Started {new Date(formData.startDate).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${formData.fundingAmount.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">65% utilized</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Team Members</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">4 investigators, 8 coordinators</p>
              </div>
            </div>

            {/* Study Details Form */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-6">Study Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocol Number
                  </label>
                  <input
                    type="text"
                    name="protocolNumber"
                    value={formData.protocolNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Study Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  >
                    <option value="INTERVENTIONAL">Interventional</option>
                    <option value="OBSERVATIONAL">Observational</option>
                    <option value="REGISTRY">Registry</option>
                    <option value="EXPANDED_ACCESS">Expanded Access</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Study Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phase
                  </label>
                  <select
                    name="phase"
                    value={formData.phase}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  >
                    <option value="PHASE_1">Phase 1</option>
                    <option value="PHASE_2">Phase 2</option>
                    <option value="PHASE_3">Phase 3</option>
                    <option value="PHASE_4">Phase 4</option>
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="ENROLLING">Enrolling</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="TERMINATED">Terminated</option>
                    <option value="COMPLETED">Completed</option>
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
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Enrollment
                  </label>
                  <input
                    type="number"
                    name="currentEnrollment"
                    value={formData.currentEnrollment}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Name
                  </label>
                  <input
                    type="text"
                    name="sponsorName"
                    value={formData.sponsorName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Funding Amount ($)
                  </label>
                  <input
                    type="number"
                    name="fundingAmount"
                    value={formData.fundingAmount}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center gap-2">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                  <span className="text-sm">Add Participant</span>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-green-600" />
                  <span className="text-sm">Upload Document</span>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center gap-2">
                  <BarChart className="h-6 w-6 text-purple-600" />
                  <span className="text-sm">View Reports</span>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center gap-2">
                  <Download className="h-6 w-6 text-indigo-600" />
                  <span className="text-sm">Export Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Study Participants</h2>
              <Link
                href={`/studies/${studyId}/participants`}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Manage Participants
              </Link>
            </div>
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>View participant details in the full management interface</p>
              <Link
                href={`/studies/${studyId}/participants`}
                className="text-sm mt-2 text-blue-600 hover:underline inline-block"
              >
                Go to Participants →
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Study Documents</h2>
              <button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-2">Upload protocols, consent forms, and other study documents</p>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Study Team</h2>
              <button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Team Member
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">SC</span>
                  </div>
                  <div>
                    <p className="font-medium">Dr. Sarah Chen</p>
                    <p className="text-sm text-gray-600">Principal Investigator</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">100% effort</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-6">Budget Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold">${formData.fundingAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Spent to Date</p>
                <p className="text-2xl font-bold">$325,000</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold">$175,000</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm">Personnel</span>
                <span className="text-sm font-medium">$200,000</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm">Equipment</span>
                <span className="text-sm font-medium">$75,000</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm">Supplies</span>
                <span className="text-sm font-medium">$50,000</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Study Tasks</h2>
              <button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Create Task
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Submit IRB application</p>
                    <p className="text-sm text-gray-600">Completed on Jan 15, 2025</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Complete enrollment target</p>
                    <p className="text-sm text-gray-600">Due by Jun 30, 2025</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
}