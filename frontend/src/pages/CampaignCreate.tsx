import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { campaignsAPI, templatesAPI, segmentsAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  type: string;
}

interface Segment {
  id: string;
  name: string;
  _count?: { contacts: number };
}

export default function CampaignCreate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [campaignTypes, setCampaignTypes] = useState<{ value: string; label: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    type: 'EMAIL',
    templateId: '',
    segmentId: '',
    scheduledAt: '',
  });

  useEffect(() => {
    fetchTemplates();
    fetchSegments();
    fetchCampaignTypes();
    if (id) {
      fetchCampaign();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const response = await campaignsAPI.getOne(id!);
      const campaign = response.data;
      setFormData({
        name: campaign.name || '',
        subject: campaign.subject || '',
        type: campaign.type || 'EMAIL',
        templateId: campaign.templateId || '',
        segmentId: campaign.segmentId || '',
        scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load campaign');
      navigate('/campaigns');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await templatesAPI.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const fetchSegments = async () => {
    try {
      const response = await segmentsAPI.getAll();
      setSegments(response.data);
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  };

  const fetchCampaignTypes = async () => {
    try {
      const response = await campaignsAPI.getTypes();
      setCampaignTypes(response.data);
    } catch (error) {
      setCampaignTypes([
        { value: 'EMAIL', label: 'Email Campaign' },
        { value: 'SMS', label: 'SMS Campaign' },
        { value: 'SOCIAL_MEDIA', label: 'Social Media' },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        scheduledAt: formData.scheduledAt || null,
        templateId: formData.templateId || null,
        segmentId: formData.segmentId || null,
      };

      if (id) {
        await campaignsAPI.update(id, payload);
        toast.success('Campaign updated successfully');
      } else {
        const response = await campaignsAPI.create(payload);
        toast.success('Campaign created successfully');
        navigate(`/campaigns/${response.data.id}`);
        return;
      }
      navigate(`/campaigns/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      <div className="mb-8">
        <Link to="/campaigns" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaigns
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Edit Campaign' : 'Create Campaign'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {id ? 'Update your campaign details' : 'Set up a new marketing campaign'}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {/* Campaign Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Campaign Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                placeholder="e.g., Summer Sale 2024"
              />
            </div>

            {/* Campaign Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Campaign Type *
              </label>
              <select
                name="type"
                id="type"
                required
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              >
                {campaignTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Line */}
            {formData.type === 'EMAIL' && (
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject Line *
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  placeholder="Enter email subject line"
                />
              </div>
            )}

            {/* Template */}
            <div>
              <label htmlFor="templateId" className="block text-sm font-medium text-gray-700">
                Template
              </label>
              <select
                name="templateId"
                id="templateId"
                value={formData.templateId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Select a template (optional)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.type})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose a template or{' '}
                <Link to="/templates/new" className="text-primary-600 hover:text-primary-500">
                  create a new one
                </Link>
              </p>
            </div>

            {/* Segment */}
            <div>
              <label htmlFor="segmentId" className="block text-sm font-medium text-gray-700">
                Target Segment
              </label>
              <select
                name="segmentId"
                id="segmentId"
                value={formData.segmentId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All contacts</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name} ({segment._count?.contacts || 0} contacts)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Send to a specific segment or{' '}
                <Link to="/segments" className="text-primary-600 hover:text-primary-500">
                  create a new segment
                </Link>
              </p>
            </div>

            {/* Schedule */}
            <div>
              <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700">
                Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                name="scheduledAt"
                id="scheduledAt"
                value={formData.scheduledAt}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to save as draft
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/campaigns')}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : id ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
