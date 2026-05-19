import CampaignFunnel from '../components/CampaignFunnel';
import CohortEngagement from '../components/CohortEngagement';
import WorkflowBuilder from '../components/WorkflowBuilder';
import EmailTemplateEditor from '../components/EmailTemplateEditor';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6" data-testid="custom-views-page">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Automation Views</h1>
        <p className="text-sm text-gray-500">
          Funnel & cohort visualizations, plus tooling to build drip workflows and email templates.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CampaignFunnel />
        <CohortEngagement />
      </div>

      <WorkflowBuilder />
      <EmailTemplateEditor />
    </div>
  );
}
