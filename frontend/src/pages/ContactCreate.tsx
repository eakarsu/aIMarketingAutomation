import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  TagIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { contactsAPI, tagsAPI, customFieldsAPI } from '../services/api';
import toast from 'react-hot-toast';

const sourceOptions = [
  { value: '', label: 'Select source...' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'import', label: 'Import' },
  { value: 'other', label: 'Other' },
];

export default function ContactCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    source: '',
    birthday: '',
    tagIds: [] as string[],
    customFields: [] as any[],
  });

  useEffect(() => {
    fetchOptions();
    if (isEdit) fetchContact();
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [tagsRes, fieldsRes] = await Promise.all([
        tagsAPI.getAll(),
        customFieldsAPI.getAll(),
      ]);
      setTags(tagsRes.data);
      setCustomFields(fieldsRes.data);
    } catch (error) {
      console.error('Failed to fetch options');
    }
  };

  const fetchContact = async () => {
    try {
      const response = await contactsAPI.getOne(id!);
      const c = response.data;
      setFormData({
        email: c.email,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        phone: c.phone || '',
        company: c.company || '',
        source: c.source || '',
        birthday: c.birthday ? c.birthday.split('T')[0] : '',
        tagIds: c.tags?.map((t: any) => t.tagId) || [],
        customFields:
          c.customFieldValues?.map((v: any) => ({
            fieldId: v.customFieldId,
            value: v.value,
          })) || [],
      });
    } catch (error) {
      toast.error('Failed to load contact');
      navigate('/contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await contactsAPI.update(id!, formData);
        toast.success('Contact updated successfully');
      } else {
        await contactsAPI.create(formData);
        toast.success('Contact created successfully');
      }
      navigate('/contacts');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setFormData((prev) => {
      const existing = prev.customFields.find((f) => f.fieldId === fieldId);
      if (existing) {
        return {
          ...prev,
          customFields: prev.customFields.map((f) =>
            f.fieldId === fieldId ? { ...f, value } : f
          ),
        };
      }
      return { ...prev, customFields: [...prev.customFields, { fieldId, value }] };
    });
  };

  const getInitials = () => {
    const first = formData.firstName?.[0] || '';
    const last = formData.lastName?.[0] || '';
    return (first + last).toUpperCase() || formData.email?.[0]?.toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/contacts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Contacts
        </Link>
        <div className="flex items-center space-x-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: '#6366F1' }}
          >
            {getInitials()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Contact' : 'New Contact'}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit
                ? 'Update contact information and preferences'
                : 'Add a new contact to your database'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@example.com"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company Inc."
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Source
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm appearance-none bg-white"
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birthday
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <DatePicker
                    selected={formData.birthday ? new Date(formData.birthday) : null}
                    onChange={(date: Date | null) =>
                      setFormData({ ...formData, birthday: date ? date.toISOString().split('T')[0] : '' })
                    }
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select birthday..."
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    maxDate={new Date()}
                    yearDropdownItemNumber={100}
                    scrollableYearDropdown
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    wrapperClassName="w-full"
                    calendarClassName="shadow-lg border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Tags</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Select tags to categorize this contact
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = formData.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                        isSelected
                          ? 'text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : {}}
                    >
                      {isSelected && <CheckIcon className="h-4 w-4 mr-1.5" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              {formData.tagIds.length > 0 && (
                <p className="mt-3 text-sm text-gray-500">
                  {formData.tagIds.length} tag{formData.tagIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Additional Information</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Fill in custom fields for more detailed contact information
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customFields.map((field) => {
                  const value =
                    formData.customFields.find((f) => f.fieldId === field.id)?.value || '';
                  return (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.fieldType === 'DROPDOWN' ? (
                        <select
                          value={value}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="">Select {field.name.toLowerCase()}...</option>
                          {JSON.parse(field.options || '[]').map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.fieldType === 'CHECKBOX' ? (
                        <label className="inline-flex items-center mt-2">
                          <input
                            type="checkbox"
                            checked={value === 'true'}
                            onChange={(e) =>
                              handleCustomFieldChange(field.id, e.target.checked.toString())
                            }
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Yes</span>
                        </label>
                      ) : field.fieldType === 'DATE' ? (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                            <CalendarIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <DatePicker
                            selected={value ? new Date(value) : null}
                            onChange={(date: Date | null) =>
                              handleCustomFieldChange(field.id, date ? date.toISOString().split('T')[0] : '')
                            }
                            dateFormat="MMMM d, yyyy"
                            placeholderText={`Select ${field.name.toLowerCase()}...`}
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            wrapperClassName="w-full"
                            calendarClassName="shadow-lg border border-gray-200 rounded-lg"
                          />
                        </div>
                      ) : (
                        <input
                          type={
                            field.fieldType === 'NUMBER'
                              ? 'number'
                              : field.fieldType === 'URL'
                              ? 'url'
                              : 'text'
                          }
                          value={value}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          placeholder={`Enter ${field.name.toLowerCase()}...`}
                          className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Link
            to="/contacts"
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                {isEdit ? 'Update Contact' : 'Create Contact'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
