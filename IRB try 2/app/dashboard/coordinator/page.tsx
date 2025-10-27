'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/state';

interface Study {
  id: string;
  title: string;
  protocolNumber: string;
  status: string;
  principalInvestigator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  currentEnrollment: number;
  targetEnrollment?: number;
}

interface EnrollmentStats {
  totalAssignedStudies: number;
  totalEnrolled: number;
  enrolledThisMonth: number;
  enrolledByCoordinator: number;
}

interface Visit {
  id: string;
  scheduledDate: string;
  status: string;
  participant: {
    participantId: string;
    firstName: string;
    lastName: string;
    study: {
      title: string;
      protocolNumber: string;
    };
  };
  studyVisit: {
    visitName: string;
    visitNumber: number;
    visitType: string;
  };
}

export default function CoordinatorDashboard() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [studies, setStudies] = useState<Study[]>([]);
  const [stats, setStats] = useState<EnrollmentStats>({
    totalAssignedStudies: 0,
    totalEnrolled: 0,
    enrolledThisMonth: 0,
    enrolledByCoordinator: 0,
  });
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      router.push('/login');
      return;
    }

    // Verify user is a coordinator
    if (user.role?.name !== 'coordinator') {
      router.push('/dashboard');
      return;
    }

    fetchAssignedStudies();
    fetchSchedule();
  }, [token, user, router]);

  const fetchAssignedStudies = async () => {
    try {
      setLoading(true);

      // Fetch studies - the API will automatically filter to only assigned studies
      const studiesResponse = await fetch('/api/studies', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (studiesResponse.ok) {
        const studiesData = await studiesResponse.json();
        setStudies(studiesData);

        // Calculate stats from the studies data
        const totalEnrolled = studiesData.reduce(
          (sum: number, study: Study) => sum + study.currentEnrollment,
          0
        );

        setStats({
          totalAssignedStudies: studiesData.length,
          totalEnrolled: totalEnrolled,
          enrolledThisMonth: 0, // This would need a separate API endpoint
          enrolledByCoordinator: 0, // This would need a separate API endpoint
        });
      } else {
        console.error('Failed to fetch studies');
      }
    } catch (error) {
      console.error('Error fetching assigned studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    if (!token || !user) return;

    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get next 7 days range
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Fetch today's visits
      const todayResponse = await fetch(
        `/api/scheduling/visits?coordinatorId=${user.id}&startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (todayResponse.ok) {
        const data = await todayResponse.json();
        setTodayVisits(data);
      }

      // Fetch upcoming visits (next 7 days)
      const upcomingResponse = await fetch(
        `/api/scheduling/visits?coordinatorId=${user.id}&startDate=${tomorrow.toISOString()}&endDate=${nextWeek.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (upcomingResponse.ok) {
        const data = await upcomingResponse.json();
        setUpcomingVisits(data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const handleCheckIn = async (visitId: string) => {
    try {
      const response = await fetch('/api/scheduling/visits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: visitId,
          checkInTime: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchSchedule();
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    try {
      const response = await fetch('/api/scheduling/visits', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: visitId,
          checkOutTime: new Date().toISOString(),
          status: 'completed',
        }),
      });

      if (response.ok) {
        fetchSchedule();
      }
    } catch (error) {
      console.error('Error checking out:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; label: string }
    > = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      PENDING_REVIEW: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Pending Review',
      },
      APPROVED: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      ACTIVE: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
      CLOSED: { color: 'bg-gray-100 text-gray-600', label: 'Closed' },
      COMPLETED: {
        color: 'bg-purple-100 text-purple-800',
        label: 'Completed',
      },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-heading-900">
            Coordinator Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Today's Visits
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {todayVisits.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Assigned Studies
                </p>
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {stats.totalAssignedStudies}
                </p>
              </div>
              <div className="p-3 bg-primary-100 rounded-full">
                <svg
                  className="w-8 h-8 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Enrollments
                </p>
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {stats.totalEnrolled}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Studies
                </p>
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  {studies.filter((s) => s.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        {todayVisits.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Today's Schedule</h2>
            <div className="space-y-4">
              {todayVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                          {new Date(visit.scheduledDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {visit.participant.firstName} {visit.participant.lastName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Study:</span>{' '}
                        {visit.participant.study.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Visit:</span>{' '}
                        {visit.studyVisit.visitName} (Visit #{visit.studyVisit.visitNumber})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCheckIn(visit.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Check In
                      </button>
                      <button
                        onClick={() => handleCheckOut(visit.id)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Studies Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              My Assigned Studies
            </h2>
          </div>

          {studies.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No studies assigned
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                You have not been assigned to any studies yet. Contact your
                Principal Investigator to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Study Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Protocol Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal Investigator
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
                  {studies.map((study) => (
                    <tr key={study.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {study.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {study.protocolNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {study.principalInvestigator.firstName}{' '}
                        {study.principalInvestigator.lastName}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(study.status)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {study.currentEnrollment}
                        {study.targetEnrollment
                          ? ` / ${study.targetEnrollment}`
                          : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <Link
                            href={`/studies/${study.id}`}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            View
                          </Link>
                          {study.status === 'ACTIVE' && (
                            <Link
                              href={`/studies/${study.id}/participants`}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Enroll
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {studies.filter((s) => s.status === 'ACTIVE').length > 0 && (
          <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studies
                .filter((s) => s.status === 'ACTIVE')
                .slice(0, 4)
                .map((study) => (
                  <Link
                    key={study.id}
                    href={`/studies/${study.id}/participants`}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {study.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        Enroll participant
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
