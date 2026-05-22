import { useEffect, useState } from 'react';
import {
  FunnelChart,
  Funnel,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface FunnelStage {
  stage: string;
  value: number;
  color: string;
}
interface FunnelData {
  stages: FunnelStage[];
  summary: { openRate: string; clickRate: string; conversionRate: string; overall: string };
  generatedAt: string;
}

export default function CampaignFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/funnel', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 text-sm" data-testid="cf-error">Error: {error}</div>;
  if (!data) return <div className="text-gray-500 text-sm" data-testid="cf-loading">Loading funnel…</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="campaign-funnel">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Funnel</h2>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Metric label="Open rate" value={data.summary.openRate} />
        <Metric label="Click rate" value={data.summary.clickRate} />
        <Metric label="Conversion rate" value={data.summary.conversionRate} />
        <Metric label="Overall (sent → conv.)" value={data.summary.overall} />
      </div>
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="value" data={data.stages} isAnimationActive>
              {data.stages.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
              <LabelList position="right" fill="#111827" stroke="none" dataKey="stage" />
              <LabelList position="left" fill="#111827" stroke="none" dataKey="value" />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-3">Generated {new Date(data.generatedAt).toLocaleString()}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}
