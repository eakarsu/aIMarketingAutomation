import { useEffect, useState } from 'react';
import { EnvelopeOpenIcon, CursorArrowRaysIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { analyticsAPI, exportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../components/Skeleton';

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [roi, setROI] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => { fetchAnalytics(); }, [period]);

  const fetchAnalytics = async () => {
    try {
      const [dashboardRes, roiRes] = await Promise.all([analyticsAPI.getDashboard(period), analyticsAPI.getROI()]);
      setData(dashboardRes.data);
      setROI(roiRes.data);
    } catch (error) { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  const handleExportPDF = async () => {
    try {
      const { data } = await exportAPI.analyticsPDF();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'analytics.pdf';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  if (loading) return <CardSkeleton count={4} />;

  const stats = [
    { name: 'Total Sent', value: data?.email?.totalSent || 0, icon: EnvelopeOpenIcon, color: 'text-blue-600' },
    { name: 'Open Rate', value: (data?.email?.openRate || 0) + '%', icon: EnvelopeOpenIcon, color: 'text-green-600' },
    { name: 'Click Rate', value: (data?.email?.clickRate || 0) + '%', icon: CursorArrowRaysIcon, color: 'text-purple-600' },
    { name: 'Conversions', value: roi?.totals?.conversions || 0, icon: ArrowTrendingUpIcon, color: 'text-orange-600' },
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Analytics</h1><p className="mt-1 text-sm text-gray-500">Track your marketing performance</p></div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <select value={period} onChange={e => setPeriod(parseInt(e.target.value))} className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map(stat => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0"><stat.icon className={"h-10 w-10 " + stat.color} /></div>
                <div className="ml-5 w-0 flex-1">
                  <dl><dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt><dd className="text-3xl font-semibold text-gray-900">{stat.value}</dd></dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Total Sent</span><span className="text-sm font-medium">{data?.email?.totalSent || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Opened</span><span className="text-sm font-medium">{data?.email?.totalOpened || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Clicked</span><span className="text-sm font-medium">{data?.email?.totalClicked || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Bounced</span><span className="text-sm font-medium">{data?.email?.totalBounced || 0}</span></div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700">Open Rate</span><span className="text-lg font-bold text-green-600">{data?.email?.openRate || 0}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-green-600 h-2 rounded-full" style={{ width: (data?.email?.openRate || 0) + '%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between items-center"><span className="text-sm font-medium text-gray-700">Click Rate</span><span className="text-lg font-bold text-purple-600">{data?.email?.clickRate || 0}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-purple-600 h-2 rounded-full" style={{ width: (data?.email?.clickRate || 0) + '%' }}></div></div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">ROI Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Total Revenue</span><span className="text-2xl font-bold text-green-600">${(roi?.totals?.revenue || 0).toFixed(2)}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Total Conversions</span><span className="text-lg font-medium">{roi?.totals?.conversions || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Conversion Rate</span><span className="text-lg font-medium">{roi?.totals?.conversionRate || 0}%</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Revenue per Email</span><span className="text-lg font-medium">${roi?.totals?.revenuePerEmail || 0}</span></div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Growth</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Total Contacts</span><span className="text-2xl font-bold">{data?.contacts?.total || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">New This Period</span><span className="text-lg font-medium text-green-600">+{data?.contacts?.growth || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Growth Rate</span><span className="text-lg font-medium">{data?.contacts?.growthRate || 0}%</span></div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Automations & Reviews</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Active Automations</span><span className="text-lg font-medium">{data?.automations?.active || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Enrollments</span><span className="text-lg font-medium">{data?.automations?.enrollments || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Reviews Received</span><span className="text-lg font-medium">{data?.reviews?.total || 0}</span></div>
            <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Average Rating</span><span className="text-lg font-medium">{data?.reviews?.avgRating || 0} / 5</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
