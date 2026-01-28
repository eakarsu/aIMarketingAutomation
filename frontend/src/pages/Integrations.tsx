import React, { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon, LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { integrationsAPI, optionsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Integrations() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationTypes, setIntegrationTypes] = useState<any[]>([]);
  const [integrationProviders, setIntegrationProviders] = useState<Record<string, { value: string; label: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: 'EMAIL_PROVIDER', name: '', provider: '', apiKey: '', apiSecret: '', webhookUrl: '', settings: '{}' });

  useEffect(() => { fetchIntegrations(); fetchIntegrationTypes(); fetchIntegrationProviders(); }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await integrationsAPI.getAll();
      setIntegrations(response.data);
    } catch (error) { toast.error('Failed to load integrations'); }
    finally { setLoading(false); }
  };

  const fetchIntegrationTypes = async () => {
    try {
      const response = await optionsAPI.getIntegrationTypes();
      setIntegrationTypes(response.data);
    } catch (error) { console.error('Failed to load integration types'); }
  };

  const fetchIntegrationProviders = async () => {
    try {
      const response = await optionsAPI.getIntegrationProviders();
      setIntegrationProviders(response.data);
    } catch (error) { console.error('Failed to load integration providers'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.provider) { toast.error('Name and provider are required'); return; }
    try {
      await integrationsAPI.create({ ...formData, settings: JSON.parse(formData.settings || '{}') });
      toast.success('Integration created');
      setShowModal(false);
      setFormData({ type: 'EMAIL_PROVIDER', name: '', provider: '', apiKey: '', apiSecret: '', webhookUrl: '', settings: '{}' });
      fetchIntegrations();
    } catch (error) { toast.error('Failed to create integration'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    try {
      await integrationsAPI.delete(id);
      toast.success('Integration deleted');
      fetchIntegrations();
    } catch (error) { toast.error('Failed to delete integration'); }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const response = await integrationsAPI.test(id);
      if (response.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed: ' + (response.data.error || 'Unknown error'));
      }
      fetchIntegrations();
    } catch (error) { toast.error('Connection test failed'); }
    finally { setTesting(null); }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await integrationsAPI.update(id, { isActive: !currentStatus });
      toast.success(currentStatus ? 'Integration disabled' : 'Integration enabled');
      fetchIntegrations();
    } catch (error) { toast.error('Failed to update integration'); }
  };

  const getProviderOptions = (type: string) => {
    return integrationProviders[type] || [];
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Integrations</h1><p className="mt-1 text-sm text-gray-500">Connect third-party services</p></div>
        <button onClick={() => setShowModal(true)} className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> Add Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {integrationTypes.map(type => {
          const count = integrations.filter(i => i.type === type.value).length;
          const active = integrations.filter(i => i.type === type.value && i.isActive).length;
          return (
            <div key={type.value} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">{type.label}</h3>
                <span className="text-sm text-gray-500">{active}/{count} active</span>
              </div>
              <p className="text-sm text-gray-500">{type.description}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-medium text-gray-900">Connected Integrations</h2></div>
        {integrations.length === 0 ? (
          <div className="text-center py-12"><LinkIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">No integrations</h3><p className="mt-1 text-sm text-gray-500">Get started by adding an integration.</p></div>
        ) : (
          <div className="divide-y divide-gray-200">
            {integrations.map(integration => (
              <div key={integration.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={"w-3 h-3 rounded-full mr-3 " + (integration.isActive ? 'bg-green-500' : 'bg-gray-300')}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.provider} - {integrationTypes.find(t => t.value === integration.type)?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {integration.lastTestedAt && (
                      <span className={"text-xs flex items-center " + (integration.lastTestSuccess ? 'text-green-600' : 'text-red-600')}>
                        {integration.lastTestSuccess ? <CheckCircleIcon className="h-4 w-4 mr-1" /> : <XCircleIcon className="h-4 w-4 mr-1" />}
                        {integration.lastTestSuccess ? 'Connected' : 'Failed'}
                      </span>
                    )}
                    <button onClick={() => handleTest(integration.id)} disabled={testing === integration.id} className="text-sm text-primary-600 hover:text-primary-900 disabled:opacity-50">
                      {testing === integration.id ? 'Testing...' : 'Test'}
                    </button>
                    <button onClick={() => handleToggle(integration.id, integration.isActive)} className={"text-sm " + (integration.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900')}>
                      {integration.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(integration.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Integration</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value, provider: ''})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  {integrationTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <select value={formData.provider} onChange={e => setFormData({...formData, provider: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="">Select provider</option>
                  {getProviderOptions(formData.type).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="My SendGrid Account" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input type="password" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">API Secret (if required)</label>
                <input type="password" value={formData.apiSecret} onChange={e => setFormData({...formData, apiSecret: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Webhook URL (optional)</label>
                <input type="url" value={formData.webhookUrl} onChange={e => setFormData({...formData, webhookUrl: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Settings (JSON)</label>
                <textarea value={formData.settings} onChange={e => setFormData({...formData, settings: e.target.value})} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">Add Integration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
