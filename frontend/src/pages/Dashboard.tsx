import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import { dashboardAPI } from '../services/api';
import toast from 'react-hot-toast';

interface DashboardData {
  stats: {
    contacts: { total: number; active: number; newThisMonth: number };
    campaigns: { total: number; active: number; sent: number };
    automations: { total: number; active: number };
    templates: { total: number };
    reviews: { pending: number; avgRating: string };
    performance: { totalSent: number; openRate: string; clickRate: string };
  };
  recent: {
    campaigns: any[];
    contacts: any[];
    reviews: any[];
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getOverview();
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = data?.stats || {
    contacts: { total: 0, active: 0, newThisMonth: 0 },
    campaigns: { total: 0, active: 0, sent: 0 },
    automations: { total: 0, active: 0 },
    templates: { total: 0 },
    reviews: { pending: 0, avgRating: '0' },
    performance: { totalSent: 0, openRate: '0', clickRate: '0' },
  };

  const statCards = [
    {
      name: 'Total Contacts',
      value: stats.contacts.total,
      change: `+${stats.contacts.newThisMonth} this month`,
      icon: UsersIcon,
      color: 'bg-blue-500',
      link: '/contacts',
    },
    {
      name: 'Active Campaigns',
      value: stats.campaigns.active,
      change: `${stats.campaigns.sent} sent`,
      icon: MegaphoneIcon,
      color: 'bg-green-500',
      link: '/campaigns',
    },
    {
      name: 'Active Automations',
      value: stats.automations.active,
      change: `of ${stats.automations.total} total`,
      icon: RectangleStackIcon,
      color: 'bg-purple-500',
      link: '/automations',
    },
    {
      name: 'Pending Reviews',
      value: stats.reviews.pending,
      change: `Avg rating: ${stats.reviews.avgRating}`,
      icon: StarIcon,
      color: 'bg-yellow-500',
      link: '/reviews',
    },
  ];

  const performanceCards = [
    {
      name: 'Emails Sent',
      value: stats.performance.totalSent,
      icon: EnvelopeOpenIcon,
    },
    {
      name: 'Open Rate',
      value: `${stats.performance.openRate}%`,
      icon: EnvelopeOpenIcon,
    },
    {
      name: 'Click Rate',
      value: `${stats.performance.clickRate}%`,
      icon: CursorArrowRaysIcon,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's an overview of your marketing performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    </dd>
                    <dd className="text-sm text-gray-500">{stat.change}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Performance Overview */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Performance</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {performanceCards.map((card) => (
              <div key={card.name} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <card.icon className="h-8 w-8 text-primary-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{card.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Campaigns */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Campaigns</h3>
              <Link to="/campaigns" className="text-sm text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {data?.recent.campaigns.length === 0 ? (
                  <li className="py-4 text-center text-gray-500">No campaigns yet</li>
                ) : (
                  data?.recent.campaigns.map((campaign: any) => (
                    <li key={campaign.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <MegaphoneIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {campaign.name}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {campaign.type} - {campaign.status}
                          </p>
                        </div>
                        <div>
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Contacts</h3>
              <Link to="/contacts" className="text-sm text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {data?.recent.contacts.length === 0 ? (
                  <li className="py-4 text-center text-gray-500">No contacts yet</li>
                ) : (
                  data?.recent.contacts.map((contact: any) => (
                    <li key={contact.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                            {contact.firstName?.[0] || contact.email[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="truncate text-sm text-gray-500">{contact.email}</p>
                        </div>
                        <div>
                          <Link
                            to={`/contacts/${contact.id}`}
                            className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white shadow rounded-lg lg:col-span-2">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Reviews</h3>
              <Link to="/reviews" className="text-sm text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {data?.recent.reviews.length === 0 ? (
                  <li className="py-4 text-center text-gray-500">No reviews yet</li>
                ) : (
                  data?.recent.reviews.map((review: any) => (
                    <li key={review.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= review.rating ? 'text-yellow-400' : 'text-gray-200'
                                }`}
                                fill={star <= review.rating ? 'currentColor' : 'none'}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {review.authorName}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {review.content?.substring(0, 100)}...
                          </p>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              review.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : review.status === 'RESPONDED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {review.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              to="/campaigns/new"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Create Campaign
            </Link>
            <Link
              to="/contacts/new"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Add Contact
            </Link>
            <Link
              to="/templates/new"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Create Template
            </Link>
            <Link
              to="/ai-tools"
              className="flex items-center justify-center px-4 py-3 border border-primary-300 shadow-sm text-sm font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100"
            >
              AI Tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
