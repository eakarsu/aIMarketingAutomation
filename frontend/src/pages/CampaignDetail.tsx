import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { campaignsAPI, analyticsAPI, governanceAPI } from '../services/api';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  type: string;
  status: string;
  templateId?: string;
  segmentId?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  approvalStatus: string;
  aiGenerated?: boolean;
  sensitiveSegment?: boolean;
  outreachApproval?: { status: string; comment?: string };
  deliveryJobs?: DeliveryJob[];
}

interface Analytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

interface Recipient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  contact?: { email: string; firstName?: string; lastName?: string };
}

interface DeliveryJob {
  id: string;
  status: string;
  channel: string;
  attempt: number;
  provider?: string;
  sentAt?: string;
  error?: { code?: string; message?: string };
  policyDecision?: { reasons?: string[] };
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaign();
      fetchAnalytics();
    }
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const response = await campaignsAPI.getOne(id!);
      setCampaign(response.data);
      setRecipients(response.data.recipients || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getCampaign(id!);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleSend = async () => {
    if (!confirm('Are you sure you want to send this campaign?')) return;

    setIsSending(true);
    try {
      const response = await campaignsAPI.send(id!);
      toast.success(`${response.data.queued} delivery job(s) queued; ${response.data.blocked} blocked by policy`);
      fetchCampaign();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  const handleApprovalRequest = async () => {
    setIsRequestingApproval(true);
    try {
      await governanceAPI.requestApproval(id!, { audienceReviewed: true });
      toast.success('Approval request recorded');
      await fetchCampaign();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not request approval');
    } finally {
      setIsRequestingApproval(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await campaignsAPI.duplicate(id!);
      toast.success('Campaign duplicated');
      navigate(`/campaigns/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to duplicate campaign');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      await campaignsAPI.delete(id!);
      toast.success('Campaign deleted');
      navigate('/campaigns');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete campaign');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!campaign) return null;

  const statCards = [
    { name: 'Sent', value: analytics?.sent || 0, icon: EnvelopeIcon, color: 'text-blue-600' },
    { name: 'Delivered', value: analytics?.delivered || 0, icon: EnvelopeIcon, color: 'text-green-600' },
    { name: 'Opened', value: analytics?.opened || 0, icon: EnvelopeOpenIcon, color: 'text-purple-600' },
    { name: 'Clicked', value: analytics?.clicked || 0, icon: CursorArrowRaysIcon, color: 'text-orange-600' },
  ];

  const rateCards = [
    { name: 'Open Rate', value: `${analytics?.openRate || 0}%`, color: 'text-purple-600' },
    { name: 'Click Rate', value: `${analytics?.clickRate || 0}%`, color: 'text-orange-600' },
    { name: 'Bounce Rate', value: `${analytics?.bounceRate || 0}%`, color: 'text-red-600' },
    { name: 'Unsubscribe Rate', value: `${analytics?.unsubscribeRate || 0}%`, color: 'text-gray-600' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link to="/campaigns" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Campaigns
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {campaign.type} - {campaign.status}
            </p>
          </div>
          <div className="flex gap-2">
            {['NOT_REQUIRED', 'REJECTED'].includes(campaign.approvalStatus) && (campaign.aiGenerated || campaign.sensitiveSegment) && (
              <button onClick={handleApprovalRequest} disabled={isRequestingApproval} className="inline-flex items-center px-4 py-2 border border-amber-300 shadow-sm text-sm font-medium rounded-md text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50">
                {isRequestingApproval ? 'Requesting...' : 'Request approval'}
              </button>
            )}
            {campaign.status === 'DRAFT' && (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Now'}
              </button>
            )}
            <Link
              to={`/campaigns/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDuplicate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
              Duplicate
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Details</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Subject Line</dt>
              <dd className="mt-1 text-sm text-gray-900">{campaign.subject}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{campaign.type}</dd>
            </div>
            {campaign.scheduledAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Scheduled For</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(campaign.scheduledAt).toLocaleString()}
                </dd>
              </div>
            )}
            {campaign.sentAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Sent At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(campaign.sentAt).toLocaleString()}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(campaign.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Human review</dt>
              <dd className="mt-1 text-sm text-gray-900">{campaign.approvalStatus || 'NOT_REQUIRED'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delivery operations</h3>
          <p className="text-sm text-gray-500 mb-4">Provider acceptance is shown as SENT. DELIVERED appears only after a verified provider callback.</p>
          {(campaign.deliveryJobs || []).length === 0 ? (
            <p className="text-sm text-gray-500">No delivery jobs have been queued.</p>
          ) : (
            <div className="space-y-2">
              {(campaign.deliveryJobs || []).slice(0, 20).map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded border border-gray-200 p-3 text-sm">
                  <div><span className="font-medium">{job.channel}</span><span className="ml-2 text-gray-500">attempt {job.attempt}</span>{job.error?.message && <p className="text-red-700">{job.error.code}: {job.error.message}</p>}</div>
                  <span className="rounded bg-gray-100 px-2 py-1 font-medium">{job.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Stats */}
      {campaign.status === 'SENT' && (
        <>
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <stat.icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                          <dd className="text-2xl font-semibold text-gray-900">{stat.value}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Rates</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rateCards.map((card) => (
                <div key={card.name} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                    <dd className={`text-3xl font-semibold ${card.color}`}>{card.value}</dd>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recipients List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recipients ({recipients.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicked
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recipients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No recipients yet
                    </td>
                  </tr>
                ) : (
                  recipients.map((recipient) => (
                    <tr key={recipient.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {recipient.contact?.firstName || recipient.firstName} {recipient.contact?.lastName || recipient.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{recipient.contact?.email || recipient.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          recipient.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          recipient.status === 'BOUNCED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {recipient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recipient.openedAt ? new Date(recipient.openedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recipient.clickedAt ? new Date(recipient.clickedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
