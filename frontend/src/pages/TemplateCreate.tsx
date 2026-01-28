import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { templatesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function TemplateCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '', type: 'EMAIL', subject: '', content: '', htmlContent: '', category: '', isPublic: false });

  useEffect(() => {
    fetchOptions();
    if (isEdit) fetchTemplate();
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [typesRes, catsRes] = await Promise.all([templatesAPI.getTypes(), templatesAPI.getCategories()]);
      setTypes(typesRes.data);
      setCategories(catsRes.data);
    } catch (error) { console.error('Failed to fetch options'); }
  };

  const fetchTemplate = async () => {
    try {
      const response = await templatesAPI.getOne(id!);
      const t = response.data;
      setFormData({ name: t.name, description: t.description || '', type: t.type, subject: t.subject || '', content: t.content || '', htmlContent: t.htmlContent || '', category: t.category || '', isPublic: t.isPublic });
    } catch (error) { toast.error('Failed to load template'); navigate('/templates'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.content) { toast.error('Name and content are required'); return; }
    setSaving(true);
    try {
      if (isEdit) { await templatesAPI.update(id!, formData); toast.success('Template updated'); }
      else { await templatesAPI.create(formData); toast.success('Template created'); }
      navigate('/templates');
    } catch (error) { toast.error('Failed to save template'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <div className="mb-6">
        <Link to="/templates" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Templates</Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Template' : 'Create Template'}</h1></div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700">Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type *</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                {types.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                <option value="">Select category...</option>
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
          </div>

          {(formData.type === 'EMAIL' || formData.type === 'LANDING_PAGE') && (
            <div><label className="block text-sm font-medium text-gray-700">Subject Line</label><input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Use {{first_name}} for personalization" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Content (Plain Text) *</label>
            <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={6} placeholder="Use {{first_name}}, {{last_name}}, {{company}} for personalization" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
          </div>

          {(formData.type === 'EMAIL' || formData.type === 'LANDING_PAGE') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">HTML Content (Optional)</label>
              <textarea value={formData.htmlContent} onChange={e => setFormData({...formData, htmlContent: e.target.value})} rows={8} placeholder="<html>...</html>" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm" />
            </div>
          )}

          <div className="flex items-center"><input type="checkbox" id="isPublic" checked={formData.isPublic} onChange={e => setFormData({...formData, isPublic: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" /><label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">Make this template public (visible to all users)</label></div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link to="/templates" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
            <button type="submit" disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update Template' : 'Create Template')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
