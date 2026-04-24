import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { contactsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchContact();
  }, [id]);

  const fetchContact = async () => {
    try {
      const response = await contactsAPI.getOne(id!);
      setContact(response.data);
    } catch (error) {
      toast.error('Failed to load contact');
      navigate('/contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactsAPI.delete(id!);
      toast.success('Contact deleted');
      navigate('/contacts');
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const handleOptOut = async () => {
    if (!confirm('Opt out this contact from all communications?')) return;
    try {
      await contactsAPI.optOut(id!);
      toast.success('Contact opted out');
      fetchContact();
    } catch (error) {
      toast.error('Failed to opt out');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!contact) return null;

  return (
    <div>
      <div className="mb-6">
        <Link to="/contacts" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Back to Contacts
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
            <p className="text-sm text-gray-500">{contact.email}</p>
          </div>
          <div className="flex space-x-3">
            <Link to={"/contacts/" + id + "/edit"} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <PencilIcon className="h-5 w-5 mr-2" /> Edit
            </Link>
            {contact.status === 'ACTIVE' && (
              <button onClick={handleOptOut} className="px-4 py-2 border border-orange-300 rounded-md text-sm font-medium text-orange-700 hover:bg-orange-50">Opt Out</button>
            )}
            <button onClick={handleDelete} className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50">
              <TrashIcon className="h-5 w-5 mr-2" /> Delete
            </button>
          </div>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-gray-500">Status</p><span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (contact.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{contact.status}</span></div>
          <div><p className="text-sm text-gray-500">Phone</p><p className="text-lg font-medium">{contact.phone || 'N/A'}</p></div>
          <div><p className="text-sm text-gray-500">Company</p><p className="text-lg font-medium">{contact.company || 'N/A'}</p></div>
          <div><p className="text-sm text-gray-500">Source</p><p className="text-lg font-medium">{contact.source || 'N/A'}</p></div>
        </div>
      </div>

      {contact.tags?.length > 0 && (
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((ct: any) => (
              <span key={ct.tag.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: ct.tag.color + '20', color: ct.tag.color }}>{ct.tag.name}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity History</h3>
        {contact.campaignRecipients?.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {contact.campaignRecipients.map((cr: any) => (
              <li key={cr.id} className="py-3 flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900">{cr.campaign?.name}</p><p className="text-sm text-gray-500">{cr.status}</p></div>
                <p className="text-sm text-gray-500">{cr.sentAt ? new Date(cr.sentAt).toLocaleDateString() : 'Pending'}</p>
              </li>
            ))}
          </ul>
        ) : (<p className="text-gray-500 text-center py-4">No activity yet</p>)}
      </div>
    </div>
  );
}
