import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { automationsAPI, templatesAPI, segmentsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AutomationCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<any[]>([]);
  const [stepTypes, setStepTypes] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '', type: 'WELCOME', segmentId: '', trigger: { event: 'contact_created' }, steps: [] as any[] });

  useEffect(() => { fetchOptions(); if (isEdit) fetchAutomation(); }, [id]);

  const fetchOptions = async () => {
    try {
      const [typesRes, stepTypesRes, templatesRes, segmentsRes] = await Promise.all([automationsAPI.getTypes(), automationsAPI.getStepTypes(), templatesAPI.getAll(), segmentsAPI.getAll()]);
      setTypes(typesRes.data);
      setStepTypes(stepTypesRes.data);
      setTemplates(templatesRes.data);
      setSegments(segmentsRes.data);
    } catch (error) { console.error('Failed to fetch options'); }
  };

  const fetchAutomation = async () => {
    try {
      const response = await automationsAPI.getOne(id!);
      const a = response.data;
      setFormData({ name: a.name, description: a.description || '', type: a.type, segmentId: a.segmentId || '', trigger: JSON.parse(a.trigger || '{}'), steps: a.steps?.map((s: any) => ({ type: s.type, delayMinutes: s.delayMinutes, templateId: s.templateId, config: s.config ? JSON.parse(s.config) : {} })) || [] });
    } catch (error) { toast.error('Failed to load automation'); navigate('/automations'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (isEdit) { await automationsAPI.update(id!, formData); toast.success('Automation updated'); }
      else { await automationsAPI.create(formData); toast.success('Automation created'); }
      navigate('/automations');
    } catch (error) { toast.error('Failed to save automation'); }
    finally { setSaving(false); }
  };

  const addStep = () => {
    setFormData(prev => ({ ...prev, steps: [...prev.steps, { type: 'EMAIL', delayMinutes: 0, templateId: '', config: {} }] }));
  };

  const updateStep = (index: number, field: string, value: any) => {
    setFormData(prev => ({ ...prev, steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s) }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <div className="mb-6"><Link to="/automations" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Automations</Link></div>
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200"><h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Automation' : 'Create Automation'}</h1></div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700">Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">{types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Target Segment (optional)</label><select value={formData.segmentId} onChange={e => setFormData({...formData, segmentId: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"><option value="">All Contacts</option>{segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-gray-900">Automation Steps</h3><button type="button" onClick={addStep} className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"><PlusIcon className="h-4 w-4 mr-1" /> Add Step</button></div>
            {formData.steps.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg"><p className="text-gray-500">No steps added yet. Click "Add Step" to begin.</p></div>
            ) : (
              <div className="space-y-4">
                {formData.steps.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-700">Step {index + 1}</span>
                      <button type="button" onClick={() => removeStep(index)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="block text-sm text-gray-600">Type</label><select value={step.type} onChange={e => updateStep(index, 'type', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm">{stepTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                      <div><label className="block text-sm text-gray-600">Delay (minutes)</label><input type="number" min="0" value={step.delayMinutes} onChange={e => updateStep(index, 'delayMinutes', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" /></div>
                      {(step.type === 'EMAIL' || step.type === 'SMS') && (
                        <div><label className="block text-sm text-gray-600">Template</label><select value={step.templateId || ''} onChange={e => updateStep(index, 'templateId', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"><option value="">Select template...</option>{templates.filter(t => t.type === step.type).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link to="/automations" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
            <button type="submit" disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update Automation' : 'Create Automation')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
