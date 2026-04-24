import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, TrashIcon, DocumentDuplicateIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { landingPagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import SortableHeader from '../components/SortableHeader';
import DetailModal from '../components/DetailModal';

export default function LandingPages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  useEffect(() => { fetchPages(); }, [sortBy, sortOrder]);

  const fetchPages = async () => {
    try {
      const params: any = {};
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;
      const response = await landingPagesAPI.getAll(params);
      setPages(response.data);
    } catch (error) { toast.error('Failed to load landing pages'); }
    finally { setLoading(false); }
  };

  const handlePublish = async (id: string) => {
    try {
      await landingPagesAPI.publish(id);
      toast.success('Page published');
      fetchPages();
    } catch (error) { toast.error('Failed to publish'); }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await landingPagesAPI.unpublish(id);
      toast.success('Page unpublished');
      fetchPages();
    } catch (error) { toast.error('Failed to unpublish'); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await landingPagesAPI.duplicate(id);
      toast.success('Page duplicated');
      fetchPages();
    } catch (error) { toast.error('Failed to duplicate'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await landingPagesAPI.delete(confirmDelete.id);
      toast.success('Page deleted');
      setConfirmDelete(null);
      fetchPages();
    } catch (error) { toast.error('Failed to delete'); }
  };

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1><p className="mt-1 text-sm text-gray-500">Create conversion-optimized landing pages</p></div>
        <Link to="/landing-pages/new" className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> Create Page
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {pages.length === 0 ? (
          <div className="text-center py-12"><GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">No landing pages</h3><p className="mt-1 text-sm text-gray-500">Get started by creating a landing page.</p></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <SortableHeader label="Views" field="views" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Conversions" field="conversions" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map(page => (
                <tr key={page.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(page)}>
                  <td className="px-6 py-4">
                    <Link to={"/landing-pages/" + page.id + "/edit"} className="text-primary-600 hover:text-primary-900" onClick={(e) => e.stopPropagation()}>
                      <div className="text-sm font-medium">{page.name}</div>
                      <div className="text-sm text-gray-500">/{page.slug}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4"><span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (page.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{page.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.views}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.conversions}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {page.isPublished ? (
                      <button onClick={() => handleUnpublish(page.id)} className="text-orange-600 hover:text-orange-900 mr-3 text-sm">Unpublish</button>
                    ) : (
                      <button onClick={() => handlePublish(page.id)} className="text-green-600 hover:text-green-900 mr-3 text-sm">Publish</button>
                    )}
                    <button onClick={() => handleDuplicate(page.id)} className="text-gray-600 hover:text-gray-900 mr-3" title="Duplicate"><DocumentDuplicateIcon className="h-5 w-5 inline" /></button>
                    <Link to={"/landing-pages/" + page.id + "/edit"} className="text-primary-600 hover:text-primary-900 mr-3">Edit</Link>
                    <button onClick={() => setConfirmDelete({ id: page.id, name: page.name })} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5 inline" /></button>
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
        title="Delete Landing Page"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || 'Landing Page Details'}
        onEdit={() => { navigate(`/landing-pages/${selectedItem?.id}/edit`); setSelectedItem(null); }}
        onDelete={() => { setConfirmDelete({ id: selectedItem?.id, name: selectedItem?.name }); setSelectedItem(null); }}
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Slug</dt>
              <dd className="mt-1 text-sm text-gray-900">/{selectedItem.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedItem.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {selectedItem.isPublished ? 'Published' : 'Draft'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Views</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.views}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Conversions</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.conversions}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
              <dd className="mt-1 text-sm text-gray-900">{selectedItem.views > 0 ? ((selectedItem.conversions / selectedItem.views) * 100).toFixed(1) : 0}%</dd>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
