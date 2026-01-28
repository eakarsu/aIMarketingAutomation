import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  RectangleStackIcon,
  PencilIcon,
  FunnelIcon,
  BoltIcon,
  UserGroupIcon,
  ClockIcon,
  CogIcon,
  ArrowPathIcon,
  SparklesIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { automationsAPI, optionsAPI } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; dotColor: string }> = {
  ACTIVE: { color: 'text-green-700', bgColor: 'bg-green-50', dotColor: 'bg-green-500' },
  PAUSED: { color: 'text-yellow-700', bgColor: 'bg-yellow-50', dotColor: 'bg-yellow-500' },
  DRAFT: { color: 'text-gray-700', bgColor: 'bg-gray-50', dotColor: 'bg-gray-400' },
  COMPLETED: { color: 'text-blue-700', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500' },
};

const TYPE_ICONS: Record<string, any> = {
  WELCOME_SERIES: SparklesIcon,
  DRIP_CAMPAIGN: EnvelopeIcon,
  RE_ENGAGEMENT: ArrowPathIcon,
  BIRTHDAY: SparklesIcon,
  ABANDONED_CART: RectangleStackIcon,
};

export default function Automations() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [types, setTypes] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomations();
    fetchOptions();
  }, [typeFilter, statusFilter]);

  const fetchAutomations = async () => {
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await automationsAPI.getAll(params);
      setAutomations(response.data);
    } catch (error) {
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [typesRes, statusesRes] = await Promise.all([
        optionsAPI.getAutomationTypes(),
        optionsAPI.getAutomationStatuses(),
      ]);
      setTypes(typesRes.data);
      setStatuses(statusesRes.data);
    } catch (error) {
      console.error('Failed to fetch options');
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try {
      await automationsAPI.activate(id);
      toast.success('Automation activated successfully');
      fetchAutomations();
    } catch (error) {
      toast.error('Failed to activate automation');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    setActionLoading(id);
    try {
      await automationsAPI.pause(id);
      toast.success('Automation paused successfully');
      fetchAutomations();
    } catch (error) {
      toast.error('Failed to pause automation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await automationsAPI.delete(id);
      toast.success('Automation deleted successfully');
      fetchAutomations();
    } catch (error) {
      toast.error('Failed to delete automation');
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  };

  const getTypeIcon = (type: string) => {
    return TYPE_ICONS[type] || BoltIcon;
  };

  const activeCount = automations.filter((a) => a.status === 'ACTIVE').length;
  const totalSteps = automations.reduce((sum, a) => sum + (a._count?.steps || 0), 0);
  const totalEnrollments = automations.reduce((sum, a) => sum + (a._count?.enrollments || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Automated marketing workflows that run on autopilot
            </p>
          </div>
          <Link
            to="/automations/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Automation
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-50">
              <BoltIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Automations</p>
              <p className="text-2xl font-bold text-gray-900">{automations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50">
              <PlayIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-50">
              <CogIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Steps</p>
              <p className="text-2xl font-bold text-gray-900">{totalSteps}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50">
              <UserGroupIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">{totalEnrollments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-gray-500">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters:
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {(typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setTypeFilter('');
                setStatusFilter('');
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Automations Grid */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">
            All Automations
            {(typeFilter || statusFilter) && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({automations.length} result{automations.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
        </div>
        {automations.length === 0 ? (
          <div className="text-center py-16">
            <BoltIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No automations yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Automations help you engage contacts automatically. Create your first automation to get started.
            </p>
            <Link
              to="/automations/new"
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Your First Automation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
            {automations.map((auto) => {
              const statusConfig = getStatusConfig(auto.status);
              const TypeIcon = getTypeIcon(auto.type);
              return (
                <div
                  key={auto.id}
                  className="group relative border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                        <TypeIcon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/automations/${auto.id}/edit`}
                            className="text-base font-semibold text-gray-900 hover:text-primary-600"
                          >
                            {auto.name}
                          </Link>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} mr-1.5`} />
                            {auto.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {auto.description || types.find((t) => t.value === auto.type)?.label || auto.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {auto.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handlePause(auto.id)}
                          disabled={actionLoading === auto.id}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Pause automation"
                        >
                          <PauseIcon className={`h-4 w-4 ${actionLoading === auto.id ? 'animate-pulse' : ''}`} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(auto.id)}
                          disabled={actionLoading === auto.id}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Activate automation"
                        >
                          <PlayIcon className={`h-4 w-4 ${actionLoading === auto.id ? 'animate-pulse' : ''}`} />
                        </button>
                      )}
                      <Link
                        to={`/automations/${auto.id}/edit`}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit automation"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(auto.id, auto.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete automation"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <CogIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-medium text-gray-900">{auto._count?.steps || 0}</span>
                        <span className="ml-1">steps</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                        <span className="font-medium text-gray-900">{auto._count?.enrollments || 0}</span>
                        <span className="ml-1">enrolled</span>
                      </div>
                    </div>
                    {auto.createdAt && (
                      <div className="flex items-center text-xs text-gray-400">
                        <ClockIcon className="h-3.5 w-3.5 mr-1" />
                        {new Date(auto.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Visual Workflow Indicator */}
                  {auto._count?.steps > 0 && (
                    <div className="mt-3 flex items-center gap-1">
                      {Array.from({ length: Math.min(auto._count.steps, 6) }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 flex-1 rounded-full ${
                            auto.status === 'ACTIVE' ? 'bg-green-400' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                      {auto._count.steps > 6 && (
                        <span className="text-xs text-gray-400">+{auto._count.steps - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
