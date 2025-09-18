'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  ArrowLeft, UserPlus, Search, Filter, Download,
  Calendar, Phone, Mail, MapPin, FileText,
  CheckCircle, Clock, XCircle, AlertCircle,
  Edit2, Trash2, Eye, UserCheck, MoreVertical
} from 'lucide-react';

interface Participant {
  id: string;
  studyId: string;
  participantId: string;
  status: 'SCREENING' | 'ELIGIBLE' | 'ENROLLED' | 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' | 'FAILED_SCREENING';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  enrollmentDate: string;
  screeningDate?: string;
  consentDate?: string;
  consentVersion: string;
  assignedGroup?: string;
  completionDate?: string;
  withdrawalDate?: string;
  withdrawalReason?: string;
  notes?: string;
}

export default function ParticipantsPage() {
  const params = useParams();
  const router = useRouter();
  const studyId = params.id as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    address: '',
    consentVersion: '1.0',
    assignedGroup: 'treatment',
    notes: '',
  });

  useEffect(() => {
    loadParticipants();
  }, [studyId]);

  const loadParticipants = async () => {
    try {
      // Mock data for demonstration
      const mockParticipants: Participant[] = [
        {
          id: 'p1',
          studyId,
          participantId: 'MSH-001-0001',
          status: 'ACTIVE',
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: '1975-03-15',
          email: 'john.smith@email.com',
          phone: '(212) 555-0101',
          address: '123 Main St, New York, NY 10001',
          enrollmentDate: '2024-03-01',
          screeningDate: '2024-02-25',
          consentDate: '2024-03-01',
          consentVersion: '1.0',
          assignedGroup: 'treatment',
        },
        {
          id: 'p2',
          studyId,
          participantId: 'MSH-001-0002',
          status: 'SCREENING',
          firstName: 'Emily',
          lastName: 'Johnson',
          dateOfBirth: '1982-07-22',
          email: 'emily.j@email.com',
          phone: '(212) 555-0102',
          address: '456 Park Ave, New York, NY 10002',
          screeningDate: '2024-03-10',
          enrollmentDate: '',
          consentDate: '',
          consentVersion: '',
        },
        {
          id: 'p3',
          studyId,
          participantId: 'MSH-001-0003',
          status: 'COMPLETED',
          firstName: 'Michael',
          lastName: 'Brown',
          dateOfBirth: '1968-11-30',
          email: 'm.brown@email.com',
          phone: '(212) 555-0103',
          address: '789 Broadway, New York, NY 10003',
          enrollmentDate: '2023-12-01',
          screeningDate: '2023-11-25',
          consentDate: '2023-12-01',
          consentVersion: '1.0',
          assignedGroup: 'control',
          completionDate: '2024-06-01',
        },
      ];
      setParticipants(mockParticipants);
    } catch (error) {
      console.error('Failed to load participants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    const newParticipant: Participant = {
      id: `p${Date.now()}`,
      studyId,
      participantId: `MSH-001-${String(participants.length + 1).padStart(4, '0')}`,
      status: 'SCREENING',
      ...formData,
      enrollmentDate: new Date().toISOString().split('T')[0],
      screeningDate: new Date().toISOString().split('T')[0],
    };

    setParticipants([...participants, newParticipant]);
    setShowEnrollForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      address: '',
      consentVersion: '1.0',
      assignedGroup: 'treatment',
      notes: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch =
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.participantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'ENROLLED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'SCREENING':
      case 'ELIGIBLE':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'COMPLETED':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'WITHDRAWN':
      case 'FAILED_SCREENING':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'ENROLLED':
        return 'bg-green-100 text-green-800';
      case 'SCREENING':
      case 'ELIGIBLE':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'WITHDRAWN':
      case 'FAILED_SCREENING':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: participants.length,
    screening: participants.filter(p => p.status === 'SCREENING').length,
    enrolled: participants.filter(p => ['ENROLLED', 'ACTIVE'].includes(p.status)).length,
    completed: participants.filter(p => p.status === 'COMPLETED').length,
    withdrawn: participants.filter(p => p.status === 'WITHDRAWN').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/studies/${studyId}`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Study Participants</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage enrollment and track participant progress</p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrollForm(true)}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Enroll Participant
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Participants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Screening</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.screening}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Enrolled/Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.enrolled}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Withdrawn</p>
            <p className="text-2xl font-bold text-red-600">{stats.withdrawn}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="SCREENING">Screening</option>
                <option value="ELIGIBLE">Eligible</option>
                <option value="ENROLLED">Enrolled</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="WITHDRAWN">Withdrawn</option>
                <option value="FAILED_SCREENING">Failed Screening</option>
              </select>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                More Filters
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {participant.firstName} {participant.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{participant.participantId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(participant.status)}
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(participant.status)}`}>
                          {participant.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-900">
                          <Mail className="h-3 w-3" />
                          {participant.email}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 mt-1">
                          <Phone className="h-3 w-3" />
                          {participant.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {participant.enrollmentDate ? new Date(participant.enrollmentDate).toLocaleDateString() : 'Not enrolled'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Screened: {participant.screeningDate ? new Date(participant.screeningDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {participant.assignedGroup || 'Not assigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedParticipant(participant)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enrollment Form Modal */}
      {showEnrollForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Enroll New Participant</h2>
                <button
                  onClick={() => setShowEnrollForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consent Version
                    </label>
                    <select
                      name="consentVersion"
                      value={formData.consentVersion}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1.0">Version 1.0</option>
                      <option value="1.1">Version 1.1</option>
                      <option value="2.0">Version 2.0</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Study Group
                    </label>
                    <select
                      name="assignedGroup"
                      value={formData.assignedGroup}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="treatment">Treatment</option>
                      <option value="control">Control</option>
                      <option value="placebo">Placebo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEnrollForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnroll}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
                >
                  Enroll Participant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participant Details Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Participant Details</h2>
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Personal Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600">Name</dt>
                      <dd className="text-sm font-medium">
                        {selectedParticipant.firstName} {selectedParticipant.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Participant ID</dt>
                      <dd className="text-sm font-medium">{selectedParticipant.participantId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Date of Birth</dt>
                      <dd className="text-sm font-medium">
                        {new Date(selectedParticipant.dateOfBirth).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Status</dt>
                      <dd>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(selectedParticipant.status)}`}>
                          {selectedParticipant.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600">Email</dt>
                      <dd className="text-sm font-medium">{selectedParticipant.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Phone</dt>
                      <dd className="text-sm font-medium">{selectedParticipant.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Address</dt>
                      <dd className="text-sm font-medium">{selectedParticipant.address}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Study Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600">Screening Date</dt>
                      <dd className="text-sm font-medium">
                        {selectedParticipant.screeningDate
                          ? new Date(selectedParticipant.screeningDate).toLocaleDateString()
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Enrollment Date</dt>
                      <dd className="text-sm font-medium">
                        {selectedParticipant.enrollmentDate
                          ? new Date(selectedParticipant.enrollmentDate).toLocaleDateString()
                          : 'Not enrolled'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Consent Date</dt>
                      <dd className="text-sm font-medium">
                        {selectedParticipant.consentDate
                          ? new Date(selectedParticipant.consentDate).toLocaleDateString()
                          : 'No consent'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Consent Version</dt>
                      <dd className="text-sm font-medium">
                        {selectedParticipant.consentVersion || 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Assignment</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600">Study Group</dt>
                      <dd className="text-sm font-medium capitalize">
                        {selectedParticipant.assignedGroup || 'Not assigned'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Completion Date</dt>
                      <dd className="text-sm font-medium">
                        {selectedParticipant.completionDate
                          ? new Date(selectedParticipant.completionDate).toLocaleDateString()
                          : 'In progress'}
                      </dd>
                    </div>
                    {selectedParticipant.withdrawalDate && (
                      <>
                        <div>
                          <dt className="text-sm text-gray-600">Withdrawal Date</dt>
                          <dd className="text-sm font-medium">
                            {new Date(selectedParticipant.withdrawalDate).toLocaleDateString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-600">Withdrawal Reason</dt>
                          <dd className="text-sm font-medium">
                            {selectedParticipant.withdrawalReason || 'Not specified'}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              </div>

              {selectedParticipant.notes && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{selectedParticipant.notes}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FileText className="h-4 w-4 inline mr-2" />
                  View Documents
                </button>
                <button className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
                  <Edit2 className="h-4 w-4 inline mr-2" />
                  Edit Participant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}