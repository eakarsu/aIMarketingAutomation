import { useEffect, useState } from 'react';

interface Cell { week: string; engagement: number | null; contacts: number }
interface Row { cohort: string; cells: Cell[] }
interface CohortData {
  cohorts: string[];
  weeks: string[];
  rows: Row[];
  generatedAt: string;
}

function engagementColor(v: number | null): string {
  if (v === null) return '#f3f4f6';
  // Gradient: red (low) → yellow (mid) → green (high)
  const t = Math.max(0, Math.min(100, v)) / 100;
  // interpolate
  const r = Math.round(t < 0.5 ? 239 - (239 - 251) * (t * 2) : 251 - (251 - 16) * ((t - 0.5) * 2));
  const g = Math.round(t < 0.5 ? 68 + (191 - 68) * (t * 2) : 191 - (191 - 185) * ((t - 0.5) * 2));
  const b = Math.round(t < 0.5 ? 68 + (36 - 68) * (t * 2) : 36 + (129 - 36) * ((t - 0.5) * 2));
  return `rgb(${r},${g},${b})`;
}

export default function CohortEngagement() {
  const [data, setData] = useState<CohortData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/cohort-engagement', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 text-sm" data-testid="ce-error">Error: {error}</div>;
  if (!data) return <div className="text-gray-500 text-sm" data-testid="ce-loading">Loading cohorts…</div>;

  const cols = data.weeks.length;

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="cohort-engagement">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Cohort Engagement Heatmap</h2>
      <p className="text-sm text-gray-500 mb-4">Engagement % of each signup cohort over the weeks after activation.</p>

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `120px repeat(${cols}, minmax(56px, 1fr))` }}
        >
          {/* Header row */}
          <div className="text-xs font-semibold text-gray-600 px-2 py-1">Cohort</div>
          {data.weeks.map((w) => (
            <div key={w} className="text-xs font-semibold text-gray-600 px-2 py-1 text-center">
              {w}
            </div>
          ))}

          {/* Body */}
          {data.rows.map((row) => (
            <Row key={row.cohort} row={row} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 text-xs text-gray-600">
        <span>Low</span>
        <div className="h-3 w-40 rounded" style={{ background: 'linear-gradient(to right, rgb(239,68,68), rgb(251,191,36), rgb(16,185,129))' }} />
        <span>High</span>
      </div>
    </div>
  );
}

function Row({ row }: { row: Row }) {
  return (
    <>
      <div className="text-xs font-medium text-gray-800 px-2 py-1 flex items-center">{row.cohort}</div>
      {row.cells.map((c, i) => (
        <div
          key={i}
          className="h-10 rounded flex items-center justify-center text-xs font-semibold"
          style={{
            background: engagementColor(c.engagement),
            color: c.engagement === null ? '#9ca3af' : c.engagement > 50 ? '#0f172a' : '#fff',
          }}
          title={`${row.cohort} ${c.week}: ${c.engagement ?? '—'}% (${c.contacts} contacts)`}
        >
          {c.engagement === null ? '—' : `${c.engagement}%`}
        </div>
      ))}
    </>
  );
}
