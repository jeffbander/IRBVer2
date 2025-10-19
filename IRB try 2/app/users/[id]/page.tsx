'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    name: string;
    description: string;
  };
  active: boolean;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { token, user: currentUser } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    active: true,
    approved: false
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUser(token);
    fetchRoles(token);
  }, [params.id, router, token]);

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user || data; // Handle both response formats
        setUser(userData);
        setFormData({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleId: userData.role.id,
          active: userData.active,
          approved: userData.approved
        });
      } else {
        console.error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (token: string) => {
    try {
      const response = await fetch('/api/auth/seed', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // If seed endpoint doesn't support GET, we'll use hardcoded roles
        setRoles([
          { id: 'admin', name: 'admin', description: 'Administrator' },
          { id: 'reviewer', name: 'reviewer', description: 'Reviewer' },
          { id: 'researcher', name: 'researcher', description: 'Researcher' }
        ]);
      }
    } catch (error) {
      // Fallback to hardcoded roles
      setRoles([
        { id: 'admin', name: 'admin', description: 'Administrator' },
        { id: 'reviewer', name: 'reviewer', description: 'Reviewer' },
        { id: 'researcher', name: 'researcher', description: 'Researcher' }
      ]);
    }
  };

  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUser(token);
        setEditing(false);
        alert('User updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user failed:', error);
      alert('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });

      if (response.ok) {
        await fetchUser(token);
        alert('User approved successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approve user failed:', error);
      alert('Failed to approve user');
    }
  };

  const handleDisapprove = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: false }),
      });

      if (response.ok) {
        await fetchUser(token);
        alert('User disapproved successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to disapprove user');
      }
    } catch (error) {
      console.error('Disapprove user failed:', error);
      alert('Failed to disapprove user');
    }
  };

  const canManageUsers = currentUser?.role?.permissions?.includes('manage_users');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003F6C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">User not found</p>
          <button
            onClick={() => router.push('/users')}
            className="mt-4 text-[#003F6C] hover:underline"
          >
            Back to Users
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
            onClick={() => router.push('/users')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-600 mt-2">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.active ? 'Active' : 'Inactive'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.approved
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.approved ? 'Approved' : 'Pending Approval'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canManageUsers && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-3">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F]"
                >
                  Edit User
                </button>
                {!user.approved && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve User
                  </button>
                )}
                {user.approved && (
                  <button
                    onClick={handleDisapprove}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Disapprove User
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#003F6C] text-white rounded-lg hover:bg-[#002D4F] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      email: user.email,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      roleId: user.role.id,
                      active: user.active,
                      approved: user.approved
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* User Details Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900">{user.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              ) : (
                <p className="text-lg font-medium text-gray-900">{user.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                />
              ) : (
                <p className="text-lg text-gray-900">{user.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
              {editing ? (
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="researcher">Researcher</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <p className="text-lg text-gray-900 capitalize">{user.role.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              {editing ? (
                <select
                  value={formData.active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              ) : (
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  user.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.active ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Approval Status</label>
              {editing ? (
                <select
                  value={formData.approved ? 'approved' : 'pending'}
                  onChange={(e) => setFormData({ ...formData, approved: e.target.value === 'approved' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003F6C] focus:border-transparent"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Approval</option>
                </select>
              ) : (
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  user.approved
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.approved ? 'Approved' : 'Pending Approval'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
              <p className="text-lg text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
              <p className="text-lg text-gray-900">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Role Details Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Role Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Role Name</label>
              <p className="text-lg text-gray-900 capitalize">{user.role.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
              <p className="text-lg text-gray-900">{user.role.description || 'No description'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
