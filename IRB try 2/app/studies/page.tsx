'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Study {
  id: string;
  title: string;
  protocolNumber: string;
  status: string;
  type: string;
  riskLevel: string;
  principalInvestigator: {
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewer?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  irbApprovalDate?: string;
  _count: {
    participants: number;
    documents: number;
  };
}

export default function StudiesPage() {
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [filteredStudies, setFilteredStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    status: '',
    type: '',
  });
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'review'>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchStudies(token);
  }, [filter, router]);

  const fetchStudies = async (token: string) => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);

      const response = await fetch(`/api/studies?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data);
        setFilteredStudies(data);
      }
    } catch (error) {
      console.error('Failed to fetch studies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter studies based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudies(studies);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = studies.filter(study =>
      study.title.toLowerCase().includes(term) ||
      study.protocolNumber.toLowerCase().includes(term) ||
      `${study.principalInvestigator.firstName} ${study.principalInvestigator.lastName}`.toLowerCase().includes(term)
    );
    setFilteredStudies(filtered);
  }, [searchTerm, studies]);

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
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getRiskBadge = (risk: string) => {
    const riskConfig = {
      MINIMAL: 'bg-green-50 text-green-700',
      MODERATE: 'bg-yellow-50 text-yellow-700',
      HIGH: 'bg-red-50 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${riskConfig[risk as keyof typeof riskConfig]}`}>
        {risk}
      </span>
    );
  };

  const filteredStudies = activeTab === 'review'
    ? studies.filter(s => s.status === 'PENDING_REVIEW')
    : studies;

  const isReviewer = user?.role?.permissions?.includes('review_studies');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003F6C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading studies...</p>
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
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Research Studies</h1>
            <p className="text-gray-600 mt-2">Manage and review research protocols</p>
          </div>
          <button
            onClick={() => router.push('/studies/new')}
            className="bg-[#003F6C] text-white px-6 py-3 rounded-lg hover:bg-[#002D4F] transition-all flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Study
          </button>
        </div>

        {/* Tabs */}
        {isReviewer && (
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-white shadow-md text-[#003F6C]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Studies ({studies.length})
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
                activeTab === 'review'
                  ? 'bg-white shadow-md text-[#003F6C]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Review Queue
              {studies.filter(s => s.status === 'PENDING_REVIEW').length > 0 && (
                <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  {studies.filter(s => s.status === 'PENDING_REVIEW').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  placeholder="Search by title, protocol number, or PI name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="INTERVENTIONAL">Interventional</option>
              <option value="OBSERVATIONAL">Observational</option>
              <option value="REGISTRY">Registry</option>
              <option value="SURVEY">Survey</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Studies Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Study
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudies.map((study) => (
                <tr key={study.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{study.title}</div>
                      <div className="text-sm text-gray-500">{study.protocolNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {study.principalInvestigator.firstName} {study.principalInvestigator.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{study.principalInvestigator.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {study.type}
                  </td>
                  <td className="px-6 py-4">
                    {getRiskBadge(study.riskLevel)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(study.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {study._count.participants} participants
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/studies/${study.id}`)}
                      className="text-[#003F6C] hover:text-[#002D4F] font-medium text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudies.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-600">No studies found</p>
              <button
                onClick={() => router.push('/studies/new')}
                className="mt-4 text-[#003F6C] font-medium hover:underline"
              >
                Create your first study
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}