import { useEffect, useState } from 'react';
import {
  SparklesIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ClockIcon,
  UserGroupIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  StarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  UsersIcon,
  HashtagIcon,
  WindowIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  EyeIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';
import { aiAPI, optionsAPI } from '../services/api';
import toast from 'react-hot-toast';

// Sample data presets for each AI tool
const SAMPLE_DATA: Record<string, { label: string; icon: string; data: Record<string, any> }[]> = {
  'content-writer': [
    { label: 'Summer Sale Blog', icon: '☀️', data: { contentType: 'blog', topic: 'Top 10 summer fashion trends for 2025 and how to style them on a budget', tone: 'casual', keywords: 'summer sale, fashion trends, affordable style, seasonal looks' } },
    { label: 'SaaS Email', icon: '📧', data: { contentType: 'email', topic: 'Announcing our new AI-powered analytics dashboard with real-time insights', tone: 'professional', keywords: 'analytics, AI, dashboard, real-time data, business intelligence' } },
    { label: 'Product Launch Ad', icon: '🚀', data: { contentType: 'ad', topic: 'Revolutionary wireless earbuds with 48-hour battery life and noise cancellation', tone: 'exciting', keywords: 'wireless earbuds, noise cancellation, long battery, premium audio' } },
  ],
  'subject-optimizer': [
    { label: 'Black Friday Sale', icon: '🏷️', data: { subjectContent: 'We are running a massive Black Friday sale with up to 70% off all products. Free shipping on orders over $50. Limited quantities available. Sale starts at midnight and runs for 48 hours only.', subjectCount: 5 } },
    { label: 'Webinar Invite', icon: '🎓', data: { subjectContent: 'Join our exclusive live webinar on scaling your e-commerce business in 2025. Learn proven strategies from industry experts. Limited to 200 seats. Includes free workbook and recording access.', subjectCount: 5 } },
    { label: 'Product Update', icon: '✨', data: { subjectContent: 'We just launched 5 new features including AI-powered recommendations, advanced reporting dashboard, team collaboration tools, custom workflows, and API integrations. Available now for all Pro plan users.', subjectCount: 5 } },
  ],
  'review-response': [
    { label: '5-Star Review', icon: '⭐', data: { reviewContent: 'Absolutely love this product! The quality is outstanding and customer service was incredibly helpful when I had questions. Shipping was fast and the packaging was perfect. Will definitely be ordering again!', reviewRating: 5, reviewAuthor: 'Sarah M.' } },
    { label: '2-Star Complaint', icon: '😟', data: { reviewContent: 'The product arrived late and the packaging was damaged. When I opened it, the color was different from what was shown online. Customer service took 3 days to respond. Disappointed with the overall experience.', reviewRating: 2, reviewAuthor: 'James K.' } },
    { label: '3-Star Mixed', icon: '🤔', data: { reviewContent: 'The product itself is decent quality but the price seems a bit high compared to competitors. Delivery was on time which was nice. The instructions could be clearer. It works but nothing exceptional.', reviewRating: 3, reviewAuthor: 'Lisa T.' } },
  ],
  'social-manager': [
    { label: 'Product Launch', icon: '🚀', data: { socialPlatform: 'instagram', socialTopic: 'We just launched our new eco-friendly water bottle made from 100% recycled materials. Available in 6 colors. For every bottle sold, we plant a tree!' } },
    { label: 'Behind the Scenes', icon: '🎬', data: { socialPlatform: 'linkedin', socialTopic: 'Our team just wrapped up a 3-month sprint to rebuild our platform from scratch. Here is what we learned about startup culture, remote work, and shipping fast.' } },
    { label: 'Holiday Promo', icon: '🎄', data: { socialPlatform: 'twitter', socialTopic: 'Holiday special! Get 30% off all plans this week only. Use code HOLIDAY30 at checkout. Perfect gift for your team!' } },
  ],
  'ad-creator': [
    { label: 'Fitness App', icon: '💪', data: { adPlatform: 'facebook', adProduct: 'FitTrack Pro - AI-powered fitness app with personalized workout plans and nutrition tracking', adAudience: 'Health-conscious adults aged 25-45 who go to the gym regularly' } },
    { label: 'Online Course', icon: '📚', data: { adPlatform: 'google', adProduct: 'MasterClass in Digital Marketing - 12-week comprehensive online certification course', adAudience: 'Marketing professionals and small business owners looking to upskill' } },
    { label: 'Coffee Brand', icon: '☕', data: { adPlatform: 'instagram', adProduct: 'Artisan Reserve Coffee - Single-origin specialty beans roasted fresh and delivered monthly', adAudience: 'Coffee enthusiasts aged 28-50 who appreciate premium quality' } },
  ],
  'send-time': [
    { label: 'E-commerce B2C', icon: '🛒', data: { sendTimeIndustry: 'E-commerce / Retail', sendTimeAudience: 'b2c', sendTimeCampaign: 'promotional' } },
    { label: 'SaaS B2B', icon: '💼', data: { sendTimeIndustry: 'SaaS / Technology', sendTimeAudience: 'b2b', sendTimeCampaign: 'newsletter' } },
    { label: 'Local Restaurant', icon: '🍕', data: { sendTimeIndustry: 'Food & Restaurant', sendTimeAudience: 'local', sendTimeCampaign: 'promotional' } },
  ],
  'audience-segmenter': [
    { label: 'Boost Sales', icon: '📈', data: { segmentGoal: 'Increase sales by targeting high-value customers who have purchased in the last 90 days and re-engaging those who have gone cold' } },
    { label: 'Reduce Churn', icon: '🔄', data: { segmentGoal: 'Reduce customer churn by identifying at-risk subscribers showing declining engagement and creating win-back segments' } },
    { label: 'New Product Launch', icon: '🆕', data: { segmentGoal: 'Identify early adopters and brand advocates for our upcoming product launch, focusing on engaged subscribers who match our ideal customer profile' } },
  ],
  'campaign-suggester': [
    { label: 'Online Fitness', icon: '🏋️', data: { campaignBusiness: 'Online fitness coaching platform with personalized workout and meal plans', campaignIndustry: 'Health & Fitness', campaignGoals: 'Increase monthly subscriptions by 30% and reduce churn rate', campaignSeason: 'winter' } },
    { label: 'Coffee E-commerce', icon: '☕', data: { campaignBusiness: 'Premium specialty coffee subscription box delivered monthly from around the world', campaignIndustry: 'Food & Beverage E-commerce', campaignGoals: 'Grow subscriber base and increase average order value by 20%', campaignSeason: 'holiday' } },
    { label: 'SaaS Startup', icon: '💻', data: { campaignBusiness: 'Project management SaaS tool for remote teams with AI task prioritization', campaignIndustry: 'Technology / SaaS', campaignGoals: 'Generate 500 new trial signups and improve trial-to-paid conversion', campaignSeason: '' } },
  ],
  'segment-builder': [
    { label: 'VIP Customers', icon: '👑', data: { segmentBuilderGoal: 'Identify VIP customers with highest lifetime value', segmentTargetAudience: 'Repeat purchasers who have spent over $500 and engaged with emails consistently', segmentBehaviors: 'Multiple purchases, high email open rates, clicked promotional links, left positive reviews' } },
    { label: 'Win-Back', icon: '💔', data: { segmentBuilderGoal: 'Win back lapsed customers who stopped engaging', segmentTargetAudience: 'Previously active customers who have not opened emails or made purchases in 60+ days', segmentBehaviors: 'No email opens in 60 days, no purchases in 90 days, previously had 3+ orders' } },
    { label: 'New Leads', icon: '🌱', data: { segmentBuilderGoal: 'Nurture new leads toward first purchase', segmentTargetAudience: 'Contacts who signed up in the last 14 days but have not made a purchase yet', segmentBehaviors: 'Recent signup, opened welcome email, browsed products, added to cart but did not buy' } },
  ],
  'journey-optimizer': [
    { label: 'Lead Nurture', icon: '🎯', data: { journeyType: 'lead-to-customer', journeyGoal: 'Convert free trial users to paying customers within 14 days with personalized onboarding', journeyCurrentStages: 'Sign up > Welcome email > Feature tour > Day 7 check-in' } },
    { label: 'Onboarding', icon: '🎉', data: { journeyType: 'onboarding', journeyGoal: 'Ensure new customers adopt key features within first 30 days to reduce churn', journeyCurrentStages: 'Purchase > Welcome > Setup guide > First success milestone' } },
    { label: 'Re-engagement', icon: '🔄', data: { journeyType: 're-engagement', journeyGoal: 'Re-activate dormant users with a 30-day win-back sequence', journeyCurrentStages: 'Identify inactive > We miss you email > Special offer > Last chance' } },
  ],
  'attribution-modeler': [
    { label: 'Full Channel Mix', icon: '📊', data: { attributionModelType: 'data-driven', attributionTimeframe: '30days', attributionChannels: ['Email', 'Social', 'Paid Search', 'Organic', 'Direct'] } },
    { label: 'First Touch Focus', icon: '🏁', data: { attributionModelType: 'first-touch', attributionTimeframe: '90days', attributionChannels: ['Email', 'Social Media', 'Content Marketing', 'Paid Ads', 'Referral'] } },
    { label: 'Last Touch Q1', icon: '🎯', data: { attributionModelType: 'last-touch', attributionTimeframe: 'year', attributionChannels: ['Email', 'Google Ads', 'Facebook Ads', 'Organic Search', 'Direct'] } },
  ],
  'budget-allocator': [
    { label: '$10K Startup', icon: '🚀', data: { budgetTotal: '10000', budgetGoals: 'Maximize brand awareness and generate initial leads for a new SaaS product launch', budgetChannels: ['Email', 'Social Ads', 'Content', 'PPC'] } },
    { label: '$50K Growth', icon: '📈', data: { budgetTotal: '50000', budgetGoals: 'Scale customer acquisition while maintaining ROI above 3x across all channels', budgetChannels: ['Email Marketing', 'Facebook Ads', 'Google Ads', 'Content Marketing', 'Influencer Marketing'] } },
    { label: '$5K Local Biz', icon: '🏪', data: { budgetTotal: '5000', budgetGoals: 'Drive foot traffic and local awareness for a new restaurant opening', budgetChannels: ['Social Media', 'Local SEO', 'Google Local Ads', 'Email'] } },
  ],
  'fatigue-detector': [
    { label: 'Last 30 Days', icon: '📅', data: { fatigueTimeframe: '30days' } },
    { label: 'Last 7 Days', icon: '⚡', data: { fatigueTimeframe: '7days' } },
    { label: 'Last 90 Days', icon: '📆', data: { fatigueTimeframe: '90days' } },
  ],
  'persona-creator': [
    { label: 'SaaS Decision Maker', icon: '💼', data: { personaIndustry: 'Technology / SaaS', personaTargetMarket: 'b2b', personaProductType: 'Project management software for enterprise teams' } },
    { label: 'E-commerce Shopper', icon: '🛍️', data: { personaIndustry: 'Fashion & Retail', personaTargetMarket: 'b2c', personaProductType: 'Online clothing store for millennial women' } },
    { label: 'Healthcare Pro', icon: '🏥', data: { personaIndustry: 'Healthcare', personaTargetMarket: 'b2b', personaProductType: 'Telemedicine platform for clinics and private practices' } },
  ],
  'influencer-matcher': [
    { label: 'Fitness Brand', icon: '💪', data: { influencerNiche: 'Fitness & Wellness', influencerPlatform: 'instagram', influencerBudget: '5000', influencerTargetAudience: 'Health-conscious adults aged 22-40 interested in home workouts' } },
    { label: 'Tech Startup', icon: '💻', data: { influencerNiche: 'Technology & SaaS', influencerPlatform: 'youtube', influencerBudget: '10000', influencerTargetAudience: 'Tech enthusiasts and startup founders aged 25-45' } },
    { label: 'Beauty Brand', icon: '💄', data: { influencerNiche: 'Beauty & Skincare', influencerPlatform: 'tiktok', influencerBudget: '3000', influencerTargetAudience: 'Gen Z and millennial women interested in clean beauty and skincare routines' } },
  ],
  'hashtag-generator': [
    { label: 'Digital Marketing', icon: '📱', data: { hashtagTopic: 'Digital Marketing Tips and Social Media Strategy', hashtagPlatform: 'instagram', hashtagCount: '20' } },
    { label: 'Startup Life', icon: '🚀', data: { hashtagTopic: 'Startup Culture, Entrepreneurship, and Building a Business', hashtagPlatform: 'linkedin', hashtagCount: '10' } },
    { label: 'Food & Cooking', icon: '🍳', data: { hashtagTopic: 'Healthy Recipes and Meal Prep Ideas for Busy Professionals', hashtagPlatform: 'tiktok', hashtagCount: '30' } },
  ],
  'landing-page-builder': [
    { label: 'SaaS Free Trial', icon: '🖥️', data: { landingPagePurpose: 'free-trial', landingPageIndustry: 'Technology / SaaS', landingPageAudience: 'Small business owners and marketing managers', landingPageProduct: 'MarketingPro AI' } },
    { label: 'Webinar Signup', icon: '🎤', data: { landingPagePurpose: 'webinar', landingPageIndustry: 'Education & Training', landingPageAudience: 'Marketing professionals looking to upskill', landingPageProduct: 'Growth Marketing Masterclass' } },
    { label: 'E-book Download', icon: '📖', data: { landingPagePurpose: 'ebook', landingPageIndustry: 'Finance & Investing', landingPageAudience: 'First-time investors and young professionals', landingPageProduct: 'The Smart Investor Guide 2025' } },
  ],
  'email-campaign-writer': [
    { label: 'Welcome Email', icon: '👋', data: { emailCampaignType: 'welcome', emailIndustry: 'E-commerce', emailAudience: 'New subscribers who just signed up', emailTone: 'warm', emailProduct: 'Fashion Boutique Online Store', emailGoal: 'Welcome new subscribers and drive first purchase with 15% discount', emailKeyMessages: 'Welcome gift, member benefits, curated picks' } },
    { label: 'Flash Sale', icon: '⚡', data: { emailCampaignType: 'promotional', emailIndustry: 'E-commerce / Retail', emailAudience: 'All active subscribers', emailTone: 'urgent', emailProduct: 'Multi-category online store', emailGoal: 'Drive maximum revenue in 24-hour window with deep discounts', emailKeyMessages: '60% off everything, 24 hours only, free shipping' } },
    { label: 'SaaS Product Launch', icon: '🚀', data: { emailCampaignType: 'product-launch', emailIndustry: 'SaaS / Technology', emailAudience: 'Existing customers and trial users', emailTone: 'exciting', emailProduct: 'AI-powered project management tool', emailGoal: 'Drive upgrades and trial signups for new version launch', emailKeyMessages: 'AI automation, 3x faster, new mobile app, early adopter pricing' } },
  ],
};

const AI_TOOLS = [
  // Original tools
  { id: 'content-writer', name: 'Content Writer', description: 'Generate marketing copy, blog posts, and ads', icon: DocumentTextIcon, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', category: 'content' },
  { id: 'subject-optimizer', name: 'Subject Line Optimizer', description: 'Optimize email subject lines for opens', icon: EnvelopeIcon, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', category: 'email' },
  { id: 'social-manager', name: 'Social Media Manager', description: 'Create engaging social media posts', icon: MegaphoneIcon, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', category: 'social' },
  { id: 'ad-creator', name: 'Ad Creator', description: 'Generate ad copy for multiple platforms', icon: PresentationChartLineIcon, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', category: 'ads' },
  { id: 'review-response', name: 'Review Response', description: 'Generate professional review responses', icon: ChatBubbleLeftRightIcon, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', category: 'engagement' },
  { id: 'send-time', name: 'Send Time Optimizer', description: 'Find the best time to send campaigns', icon: ClockIcon, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', category: 'email' },
  { id: 'audience-segmenter', name: 'Audience Segmenter', description: 'AI-powered contact segmentation', icon: UserGroupIcon, color: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-50', category: 'segments' },
  { id: 'campaign-suggester', name: 'Campaign Suggester', description: 'Get campaign ideas and recommendations', icon: LightBulbIcon, color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', category: 'campaigns' },
  // New AI features
  { id: 'segment-builder', name: 'AI Segment Builder', description: 'Build smart audience segments with AI', icon: UserGroupIcon, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-50', category: 'segments' },
  { id: 'journey-optimizer', name: 'AI Journey Optimizer', description: 'Optimize customer journeys for conversion', icon: ChartBarIcon, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50', category: 'automation' },
  { id: 'attribution-modeler', name: 'AI Attribution Modeler', description: 'Analyze marketing channel attribution', icon: ChartBarIcon, color: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-50', category: 'analytics' },
  { id: 'budget-allocator', name: 'AI Budget Allocator', description: 'Optimize marketing budget allocation', icon: CurrencyDollarIcon, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-50', category: 'budget' },
  { id: 'fatigue-detector', name: 'AI Fatigue Detector', description: 'Detect email fatigue in your audience', icon: ExclamationTriangleIcon, color: 'from-red-500 to-red-600', bgColor: 'bg-red-50', category: 'email' },
  { id: 'persona-creator', name: 'AI Persona Creator', description: 'Create detailed customer personas', icon: UserCircleIcon, color: 'from-fuchsia-500 to-fuchsia-600', bgColor: 'bg-fuchsia-50', category: 'segments' },
  { id: 'influencer-matcher', name: 'AI Influencer Matcher', description: 'Find perfect influencers for your brand', icon: UsersIcon, color: 'from-rose-500 to-rose-600', bgColor: 'bg-rose-50', category: 'social' },
  { id: 'hashtag-generator', name: 'AI Hashtag Generator', description: 'Generate trending hashtags for posts', icon: HashtagIcon, color: 'from-sky-500 to-sky-600', bgColor: 'bg-sky-50', category: 'social' },
  { id: 'landing-page-builder', name: 'AI Landing Page Builder', description: 'Generate high-converting landing pages', icon: WindowIcon, color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50', category: 'content' },
  { id: 'email-campaign-writer', name: 'AI Email Campaign Writer', description: 'Write complete email campaigns with AI', icon: EnvelopeOpenIcon, color: 'from-indigo-500 to-blue-600', bgColor: 'bg-indigo-50', category: 'email' },
];

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  type: string;
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: any) => void;
}

function DetailModal({ isOpen, onClose, item, type, onDelete, onEdit }: DetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (item) {
      setEditData({ name: item.name, status: item.status });
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    if (onEdit) {
      onEdit(item.id, editData);
    }
    setIsEditing(false);
  };

  const renderContent = () => {
    switch (type) {
      case 'segment':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-cyan-50 rounded-xl p-4">
                <p className="text-sm text-cyan-600 font-medium">Contacts</p>
                <p className="text-2xl font-bold text-cyan-900">{item.contactCount}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600 font-medium">Confidence</p>
                <p className="text-2xl font-bold text-green-900">{item.confidence}%</p>
              </div>
            </div>
            {item.description && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-gray-600">{item.description}</p>
              </div>
            )}
            {item.parsedInsights && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-700 mb-2">AI Insights</p>
                <ul className="space-y-1">
                  {item.parsedInsights.map((insight: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-blue-800">
                      <SparklesIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'journey':
        return (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-emerald-600 font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold text-emerald-900">{item.conversionRate}%</p>
            </div>
            {item.parsedStages && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Journey Stages</p>
                {item.parsedStages.map((stage: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm mr-3">
                      {stage.order}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{stage.name}</p>
                      <p className="text-xs text-gray-500">{stage.channels?.join(', ')}</p>
                    </div>
                    <span className="text-xs text-gray-400">{stage.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'attribution':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-violet-50 rounded-xl p-4">
                <p className="text-sm text-violet-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-violet-900">${item.revenue?.toLocaleString()}</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-sm text-indigo-600 font-medium">Conversions</p>
                <p className="text-2xl font-bold text-indigo-900">{item.conversions}</p>
              </div>
            </div>
            {item.parsedChannels && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Channel Attribution</p>
                {item.parsedChannels.map((channel: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{channel.name}</span>
                      <span className="text-sm font-bold text-violet-600">{channel.attribution}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${channel.attribution}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'budget':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600 font-medium">Total Budget</p>
                <p className="text-2xl font-bold text-green-900">${item.totalBudget?.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-sm text-emerald-600 font-medium">Projected ROI</p>
                <p className="text-2xl font-bold text-emerald-900">{item.projectedROI}x</p>
              </div>
            </div>
            {item.parsedAllocations && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Budget Allocations</p>
                {item.parsedAllocations.map((alloc: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{alloc.channel}</p>
                      <p className="text-xs text-gray-500">Expected ROI: {alloc.expectedROI}x</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${alloc.amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{alloc.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'fatigue':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm text-red-600 font-medium">Fatigue Score</p>
                <p className="text-2xl font-bold text-red-900">{item.fatigueScore}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm text-orange-600 font-medium">Email Frequency</p>
                <p className="text-2xl font-bold text-orange-900">{item.emailFrequency}/mo</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-sm text-yellow-600 font-medium">Open Rate Decline</p>
                <p className="text-2xl font-bold text-yellow-900">{item.openRateDecline}%</p>
              </div>
            </div>
            {item.parsedRecommendations && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-700 mb-2">Recommendations</p>
                <ul className="space-y-1">
                  {item.parsedRecommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-blue-800">
                      <CheckIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'persona':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 bg-fuchsia-50 rounded-xl p-4">
              <div className="w-16 h-16 rounded-full bg-fuchsia-200 flex items-center justify-center">
                <UserCircleIcon className="h-10 w-10 text-fuchsia-600" />
              </div>
              <div>
                <p className="font-bold text-fuchsia-900 text-lg">{item.name}</p>
                <p className="text-sm text-fuchsia-600">{item.parsedDemographics?.occupation}</p>
              </div>
            </div>
            {item.parsedDemographics && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Demographics</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">Age:</span> {item.parsedDemographics.age}</p>
                  <p><span className="text-gray-500">Income:</span> {item.parsedDemographics.income}</p>
                  <p><span className="text-gray-500">Location:</span> {item.parsedDemographics.location}</p>
                  <p><span className="text-gray-500">Education:</span> {item.parsedDemographics.education}</p>
                </div>
              </div>
            )}
            {item.parsedPainPoints && (
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm font-medium text-red-700 mb-2">Pain Points</p>
                <ul className="space-y-1">
                  {item.parsedPainPoints.map((point: string, i: number) => (
                    <li key={i} className="text-sm text-red-800">• {point}</li>
                  ))}
                </ul>
              </div>
            )}
            {item.parsedGoals && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm font-medium text-green-700 mb-2">Goals</p>
                <ul className="space-y-1">
                  {item.parsedGoals.map((goal: string, i: number) => (
                    <li key={i} className="text-sm text-green-800">• {goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'influencer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-rose-50 rounded-xl p-4">
                <p className="text-sm text-rose-600 font-medium">Followers</p>
                <p className="text-2xl font-bold text-rose-900">{(item.followers / 1000).toFixed(0)}K</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-4">
                <p className="text-sm text-pink-600 font-medium">Engagement</p>
                <p className="text-2xl font-bold text-pink-900">{item.engagementRate}%</p>
              </div>
              <div className="bg-fuchsia-50 rounded-xl p-4">
                <p className="text-sm text-fuchsia-600 font-medium">Match Score</p>
                <p className="text-2xl font-bold text-fuchsia-900">{item.matchScore}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform:</span>
                <span className="font-medium">{item.platform}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Niche:</span>
                <span className="font-medium">{item.niche}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Est. Cost:</span>
                <span className="font-medium text-green-600">${item.estimatedCost}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Est. Reach:</span>
                <span className="font-medium">{item.estimatedReach?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      case 'hashtag':
        return (
          <div className="space-y-4">
            <div className="bg-sky-50 rounded-xl p-4">
              <p className="text-sm text-sky-600 font-medium">Topic</p>
              <p className="text-lg font-bold text-sky-900">{item.topic}</p>
              <p className="text-sm text-sky-600 mt-1">Platform: {item.platform}</p>
            </div>
            {item.parsedHashtags && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Generated Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {item.parsedHashtags.map((h: any, i: number) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        h.recommended ? 'bg-sky-100 text-sky-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {h.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'landing-page':
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium uppercase">Headline</p>
              <p className="text-xl font-bold text-amber-900">{item.headline}</p>
              {item.subheadline && (
                <p className="text-sm text-amber-700 mt-1">{item.subheadline}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Body Copy</p>
              <p className="text-gray-700">{item.bodyCopy}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                className="px-6 py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: item.ctaColor || '#4F46E5' }}
              >
                {item.ctaText}
              </button>
              <span className="text-sm text-gray-500">CTA Preview</span>
            </div>
            {item.parsedConversionTips && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm font-medium text-green-700 mb-2">Conversion Tips</p>
                <ul className="space-y-1">
                  {item.parsedConversionTips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-green-800">
                      <CheckIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'email-campaign':
        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium uppercase">{item.campaignType}</span>
                <span className="text-xs text-indigo-500">{item.tone} tone</span>
              </div>
              <p className="text-xs text-indigo-600 font-medium">Subject Line</p>
              <p className="text-lg font-bold text-indigo-900">{item.subject}</p>
              {item.previewText && <p className="text-sm text-indigo-600 italic mt-1">{item.previewText}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-green-600 font-medium">Est. Open Rate</p>
                <p className="text-2xl font-bold text-green-900">{item.estimatedOpenRate}%</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-600 font-medium">Est. Click Rate</p>
                <p className="text-2xl font-bold text-blue-900">{item.estimatedClickRate}%</p>
              </div>
            </div>
            {item.ctaText && (
              <div className="text-center py-3">
                <button className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600">{item.ctaText}</button>
                {item.sendTimeRec && <p className="text-xs text-gray-500 mt-2">Best time: {item.sendTimeRec}</p>}
              </div>
            )}
            {item.parsedAbVariants && item.parsedAbVariants.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">A/B Test Variants</p>
                {item.parsedAbVariants.map((v: any, i: number) => (
                  <div key={i} className="flex items-center mb-2 last:mb-0">
                    <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">{String.fromCharCode(65 + i)}</span>
                    <span className="text-sm text-gray-800">{v.subject}</span>
                  </div>
                ))}
              </div>
            )}
            {item.parsedTips && item.parsedTips.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm font-medium text-green-700 mb-2">Optimization Tips</p>
                <ul className="space-y-1">
                  {item.parsedTips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-green-800">
                      <CheckIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      default:
        return <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">{JSON.stringify(item, null, 2)}</pre>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="text-xl font-bold text-gray-900 border-b-2 border-primary-500 bg-transparent focus:outline-none"
              />
            ) : (
              <h2 className="text-xl font-bold text-gray-900">{item.name || item.segmentName || 'Details'}</h2>
            )}
            <p className="text-sm text-gray-500 mt-1">Created: {new Date(item.createdAt || item.detectedAt).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XMarkIcon className="h-6 w-6 text-gray-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderContent()}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => onDelete(item.id)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Save
                </button>
              </>
            ) : (
              <>
                {onEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AITools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Options from API
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [tones, setTones] = useState<any[]>([]);
  const [socialPlatforms, setSocialPlatforms] = useState<any[]>([]);
  const [adPlatforms, setAdPlatforms] = useState<any[]>([]);

  // Form states for original tools
  const [contentType, setContentType] = useState('blog');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [keywords, setKeywords] = useState('');
  const [subjectContent, setSubjectContent] = useState('');
  const [subjectCount, setSubjectCount] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [socialTopic, setSocialTopic] = useState('');
  const [adPlatform, setAdPlatform] = useState('facebook');
  const [adProduct, setAdProduct] = useState('');
  const [adAudience, setAdAudience] = useState('');
  const [sendTimeIndustry, setSendTimeIndustry] = useState('');
  const [sendTimeAudience, setSendTimeAudience] = useState('b2b');
  const [sendTimeCampaign, setSendTimeCampaign] = useState('promotional');
  const [segmentGoal, setSegmentGoal] = useState('');
  const [campaignIndustry, setCampaignIndustry] = useState('');
  const [campaignGoals, setCampaignGoals] = useState('');
  const [campaignSeason, setCampaignSeason] = useState('');
  const [campaignBusiness, setCampaignBusiness] = useState('');

  // New feature form states
  const [segmentBuilderGoal, setSegmentBuilderGoal] = useState('');
  const [segmentTargetAudience, setSegmentTargetAudience] = useState('');
  const [segmentBehaviors, setSegmentBehaviors] = useState('');
  const [journeyType, setJourneyType] = useState('lead-to-customer');
  const [journeyGoal, setJourneyGoal] = useState('');
  const [journeyCurrentStages, setJourneyCurrentStages] = useState('');
  const [attributionModelType, setAttributionModelType] = useState('data-driven');
  const [attributionChannels, setAttributionChannels] = useState<string[]>(['Email', 'Social', 'Paid Search', 'Organic']);
  const [attributionTimeframe, setAttributionTimeframe] = useState('30days');
  const [budgetTotal, setBudgetTotal] = useState('10000');
  const [budgetChannels, setBudgetChannels] = useState<string[]>(['Email', 'Social Ads', 'Content', 'PPC']);
  const [budgetGoals, setBudgetGoals] = useState('');
  const [fatigueTimeframe, setFatigueTimeframe] = useState('30days');
  const [personaIndustry, setPersonaIndustry] = useState('');
  const [personaTargetMarket, setPersonaTargetMarket] = useState('b2b');
  const [personaProductType, setPersonaProductType] = useState('');
  const [influencerNiche, setInfluencerNiche] = useState('');
  const [influencerPlatform, setInfluencerPlatform] = useState('instagram');
  const [influencerBudget, setInfluencerBudget] = useState('5000');
  const [influencerTargetAudience, setInfluencerTargetAudience] = useState('');
  const [hashtagTopic, setHashtagTopic] = useState('');
  const [hashtagPlatform, setHashtagPlatform] = useState('instagram');
  const [hashtagCount, setHashtagCount] = useState('20');
  const [landingPagePurpose, setLandingPagePurpose] = useState('lead-generation');
  const [landingPageIndustry, setLandingPageIndustry] = useState('');
  const [landingPageAudience, setLandingPageAudience] = useState('');
  const [landingPageProduct, setLandingPageProduct] = useState('');

  // Email Campaign Writer form states
  const [emailCampaignType, setEmailCampaignType] = useState('promotional');
  const [emailIndustry, setEmailIndustry] = useState('');
  const [emailAudience, setEmailAudience] = useState('');
  const [emailTone, setEmailTone] = useState('professional');
  const [emailProduct, setEmailProduct] = useState('');
  const [emailGoal, setEmailGoal] = useState('');
  const [emailKeyMessages, setEmailKeyMessages] = useState('');

  const loadSampleData = (sampleIndex: number) => {
    if (!activeTool) return;
    const samples = SAMPLE_DATA[activeTool];
    if (!samples || !samples[sampleIndex]) return;
    const d = samples[sampleIndex].data;

    switch (activeTool) {
      case 'content-writer':
        if (d.contentType) setContentType(d.contentType);
        if (d.topic) setTopic(d.topic);
        if (d.tone) setTone(d.tone);
        if (d.keywords) setKeywords(d.keywords);
        break;
      case 'subject-optimizer':
        if (d.subjectContent) setSubjectContent(d.subjectContent);
        if (d.subjectCount) setSubjectCount(d.subjectCount);
        break;
      case 'review-response':
        if (d.reviewContent) setReviewContent(d.reviewContent);
        if (d.reviewRating) setReviewRating(d.reviewRating);
        if (d.reviewAuthor) setReviewAuthor(d.reviewAuthor);
        break;
      case 'social-manager':
        if (d.socialPlatform) setSocialPlatform(d.socialPlatform);
        if (d.socialTopic) setSocialTopic(d.socialTopic);
        break;
      case 'ad-creator':
        if (d.adPlatform) setAdPlatform(d.adPlatform);
        if (d.adProduct) setAdProduct(d.adProduct);
        if (d.adAudience) setAdAudience(d.adAudience);
        break;
      case 'send-time':
        if (d.sendTimeIndustry) setSendTimeIndustry(d.sendTimeIndustry);
        if (d.sendTimeAudience) setSendTimeAudience(d.sendTimeAudience);
        if (d.sendTimeCampaign) setSendTimeCampaign(d.sendTimeCampaign);
        break;
      case 'audience-segmenter':
        if (d.segmentGoal) setSegmentGoal(d.segmentGoal);
        break;
      case 'campaign-suggester':
        if (d.campaignBusiness) setCampaignBusiness(d.campaignBusiness);
        if (d.campaignIndustry) setCampaignIndustry(d.campaignIndustry);
        if (d.campaignGoals) setCampaignGoals(d.campaignGoals);
        if (d.campaignSeason !== undefined) setCampaignSeason(d.campaignSeason);
        break;
      case 'segment-builder':
        if (d.segmentBuilderGoal) setSegmentBuilderGoal(d.segmentBuilderGoal);
        if (d.segmentTargetAudience) setSegmentTargetAudience(d.segmentTargetAudience);
        if (d.segmentBehaviors) setSegmentBehaviors(d.segmentBehaviors);
        break;
      case 'journey-optimizer':
        if (d.journeyType) setJourneyType(d.journeyType);
        if (d.journeyGoal) setJourneyGoal(d.journeyGoal);
        if (d.journeyCurrentStages) setJourneyCurrentStages(d.journeyCurrentStages);
        break;
      case 'attribution-modeler':
        if (d.attributionModelType) setAttributionModelType(d.attributionModelType);
        if (d.attributionTimeframe) setAttributionTimeframe(d.attributionTimeframe);
        if (d.attributionChannels) setAttributionChannels(d.attributionChannels);
        break;
      case 'budget-allocator':
        if (d.budgetTotal) setBudgetTotal(d.budgetTotal);
        if (d.budgetGoals) setBudgetGoals(d.budgetGoals);
        if (d.budgetChannels) setBudgetChannels(d.budgetChannels);
        break;
      case 'fatigue-detector':
        if (d.fatigueTimeframe) setFatigueTimeframe(d.fatigueTimeframe);
        break;
      case 'persona-creator':
        if (d.personaIndustry) setPersonaIndustry(d.personaIndustry);
        if (d.personaTargetMarket) setPersonaTargetMarket(d.personaTargetMarket);
        if (d.personaProductType) setPersonaProductType(d.personaProductType);
        break;
      case 'influencer-matcher':
        if (d.influencerNiche) setInfluencerNiche(d.influencerNiche);
        if (d.influencerPlatform) setInfluencerPlatform(d.influencerPlatform);
        if (d.influencerBudget) setInfluencerBudget(d.influencerBudget);
        if (d.influencerTargetAudience) setInfluencerTargetAudience(d.influencerTargetAudience);
        break;
      case 'hashtag-generator':
        if (d.hashtagTopic) setHashtagTopic(d.hashtagTopic);
        if (d.hashtagPlatform) setHashtagPlatform(d.hashtagPlatform);
        if (d.hashtagCount) setHashtagCount(d.hashtagCount);
        break;
      case 'landing-page-builder':
        if (d.landingPagePurpose) setLandingPagePurpose(d.landingPagePurpose);
        if (d.landingPageIndustry) setLandingPageIndustry(d.landingPageIndustry);
        if (d.landingPageAudience) setLandingPageAudience(d.landingPageAudience);
        if (d.landingPageProduct) setLandingPageProduct(d.landingPageProduct);
        break;
      case 'email-campaign-writer':
        if (d.emailCampaignType) setEmailCampaignType(d.emailCampaignType);
        if (d.emailIndustry) setEmailIndustry(d.emailIndustry);
        if (d.emailAudience) setEmailAudience(d.emailAudience);
        if (d.emailTone) setEmailTone(d.emailTone);
        if (d.emailProduct) setEmailProduct(d.emailProduct);
        if (d.emailGoal) setEmailGoal(d.emailGoal);
        if (d.emailKeyMessages) setEmailKeyMessages(d.emailKeyMessages);
        break;
    }
    toast.success('Sample data loaded!');
  };

  const renderSampleButtons = () => {
    if (!activeTool) return null;
    const samples = SAMPLE_DATA[activeTool];
    if (!samples || samples.length === 0) return null;

    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Test Samples</p>
        <div className="flex flex-wrap gap-2">
          {samples.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadSampleData(i)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl hover:from-primary-50 hover:to-blue-50 hover:border-primary-300 hover:text-primary-700 transition-all group"
            >
              <span className="mr-2 text-base group-hover:scale-110 transition-transform">{sample.icon}</span>
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (activeTool) {
      fetchSavedItems();
    }
  }, [activeTool]);

  const fetchOptions = async () => {
    try {
      const [contentTypesRes, tonesRes, socialRes, adRes] = await Promise.all([
        optionsAPI.getAIContentTypes(),
        optionsAPI.getAITones(),
        optionsAPI.getSocialPlatforms(),
        optionsAPI.getAdPlatforms(),
      ]);
      setContentTypes(contentTypesRes.data);
      setTones(tonesRes.data);
      setSocialPlatforms(socialRes.data);
      setAdPlatforms(adRes.data);
    } catch (error) {
      console.error('Failed to load options');
    }
  };

  const fetchSavedItems = async () => {
    try {
      let response;
      switch (activeTool) {
        case 'segment-builder':
          response = await aiAPI.getAISegments();
          break;
        case 'journey-optimizer':
          response = await aiAPI.getJourneys();
          break;
        case 'attribution-modeler':
          response = await aiAPI.getAttributions();
          break;
        case 'budget-allocator':
          response = await aiAPI.getBudgets();
          break;
        case 'fatigue-detector':
          response = await aiAPI.getFatigues();
          break;
        case 'persona-creator':
          response = await aiAPI.getPersonas();
          break;
        case 'influencer-matcher':
          response = await aiAPI.getInfluencers();
          break;
        case 'hashtag-generator':
          response = await aiAPI.getHashtags();
          break;
        case 'landing-page-builder':
          response = await aiAPI.getAILandingPages();
          break;
        case 'email-campaign-writer':
          response = await aiAPI.getEmailCampaigns();
          break;
        default:
          return;
      }
      setSavedItems(response?.data || []);
    } catch (error) {
      console.error('Failed to fetch saved items');
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      let response;
      switch (activeTool) {
        case 'content-writer':
          if (!topic.trim()) { toast.error('Please enter a topic'); setLoading(false); return; }
          response = await aiAPI.generateContent({ type: contentType, topic, tone, keywords: keywords.split(',').map(k => k.trim()).filter(k => k) });
          setResult({ type: 'text', content: response.data.content, title: 'Generated Content' });
          break;
        case 'subject-optimizer':
          if (!subjectContent.trim()) { toast.error('Please enter email content'); setLoading(false); return; }
          response = await aiAPI.optimizeSubject({ content: subjectContent, count: subjectCount });
          setResult({ type: 'list', items: response.data.subjects || response.data.subjectLines, title: 'Subject Line Suggestions' });
          break;
        case 'review-response':
          if (!reviewContent.trim()) { toast.error('Please enter review content'); setLoading(false); return; }
          response = await aiAPI.generateReviewResponse({ reviewContent, rating: reviewRating, authorName: reviewAuthor || 'Customer' });
          setResult({ type: 'text', content: response.data.response, title: 'Generated Response' });
          break;
        case 'social-manager':
          if (!socialTopic.trim()) { toast.error('Please enter a topic'); setLoading(false); return; }
          response = await aiAPI.generateSocialPost({ platform: socialPlatform, topic: socialTopic });
          setResult({ type: 'social', content: response.data.post, platform: socialPlatform, title: 'Social Media Post' });
          break;
        case 'ad-creator':
          if (!adProduct.trim()) { toast.error('Please enter a product'); setLoading(false); return; }
          response = await aiAPI.generateAd({ platform: adPlatform, product: adProduct, targetAudience: adAudience });
          setResult({ type: 'ad', headline: response.data.headline, body: response.data.body, cta: response.data.cta, title: 'Ad Copy' });
          break;
        case 'send-time':
          response = await aiAPI.optimizeSendTime({ industry: sendTimeIndustry, audienceType: sendTimeAudience, campaignType: sendTimeCampaign });
          setResult({ type: 'sendtime', data: response.data, title: 'Optimal Send Times' });
          break;
        case 'audience-segmenter':
          response = await aiAPI.suggestSegments({ goal: segmentGoal });
          setResult({ type: 'segments', segments: response.data.suggestions, title: 'Suggested Segments' });
          break;
        case 'campaign-suggester':
          response = await aiAPI.suggestCampaign({ industry: campaignIndustry, goals: campaignGoals, season: campaignSeason, businessDescription: campaignBusiness });
          setResult({ type: 'campaign', data: response.data, title: 'Campaign Ideas' });
          break;
        // New AI features
        case 'segment-builder':
          response = await aiAPI.buildSegment({ goal: segmentBuilderGoal, targetAudience: segmentTargetAudience, behaviors: segmentBehaviors });
          setResult({ type: 'segment-build', data: response.data, title: 'AI Segment Built' });
          fetchSavedItems();
          break;
        case 'journey-optimizer':
          response = await aiAPI.optimizeJourney({ journeyType, goal: journeyGoal, currentStages: journeyCurrentStages });
          setResult({ type: 'journey', data: response.data, title: 'Optimized Journey' });
          fetchSavedItems();
          break;
        case 'attribution-modeler':
          response = await aiAPI.analyzeAttribution({ modelType: attributionModelType, channels: attributionChannels, timeframe: attributionTimeframe });
          setResult({ type: 'attribution', data: response.data, title: 'Attribution Analysis' });
          fetchSavedItems();
          break;
        case 'budget-allocator':
          response = await aiAPI.allocateBudget({ totalBudget: parseFloat(budgetTotal), channels: budgetChannels, goals: budgetGoals });
          setResult({ type: 'budget', data: response.data, title: 'Budget Allocation' });
          fetchSavedItems();
          break;
        case 'fatigue-detector':
          response = await aiAPI.detectFatigue({ timeframe: fatigueTimeframe });
          setResult({ type: 'fatigue', data: response.data, title: 'Fatigue Detection Results' });
          fetchSavedItems();
          break;
        case 'persona-creator':
          response = await aiAPI.createPersona({ industry: personaIndustry, targetMarket: personaTargetMarket, productType: personaProductType });
          setResult({ type: 'persona', data: response.data, title: 'Customer Persona Created' });
          fetchSavedItems();
          break;
        case 'influencer-matcher':
          response = await aiAPI.matchInfluencers({ niche: influencerNiche, platform: influencerPlatform, budget: parseFloat(influencerBudget), targetAudience: influencerTargetAudience });
          setResult({ type: 'influencer', data: response.data, title: 'Matched Influencers' });
          fetchSavedItems();
          break;
        case 'hashtag-generator':
          if (!hashtagTopic.trim()) { toast.error('Please enter a topic'); setLoading(false); return; }
          response = await aiAPI.generateHashtags({ topic: hashtagTopic, platform: hashtagPlatform, count: parseInt(hashtagCount) });
          setResult({ type: 'hashtag', data: response.data, title: 'Generated Hashtags' });
          fetchSavedItems();
          break;
        case 'landing-page-builder':
          response = await aiAPI.generateLandingPage({ purpose: landingPagePurpose, industry: landingPageIndustry, targetAudience: landingPageAudience, productName: landingPageProduct });
          setResult({ type: 'landing-page', data: response.data, title: 'Landing Page Generated' });
          fetchSavedItems();
          break;
        case 'email-campaign-writer':
          response = await aiAPI.generateEmailCampaign({ campaignType: emailCampaignType, industry: emailIndustry, audience: emailAudience, tone: emailTone, productName: emailProduct, goal: emailGoal, keyMessages: emailKeyMessages });
          setResult({ type: 'email-campaign', data: response.data, title: 'Email Campaign Generated' });
          fetchSavedItems();
          break;
        default:
          toast.error('Tool not implemented');
      }
      toast.success('Generated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      switch (activeTool) {
        case 'segment-builder': await aiAPI.deleteAISegment(id); break;
        case 'journey-optimizer': await aiAPI.deleteJourney(id); break;
        case 'attribution-modeler': await aiAPI.deleteAttribution(id); break;
        case 'budget-allocator': await aiAPI.deleteBudget(id); break;
        case 'fatigue-detector': await aiAPI.deleteFatigue(id); break;
        case 'persona-creator': await aiAPI.deletePersona(id); break;
        case 'influencer-matcher': await aiAPI.deleteInfluencer(id); break;
        case 'hashtag-generator': await aiAPI.deleteHashtag(id); break;
        case 'landing-page-builder': await aiAPI.deleteAILandingPage(id); break;
        case 'email-campaign-writer': await aiAPI.deleteEmailCampaign(id); break;
      }
      toast.success('Deleted successfully');
      setShowDetail(false);
      fetchSavedItems();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = async (id: string, data: any) => {
    try {
      switch (activeTool) {
        case 'segment-builder': await aiAPI.updateAISegment(id, data); break;
        case 'journey-optimizer': await aiAPI.updateJourney(id, data); break;
        case 'persona-creator': await aiAPI.updatePersona(id, data); break;
        case 'influencer-matcher': await aiAPI.updateInfluencer(id, data); break;
        case 'landing-page-builder': await aiAPI.updateAILandingPage(id, data); break;
        case 'email-campaign-writer': await aiAPI.updateEmailCampaign(id, data); break;
      }
      toast.success('Updated successfully');
      fetchSavedItems();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const getActiveTool = () => AI_TOOLS.find(t => t.id === activeTool);

  const getDetailType = () => {
    switch (activeTool) {
      case 'segment-builder': return 'segment';
      case 'journey-optimizer': return 'journey';
      case 'attribution-modeler': return 'attribution';
      case 'budget-allocator': return 'budget';
      case 'fatigue-detector': return 'fatigue';
      case 'persona-creator': return 'persona';
      case 'influencer-matcher': return 'influencer';
      case 'hashtag-generator': return 'hashtag';
      case 'landing-page-builder': return 'landing-page';
      case 'email-campaign-writer': return 'email-campaign';
      default: return 'default';
    }
  };

  const categories = [
    { id: 'all', name: 'All Tools' },
    { id: 'content', name: 'Content' },
    { id: 'email', name: 'Email' },
    { id: 'social', name: 'Social' },
    { id: 'segments', name: 'Segments' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'automation', name: 'Automation' },
  ];

  const filteredTools = activeCategory === 'all'
    ? AI_TOOLS
    : AI_TOOLS.filter(t => t.category === activeCategory);

  const renderToolForm = () => {
    const inputClass = "block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all";
    const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

    switch (activeTool) {
      case 'content-writer':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Content Type</label>
              <select value={contentType} onChange={e => setContentType(e.target.value)} className={inputClass}>
                {contentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Topic/Subject <span className="text-red-500">*</span></label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Summer sale promotion" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)} className={inputClass}>
                {tones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Keywords (comma-separated)</label>
              <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g., discount, limited time" className={inputClass} />
            </div>
          </div>
        );
      case 'subject-optimizer':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Email Content/Topic <span className="text-red-500">*</span></label>
              <textarea value={subjectContent} onChange={e => setSubjectContent(e.target.value)} rows={4} placeholder="Describe your email content..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Number of Suggestions</label>
              <select value={subjectCount} onChange={e => setSubjectCount(parseInt(e.target.value))} className={inputClass}>
                <option value={3}>3 suggestions</option>
                <option value={5}>5 suggestions</option>
                <option value={10}>10 suggestions</option>
              </select>
            </div>
          </div>
        );
      case 'review-response':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Customer Review <span className="text-red-500">*</span></label>
              <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)} rows={4} placeholder="Paste the customer review..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rating</label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} type="button" onClick={() => setReviewRating(r)} className={`p-2 rounded-lg transition-all ${reviewRating >= r ? 'text-yellow-500' : 'text-gray-300'}`}>
                    <StarIcon className={`h-8 w-8 ${reviewRating >= r ? 'fill-yellow-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Reviewer Name</label>
              <input type="text" value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder="Customer name (optional)" className={inputClass} />
            </div>
          </div>
        );
      case 'social-manager':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Platform</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {socialPlatforms.map(p => (
                  <button key={p.value} type="button" onClick={() => setSocialPlatform(p.value)} className={`p-3 rounded-xl border-2 text-left transition-all ${socialPlatform === p.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-medium text-gray-900">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Topic/Message <span className="text-red-500">*</span></label>
              <textarea value={socialTopic} onChange={e => setSocialTopic(e.target.value)} rows={4} placeholder="What do you want to post about?" className={inputClass} />
            </div>
          </div>
        );
      case 'ad-creator':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Platform</label>
              <select value={adPlatform} onChange={e => setAdPlatform(e.target.value)} className={inputClass}>
                {adPlatforms.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Product/Service <span className="text-red-500">*</span></label>
              <input type="text" value={adProduct} onChange={e => setAdProduct(e.target.value)} placeholder="What are you advertising?" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input type="text" value={adAudience} onChange={e => setAdAudience(e.target.value)} placeholder="e.g., Small business owners" className={inputClass} />
            </div>
          </div>
        );
      case 'send-time':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-100">
              <p className="text-sm text-orange-800"><strong>AI analyzes your data</strong> to find optimal send times.</p>
            </div>
            <div>
              <label className={labelClass}>Your Industry</label>
              <input type="text" value={sendTimeIndustry} onChange={e => setSendTimeIndustry(e.target.value)} placeholder="e.g., E-commerce, SaaS" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Audience Type</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[{ value: 'b2b', label: 'B2B' }, { value: 'b2c', label: 'B2C' }, { value: 'mixed', label: 'Mixed' }, { value: 'local', label: 'Local' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setSendTimeAudience(opt.value)} className={`p-3 rounded-xl border-2 text-left transition-all ${sendTimeAudience === opt.value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-medium text-gray-900">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Campaign Type</label>
              <select value={sendTimeCampaign} onChange={e => setSendTimeCampaign(e.target.value)} className={inputClass}>
                <option value="promotional">Promotional</option>
                <option value="newsletter">Newsletter</option>
                <option value="transactional">Transactional</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
          </div>
        );
      case 'audience-segmenter':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
              <p className="text-sm text-teal-800"><strong>AI analyzes your contacts</strong> and suggests smart segments.</p>
            </div>
            <div>
              <label className={labelClass}>What's your main goal?</label>
              <textarea value={segmentGoal} onChange={e => setSegmentGoal(e.target.value)} rows={3} placeholder="e.g., Increase sales, improve retention..." className={inputClass} />
            </div>
          </div>
        );
      case 'campaign-suggester':
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Describe Your Business</label>
              <textarea value={campaignBusiness} onChange={e => setCampaignBusiness(e.target.value)} rows={2} placeholder="e.g., Online fitness coaching" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Industry</label>
                <input type="text" value={campaignIndustry} onChange={e => setCampaignIndustry(e.target.value)} placeholder="e.g., Fitness" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Season</label>
                <select value={campaignSeason} onChange={e => setCampaignSeason(e.target.value)} className={inputClass}>
                  <option value="">Any time</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="holiday">Holiday Season</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Your Goals</label>
              <textarea value={campaignGoals} onChange={e => setCampaignGoals(e.target.value)} rows={2} placeholder="e.g., Increase sales by 20%" className={inputClass} />
            </div>
          </div>
        );
      // New AI feature forms
      case 'segment-builder':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
              <p className="text-sm text-cyan-800"><strong>AI Segment Builder</strong> creates smart audience segments based on your criteria.</p>
            </div>
            <div>
              <label className={labelClass}>Segmentation Goal</label>
              <input type="text" value={segmentBuilderGoal} onChange={e => setSegmentBuilderGoal(e.target.value)} placeholder="e.g., High-value customers, Re-engagement" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Target Audience Description</label>
              <textarea value={segmentTargetAudience} onChange={e => setSegmentTargetAudience(e.target.value)} rows={2} placeholder="Describe your ideal segment..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Key Behaviors to Include</label>
              <textarea value={segmentBehaviors} onChange={e => setSegmentBehaviors(e.target.value)} rows={2} placeholder="e.g., Purchased recently, opened emails, clicked links" className={inputClass} />
            </div>
          </div>
        );
      case 'journey-optimizer':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-sm text-emerald-800"><strong>AI Journey Optimizer</strong> creates and optimizes customer journeys for better conversion.</p>
            </div>
            <div>
              <label className={labelClass}>Journey Type</label>
              <select value={journeyType} onChange={e => setJourneyType(e.target.value)} className={inputClass}>
                <option value="lead-to-customer">Lead to Customer</option>
                <option value="onboarding">Customer Onboarding</option>
                <option value="re-engagement">Re-engagement</option>
                <option value="upsell">Upsell/Cross-sell</option>
                <option value="retention">Retention</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Primary Goal</label>
              <input type="text" value={journeyGoal} onChange={e => setJourneyGoal(e.target.value)} placeholder="e.g., Increase conversions by 25%" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Current Journey Stages (optional)</label>
              <textarea value={journeyCurrentStages} onChange={e => setJourneyCurrentStages(e.target.value)} rows={2} placeholder="Describe your current journey if any..." className={inputClass} />
            </div>
          </div>
        );
      case 'attribution-modeler':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
              <p className="text-sm text-violet-800"><strong>AI Attribution Modeler</strong> analyzes which channels drive conversions.</p>
            </div>
            <div>
              <label className={labelClass}>Attribution Model</label>
              <select value={attributionModelType} onChange={e => setAttributionModelType(e.target.value)} className={inputClass}>
                <option value="data-driven">Data-Driven (Recommended)</option>
                <option value="first-touch">First Touch</option>
                <option value="last-touch">Last Touch</option>
                <option value="linear">Linear</option>
                <option value="time-decay">Time Decay</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Timeframe</label>
              <select value={attributionTimeframe} onChange={e => setAttributionTimeframe(e.target.value)} className={inputClass}>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        );
      case 'budget-allocator':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <p className="text-sm text-green-800"><strong>AI Budget Allocator</strong> optimizes your marketing spend across channels.</p>
            </div>
            <div>
              <label className={labelClass}>Total Budget ($)</label>
              <input type="number" value={budgetTotal} onChange={e => setBudgetTotal(e.target.value)} placeholder="10000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Marketing Goals</label>
              <textarea value={budgetGoals} onChange={e => setBudgetGoals(e.target.value)} rows={2} placeholder="e.g., Maximize ROI, Grow brand awareness" className={inputClass} />
            </div>
          </div>
        );
      case 'fatigue-detector':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
              <p className="text-sm text-red-800"><strong>AI Fatigue Detector</strong> identifies contacts showing signs of email fatigue.</p>
            </div>
            <div>
              <label className={labelClass}>Analysis Timeframe</label>
              <select value={fatigueTimeframe} onChange={e => setFatigueTimeframe(e.target.value)} className={inputClass}>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="60days">Last 60 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>
          </div>
        );
      case 'persona-creator':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-xl p-4 border border-fuchsia-100">
              <p className="text-sm text-fuchsia-800"><strong>AI Persona Creator</strong> builds detailed customer personas for better targeting.</p>
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <input type="text" value={personaIndustry} onChange={e => setPersonaIndustry(e.target.value)} placeholder="e.g., Technology, Healthcare" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Target Market</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[{ value: 'b2b', label: 'B2B' }, { value: 'b2c', label: 'B2C' }, { value: 'both', label: 'Both' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setPersonaTargetMarket(opt.value)} className={`p-3 rounded-xl border-2 text-left transition-all ${personaTargetMarket === opt.value ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="font-medium text-gray-900">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Product/Service Type</label>
              <input type="text" value={personaProductType} onChange={e => setPersonaProductType(e.target.value)} placeholder="e.g., SaaS, E-commerce, Services" className={inputClass} />
            </div>
          </div>
        );
      case 'influencer-matcher':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
              <p className="text-sm text-rose-800"><strong>AI Influencer Matcher</strong> finds perfect influencers for your brand.</p>
            </div>
            <div>
              <label className={labelClass}>Niche/Industry</label>
              <input type="text" value={influencerNiche} onChange={e => setInfluencerNiche(e.target.value)} placeholder="e.g., Marketing, Fitness, Tech" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Platform</label>
              <select value={influencerPlatform} onChange={e => setInfluencerPlatform(e.target.value)} className={inputClass}>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">Twitter/X</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Budget ($)</label>
              <input type="number" value={influencerBudget} onChange={e => setInfluencerBudget(e.target.value)} placeholder="5000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input type="text" value={influencerTargetAudience} onChange={e => setInfluencerTargetAudience(e.target.value)} placeholder="e.g., Professionals 25-45" className={inputClass} />
            </div>
          </div>
        );
      case 'hashtag-generator':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100">
              <p className="text-sm text-sky-800"><strong>AI Hashtag Generator</strong> creates trending hashtags for maximum reach.</p>
            </div>
            <div>
              <label className={labelClass}>Topic <span className="text-red-500">*</span></label>
              <input type="text" value={hashtagTopic} onChange={e => setHashtagTopic(e.target.value)} placeholder="e.g., Digital Marketing, Fitness Tips" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Platform</label>
              <select value={hashtagPlatform} onChange={e => setHashtagPlatform(e.target.value)} className={inputClass}>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter/X</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Number of Hashtags</label>
              <select value={hashtagCount} onChange={e => setHashtagCount(e.target.value)} className={inputClass}>
                <option value="10">10 hashtags</option>
                <option value="20">20 hashtags</option>
                <option value="30">30 hashtags</option>
              </select>
            </div>
          </div>
        );
      case 'landing-page-builder':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
              <p className="text-sm text-amber-800"><strong>AI Landing Page Builder</strong> generates high-converting landing page copy.</p>
            </div>
            <div>
              <label className={labelClass}>Page Purpose</label>
              <select value={landingPagePurpose} onChange={e => setLandingPagePurpose(e.target.value)} className={inputClass}>
                <option value="lead-generation">Lead Generation</option>
                <option value="product-launch">Product Launch</option>
                <option value="webinar">Webinar Registration</option>
                <option value="free-trial">Free Trial</option>
                <option value="demo">Demo Request</option>
                <option value="ebook">E-book Download</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <input type="text" value={landingPageIndustry} onChange={e => setLandingPageIndustry(e.target.value)} placeholder="e.g., Technology, Healthcare" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input type="text" value={landingPageAudience} onChange={e => setLandingPageAudience(e.target.value)} placeholder="e.g., Small businesses, Marketers" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Product/Service Name</label>
              <input type="text" value={landingPageProduct} onChange={e => setLandingPageProduct(e.target.value)} placeholder="e.g., Marketing Pro" className={inputClass} />
            </div>
          </div>
        );
      case 'email-campaign-writer':
        return (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-sm text-indigo-800"><strong>AI Email Campaign Writer</strong> generates complete, ready-to-send email campaigns with subject lines, body copy, CTAs, and A/B test variants.</p>
            </div>
            <div>
              <label className={labelClass}>Campaign Type</label>
              <select value={emailCampaignType} onChange={e => setEmailCampaignType(e.target.value)} className={inputClass}>
                <option value="welcome">Welcome Email</option>
                <option value="promotional">Promotional</option>
                <option value="newsletter">Newsletter</option>
                <option value="re-engagement">Re-engagement / Win-back</option>
                <option value="announcement">Announcement</option>
                <option value="product-launch">Product Launch</option>
                <option value="event">Event Invitation</option>
                <option value="seasonal">Seasonal / Holiday</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Industry</label>
                <input type="text" value={emailIndustry} onChange={e => setEmailIndustry(e.target.value)} placeholder="e.g., E-commerce, SaaS" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tone</label>
                <select value={emailTone} onChange={e => setEmailTone(e.target.value)} className={inputClass}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="urgent">Urgent</option>
                  <option value="exciting">Exciting</option>
                  <option value="warm">Warm</option>
                  <option value="persuasive">Persuasive</option>
                  <option value="informative">Informative</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Target Audience</label>
              <input type="text" value={emailAudience} onChange={e => setEmailAudience(e.target.value)} placeholder="e.g., New subscribers, VIP customers" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Product/Service Name</label>
              <input type="text" value={emailProduct} onChange={e => setEmailProduct(e.target.value)} placeholder="e.g., MarketingPro AI" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Campaign Goal</label>
              <textarea value={emailGoal} onChange={e => setEmailGoal(e.target.value)} rows={2} placeholder="e.g., Drive first purchase, re-engage churned users" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Key Messages (comma-separated)</label>
              <input type="text" value={emailKeyMessages} onChange={e => setEmailKeyMessages(e.target.value)} placeholder="e.g., 40% off, free shipping, limited time" className={inputClass} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const renderProfessionalOutput = (data: any, type: string) => {
      switch (type) {
        case 'segment-build':
          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-cyan-900">{data.name}</h3>
                  <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium">{data.contactCount} contacts</span>
                </div>
                <p className="text-cyan-700 mb-4">{data.description}</p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="text-sm text-cyan-600 mr-2">Confidence:</span>
                    <div className="w-24 h-2 bg-cyan-200 rounded-full">
                      <div className="h-2 bg-cyan-500 rounded-full" style={{ width: `${data.confidence}%` }} />
                    </div>
                    <span className="ml-2 text-sm font-medium text-cyan-700">{data.confidence}%</span>
                  </div>
                </div>
              </div>
              {data.parsedInsights && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Insights</h4>
                  <ul className="space-y-2">
                    {data.parsedInsights.map((insight: string, i: number) => (
                      <li key={i} className="flex items-start text-sm text-gray-600">
                        <SparklesIcon className="h-4 w-4 text-cyan-500 mr-2 mt-0.5 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.recommendations && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-700 mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {data.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start text-sm text-green-700">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        case 'journey':
          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-emerald-900">{data.name}</h3>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">{data.conversionRate}% conversion</span>
                </div>
                <p className="text-emerald-700">{data.description}</p>
              </div>
              {data.parsedStages && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Journey Stages</h4>
                  <div className="space-y-3">
                    {data.parsedStages.map((stage: any, i: number) => (
                      <div key={i} className="flex items-center bg-gray-50 rounded-lg p-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mr-4">{stage.order}</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{stage.name}</p>
                          <p className="text-xs text-gray-500">{stage.channels?.join(', ')}</p>
                        </div>
                        <span className="text-sm text-gray-400">{stage.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        case 'attribution':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200">
                  <p className="text-sm text-violet-600 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-violet-900">${data.revenue?.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200">
                  <p className="text-sm text-indigo-600 font-medium">Total Conversions</p>
                  <p className="text-3xl font-bold text-indigo-900">{data.conversions?.toLocaleString()}</p>
                </div>
              </div>
              {data.parsedChannels && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Channel Attribution</h4>
                  <div className="space-y-4">
                    {data.parsedChannels.map((channel: any, i: number) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{channel.name}</span>
                          <span className="text-sm font-bold text-violet-600">{channel.attribution}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-3 rounded-full transition-all" style={{ width: `${channel.attribution}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>{channel.conversions} conversions</span>
                          <span>${channel.revenue?.toLocaleString()} revenue</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        case 'budget':
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Total Budget</p>
                  <p className="text-2xl font-bold text-green-900">${data.totalBudget?.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Projected ROI</p>
                  <p className="text-2xl font-bold text-blue-900">{data.projectedROI}x</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm text-purple-600 font-medium">Est. Revenue</p>
                  <p className="text-2xl font-bold text-purple-900">${data.projectedRevenue?.toLocaleString()}</p>
                </div>
              </div>
              {data.parsedAllocations && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Budget Allocations</h4>
                  <div className="space-y-3">
                    {data.parsedAllocations.map((alloc: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${alloc.priority === 'high' ? 'bg-green-500' : alloc.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{alloc.channel}</p>
                            <p className="text-xs text-gray-500">Expected ROI: {alloc.expectedROI}x</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${alloc.amount?.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{alloc.percentage}% of budget</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        case 'fatigue':
          return (
            <div className="space-y-4">
              {(Array.isArray(data) ? data : [data]).map((item: any, idx: number) => (
                <div key={idx} className={`rounded-xl p-5 border ${item.fatigueScore >= 70 ? 'bg-red-50 border-red-200' : item.fatigueScore >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">{item.segmentName}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.riskLevel === 'critical' || item.riskLevel === 'high' ? 'bg-red-100 text-red-700' : item.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {item.riskLevel} risk
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Fatigue Score</p>
                      <p className="text-xl font-bold">{item.fatigueScore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email Frequency</p>
                      <p className="text-xl font-bold">{item.emailFrequency}/mo</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Open Rate Change</p>
                      <p className="text-xl font-bold text-red-600">{item.openRateDecline}%</p>
                    </div>
                  </div>
                  {item.parsedRecommendations && (
                    <ul className="space-y-1">
                      {item.parsedRecommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center">
                          <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          );
        case 'persona':
          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 rounded-2xl p-6 border border-fuchsia-200">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-20 h-20 rounded-full bg-fuchsia-200 flex items-center justify-center">
                    <UserCircleIcon className="h-14 w-14 text-fuchsia-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-fuchsia-900">{data.name}</h3>
                    <p className="text-fuchsia-600">{data.parsedDemographics?.occupation}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Demographics</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Age:</span> <span className="font-medium">{data.parsedDemographics?.age}</span></p>
                    <p><span className="text-gray-500">Income:</span> <span className="font-medium">{data.parsedDemographics?.income}</span></p>
                    <p><span className="text-gray-500">Location:</span> <span className="font-medium">{data.parsedDemographics?.location}</span></p>
                    <p><span className="text-gray-500">Education:</span> <span className="font-medium">{data.parsedDemographics?.education}</span></p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Preferred Channels</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.parsedPreferredChannels?.map((channel: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-full text-sm">{channel}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">Pain Points</h4>
                  <ul className="space-y-1">
                    {data.parsedPainPoints?.map((point: string, i: number) => (
                      <li key={i} className="text-sm text-red-800">• {point}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Goals</h4>
                  <ul className="space-y-1">
                    {data.parsedGoals?.map((goal: string, i: number) => (
                      <li key={i} className="text-sm text-green-800">• {goal}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        case 'influencer':
          return (
            <div className="space-y-4">
              {(Array.isArray(data) ? data : [data]).map((inf: any, idx: number) => (
                <div key={idx} className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border border-rose-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-rose-200 flex items-center justify-center mr-3">
                        <UsersIcon className="h-7 w-7 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{inf.name}</h4>
                        <p className="text-sm text-rose-600">{inf.platform} • {inf.niche}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-rose-600">{inf.matchScore}</p>
                      <p className="text-xs text-gray-500">Match Score</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{(inf.followers / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-gray-500">Followers</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{inf.engagementRate}%</p>
                      <p className="text-xs text-gray-500">Engagement</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{(inf.estimatedReach / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-gray-500">Est. Reach</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600">${inf.estimatedCost}</p>
                      <p className="text-xs text-gray-500">Est. Cost</p>
                    </div>
                  </div>
                  {inf.recommendedCollaboration && (
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-rose-600 mb-1">Recommended Collaboration</p>
                      <p className="text-sm text-gray-700">{inf.recommendedCollaboration}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        case 'hashtag':
          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-sky-900">{data.topic}</h3>
                    <p className="text-sm text-sky-600">{data.platform}</p>
                  </div>
                  <HashtagIcon className="h-10 w-10 text-sky-400" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.parsedHashtags?.map((h: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(h.tag, `hash-${i}`)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                        h.recommended ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {h.tag}
                      {copied === `hash-${i}` && <CheckIcon className="h-4 w-4 ml-1 inline" />}
                    </button>
                  ))}
                </div>
              </div>
              {data.strategy && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Strategy</h4>
                  <p className="text-sm text-blue-800">{data.strategy}</p>
                </div>
              )}
              {data.parsedRecommendations && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Best Practices</h4>
                  <ul className="space-y-1">
                    {data.parsedRecommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-green-800 flex items-center">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        case 'landing-page':
          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-2">Headline</p>
                <h3 className="text-2xl font-bold text-amber-900 mb-2">{data.headline}</h3>
                {data.subheadline && <p className="text-amber-700">{data.subheadline}</p>}
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Body Copy</p>
                <p className="text-gray-700 leading-relaxed">{data.bodyCopy}</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="px-8 py-4 rounded-xl font-bold text-white shadow-lg" style={{ backgroundColor: data.ctaColor || '#4F46E5' }}>
                  {data.ctaText}
                </button>
                <span className="text-sm text-gray-500">CTA Preview</span>
              </div>
              {data.features && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Features</p>
                  <div className="grid grid-cols-2 gap-3">
                    {data.features.map((f: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{f.title}</p>
                        <p className="text-sm text-gray-600">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.parsedConversionTips && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Conversion Tips</h4>
                  <ul className="space-y-1">
                    {data.parsedConversionTips.map((tip: string, i: number) => (
                      <li key={i} className="text-sm text-green-800 flex items-center">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        case 'email-campaign':
          return (
            <div className="space-y-4">
              {/* Subject Line & Preview */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold uppercase tracking-wide">{data.campaignType || 'Email Campaign'}</span>
                  <button onClick={() => copyToClipboard(data.subject, 'subject')} className="text-indigo-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-100 rounded-lg transition-all">
                    {copied === 'subject' ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Subject Line</p>
                <h3 className="text-xl font-bold text-indigo-900 mb-2">{data.subject}</h3>
                {data.previewText && (
                  <>
                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Preview Text</p>
                    <p className="text-sm text-indigo-700 italic">{data.previewText}</p>
                  </>
                )}
              </div>

              {/* Performance Estimates */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                  <p className="text-xs text-green-600 font-medium">Est. Open Rate</p>
                  <p className="text-2xl font-bold text-green-900">{data.estimatedOpenRate}%</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                  <p className="text-xs text-blue-600 font-medium">Est. Click Rate</p>
                  <p className="text-2xl font-bold text-blue-900">{data.estimatedClickRate}%</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 text-center">
                  <p className="text-xs text-purple-600 font-medium">Best Send Time</p>
                  <p className="text-sm font-bold text-purple-900 mt-1">{data.sendTimeRec}</p>
                </div>
              </div>

              {/* Email Sections Preview */}
              {data.parsedSections && data.parsedSections.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Content Preview</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {data.parsedSections.map((section: any, i: number) => (
                      <div key={i} className="p-4">
                        {section.type === 'header' && (
                          <div className="text-center py-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl">
                            <h4 className="text-xl font-bold text-gray-900">{section.heading}</h4>
                            {section.subheading && <p className="text-sm text-gray-600 mt-1">{section.subheading}</p>}
                          </div>
                        )}
                        {section.type === 'body' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">{section.heading}</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{section.content}</p>
                          </div>
                        )}
                        {section.type === 'feature' && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">{section.heading}</h4>
                            <ul className="space-y-2">
                              {section.items?.map((item: string, j: number) => (
                                <li key={j} className="flex items-center text-sm text-gray-700">
                                  <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {section.type === 'testimonial' && (
                          <div className="bg-gray-50 rounded-xl p-4 italic">
                            <p className="text-gray-700 text-sm">"{section.quote}"</p>
                            <p className="text-xs text-gray-500 mt-2 not-italic font-medium">— {section.author}{section.role ? `, ${section.role}` : ''}</p>
                          </div>
                        )}
                        {section.type === 'cta' && (
                          <div className="text-center py-4">
                            <p className="font-semibold text-gray-900 mb-3">{section.heading}</p>
                            <button className="px-8 py-3 rounded-xl font-bold text-white shadow-lg" style={{ backgroundColor: data.ctaColor || '#4F46E5' }}>
                              {section.buttonText || data.ctaText}
                            </button>
                            {section.urgency && <p className="text-xs text-red-500 mt-2 font-medium">{section.urgency}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* A/B Test Variants */}
              {data.parsedAbVariants && data.parsedAbVariants.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">A/B Test Subject Lines</h4>
                  <div className="space-y-2">
                    {data.parsedAbVariants.map((variant: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 group">
                        <div className="flex items-center">
                          <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mr-3">{String.fromCharCode(65 + i)}</span>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{variant.subject}</p>
                            <p className="text-xs text-gray-500">{variant.angle}</p>
                          </div>
                        </div>
                        <button onClick={() => copyToClipboard(variant.subject, `ab-${i}`)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                          {copied === `ab-${i}` ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optimization Tips */}
              {data.parsedTips && data.parsedTips.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-700 mb-3">Optimization Tips</h4>
                  <ul className="space-y-2">
                    {data.parsedTips.map((tip: string, i: number) => (
                      <li key={i} className="flex items-start text-sm text-green-800">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        default:
          return null;
      }
    };

    // Handle new AI features
    if (['segment-build', 'journey', 'attribution', 'budget', 'fatigue', 'persona', 'influencer', 'hashtag', 'landing-page', 'email-campaign'].includes(result.type)) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
          {renderProfessionalOutput(result.data, result.type)}
        </div>
      );
    }

    // Original result rendering for older tools
    switch (result.type) {
      case 'text':
      case 'social':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
              <button onClick={() => copyToClipboard(result.content, 'main')} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                {copied === 'main' ? <CheckIcon className="h-4 w-4 mr-1" /> : <ClipboardDocumentIcon className="h-4 w-4 mr-1" />}
                {copied === 'main' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{result.content}</p>
            </div>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="space-y-3">
              {(result.items || []).map((item: string, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-all group">
                  <div className="flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm mr-4">{i + 1}</span>
                    <span className="text-gray-800 font-medium">{item}</span>
                  </div>
                  <button onClick={() => copyToClipboard(item, `item-${i}`)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                    {copied === `item-${i}` ? <CheckIcon className="h-5 w-5" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ad':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200 space-y-5">
              <div>
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Headline</p>
                <p className="text-xl font-bold text-gray-900">{result.headline}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Body</p>
                <p className="text-gray-700 leading-relaxed">{result.body}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Call to Action</p>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg">
                  {result.cta} <ChevronRightIcon className="h-5 w-5 ml-2 inline" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'sendtime':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
                <ClockIcon className="h-8 w-8 text-orange-500 mb-3" />
                <p className="text-sm font-medium text-orange-600 mb-1">Best Day</p>
                <p className="text-2xl font-bold text-gray-900">{result.data.bestDay}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <ClockIcon className="h-8 w-8 text-blue-500 mb-3" />
                <p className="text-sm font-medium text-blue-600 mb-1">Best Time</p>
                <p className="text-2xl font-bold text-gray-900">{result.data.bestTime}</p>
              </div>
            </div>
            {result.data.recommendations && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Recommendations</p>
                <ul className="space-y-2">
                  {result.data.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-gray-600">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'segments':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="space-y-3">
              {(result.segments || []).map((seg: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center mr-3 flex-shrink-0">
                        <UserGroupIcon className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{seg.name}</h4>
                        {seg.description && <p className="text-sm text-gray-600 mt-1">{seg.description}</p>}
                      </div>
                    </div>
                    {seg.contactCount !== undefined && (
                      <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">{seg.contactCount} contacts</span>
                    )}
                  </div>
                  {seg.suggestedAction && (
                    <div className="bg-white/60 rounded-lg p-3 mt-3">
                      <p className="text-xs font-semibold text-teal-700 mb-1">Suggested Action</p>
                      <p className="text-sm text-gray-700">{seg.suggestedAction}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'campaign':
        const ideas = result.data.ideas || [result.data];
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
            <div className="space-y-4">
              {ideas.map((idea: any, i: number) => (
                <div key={i} className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center mr-4 flex-shrink-0">
                      <LightBulbIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-gray-900 text-lg">{idea.title || idea.name}</h4>
                        {idea.estimatedImpact && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${idea.estimatedImpact === 'high' ? 'bg-green-100 text-green-700' : idea.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {idea.estimatedImpact} impact
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{idea.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {idea.type && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full capitalize">{idea.type}</span>}
                        {idea.targetAudience && <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{idea.targetAudience}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderSavedItemsList = () => {
    if (savedItems.length === 0) return null;

    return (
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Items ({savedItems.length})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {savedItems.map((item, i) => (
            <div
              key={item.id || i}
              onClick={() => { setSelectedItem(item); setShowDetail(true); }}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mr-3">
                  <SparklesIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.name || item.segmentName || item.topic || `Item ${i + 1}`}</p>
                  <p className="text-sm text-gray-500">{new Date(item.createdAt || item.detectedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setShowDetail(true); }}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
        <p className="mt-1 text-sm text-gray-500">Supercharge your marketing with AI-powered tools</p>
      </div>

      {!activeTool ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
              <SparklesIcon className="h-8 w-8 mb-3 opacity-80" />
              <p className="text-3xl font-bold">{AI_TOOLS.length}</p>
              <p className="text-primary-100">AI Tools Available</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <DocumentTextIcon className="h-8 w-8 text-blue-500 mb-3" />
              <p className="text-3xl font-bold text-gray-900">Unlimited</p>
              <p className="text-gray-500">Generations</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <ClockIcon className="h-8 w-8 text-green-500 mb-3" />
              <p className="text-3xl font-bold text-gray-900">&lt; 5s</p>
              <p className="text-gray-500">Average Response</p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setResult(null); }}
                className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-xl hover:border-gray-300 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <tool.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{tool.name}</h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{tool.description}</p>
                <div className="mt-4 flex items-center text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Use Tool <ChevronRightIcon className="h-4 w-4 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Tool Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button onClick={() => { setActiveTool(null); setResult(null); setSavedItems([]); }} className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
                {(() => {
                  const tool = getActiveTool();
                  return tool ? (
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mr-4`}>
                      <tool.icon className="h-6 w-6 text-white" />
                    </div>
                  ) : null;
                })()}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{getActiveTool()?.name}</h2>
                  <p className="text-sm text-gray-500">{getActiveTool()?.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tool Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Input</h3>
                {renderSampleButtons()}
                {renderToolForm()}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="mt-6 w-full inline-flex justify-center items-center px-6 py-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Generate with AI
                    </>
                  )}
                </button>
                {renderSavedItemsList()}
              </div>

              {/* Output Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Output</h3>
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 animate-pulse">
                      <SparklesIcon className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600 font-medium">AI is working its magic...</p>
                    <p className="text-gray-400 text-sm mt-1">This usually takes a few seconds</p>
                  </div>
                ) : result ? (
                  renderResult()
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                      <SparklesIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Your AI-generated content will appear here</p>
                    <p className="text-gray-400 text-sm mt-1">Fill in the form and click Generate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        item={selectedItem}
        type={getDetailType()}
        onDelete={handleDelete}
        onEdit={['segment-builder', 'journey-optimizer', 'persona-creator', 'influencer-matcher', 'landing-page-builder', 'email-campaign-writer'].includes(activeTool || '') ? handleEdit : undefined}
      />
    </div>
  );
}
