import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { contactsAPI, tagsAPI, exportAPI } from '../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import SortableHeader from '../components/SortableHeader';
import DetailModal from '../components/DetailModal';

interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  status: string;
  tags: { id: string; tag: { id: string; name: string; color: string } }[];
  createdAt: string;
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [tags, setTags] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean; id: string; name: string}>({open: false, id: '', name: ''});
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchTags();
    fetchStatuses();
  }, [sortBy, sortOrder]);

  const fetchContacts = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (tagFilter) params.tagId = tagFilter;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      const response = await contactsAPI.getAll(params);
      // Backend returns { contacts: [...], pagination: {...} }
      setContacts(response.data.contacts || response.data);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setTags(response.data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await contactsAPI.getStatuses();
      setStatuses(response.data);
    } catch (error) {
      setStatuses(['ACTIVE', 'INACTIVE', 'UNSUBSCRIBED', 'BOUNCED']);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchContacts();
  };

  const handleFilterChange = () => {
    setLoading(true);
    fetchContacts();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContacts(contacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter(cid => cid !== id));
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.length === 0) {
      toast.error('No contacts selected');
      return;
    }

    setConfirmDelete({
      open: true,
      id: '__bulk__',
      name: `${selectedContacts.length} contact(s)`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (confirmDelete.id === '__bulk__') {
        await contactsAPI.bulkDelete(selectedContacts);
        toast.success(`${selectedContacts.length} contact(s) deleted`);
        setSelectedContacts([]);
      } else {
        await contactsAPI.delete(confirmDelete.id);
        toast.success('Contact deleted');
      }
      setConfirmDelete({ open: false, id: '', name: '' });
      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
      setConfirmDelete({ open: false, id: '', name: '' });
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedContacts.length === 0) {
      toast.error('No contacts selected');
      return;
    }
    try {
      await contactsAPI.bulkUpdate(selectedContacts, { status });
      toast.success(`${selectedContacts.length} contact(s) updated to ${status}`);
      setSelectedContacts([]);
      setBulkStatusUpdate('');
      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update contacts');
    }
  };

  const handleExport = async () => {
    try {
      const response = await contactsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contacts-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Contacts exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export contacts');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { data } = await exportAPI.contactsPDF();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'contacts.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  if (loading && contacts.length === 0) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your contact list ({contacts.length} total)
            </p>
          </div>
          <Link
            to="/contacts/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Contact
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search by name or email..."
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </form>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    handleFilterChange();
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag
                </label>
                <select
                  value={tagFilter}
                  onChange={(e) => {
                    setTagFilter(e.target.value);
                    handleFilterChange();
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-900">
              {selectedContacts.length} contact(s) selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={bulkStatusUpdate}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusUpdate(e.target.value);
                  }
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
              >
                <option value="">Update Status...</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={handleExport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export CSV
        </button>
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export PDF
        </button>
        <Link
          to="/contacts/import"
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
          Import
        </Link>
      </div>

      {/* Contacts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <SortableHeader label="Name" field="firstName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Email" field="email" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <SortableHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No contacts found. Create your first contact to get started.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(contact)}>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                        {contact.firstName?.[0] || contact.email[0].toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      contact.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      contact.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                      contact.status === 'UNSUBSCRIBED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.slice(0, 2).map((contactTag) => (
                        <span
                          key={contactTag.tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: contactTag.tag.color + '20', color: contactTag.tag.color }}
                        >
                          {contactTag.tag.name}
                        </span>
                      ))}
                      {contact.tags?.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{contact.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      View
                    </Link>
                    <Link
                      to={`/contacts/${contact.id}/edit`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: '', name: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${confirmDelete.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Contact Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`${selectedItem?.firstName || ''} ${selectedItem?.lastName || ''}`.trim() || 'Contact Details'}
        onEdit={() => {
          navigate(`/contacts/${selectedItem?.id}/edit`);
          setSelectedItem(null);
        }}
        onDelete={() => {
          setConfirmDelete({
            open: true,
            id: selectedItem?.id || '',
            name: `${selectedItem?.firstName || ''} ${selectedItem?.lastName || ''}`.trim() || selectedItem?.email || '',
          });
          setSelectedItem(null);
        }}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.firstName} {selectedItem.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Company</p>
              <p className="mt-1 text-sm text-gray-900">{selectedItem.company || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                selectedItem.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                selectedItem.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                selectedItem.status === 'UNSUBSCRIBED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedItem.status}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Tags</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {selectedItem.tags?.length > 0 ? selectedItem.tags.map((contactTag: any) => (
                  <span
                    key={contactTag.tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: contactTag.tag.color + '20', color: contactTag.tag.color }}
                  >
                    {contactTag.tag.name}
                  </span>
                )) : <p className="text-sm text-gray-400">No tags</p>}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="mt-1 text-sm text-gray-900">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
