import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, TrashIcon, DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { formsAPI } from '../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import SortableHeader from '../components/SortableHeader';
import DetailModal from '../components/DetailModal';

export default function Forms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  useEffect(() => { fetchForms(); }, [sortBy, sortOrder]);

  const fetchForms = async () => {
    try {
      const params: any = {};
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      const response = await formsAPI.getAll(params);
      setForms(response.data);
    } catch (error) { toast.error('Failed to load forms'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await formsAPI.delete(confirmDelete.id);
      toast.success('Form deleted');
      setConfirmDelete(null);
      fetchForms();
    } catch (error) { toast.error('Failed to delete form'); }
  };

  const handleExport = async (id: string) => {
    try {
      const response = await formsAPI.exportSubmissions(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'submissions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch (error) { toast.error('Failed to export'); }
  };

  if (loading) return <TableSkeleton rows={5} cols={4} />;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Forms</h1><p className="mt-1 text-sm text-gray-500">Capture leads with custom forms</p></div>
        <Link to="/forms/new" className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> Create Form
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {forms.length === 0 ? (
          <div className="text-center py-12"><DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">No forms</h3><p className="mt-1 text-sm text-gray-500">Get started by creating a form.</p></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Landing Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <SortableHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forms.map(form => (
                <tr key={form.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(form)}>
                  <td className="px-6 py-4">
                    <Link to={"/forms/" + form.id + "/edit"} className="text-primary-600 hover:text-primary-900" onClick={(e) => e.stopPropagation()}>
                      <div className="text-sm font-medium">{form.name}</div>
                      <div className="text-sm text-gray-500">{form.description}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{form.landingPage?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{form._count?.submissions || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(form.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleExport(form.id)} className="text-gray-600 hover:text-gray-900 mr-3" title="Export"><ArrowDownTrayIcon className="h-5 w-5 inline" /></button>
                    <Link to={"/forms/" + form.id + "/edit"} className="text-primary-600 hover:text-primary-900 mr-3">Edit</Link>
                    <button onClick={() => setConfirmDelete({ id: form.id, name: form.name })} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Form"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || 'Form Details'}
        onEdit={() => { navigate(`/forms/${selectedItem?.id}/edit`); setSelectedItem(null); }}
        onDelete={() => { setConfirmDelete({ id: selectedItem?.id, name: selectedItem?.name }); setSelectedItem(null); }}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.description || 'No description'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Fields</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {selectedItem.fields && selectedItem.fields.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {selectedItem.fields.map((field: any, idx: number) => (
                      <li key={idx}>{field.label || field.name || field}</li>
                    ))}
                  </ul>
                ) : 'No fields configured'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Submissions</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem._count?.submissions || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Landing Page</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.landingPage?.name || 'None'}</dd>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
