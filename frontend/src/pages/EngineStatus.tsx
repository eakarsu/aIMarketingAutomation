import { useState } from 'react';
import { adminAPI } from '../services/api';

/**
 * Engine Status — manual triggers for the send executor and automation engine.
 * Useful for ops + integration testing without waiting for the 1-min cron tick.
 */
export default function EngineStatus() {
  const [sendResult, setSendResult] = useState<any>(null);
  const [autoResult, setAutoResult] = useState<any>(null);
  const [loading, setLoading] = useState<'send' | 'auto' | null>(null);
  const [error, setError] = useState<string>('');

  async function runSend() {
    setLoading('send'); setError('');
    try { const r = await adminAPI.runSendExecutor(); setSendResult(r.data); }
    catch (e: any) { setError(e?.response?.data?.error || e.message); }
    finally { setLoading(null); }
  }
  async function runAuto() {
    setLoading('auto'); setError('');
    try { const r = await adminAPI.runAutomationEngine(); setAutoResult(r.data); }
    catch (e: any) { setError(e?.response?.data?.error || e.message); }
    finally { setLoading(null); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Engine Status & Manual Triggers</h1>
        <p className="text-sm text-gray-500 mt-1">Send executor + automation engine run automatically every minute via cron. Use these buttons for immediate execution.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Send Executor</h2>
          <p className="text-xs text-gray-500 mb-3">Picks SCHEDULED campaigns whose scheduledAt &lt;= now and dispatches via SMTP/Twilio (or simulates).</p>
          <button onClick={runSend} disabled={loading === 'send'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded text-sm font-medium">
            {loading === 'send' ? 'Running…' : 'Run Now'}
          </button>
          {sendResult && (
            <div className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded p-2">
              <div>Campaigns processed: <strong>{sendResult.campaignsProcessed}</strong></div>
              <div>Recipients sent: <strong>{sendResult.recipientsSent}</strong></div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Automation Engine</h2>
          <p className="text-xs text-gray-500 mb-3">Walks active enrollments through their steps, respecting delayMinutes. Handles EMAIL, SMS, WAIT, TAG_ADD/REMOVE, CONDITION, WEBHOOK.</p>
          <button onClick={runAuto} disabled={loading === 'auto'}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded text-sm font-medium">
            {loading === 'auto' ? 'Running…' : 'Run Now'}
          </button>
          {autoResult && (
            <div className="mt-3 text-xs bg-gray-50 border border-gray-200 rounded p-2">
              <div>Enrollments processed: <strong>{autoResult.enrollmentsProcessed}</strong></div>
              <div>Steps executed: <strong>{autoResult.stepsExecuted}</strong></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
        <p className="font-semibold mb-1">Webhook integration tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>SendGrid: configure event webhook to POST to <code className="bg-white px-1 rounded">/api/inbound-webhooks/sendgrid</code> and pass <code>campaign_id</code> + <code>recipient_id</code> as <code>custom_args</code>.</li>
          <li>Twilio: set Status Callback URL to <code className="bg-white px-1 rounded">/api/inbound-webhooks/twilio?recipientId=&lt;id&gt;</code> when creating each message.</li>
          <li>Without SMTP/Twilio env vars, both engines run in SIMULATION mode (status updates without external network).</li>
        </ul>
      </div>
    </div>
  );
}
