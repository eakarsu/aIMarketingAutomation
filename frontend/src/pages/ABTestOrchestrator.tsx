import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { abTestAPI } from '../services/api';

/**
 * AI A/B Test Orchestrator UI.
 * Workflow: select a campaign → propose AI variants → run pilot to 10% → finalize with winner.
 */
export default function ABTestOrchestrator() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [abTest, setAbTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'proposing' | 'piloting' | 'finalizing'>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    api.get('/campaigns?pageSize=100').then(r => setCampaigns(r.data.data || [])).catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if (selected) {
      abTestAPI.status(selected).then(r => setAbTest(r.data)).catch(() => setAbTest(null));
    }
  }, [selected]);

  async function propose() {
    if (!selected) return;
    setLoading(true); setStep('proposing'); setError('');
    try {
      const r = await abTestAPI.proposeVariants(selected);
      setAbTest(r.data.abTest);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally { setLoading(false); setStep('idle'); }
  }
  async function pilot() {
    setLoading(true); setStep('piloting'); setError('');
    try {
      const r = await abTestAPI.runPilot(selected);
      const updated = await abTestAPI.status(selected);
      setAbTest(updated.data);
      alert(`Pilot launched: ${r.data.pilot_size} recipients across ${r.data.variants} variants`);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally { setLoading(false); setStep('idle'); }
  }
  async function finalize() {
    setLoading(true); setStep('finalizing'); setError('');
    try {
      const r = await abTestAPI.finalize(selected);
      const updated = await abTestAPI.status(selected);
      setAbTest(updated.data);
      alert(`Winner picked: ${r.data.winner.subject}\nSent to ${r.data.dispatched_to_remainder} more recipients (total: ${r.data.total_sent})`);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message);
    } finally { setLoading(false); setStep('idle'); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI A/B Test Orchestrator</h1>
        <p className="text-sm text-gray-500 mt-1">AI proposes 3 subject variants → 10% pilot → winner sent to remaining recipients.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <label className="block text-xs font-medium text-gray-700 mb-1">Select Campaign</label>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">— pick a campaign —</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

      {selected && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <button onClick={propose} disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-3 rounded-lg text-sm font-medium">
            {step === 'proposing' ? 'Proposing…' : '1. Propose AI Variants'}
          </button>
          <button onClick={pilot} disabled={loading || !abTest?.variants?.length}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-3 rounded-lg text-sm font-medium">
            {step === 'piloting' ? 'Piloting…' : '2. Run 10% Pilot'}
          </button>
          <button onClick={finalize} disabled={loading || abTest?.status === 'COMPLETED'}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-3 rounded-lg text-sm font-medium">
            {step === 'finalizing' ? 'Finalizing…' : '3. Pick Winner & Send Rest'}
          </button>
        </div>
      )}

      {abTest && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900">{abTest.name}</h2>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              abTest.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
              abTest.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>{abTest.status}</span>
          </div>
          {abTest.winnerVariant && (
            <p className="text-xs text-emerald-600 mb-3">Winner: {abTest.winnerVariant}</p>
          )}
          <div className="space-y-2">
            {abTest.variants?.map((v: any) => {
              const isWinner = v.id === abTest.winnerVariant;
              return (
                <div key={v.id} className={`p-3 rounded border ${isWinner ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{v.name}</span>
                      {isWinner && <span className="ml-2 text-xs text-emerald-700 font-bold">WINNER</span>}
                    </div>
                    <span className="text-xs text-gray-500">{v.percentage}%</span>
                  </div>
                  <p className="text-sm text-gray-900">{v.subject}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-500">
                    <span>Sent: {v.sent}</span>
                    <span>Opened: {v.opened}</span>
                    <span>Clicked: {v.clicked}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
