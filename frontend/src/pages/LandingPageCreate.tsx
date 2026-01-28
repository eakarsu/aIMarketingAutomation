import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { landingPagesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LandingPageCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', htmlContent: '', cssContent: '', jsContent: '' });

  useEffect(() => { if (isEdit) fetchPage(); }, [id]);

  const fetchPage = async () => {
    try {
      const response = await landingPagesAPI.getOne(id!);
      const p = response.data;
      setFormData({ name: p.name, slug: p.slug, htmlContent: p.htmlContent || '', cssContent: p.cssContent || '', jsContent: p.jsContent || '' });
    } catch (error) { toast.error('Failed to load page'); navigate('/landing-pages'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    try {
      if (isEdit) { await landingPagesAPI.update(id!, formData); toast.success('Page updated'); }
      else { await landingPagesAPI.create(formData); toast.success('Page created'); }
      navigate('/landing-pages');
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed to save page'); }
    finally { setSaving(false); }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <div className="mb-6"><Link to="/landing-pages" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Landing Pages</Link></div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Landing Page' : 'Create Landing Page'}</h1></div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700">Name *</label><input type="text" required value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); if (!isEdit) setFormData(prev => ({...prev, slug: generateSlug(e.target.value)})); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Slug * (URL path)</label><div className="mt-1 flex rounded-md shadow-sm"><span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">/</span><input type="text" required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-primary-500 focus:ring-primary-500" /></div></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">HTML Content *</label>
            <textarea value={formData.htmlContent} onChange={e => setFormData({...formData, htmlContent: e.target.value})} rows={12} placeholder="<div class='container'>...</div>" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CSS Styles (Optional)</label>
            <textarea value={formData.cssContent} onChange={e => setFormData({...formData, cssContent: e.target.value})} rows={6} placeholder=".container { max-width: 800px; margin: 0 auto; }" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">JavaScript (Optional)</label>
            <textarea value={formData.jsContent} onChange={e => setFormData({...formData, jsContent: e.target.value})} rows={4} placeholder="// Custom scripts" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm" />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link to="/landing-pages" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
            <button type="submit" disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update Page' : 'Create Page')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
