import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  TagIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  SwatchIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { tagsAPI } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = [
  { value: '#3B82F6', name: 'Blue' },
  { value: '#22C55E', name: 'Green' },
  { value: '#F97316', name: 'Orange' },
  { value: '#EF4444', name: 'Red' },
  { value: '#8B5CF6', name: 'Purple' },
  { value: '#EC4899', name: 'Pink' },
  { value: '#14B8A6', name: 'Teal' },
  { value: '#F59E0B', name: 'Amber' },
  { value: '#6366F1', name: 'Indigo' },
  { value: '#6B7280', name: 'Gray' },
  { value: '#0EA5E9', name: 'Sky' },
  { value: '#84CC16', name: 'Lime' },
];

export default function Tags() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setTags(response.data);
    } catch (error) {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tag name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingTag) {
        await tagsAPI.update(editingTag.id, formData);
        toast.success('Tag updated successfully');
      } else {
        await tagsAPI.create(formData);
        toast.success('Tag created successfully');
      }
      setShowModal(false);
      setEditingTag(null);
      setFormData({ name: '', color: '#3B82F6' });
      fetchTags();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${name}"?`)) return;
    try {
      await tagsAPI.delete(id);
      toast.success('Tag deleted successfully');
      fetchTags();
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const openEditModal = (tag: any) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6' });
    setShowModal(true);
  };

  const totalContacts = tags.reduce((sum, tag) => sum + (tag._count?.contacts || 0), 0);

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
            <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize and categorize your contacts with tags
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Tag
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50">
              <TagIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tags</p>
              <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50">
              <UsersIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tagged Contacts</p>
              <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50">
              <SwatchIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Colors Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(tags.map((t) => t.color)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Grid */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">All Tags</h2>
        </div>
        {tags.length === 0 ? (
          <div className="text-center py-16">
            <TagIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tags yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Tags help you organize contacts into groups. Create your first tag to get started.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Your First Tag
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group relative border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: tag.color + '20' }}
                    >
                      <TagIcon className="h-5 w-5" style={{ color: tag.color }} />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-base font-semibold text-gray-900">{tag.name}</h3>
                      <p className="text-sm text-gray-500">
                        {tag._count?.contacts || 0} contact{tag._count?.contacts !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(tag)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit tag"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete tag"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <div
                    className="h-2 rounded-full flex-1"
                    style={{ backgroundColor: tag.color + '30' }}
                  >
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: tag.color,
                        width: `${Math.min((tag._count?.contacts || 0) * 5, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: formData.color + '20' }}
                  >
                    <TagIcon className="h-5 w-5" style={{ color: formData.color }} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingTag ? 'Edit Tag' : 'Create New Tag'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {editingTag ? 'Update tag details' : 'Add a new tag to organize contacts'}
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
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Tag Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., VIP Customer, Newsletter"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tag Color
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`relative w-10 h-10 rounded-lg transition-all duration-200 ${
                        formData.color === color.value
                          ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {formData.color === color.value && (
                        <CheckIcon className="h-5 w-5 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="flex items-center space-x-3">
                  <span
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    <TagIcon className="h-4 w-4 mr-2" />
                    {formData.name || 'Tag Name'}
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: formData.color + '20', color: formData.color }}
                  >
                    {formData.name || 'Tag Name'}
                  </span>
                </div>
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
                      {editingTag ? 'Update Tag' : 'Create Tag'}
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
