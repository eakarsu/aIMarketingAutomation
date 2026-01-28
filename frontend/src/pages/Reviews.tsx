import React, { useEffect, useState } from 'react';
import { PlusIcon, StarIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { reviewsAPI, aiAPI, optionsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [responseModal, setResponseModal] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({ platform: 'GOOGLE', rating: 5, content: '', authorName: '' });

  useEffect(() => { fetchReviews(); fetchStats(); fetchPlatforms(); fetchStatuses(); }, [platformFilter, statusFilter]);

  const fetchReviews = async () => {
    try {
      const params: any = {};
      if (platformFilter) params.platform = platformFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await reviewsAPI.getAll(params);
      setReviews(response.data);
    } catch (error) { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const response = await reviewsAPI.getStats();
      setStats(response.data);
    } catch (error) { console.error('Failed to load stats'); }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await optionsAPI.getReviewPlatforms();
      setPlatforms(response.data);
    } catch (error) { console.error('Failed to load platforms'); }
  };

  const fetchStatuses = async () => {
    try {
      const response = await optionsAPI.getReviewStatuses();
      setStatuses(response.data);
    } catch (error) { console.error('Failed to load statuses'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reviewsAPI.create(formData);
      toast.success('Review added');
      setShowModal(false);
      setFormData({ platform: 'GOOGLE', rating: 5, content: '', authorName: '' });
      fetchReviews();
      fetchStats();
    } catch (error) { toast.error('Failed to add review'); }
  };

  const handleRespond = async (id: string) => {
    if (!response.trim()) { toast.error('Please enter a response'); return; }
    try {
      await reviewsAPI.respond(id, response);
      toast.success('Response added');
      setResponseModal(null);
      setResponse('');
      fetchReviews();
    } catch (error) { toast.error('Failed to add response'); }
  };

  const handleIgnore = async (id: string) => {
    try {
      await reviewsAPI.ignore(id);
      toast.success('Review ignored');
      fetchReviews();
    } catch (error) { toast.error('Failed to ignore review'); }
  };

  const generateAIResponse = async (review: any) => {
    setGenerating(true);
    try {
      const result = await aiAPI.generateReviewResponse({ reviewContent: review.content, rating: review.rating, authorName: review.authorName });
      setResponse(result.data.response);
    } catch (error) { toast.error('Failed to generate response'); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Reviews</h1><p className="mt-1 text-sm text-gray-500">Monitor and respond to customer reviews</p></div>
        <button onClick={() => setShowModal(true)} className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> Add Review
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Total Reviews</p><p className="text-2xl font-bold">{stats.total}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Average Rating</p><p className="text-2xl font-bold text-yellow-500">{stats.avgRating}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-orange-500">{stats.byStatus?.pending || 0}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Responded</p><p className="text-2xl font-bold text-green-500">{stats.byStatus?.responded || 0}</p></div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
            <option value="">All Platforms</option>
            {platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {reviews.length === 0 ? (
          <div className="text-center py-12"><StarIcon className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">No reviews</h3></div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reviews.map(review => (
              <div key={review.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <div className="flex">{[1,2,3,4,5].map(star => <StarIcon key={star} className={"h-5 w-5 " + (star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300')} />)}</div>
                      <span className="ml-2 text-sm text-gray-500">{review.platform}</span>
                      <span className={"ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (review.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : review.status === 'RESPONDED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{review.status}</span>
                    </div>
                    <p className="text-gray-900 mb-2">{review.content}</p>
                    <p className="text-sm text-gray-500"> {review.authorName} " {new Date(review.createdAt).toLocaleDateString()}</p>
                    {review.response && (
                      <div className="mt-4 pl-4 border-l-2 border-primary-500 bg-gray-50 p-3 rounded"><p className="text-sm font-medium text-gray-700">Your Response:</p><p className="text-sm text-gray-600">{review.response}</p></div>
                    )}
                  </div>
                  {review.status === 'PENDING' && (
                    <div className="ml-4 flex flex-col space-y-2">
                      <button onClick={() => { setResponseModal(review); setResponse(''); }} className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700">Respond</button>
                      <button onClick={() => handleIgnore(review.id)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Ignore</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Review</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Platform</label><select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">{platforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700">Author Name</label><input type="text" required value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Rating</label><select value={formData.rating} onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"><option value={5}>5 Stars</option><option value={4}>4 Stars</option><option value={3}>3 Stars</option><option value={2}>2 Stars</option><option value={1}>1 Star</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700">Content</label><textarea required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" /></div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">Add Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {responseModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Respond to Review</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded"><p className="text-sm text-gray-600">{responseModal.content}</p><p className="text-xs text-gray-500 mt-1"> {responseModal.authorName}</p></div>
            <div className="mb-4"><button type="button" onClick={() => generateAIResponse(responseModal)} disabled={generating} className="text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50">{generating ? 'Generating...' : 'Generate AI Response'}</button></div>
            <textarea value={response} onChange={e => setResponse(e.target.value)} rows={4} placeholder="Write your response..." className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
            <div className="flex justify-end space-x-3 mt-4">
              <button type="button" onClick={() => setResponseModal(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleRespond(responseModal.id)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700">Submit Response</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
