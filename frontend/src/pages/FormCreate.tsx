import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formsAPI, landingPagesAPI } from '../services/api';
import toast from 'react-hot-toast';

const FIELD_TYPES = [{ value: 'text', label: 'Text' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Phone' }, { value: 'number', label: 'Number' }, { value: 'textarea', label: 'Text Area' }, { value: 'select', label: 'Dropdown' }, { value: 'checkbox', label: 'Checkbox' }];

export default function FormCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [landingPages, setLandingPages] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '', landingPageId: '', fields: [] as any[] });

  useEffect(() => { fetchLandingPages(); if (isEdit) fetchForm(); }, [id]);

  const fetchLandingPages = async () => {
    try {
      const response = await landingPagesAPI.getAll();
      setLandingPages(response.data);
    } catch (error) { console.error('Failed to fetch landing pages'); }
  };

  const fetchForm = async () => {
    try {
      const response = await formsAPI.getOne(id!);
      const f = response.data;
      setFormData({ name: f.name, description: f.description || '', landingPageId: f.landingPageId || '', fields: JSON.parse(f.fields || '[]') });
    } catch (error) { toast.error('Failed to load form'); navigate('/forms'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (isEdit) { await formsAPI.update(id!, formData); toast.success('Form updated'); }
      else { await formsAPI.create(formData); toast.success('Form created'); }
      navigate('/forms');
    } catch (error) { toast.error('Failed to save form'); }
    finally { setSaving(false); }
  };

  const addField = () => {
    setFormData(prev => ({ ...prev, fields: [...prev.fields, { name: '', type: 'text', label: '', required: false, options: '' }] }));
  };

  const updateField = (index: number, key: string, value: any) => {
    setFormData(prev => ({ ...prev, fields: prev.fields.map((f, i) => i === index ? { ...f, [key]: value } : f) }));
  };

  const removeField = (index: number) => {
    setFormData(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <div className="mb-6"><Link to="/forms" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Forms</Link></div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Form' : 'Create Form'}</h1></div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700">Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Landing Page (Optional)</label><select value={formData.landingPageId} onChange={e => setFormData({...formData, landingPageId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"><option value="">None</option>{landingPages.map(lp => <option key={lp.id} value={lp.id}>{lp.name}</option>)}</select></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-gray-900">Form Fields</h3><button type="button" onClick={addField} className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"><PlusIcon className="h-4 w-4 mr-1" /> Add Field</button></div>
            {formData.fields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg"><p className="text-gray-500">No fields added yet.</p></div>
            ) : (
              <div className="space-y-4">
                {formData.fields.map((field, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3"><span className="font-medium text-gray-700">Field {index + 1}</span><button type="button" onClick={() => removeField(index)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div><label className="block text-sm text-gray-600">Label</label><input type="text" value={field.label} onChange={e => updateField(index, 'label', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" /></div>
                      <div><label className="block text-sm text-gray-600">Name (ID)</label><input type="text" value={field.name} onChange={e => updateField(index, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" /></div>
                      <div><label className="block text-sm text-gray-600">Type</label><select value={field.type} onChange={e => updateField(index, 'type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                      <div className="flex items-end"><label className="flex items-center"><input type="checkbox" checked={field.required} onChange={e => updateField(index, 'required', e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded" /><span className="ml-2 text-sm text-gray-700">Required</span></label></div>
                    </div>
                    {field.type === 'select' && (
                      <div className="mt-3"><label className="block text-sm text-gray-600">Options (comma-separated)</label><input type="text" value={field.options || ''} onChange={e => updateField(index, 'options', e.target.value)} placeholder="Option 1, Option 2, Option 3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" /></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link to="/forms" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
            <button type="submit" disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update Form' : 'Create Form')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
