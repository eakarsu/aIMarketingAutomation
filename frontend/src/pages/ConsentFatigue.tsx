import { useState } from 'react';

const sample = JSON.stringify([
  { email: 'sam@example.com', sends7d: 9, opens7d: 1, unsubscribed: false },
  { email: 'lee@example.com', sends7d: 3, opens7d: 2, unsubscribed: false }
], null, 2);

export default function ConsentFatigue() {
  const [payload, setPayload] = useState(sample);
  const [result, setResult] = useState<any>(null);

  async function run() {
    const response = await fetch('/api/consent-fatigue/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: JSON.parse(payload) }),
    });
    setResult(await response.json());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consent Fatigue Guard</h1>
        <p className="text-gray-500">Score send fatigue and recommend suppression or cadence changes.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <textarea className="w-full rounded-md border p-3 font-mono text-sm" rows={12} value={payload} onChange={(event) => setPayload(event.target.value)} />
          <button className="mt-3 rounded-md bg-primary-600 px-4 py-2 text-white" onClick={run}>Score fatigue</button>
        </div>
        <div className="rounded-lg border bg-white p-5">
          {result ? result.scored.map((row: any) => (
            <div key={row.email} className="border-b py-3">
              <strong>{row.email}</strong>
              <div>Fatigue {row.fatigue}/100 | {row.action}</div>
              <p className="text-sm text-gray-500">{row.reason}</p>
            </div>
          )) : <p className="text-gray-500">Run a score to protect consent health.</p>}
        </div>
      </div>
    </div>
  );
}
