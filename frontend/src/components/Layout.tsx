import { useState, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Menu, Transition } from '@headlessui/react';
import {
  HomeIcon,
  MegaphoneIcon,
  UsersIcon,
  TagIcon,
  RectangleGroupIcon,
  EnvelopeIcon,
  CogIcon,
  Bars3Icon,
  ChartBarIcon,
  StarIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  PhotoIcon,
  DocumentTextIcon,
  RectangleStackIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Contacts', href: '/contacts', icon: UsersIcon },
  { name: 'Segments', href: '/segments', icon: RectangleGroupIcon },
  { name: 'Tags', href: '/tags', icon: TagIcon },
  { name: 'Custom Fields', href: '/custom-fields', icon: AdjustmentsHorizontalIcon },
  { name: 'Templates', href: '/templates', icon: EnvelopeIcon },
  { name: 'Automations', href: '/automations', icon: RectangleStackIcon },
  { name: 'Landing Pages', href: '/landing-pages', icon: DocumentTextIcon },
  { name: 'Forms', href: '/forms', icon: DocumentTextIcon },
  { name: 'Image Library', href: '/images', icon: PhotoIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Reviews', href: '/reviews', icon: StarIcon },
  { name: 'Integrations', href: '/integrations', icon: PuzzlePieceIcon, adminOnly: true },
  { name: 'AI Tools', href: '/ai-tools', icon: SparklesIcon },
  { name: 'A/B Test Orchestrator', href: '/ab-test', icon: SparklesIcon },
  { name: 'Engine Status', href: '/engine-status', icon: CogIcon },
] as const;

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleVerifyEmail = async () => {
    try {
      const { data } = await authAPI.sendVerification();
      if (data.token) {
        await authAPI.verifyEmail(data.token);
        toast.success('Email verified!');
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to verify email');
    }
  };

  const filteredNav = navigation.filter((item) => {
    if ('adminOnly' in item && item.adminOnly && user?.role !== 'ADMIN') return false;
    return true;
  });

  return (
    <div>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <SparklesIcon className="h-8 w-8 text-primary-600" />
                    <span className="ml-2 text-xl font-bold text-gray-900">AI Marketing</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {filteredNav.map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={classNames(
                                  location.pathname === item.href
                                    ? 'bg-gray-100 text-primary-600'
                                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                )}
                              >
                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <SparklesIcon className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">AI Marketing</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNav.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={classNames(
                          location.pathname === item.href
                            ? 'bg-gray-100 text-primary-600'
                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <Link
                  to="/settings"
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                >
                  <CogIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Profile dropdown */}
              <Menu as="div" className="relative">
                <Menu.Button className="-m-1.5 flex items-center p-1.5">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                    {user?.firstName?.[0] || 'U'}
                  </div>
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      className="ml-4 text-sm font-semibold leading-6 text-gray-900"
                      aria-hidden="true"
                    >
                      {user?.firstName} {user?.lastName}
                    </span>
                  </span>
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={classNames(
                            active ? 'bg-gray-50' : '',
                            'block px-3 py-1 text-sm leading-6 text-gray-900'
                          )}
                        >
                          Settings
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={classNames(
                            active ? 'bg-gray-50' : '',
                            'block w-full text-left px-3 py-1 text-sm leading-6 text-gray-900'
                          )}
                        >
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>

        {/* Email verification banner */}
        {user && user.emailVerified === false && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">Your email is not verified.</p>
              </div>
              <button
                onClick={handleVerifyEmail}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                Verify now
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
