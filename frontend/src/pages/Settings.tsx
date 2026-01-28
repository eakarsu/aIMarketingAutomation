import React, { useEffect, useState } from 'react';
import { UserCircleIcon, BellIcon, KeyIcon, PaintBrushIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({ name: '', email: '', company: '', phone: '', timezone: 'America/New_York' });

  // Password State
  const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });

  // Notifications State
  const [notifications, setNotifications] = useState({
    emailCampaigns: true,
    emailReviews: true,
    emailWeekly: true,
    pushCampaigns: false,
    pushReviews: true,
  });

  // Branding State
  const [branding, setBranding] = useState({ primaryColor: '#3B82F6', logo: '', companyName: '', tagline: '' });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', email: user.email || '', company: user.company || '', phone: user.phone || '', timezone: user.timezone || 'America/New_York' });
      setBranding(prev => ({ ...prev, companyName: user.company || '' }));
    }
  }, [user]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(profile);
      toast.success('Profile updated successfully');
    } catch (error) { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.newPassword) { toast.error('Please fill in all password fields'); return; }
    if (passwords.newPassword !== passwords.confirm) { toast.error('New passwords do not match'); return; }
    if (passwords.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPassword });
      toast.success('Password changed successfully');
      setPasswords({ current: '', newPassword: '', confirm: '' });
    } catch (error) { toast.error('Failed to change password'); }
    finally { setSaving(false); }
  };

  const handleNotificationsSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateNotifications(notifications);
      toast.success('Notification preferences saved');
    } catch (error) { toast.error('Failed to save preferences'); }
    finally { setSaving(false); }
  };

  const handleBrandingSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateBranding(branding);
      toast.success('Branding settings saved');
    } catch (error) { toast.error('Failed to save branding'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'password', name: 'Password', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'branding', name: 'Branding', icon: PaintBrushIcon },
  ];

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (AZ)' },
    { value: 'America/Anchorage', label: 'Alaska (AK)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              <p className="mt-1 text-sm text-gray-500">Update your account information and preferences.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <input type="text" value={profile.company} onChange={e => setProfile({...profile, company: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <select value={profile.timezone} onChange={e => setProfile({...profile, timezone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  {timezones.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleProfileSave} disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        );
      case 'password':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <p className="mt-1 text-sm text-gray-500">Ensure your account is using a secure password.</p>
            </div>
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input type="password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handlePasswordChange} disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
              <p className="mt-1 text-sm text-gray-500">Choose how you want to receive notifications.</p>
            </div>
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Email Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" checked={notifications.emailCampaigns} onChange={e => setNotifications({...notifications, emailCampaigns: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    <span className="ml-3 text-sm text-gray-700">Campaign performance updates</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={notifications.emailReviews} onChange={e => setNotifications({...notifications, emailReviews: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    <span className="ml-3 text-sm text-gray-700">New review alerts</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={notifications.emailWeekly} onChange={e => setNotifications({...notifications, emailWeekly: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    <span className="ml-3 text-sm text-gray-700">Weekly performance digest</span>
                  </label>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Push Notifications</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" checked={notifications.pushCampaigns} onChange={e => setNotifications({...notifications, pushCampaigns: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    <span className="ml-3 text-sm text-gray-700">Campaign alerts</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" checked={notifications.pushReviews} onChange={e => setNotifications({...notifications, pushReviews: e.target.checked})} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    <span className="ml-3 text-sm text-gray-700">Review notifications</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleNotificationsSave} disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        );
      case 'branding':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Branding Settings</h3>
              <p className="mt-1 text-sm text-gray-500">Customize the look and feel of your marketing materials.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input type="text" value={branding.companyName} onChange={e => setBranding({...branding, companyName: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tagline</label>
                <input type="text" value={branding.tagline} onChange={e => setBranding({...branding, tagline: e.target.value})} placeholder="Your company tagline" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="mt-1 flex items-center space-x-3">
                  <input type="color" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} className="h-10 w-20 rounded border border-gray-300 cursor-pointer" />
                  <input type="text" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                <input type="url" value={branding.logo} onChange={e => setBranding({...branding, logo: e.target.value})} placeholder="https://..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
            </div>
            {branding.logo && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Preview</label>
                <img src={branding.logo} alt="Logo preview" className="h-16 object-contain" />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleBrandingSave} disabled={saving} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Branding'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={"flex items-center px-6 py-4 text-sm font-medium border-b-2 " + (activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
