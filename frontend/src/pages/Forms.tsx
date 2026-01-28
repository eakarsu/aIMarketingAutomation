import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, TrashIcon, DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { formsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Forms() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      const response = await formsAPI.getAll();
      setForms(response.data);
    } catch (error) { toast.error('Failed to load forms'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      await formsAPI.delete(id);
      toast.success('Form deleted');
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Landing Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forms.map(form => (
                <tr key={form.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={"/forms/" + form.id + "/edit"} className="text-primary-600 hover:text-primary-900">
                      <div className="text-sm font-medium">{form.name}</div>
                      <div className="text-sm text-gray-500">{form.description}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{form.landingPage?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{form._count?.submissions || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(form.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleExport(form.id)} className="text-gray-600 hover:text-gray-900 mr-3" title="Export"><ArrowDownTrayIcon className="h-5 w-5 inline" /></button>
                    <Link to={"/forms/" + form.id + "/edit"} className="text-primary-600 hover:text-primary-900 mr-3">Edit</Link>
                    <button onClick={() => handleDelete(form.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5 inline" /></button>
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
