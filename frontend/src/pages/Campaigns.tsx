import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, DocumentDuplicateIcon, PaperAirplaneIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { campaignsAPI, exportAPI } from '../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import SortableHeader from '../components/SortableHeader';
import DetailModal from '../components/DetailModal';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  subject: string;
  scheduledAt: string;
  sentAt: string;
  createdAt: string;
  template?: { id: string; name: string };
  segment?: { id: string; name: string };
  _count: { recipients: number };
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [types, setTypes] = useState<{ value: string; label: string }[]>([]);
  const [statuses, setStatuses] = useState<{ value: string; label: string }[]>([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean; id: string; name: string}>({open: false, id: '', name: ''});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCampaigns();
    fetchOptions();
  }, [typeFilter, statusFilter, sortBy, sortOrder]);

  const fetchCampaigns = async () => {
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
      const response = await campaignsAPI.getAll(params);
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [typesRes, statusesRes] = await Promise.all([
        campaignsAPI.getTypes(),
        campaignsAPI.getStatuses(),
      ]);
      setTypes(typesRes.data);
      setStatuses(statusesRes.data);
    } catch (error) {
      console.error('Failed to fetch options');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCampaigns();
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDelete({ open: true, id, name });
  };

  const handleConfirmDelete = async () => {
    try {
      await campaignsAPI.delete(confirmDelete.id);
      toast.success('Campaign deleted');
      setConfirmDelete({ open: false, id: '', name: '' });
      setSelectedItem(null);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleExportPDF = async () => {
    try {
      const { data } = await exportAPI.campaignsPDF();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'campaigns.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(campaigns.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkUpdate = async (status: string) => {
    try {
      await campaignsAPI.bulkUpdate(selectedIds, { status });
      toast.success(`${selectedIds.length} campaign(s) updated to ${status}`);
      setSelectedIds([]);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to update campaigns');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await campaignsAPI.duplicate(id);
      toast.success('Campaign duplicated');
      navigate(`/campaigns/${response.data.id}/edit`);
    } catch (error) {
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Are you sure you want to send this campaign now?')) return;
    try {
      const response = await campaignsAPI.send(id);
      toast.success(`${response.data.queued} delivery job(s) queued; ${response.data.blocked} blocked`);
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to send campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'SENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SENT': return 'bg-green-100 text-green-800';
      case 'PAUSED': return 'bg-orange-100 text-orange-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EMAIL': return 'bg-blue-100 text-blue-800';
      case 'SMS': return 'bg-green-100 text-green-800';
      case 'SOCIAL_MEDIA': return 'bg-purple-100 text-purple-800';
      case 'MULTI_CHANNEL': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <TableSkeleton rows={5} cols={5} />;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your email, SMS, and social media campaigns</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
            Export PDF
          </button>
          <Link
            to="/campaigns/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Search
          </button>
        </form>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-900">
              {selectedIds.length} campaign(s) selected
            </span>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkUpdate(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                defaultValue=""
              >
                <option value="" disabled>Change Status...</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new campaign.</p>
            <div className="mt-6">
              <Link
                to="/campaigns/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Campaign
              </Link>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === campaigns.length && campaigns.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <SortableHeader label="Campaign" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Type" field="type" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <SortableHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedItem(campaign)}>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(campaign.id)}
                      onChange={() => handleSelectOne(campaign.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary-600">{campaign.name}</div>
                    <div className="text-sm text-gray-500">{campaign.subject || 'No subject'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(campaign.type)}`}>
                      {campaign.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign._count?.recipients || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {campaign.status === 'DRAFT' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSend(campaign.id); }}
                          className="text-green-600 hover:text-green-900"
                          title="Send"
                        >
                          <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(campaign.id); }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Duplicate"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>
                      <Link
                        to={`/campaigns/${campaign.id}/edit`}
                        className="text-primary-600 hover:text-primary-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(campaign.id, campaign.name); }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: '', name: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || 'Campaign Details'}
        onEdit={() => {
          navigate(`/campaigns/${selectedItem?.id}/edit`);
          setSelectedItem(null);
        }}
        onDelete={() => {
          handleDelete(selectedItem?.id, selectedItem?.name);
          setSelectedItem(null);
        }}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Name</label>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Type</label>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedItem.type)}`}>
                  {selectedItem.type.replace('_', ' ')}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Subject</label>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.subject || 'No subject'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.description || 'No description'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1 text-sm text-gray-900">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
