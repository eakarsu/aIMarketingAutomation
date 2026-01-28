import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  HashtagIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  LinkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { customFieldsAPI } from '../services/api';
import toast from 'react-hot-toast';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text', icon: DocumentTextIcon, color: 'bg-blue-500', description: 'Single line text input' },
  { value: 'NUMBER', label: 'Number', icon: HashtagIcon, color: 'bg-green-500', description: 'Numeric values' },
  { value: 'DATE', label: 'Date', icon: CalendarDaysIcon, color: 'bg-purple-500', description: 'Date picker' },
  { value: 'DROPDOWN', label: 'Dropdown', icon: ListBulletIcon, color: 'bg-orange-500', description: 'Select from options' },
  { value: 'CHECKBOX', label: 'Checkbox', icon: CheckCircleIcon, color: 'bg-pink-500', description: 'Yes/No toggle' },
  { value: 'URL', label: 'URL', icon: LinkIcon, color: 'bg-teal-500', description: 'Website links' },
];

export default function CustomFields() {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    fieldType: 'TEXT',
    options: '',
    required: false,
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await customFieldsAPI.getAll();
      setFields(response.data);
    } catch (error) {
      toast.error('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Field name is required');
      return;
    }
    setSaving(true);
    const data = {
      ...formData,
      options:
        formData.fieldType === 'DROPDOWN'
          ? formData.options
              .split(',')
              .map((o) => o.trim())
              .filter((o) => o)
          : undefined,
    };
    try {
      if (editingField) {
        await customFieldsAPI.update(editingField.id, data);
        toast.success('Field updated successfully');
      } else {
        await customFieldsAPI.create(data);
        toast.success('Field created successfully');
      }
      setShowModal(false);
      setEditingField(null);
      setFormData({ name: '', fieldType: 'TEXT', options: '', required: false });
      fetchFields();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove the field from all contacts.`)) return;
    try {
      await customFieldsAPI.delete(id);
      toast.success('Field deleted successfully');
      fetchFields();
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const openEditModal = (field: any) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      fieldType: field.fieldType,
      options: field.options ? JSON.parse(field.options).join(', ') : '',
      required: field.required,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingField(null);
    setFormData({ name: '', fieldType: 'TEXT', options: '', required: false });
    setShowModal(true);
  };

  const getFieldTypeInfo = (type: string) => {
    return FIELD_TYPES.find((t) => t.value === type) || FIELD_TYPES[0];
  };

  const requiredCount = fields.filter((f) => f.required).length;
  const typeCount = new Set(fields.map((f) => f.fieldType)).size;

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
            <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add custom data fields to collect additional contact information
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Field
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Fields</p>
              <p className="text-2xl font-bold text-gray-900">{fields.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-50">
              <CheckCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Required Fields</p>
              <p className="text-2xl font-bold text-gray-900">{requiredCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50">
              <ListBulletIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Field Types Used</p>
              <p className="text-2xl font-bold text-gray-900">{typeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">All Custom Fields</h2>
        </div>
        {fields.length === 0 ? (
          <div className="text-center py-16">
            <AdjustmentsHorizontalIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No custom fields yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Custom fields let you collect additional data about your contacts. Create your first field to get started.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Your First Field
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {fields.map((field) => {
              const typeInfo = getFieldTypeInfo(field.fieldType);
              const IconComponent = typeInfo.icon;
              return (
                <div
                  key={field.id}
                  className="group relative border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-base font-semibold text-gray-900">{field.name}</h3>
                          {field.required && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{typeInfo.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(field)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit field"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(field.id, field.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete field"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {field.fieldType === 'DROPDOWN' && field.options && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Options:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {JSON.parse(field.options)
                          .slice(0, 4)
                          .map((opt: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md"
                            >
                              {opt}
                            </span>
                          ))}
                        {JSON.parse(field.options).length > 4 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                            +{JSON.parse(field.options).length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-lg ${
                      getFieldTypeInfo(formData.fieldType).color
                    } flex items-center justify-center`}
                  >
                    {React.createElement(getFieldTypeInfo(formData.fieldType).icon, {
                      className: 'h-5 w-5 text-white',
                    })}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingField ? 'Edit Field' : 'Create New Field'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {editingField ? 'Update field properties' : 'Add a new custom field for contacts'}
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
              {/* Field Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Company Size, Industry, Birthday"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Field Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {FIELD_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, fieldType: type.value })}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          formData.fieldType === type.value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${type.color} flex items-center justify-center mb-2`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-900">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dropdown Options */}
              {formData.fieldType === 'DROPDOWN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dropdown Options
                  </label>
                  <textarea
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder="Enter options separated by commas, e.g., Small, Medium, Large, Enterprise"
                    rows={3}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">Separate options with commas</p>
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Required Field</p>
                  <p className="text-xs text-gray-500">Make this field mandatory for all contacts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, required: !formData.required })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.required ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.required ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
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
                      {editingField ? 'Update Field' : 'Create Field'}
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
