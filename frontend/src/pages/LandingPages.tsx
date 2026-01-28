import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, TrashIcon, DocumentDuplicateIcon, GlobeAltIcon, EyeIcon } from '@heroicons/react/24/outline';
import { landingPagesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LandingPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    try {
      const response = await landingPagesAPI.getAll();
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;
    try {
      await landingPagesAPI.delete(id);
      toast.success('Page deleted');
      fetchPages();
    } catch (error) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map(page => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={"/landing-pages/" + page.id + "/edit"} className="text-primary-600 hover:text-primary-900">
                      <div className="text-sm font-medium">{page.name}</div>
                      <div className="text-sm text-gray-500">/{page.slug}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4"><span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (page.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{page.isPublished ? 'Published' : 'Draft'}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.views}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.conversions}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : 0}%</td>
                  <td className="px-6 py-4 text-right">
                    {page.isPublished ? (
                      <button onClick={() => handleUnpublish(page.id)} className="text-orange-600 hover:text-orange-900 mr-3 text-sm">Unpublish</button>
                    ) : (
                      <button onClick={() => handlePublish(page.id)} className="text-green-600 hover:text-green-900 mr-3 text-sm">Publish</button>
                    )}
                    <button onClick={() => handleDuplicate(page.id)} className="text-gray-600 hover:text-gray-900 mr-3" title="Duplicate"><DocumentDuplicateIcon className="h-5 w-5 inline" /></button>
                    <Link to={"/landing-pages/" + page.id + "/edit"} className="text-primary-600 hover:text-primary-900 mr-3">Edit</Link>
                    <button onClick={() => handleDelete(page.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
