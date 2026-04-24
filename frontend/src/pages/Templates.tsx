import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ShareIcon,
  PencilIcon,
  FunnelIcon,
  MegaphoneIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { templatesAPI } from '../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { CardSkeleton } from '../components/Skeleton';
import DetailModal from '../components/DetailModal';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  EMAIL: { icon: EnvelopeIcon, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Email' },
  SMS: { icon: DevicePhoneMobileIcon, color: 'text-green-600', bgColor: 'bg-green-100', label: 'SMS' },
  SOCIAL_POST: { icon: ShareIcon, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Social' },
};

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [types, setTypes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchOptions();
  }, [typeFilter, categoryFilter, sortBy, sortOrder]);

  const fetchTemplates = async () => {
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      const response = await templatesAPI.getAll(params);
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        templatesAPI.getTypes(),
        templatesAPI.getCategories(),
      ]);
      setTypes(typesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to fetch options');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await templatesAPI.delete(confirmDelete.id);
      toast.success('Template deleted successfully');
      setConfirmDelete(null);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    try {
      await templatesAPI.duplicate(id);
      toast.success('Template duplicated successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to duplicate template');
    } finally {
      setDuplicating(null);
    }
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] || TYPE_CONFIG.EMAIL;
  };

  const totalCampaigns = templates.reduce((sum, t) => sum + (t._count?.campaigns || 0), 0);
  const typeBreakdown = types.map((t) => ({
    ...t,
    count: templates.filter((tmpl) => tmpl.type === t.value).length,
  }));

  if (loading) {
    return <CardSkeleton count={8} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Reusable email, SMS, and social media templates
            </p>
          </div>
          <Link
            to="/templates/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Template
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50">
              <DocumentTextIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
          </div>
        </div>
        {typeBreakdown.slice(0, 2).map((type) => {
          const config = getTypeConfig(type.value);
          const IconComponent = config.icon;
          return (
            <div key={type.value} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${config.bgColor}`}>
                  <IconComponent className={`h-6 w-6 ${config.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{type.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{type.count}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50">
              <MegaphoneIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Used in Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-500">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters:
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {(typeFilter || categoryFilter) && (
            <button
              onClick={() => {
                setTypeFilter('');
                setCategoryFilter('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">
            All Templates
            {(typeFilter || categoryFilter) && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({templates.length} result{templates.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
        </div>
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <EnvelopeIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No templates yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Templates help you create consistent marketing content. Create your first template to get started.
            </p>
            <Link
              to="/templates/new"
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Your First Template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {templates.map((template) => {
              const typeConfig = getTypeConfig(template.type);
              const IconComponent = typeConfig.icon;
              return (
                <div
                  key={template.id}
                  className="group relative border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedItem(template)}
                >
                  {/* Preview Header */}
                  <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-200">
                    <div className={`p-4 rounded-full ${typeConfig.bgColor}`}>
                      <IconComponent className={`h-8 w-8 ${typeConfig.color}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </span>
                          {template.category && (
                            <span className="text-xs text-gray-500">{template.category}</span>
                          )}
                        </div>
                        <Link
                          to={`/templates/${template.id}/edit`}
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3 className="text-base font-semibold text-gray-900 hover:text-primary-600 truncate">
                            {template.name}
                          </h3>
                        </Link>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {template.subject || template.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-500">
                        <MegaphoneIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-medium text-gray-900">{template._count?.campaigns || 0}</span>
                        <span className="ml-1">campaigns</span>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/templates/${template.id}/edit`}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit template"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(template.id); }}
                          disabled={duplicating === template.id}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Duplicate template"
                        >
                          <DocumentDuplicateIcon
                            className={`h-4 w-4 ${duplicating === template.id ? 'animate-pulse' : ''}`}
                          />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: template.id, name: template.name }); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || 'Template Details'}
        onEdit={() => { navigate(`/templates/${selectedItem?.id}/edit`); setSelectedItem(null); }}
        onDelete={() => { setConfirmDelete({ id: selectedItem?.id, name: selectedItem?.name }); setSelectedItem(null); }}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{getTypeConfig(selectedItem.type).label}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.category || 'None'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Subject</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.subject || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Content Preview</dt>
              <dd className="mt-1 text-sm text-gray-900 line-clamp-6">{selectedItem.content || selectedItem.description || 'No content'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Used in Campaigns</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem._count?.campaigns || 0}</dd>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
