'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/state';
import { Button } from '@/components/ui/Button';

interface Coordinator {
  id: string;
  assignedAt: string;
  assignedBy: string;
  coordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    active: boolean;
    approved: boolean;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  approved: boolean;
}

export default function StudyCoordinatorsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCoordinators();
    fetchAvailableCoordinators();
  }, [params.id]);

  const fetchCoordinators = async () => {
    try {
      const response = await fetch(`/api/studies/${params.id}/coordinators`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCoordinators(data);
      } else if (response.status === 403) {
        setError('You do not have permission to view coordinators for this study');
      } else {
        setError('Failed to load coordinators');
      }
    } catch (err) {
      console.error('Error fetching coordinators:', err);
      setError('Failed to load coordinators');
    }
  };

  const fetchAvailableCoordinators = async () => {
    try {
      const response = await fetch('/api/users?role=coordinator', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to only show active, approved coordinators
        const activeCoordinators = data.filter(
          (user: User) => user.active && user.approved
        );
        setAvailableUsers(activeCoordinators);
      }
    } catch (err) {
      console.error('Error fetching available coordinators:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedCoordinator) {
      setError('Please select a coordinator');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/studies/${params.id}/coordinators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coordinatorId: selectedCoordinator }),
      });

      if (response.ok) {
        setSuccessMessage('Coordinator assigned successfully');
        await fetchCoordinators();
        setSelectedCoordinator('');
        setShowAddForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to assign coordinator');
      }
    } catch (err) {
      console.error('Error assigning coordinator:', err);
      setError('Failed to assign coordinator');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (coordinatorId: string) => {
    if (!confirm('Are you sure you want to remove this coordinator from the study?')) {
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(
        `/api/studies/${params.id}/coordinators/${coordinatorId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setSuccessMessage('Coordinator removed successfully');
        await fetchCoordinators();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove coordinator');
      }
    } catch (err) {
      console.error('Error removing coordinator:', err);
      setError('Failed to remove coordinator');
    }
  };

  // Filter available users to exclude already assigned coordinators
  const unassignedCoordinators = availableUsers.filter(
    (user) => !coordinators.some((c) => c.coordinator.id === user.id)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/studies/${params.id}`}
          className="text-primary-600 hover:text-primary-800 mb-2 inline-block"
        >
          ← Back to Study
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-heading-900">
            Manage Study Coordinators
          </h1>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Assign Coordinator'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {showAddForm && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Assign New Coordinator</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label
                htmlFor="coordinator-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Coordinator
              </label>
              <select
                id="coordinator-select"
                value={selectedCoordinator}
                onChange={(e) => setSelectedCoordinator(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a coordinator</option>
                {unassignedCoordinators.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
              {unassignedCoordinators.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  All available coordinators are already assigned to this study
                </p>
              )}
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedCoordinator || loading}
            >
              {loading ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordinator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {coordinators.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  <p className="text-lg">No coordinators assigned yet</p>
                  <p className="text-sm mt-1">
                    Click &quot;Assign Coordinator&quot; to add coordinators to this study
                  </p>
                </td>
              </tr>
            ) : (
              coordinators.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {assignment.coordinator.firstName}{' '}
                      {assignment.coordinator.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {assignment.coordinator.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assignment.coordinator.active &&
                        assignment.coordinator.approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {assignment.coordinator.active &&
                      assignment.coordinator.approved
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(assignment.assignedAt).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemove(assignment.coordinator.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
