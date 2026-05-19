import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import CampaignCreate from './pages/CampaignCreate';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import ContactCreate from './pages/ContactCreate';
import Segments from './pages/Segments';
import Tags from './pages/Tags';
import CustomFields from './pages/CustomFields';
import Templates from './pages/Templates';
import TemplateCreate from './pages/TemplateCreate';
import Automations from './pages/Automations';
import AutomationCreate from './pages/AutomationCreate';
import LandingPages from './pages/LandingPages';
import LandingPageCreate from './pages/LandingPageCreate';
import Forms from './pages/Forms';
import FormCreate from './pages/FormCreate';
import ImageLibrary from './pages/ImageLibrary';
import Analytics from './pages/Analytics';
import Reviews from './pages/Reviews';
import Integrations from './pages/Integrations';
import AITools from './pages/AITools';
import Settings from './pages/Settings';
import ABTestOrchestrator from './pages/ABTestOrchestrator';
import EngineStatus from './pages/EngineStatus';
import CustomViewsPage from './pages/CustomViewsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/campaigns/new" element={<CampaignCreate />} />
                    <Route path="/campaigns/:id" element={<CampaignDetail />} />
                    <Route path="/campaigns/:id/edit" element={<CampaignCreate />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/contacts/new" element={<ContactCreate />} />
                    <Route path="/contacts/:id" element={<ContactDetail />} />
                    <Route path="/contacts/:id/edit" element={<ContactCreate />} />
                    <Route path="/segments" element={<Segments />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/custom-fields" element={<CustomFields />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/templates/new" element={<TemplateCreate />} />
                    <Route path="/templates/:id/edit" element={<TemplateCreate />} />
                    <Route path="/automations" element={<Automations />} />
                    <Route path="/automations/new" element={<AutomationCreate />} />
                    <Route path="/automations/:id/edit" element={<AutomationCreate />} />
                    <Route path="/landing-pages" element={<LandingPages />} />
                    <Route path="/landing-pages/new" element={<LandingPageCreate />} />
                    <Route path="/landing-pages/:id/edit" element={<LandingPageCreate />} />
                    <Route path="/forms" element={<Forms />} />
                    <Route path="/forms/new" element={<FormCreate />} />
                    <Route path="/forms/:id/edit" element={<FormCreate />} />
                    <Route path="/images" element={<ImageLibrary />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/ai-tools" element={<AITools />} />
                    <Route path="/ab-test" element={<ABTestOrchestrator />} />
                    <Route path="/engine-status" element={<EngineStatus />} />
                    <Route path="/custom-views" element={<CustomViewsPage />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </ErrorBoundary>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
