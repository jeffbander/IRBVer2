'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

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
        return 'bg-purple-100 text-purple-800';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800';
      case 'researcher':
        return 'bg-green-100 text-green-800';
      case 'coordinator':
        return 'bg-yellow-100 text-yellow-800';
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
    { name: 'Audit Log', href: '/audit', icon: '📊', permission: 'view_audit_logs' },
  ];

  const hasPermission = (permission: string) => {
    const permissions = user.role.permissions as string[];
    return permissions.includes(permission);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">IRB Management System</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role.name)}`}>
                {user.role.name.toUpperCase()}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to your IRB Management System</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                  <span className="text-3xl">📋</span>
                </div>
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-blue-100 font-medium mb-1">Total Studies</p>
              <p className="text-4xl font-bold text-white">{stats.totalStudies}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                  <span className="text-3xl">✅</span>
                </div>
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-green-100 font-medium mb-1">Active Studies</p>
              <p className="text-4xl font-bold text-white">{stats.activeStudies}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                  <span className="text-3xl">⏳</span>
                </div>
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-amber-100 font-medium mb-1">Pending Reviews</p>
              <p className="text-4xl font-bold text-white">{stats.pendingReviews}</p>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                  <span className="text-3xl">👥</span>
                </div>
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm text-purple-100 font-medium mb-1">Total Participants</p>
              <p className="text-4xl font-bold text-white">{stats.totalParticipants}</p>
            </div>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationItems.map((item) => {
            const hasAccess = hasPermission(item.permission);
            return (
              <button
                key={item.name}
                onClick={() => hasAccess && router.push(item.href)}
                disabled={!hasAccess}
                className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md p-6 border-2 text-left transition-all duration-300 overflow-hidden ${
                  hasAccess
                    ? 'border-gray-200 hover:border-blue-400 hover:shadow-xl hover:scale-105 cursor-pointer'
                    : 'border-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all duration-300 ${
                    hasAccess
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 group-hover:rotate-12 group-hover:scale-110'
                      : 'bg-gray-200'
                  }`}>
                    <span className={hasAccess ? 'filter drop-shadow-lg' : ''}>{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg mb-1 ${hasAccess ? 'text-gray-900 group-hover:text-blue-600' : 'text-gray-500'}`}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {hasAccess ? 'Click to manage' : 'No access'}
                    </p>
                  </div>
                  {hasAccess && (
                    <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        {user.role.name === 'researcher' && (
          <div className="mt-8 relative bg-gradient-to-r from-[#003F6C] via-[#004D7A] to-[#2E8B57] rounded-2xl p-8 text-white shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/studies/new')}
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-lg rounded-xl px-5 py-4 hover:bg-white/25 hover:scale-105 transition-all duration-300 border border-white/20"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-semibold">New Study Protocol</span>
                </button>
                <button
                  onClick={() => router.push('/participants/enroll')}
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-lg rounded-xl px-5 py-4 hover:bg-white/25 hover:scale-105 transition-all duration-300 border border-white/20"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <span className="font-semibold">Enroll Participant</span>
                </button>
                <button
                  onClick={() => router.push('/documents/upload')}
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-lg rounded-xl px-5 py-4 hover:bg-white/25 hover:scale-105 transition-all duration-300 border border-white/20"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="font-semibold">Upload Document</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}