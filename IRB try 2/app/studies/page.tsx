'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';
import { Button, StatusBadge } from '@/components/ui';

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
  const { token, user, _hasHydrated } = useAuthStore();
  const [studies, setStudies] = useState<Study[]>([]);
  const [filteredStudies, setFilteredStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({
    status: '',
    type: '',
  });
  const [activeTab, setActiveTab] = useState<'all' | 'review'>('all');

  useEffect(() => {
    // Wait for Zustand to rehydrate from localStorage before checking auth
    if (!_hasHydrated) {
      return;
    }

    // Check authentication after hydration
    if (!token || !user) {
      router.push('/login');
      return;
    }

    fetchStudies(token);
  }, [filter, router, token, user, _hasHydrated]);

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
    const statusMap: Record<string, 'draft' | 'pending' | 'approved' | 'active' | 'rejected'> = {
      DRAFT: 'draft',
      PENDING_REVIEW: 'pending',
      APPROVED: 'approved',
      ACTIVE: 'active',
      SUSPENDED: 'rejected',
      CLOSED: 'draft',
      COMPLETED: 'approved',
    };

    return <StatusBadge status={statusMap[status] || 'draft'} />;
  };

  const getRiskBadge = (risk: string) => {
    const riskConfig = {
      MINIMAL: 'bg-status-success/10 text-status-success border border-status-success/20',
      MODERATE: 'bg-status-warning/10 text-status-warning border border-status-warning/20',
      HIGH: 'bg-status-error/10 text-status-error border border-status-error/20',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskConfig[risk as keyof typeof riskConfig]}`}>
        {risk}
      </span>
    );
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.type) params.append('type', filter.type);

    const response = await fetch(`/api/studies/export?${params}`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studies-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const displayedStudies = activeTab === 'review'
    ? filteredStudies.filter(s => s.status === 'PENDING_REVIEW')
    : filteredStudies;

  const hasPermission = (permission: string) => {
    if (!user?.role?.permissions) return false;
    const permissions = user.role.permissions;

    // Handle permissions as object (e.g., {review_studies: true})
    if (typeof permissions === 'object' && !Array.isArray(permissions)) {
      return permissions[permission] === true;
    }

    // Handle permissions as array (legacy)
    if (Array.isArray(permissions)) {
      return permissions.includes(permission);
    }

    return false;
  };

  const isReviewer = hasPermission('review_studies');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
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
            <Button
              onClick={() => router.push('/dashboard')}
              variant="tertiary"
              className="mb-4 px-0 hover:bg-transparent"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Button>
            <h1 className="text-h1 text-brand-heading">Research Studies</h1>
            <p className="text-body-large text-gray-600 mt-2">Manage and review research protocols</p>
          </div>
          <Button
            onClick={() => router.push('/studies/new')}
            variant="primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Study
          </Button>
        </div>

        {/* Tabs */}
        {isReviewer && (
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white shadow-md text-brand-primary border-2 border-brand-primary'
                  : 'text-gray-600 hover:text-brand-heading bg-white border-2 border-transparent hover:border-gray-200'
              }`}
            >
              All Studies ({studies.length})
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center ${
                activeTab === 'review'
                  ? 'bg-white shadow-md text-brand-accent border-2 border-brand-accent'
                  : 'text-gray-600 hover:text-brand-heading bg-white border-2 border-transparent hover:border-gray-200'
              }`}
            >
              Review Queue
              {studies.filter(s => s.status === 'PENDING_REVIEW').length > 0 && (
                <span className="ml-2 bg-brand-accent text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {studies.filter(s => s.status === 'PENDING_REVIEW').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                />
              </div>
            </div>

            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
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
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
            >
              <option value="">All Types</option>
              <option value="INTERVENTIONAL">Interventional</option>
              <option value="OBSERVATIONAL">Observational</option>
              <option value="REGISTRY">Registry</option>
              <option value="SURVEY">Survey</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleExport}
              variant="secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to CSV
            </Button>
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
              {displayedStudies.map((study) => (
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
                      className="text-brand-primary hover:text-brand-primary-hover font-semibold text-sm transition-colors"
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {displayedStudies.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-600 text-lg">No studies found</p>
              <Button
                onClick={() => router.push('/studies/new')}
                variant="primary"
                className="mt-4"
              >
                Create your first study
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}