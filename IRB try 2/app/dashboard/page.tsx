'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';
import { StatCard, Button, StatusBadge } from '@/components/ui';

export default function Dashboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState({
    totalStudies: 0,
    activeStudies: 0,
    pendingReviews: 0,
    totalParticipants: 0,
  });

  useEffect(() => {
    // Check authentication
    if (!token || !user) {
      router.push('/login');
      return;
    }

    // Redirect coordinators to their specialized dashboard
    if (user.role?.name === 'coordinator') {
      router.push('/dashboard/coordinator');
      return;
    }

    // Fetch dashboard stats
    fetchStats(token);
  }, [router, token, user]);

  const fetchStats = async (token: string) => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-semantic-active-bg text-semantic-active-text';
      case 'reviewer':
        return 'bg-semantic-approved-bg text-semantic-approved-text';
      case 'researcher':
        return 'bg-semantic-pending-bg text-semantic-pending-text';
      case 'coordinator':
        return 'bg-semantic-draft-bg text-semantic-draft-text';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const navigationItems = [
    { name: 'Studies', href: '/studies', icon: '📋', permission: 'view_studies' },
    { name: 'Participants', href: '/participants', icon: '👥', permission: 'manage_participants' },
    { name: 'Documents', href: '/documents', icon: '📄', permission: 'view_documents' },
    { name: 'Reviews', href: '/reviews', icon: '✓', permission: 'review_studies' },
    { name: 'Users', href: '/users', icon: '👤', permission: 'manage_users' },
    { name: 'Audit Log', href: '/audit-logs', icon: '📊', permission: 'view_audit_logs' },
  ];

  const hasPermission = (permission: string) => {
    const permissions = user.role.permissions;

    // Handle permissions as object (e.g., {canManageUsers: true})
    if (typeof permissions === 'object' && !Array.isArray(permissions)) {
      return permissions[permission] === true;
    }

    // Fallback for array format (legacy)
    if (Array.isArray(permissions)) {
      return permissions.includes(permission);
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mount Sinai Branding */}
      <header className="bg-gradient-to-r from-brand-heading via-brand-navy to-brand-heading shadow-lg border-b-4 border-brand-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-8 h-8 text-brand-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Mount Sinai</h1>
                <p className="text-brand-primary text-sm font-medium">IRB Management System</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-base font-semibold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-brand-primary">{user.email}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${getRoleBadgeColor(user.role.name)}`}>
                {user.role.name.toUpperCase()}
              </span>
              <Button
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="border-white text-white hover:bg-white/20"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-h1 text-brand-heading">Dashboard</h1>
          <p className="text-body-large text-gray-600 mt-2">Welcome back, {user.firstName}. Here&apos;s an overview of your IRB activities.</p>
        </div>

        {/* Stats - Mount Sinai Design System */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Studies"
            value={stats.totalStudies}
            gradient="blue"
            icon={
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            title="Active Studies"
            value={stats.activeStudies}
            gradient="green"
            subtitle="Currently enrolling"
            icon={
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Pending Reviews"
            value={stats.pendingReviews}
            gradient="pink"
            subtitle="Requires attention"
            icon={
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Total Participants"
            value={stats.totalParticipants}
            gradient="navy"
            icon={
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>

        {/* Navigation Grid - Mount Sinai Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationItems.map((item) => {
            const hasAccess = hasPermission(item.permission);
            return (
              <button
                key={item.name}
                onClick={() => hasAccess && router.push(item.href)}
                disabled={!hasAccess}
                className={`group relative bg-white rounded-xl shadow-md p-6 border-2 text-left transition-all duration-300 overflow-hidden ${
                  hasAccess
                    ? 'border-gray-200 hover:border-brand-primary hover:shadow-xl hover:scale-105 cursor-pointer'
                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all duration-300 ${
                    hasAccess
                      ? 'bg-gradient-to-br from-brand-primary to-brand-accent group-hover:rotate-12 group-hover:scale-110 shadow-md'
                      : 'bg-gray-200'
                  }`}>
                    <span className={hasAccess ? 'filter drop-shadow-lg' : ''}>{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg mb-1 ${hasAccess ? 'text-brand-heading group-hover:text-brand-primary' : 'text-gray-500'}`}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {hasAccess ? 'Click to manage' : 'No access'}
                    </p>
                  </div>
                  {hasAccess && (
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-brand-primary group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Actions - Mount Sinai Design */}
        {user.role.name === 'researcher' && (
          <div className="mt-8 relative bg-gradient-to-r from-brand-heading via-brand-navy to-brand-primary rounded-2xl p-8 text-white shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-accent opacity-10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-h2 font-bold">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => router.push('/studies/new')}
                  variant="secondary"
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-lg border-white/30 text-white hover:bg-white/25 hover:scale-105 justify-start"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-semibold">New Study Protocol</span>
                </Button>
                <Button
                  onClick={() => router.push('/participants/enroll')}
                  variant="secondary"
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-lg border-white/30 text-white hover:bg-white/25 hover:scale-105 justify-start"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <span className="font-semibold">Enroll Participant</span>
                </Button>
                <Button
                  onClick={() => router.push('/documents/upload')}
                  variant="secondary"
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-lg border-white/30 text-white hover:bg-white/25 hover:scale-105 justify-start"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="font-semibold">Upload Document</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}