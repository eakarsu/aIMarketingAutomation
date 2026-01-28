import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  UserGroupIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  FunnelIcon,
  ChartBarIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import { segmentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const RULE_FIELDS = [
  { value: 'status', label: 'Status', icon: '📊' },
  { value: 'source', label: 'Source', icon: '🔗' },
  { value: 'email', label: 'Email contains', icon: '📧' },
  { value: 'company', label: 'Company contains', icon: '🏢' },
  { value: 'createdAfter', label: 'Created After', icon: '📅' },
  { value: 'tag', label: 'Has Tag', icon: '🏷️' },
];

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
];

export default function Segments() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: [] as any[],
  });

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const response = await segmentsAPI.getAll();
      setSegments(response.data);
    } catch (error) {
      toast.error('Failed to load segments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Segment name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingSegment) {
        await segmentsAPI.update(editingSegment.id, formData);
        toast.success('Segment updated successfully');
      } else {
        await segmentsAPI.create(formData);
        toast.success('Segment created successfully');
      }
      setShowModal(false);
      setEditingSegment(null);
      setFormData({ name: '', description: '', rules: [] });
      fetchSegments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save segment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the segment "${name}"?`)) return;
    try {
      await segmentsAPI.delete(id);
      toast.success('Segment deleted successfully');
      fetchSegments();
    } catch (error) {
      toast.error('Failed to delete segment');
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      const response = await segmentsAPI.refresh(id);
      toast.success(`Segment refreshed: ${response.data.contactCount} contacts`);
      fetchSegments();
    } catch (error) {
      toast.error('Failed to refresh segment');
    } finally {
      setRefreshingId(null);
    }
  };

  const openEditModal = (segment: any) => {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description || '',
      rules: JSON.parse(segment.rules || '[]'),
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingSegment(null);
    setFormData({ name: '', description: '', rules: [] });
    setShowModal(true);
  };

  const addRule = () => {
    setFormData((prev) => ({
      ...prev,
      rules: [...prev.rules, { field: 'status', operator: 'eq', value: 'ACTIVE' }],
    }));
  };

  const updateRule = (index: number, key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    }));
  };

  const removeRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const totalContacts = segments.reduce((sum, seg) => sum + (seg._count?.contacts || 0), 0);
  const totalCampaigns = segments.reduce((sum, seg) => sum + (seg._count?.campaigns || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create dynamic contact segments with custom rules
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Segment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50">
              <FunnelIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Segments</p>
              <p className="text-2xl font-bold text-gray-900">{segments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Segmented Contacts</p>
              <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50">
              <MegaphoneIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Segments Grid */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">All Segments</h2>
        </div>
        {segments.length === 0 ? (
          <div className="text-center py-16">
            <FunnelIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No segments yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Segments help you target specific groups of contacts. Create your first segment to get started.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Your First Segment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="group relative border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <FunnelIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-base font-semibold text-gray-900">{segment.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {segment.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRefresh(segment.id)}
                      disabled={refreshingId === segment.id}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh segment"
                    >
                      <ArrowPathIcon
                        className={`h-4 w-4 ${refreshingId === segment.id ? 'animate-spin' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => openEditModal(segment)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit segment"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(segment.id, segment.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete segment"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <UserGroupIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                      <span className="font-medium text-gray-900">{segment._count?.contacts || 0}</span>
                      <span className="ml-1">contacts</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MegaphoneIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                      <span className="font-medium text-gray-900">{segment._count?.campaigns || 0}</span>
                      <span className="ml-1">campaigns</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(segment.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {/* Rules indicator */}
                {segment.rules && JSON.parse(segment.rules).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <ChartBarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {JSON.parse(segment.rules).length} rule(s) applied
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <FunnelIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingSegment ? 'Edit Segment' : 'Create New Segment'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {editingSegment ? 'Update segment details and rules' : 'Define a new segment with custom rules'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Segment Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Segment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., VIP Customers, Newsletter Subscribers"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this segment is for..."
                  rows={2}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Rules Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Segment Rules
                  </label>
                  <button
                    type="button"
                    onClick={addRule}
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Rule
                  </button>
                </div>

                {formData.rules.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <ChartBarIcon className="h-8 w-8 mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No rules defined</p>
                    <p className="text-xs text-gray-400">Add rules to filter contacts in this segment</p>
                    <button
                      type="button"
                      onClick={addRule}
                      className="mt-3 inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Your First Rule
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.rules.map((rule, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <select
                            value={rule.field}
                            onChange={(e) => updateRule(index, 'field', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            {RULE_FIELDS.map((field) => (
                              <option key={field.value} value={field.value}>
                                {field.icon} {field.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={rule.operator}
                            onChange={(e) => updateRule(index, 'operator', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            {OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => updateRule(index, 'value', e.target.value)}
                            placeholder="Value"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {formData.rules.length > 1 && (
                      <p className="text-xs text-gray-500 pl-2">
                        Contacts must match ALL rules to be included in this segment
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="-ml-1 mr-2 h-4 w-4" />
                      {editingSegment ? 'Update Segment' : 'Create Segment'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
