'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Study } from '@/lib/api';
import {
  Activity, Users, FileText, Calendar, ChevronRight,
  Plus, Search, Filter, LogOut
} from 'lucide-react';

export default function DashboardPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadStudies();
  }, []);

  const loadStudies = async () => {
    try {
      const response = await api.getStudies();
      setStudies(response.data);
    } catch (error) {
      console.error('Failed to load studies:', error);
      // If auth fails, redirect to login
      if (error instanceof Error && error.message === 'Authentication required') {
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push('/');
  };

  const filteredStudies = studies.filter(study =>
    study.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.protocolNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: studies.length,
    active: studies.filter(s => s.status === 'ENROLLING' || s.status === 'APPROVED').length,
    enrolling: studies.filter(s => s.status === 'ENROLLING').length,
    pending: studies.filter(s => s.status === 'PENDING').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-900 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mount Sinai Research Portal</h1>
                <p className="text-xs text-gray-600">Study Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/studies/new')}
                className="flex items-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>New Study</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Studies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-900 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Studies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enrolling</p>
                <p className="text-2xl font-bold text-gray-900">{stats.enrolling}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending IRB</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Studies List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Your Studies</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search studies..."
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
                <button className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              Loading studies...
            </div>
          ) : filteredStudies.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No studies found
            </div>
          ) : (
            <div className="divide-y">
              {filteredStudies.map((study) => (
                <div
                  key={study.id}
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/studies/${study.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{study.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          study.status === 'ENROLLING' ? 'bg-green-100 text-green-700' :
                          study.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                          study.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {study.status}
                        </span>
                        {study.phase && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                            {study.phase}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{study.description}</p>
                      <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                        <span>Protocol: {study.protocolNumber}</span>
                        <span>•</span>
                        <span>PI: {study.principalInvestigator.firstName} {study.principalInvestigator.lastName}</span>
                        <span>•</span>
                        <span>Type: {study.type}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}