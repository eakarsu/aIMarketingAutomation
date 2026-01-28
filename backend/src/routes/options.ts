import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Public options (no auth required)

// Campaign types
router.get('/campaign-types', (req, res) => {
  res.json([
    { value: 'EMAIL', label: 'Email' },
    { value: 'SMS', label: 'SMS' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media' },
    { value: 'MULTI_CHANNEL', label: 'Multi-Channel' },
  ]);
});

// Campaign statuses
router.get('/campaign-statuses', (req, res) => {
  res.json([
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'SENDING', label: 'Sending' },
    { value: 'SENT', label: 'Sent' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PAUSED', label: 'Paused' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]);
});

// Template types
router.get('/template-types', (req, res) => {
  res.json([
    { value: 'EMAIL', label: 'Email' },
    { value: 'SMS', label: 'SMS' },
    { value: 'SOCIAL_POST', label: 'Social Post' },
    { value: 'LANDING_PAGE', label: 'Landing Page' },
  ]);
});

// Template categories
router.get('/template-categories', (req, res) => {
  res.json([
    { value: 'Welcome', label: 'Welcome' },
    { value: 'Newsletter', label: 'Newsletter' },
    { value: 'Promotional', label: 'Promotional' },
    { value: 'Transactional', label: 'Transactional' },
    { value: 'Engagement', label: 'Engagement' },
    { value: 'Reminder', label: 'Reminder' },
    { value: 'Feedback', label: 'Feedback' },
    { value: 'Events', label: 'Events' },
    { value: 'Social', label: 'Social' },
    { value: 'Other', label: 'Other' },
  ]);
});

// Automation types
router.get('/automation-types', (req, res) => {
  res.json([
    { value: 'WELCOME', label: 'Welcome Series' },
    { value: 'DRIP', label: 'Drip Campaign' },
    { value: 'TRIGGER', label: 'Trigger-Based' },
    { value: 'BIRTHDAY', label: 'Birthday' },
    { value: 'REENGAGEMENT', label: 'Re-engagement' },
  ]);
});

// Automation statuses
router.get('/automation-statuses', (req, res) => {
  res.json([
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PAUSED', label: 'Paused' },
  ]);
});

// Automation step types
router.get('/automation-step-types', (req, res) => {
  res.json([
    { value: 'EMAIL', label: 'Send Email' },
    { value: 'SMS', label: 'Send SMS' },
    { value: 'WAIT', label: 'Wait/Delay' },
    { value: 'CONDITION', label: 'Condition/Branch' },
    { value: 'TAG_ADD', label: 'Add Tag' },
    { value: 'TAG_REMOVE', label: 'Remove Tag' },
    { value: 'WEBHOOK', label: 'Webhook' },
    { value: 'NOTIFICATION', label: 'Send Notification' },
  ]);
});

// Contact statuses
router.get('/contact-statuses', (req, res) => {
  res.json([
    { value: 'ACTIVE', label: 'Active' },
    { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
    { value: 'BOUNCED', label: 'Bounced' },
    { value: 'INACTIVE', label: 'Inactive' },
  ]);
});

// Contact sources
router.get('/contact-sources', (req, res) => {
  res.json([
    { value: 'website', label: 'Website' },
    { value: 'form', label: 'Form Submission' },
    { value: 'import', label: 'Import' },
    { value: 'referral', label: 'Referral' },
    { value: 'tradeshow', label: 'Trade Show' },
    { value: 'advertisement', label: 'Advertisement' },
    { value: 'cold_email', label: 'Cold Outreach' },
    { value: 'social', label: 'Social Media' },
    { value: 'api', label: 'API' },
    { value: 'other', label: 'Other' },
  ]);
});

// Review platforms
router.get('/review-platforms', (req, res) => {
  res.json([
    { value: 'GOOGLE', label: 'Google' },
    { value: 'YELP', label: 'Yelp' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'TRIPADVISOR', label: 'TripAdvisor' },
    { value: 'TRUSTPILOT', label: 'Trustpilot' },
    { value: 'BBB', label: 'BBB' },
    { value: 'OTHER', label: 'Other' },
  ]);
});

// Review statuses
router.get('/review-statuses', (req, res) => {
  res.json([
    { value: 'PENDING', label: 'Pending' },
    { value: 'RESPONDED', label: 'Responded' },
    { value: 'IGNORED', label: 'Ignored' },
  ]);
});

// Integration types
router.get('/integration-types', (req, res) => {
  res.json([
    { value: 'EMAIL_PROVIDER', label: 'Email Provider', description: 'SendGrid, Mailgun, AWS SES' },
    { value: 'SMS_PROVIDER', label: 'SMS Provider', description: 'Twilio, Vonage' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media', description: 'Facebook, Instagram, Twitter' },
    { value: 'CRM', label: 'CRM', description: 'Salesforce, HubSpot, Zoho' },
    { value: 'BOOKING', label: 'Booking System', description: 'Calendly, Acuity' },
    { value: 'ANALYTICS', label: 'Analytics', description: 'Google Analytics, Mixpanel' },
    { value: 'PAYMENT', label: 'Payment', description: 'Stripe, PayPal' },
    { value: 'ECOMMERCE', label: 'E-commerce', description: 'Shopify, WooCommerce' },
    { value: 'WEBHOOK', label: 'Webhook', description: 'Custom webhooks' },
    { value: 'API', label: 'API', description: 'REST API access' },
  ]);
});

// Integration providers by type
router.get('/integration-providers', (req, res) => {
  res.json({
    EMAIL_PROVIDER: [
      { value: 'sendgrid', label: 'SendGrid' },
      { value: 'mailgun', label: 'Mailgun' },
      { value: 'aws_ses', label: 'AWS SES' },
      { value: 'postmark', label: 'Postmark' },
      { value: 'mailchimp', label: 'Mailchimp Transactional' },
    ],
    SMS_PROVIDER: [
      { value: 'twilio', label: 'Twilio' },
      { value: 'vonage', label: 'Vonage' },
      { value: 'plivo', label: 'Plivo' },
      { value: 'messagebird', label: 'MessageBird' },
    ],
    SOCIAL_MEDIA: [
      { value: 'facebook', label: 'Facebook' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'twitter', label: 'Twitter/X' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'tiktok', label: 'TikTok' },
    ],
    CRM: [
      { value: 'salesforce', label: 'Salesforce' },
      { value: 'hubspot', label: 'HubSpot' },
      { value: 'zoho', label: 'Zoho CRM' },
      { value: 'pipedrive', label: 'Pipedrive' },
      { value: 'freshsales', label: 'Freshsales' },
    ],
    BOOKING: [
      { value: 'calendly', label: 'Calendly' },
      { value: 'acuity', label: 'Acuity Scheduling' },
      { value: 'square', label: 'Square Appointments' },
      { value: 'setmore', label: 'Setmore' },
    ],
    ANALYTICS: [
      { value: 'google_analytics', label: 'Google Analytics' },
      { value: 'mixpanel', label: 'Mixpanel' },
      { value: 'amplitude', label: 'Amplitude' },
      { value: 'heap', label: 'Heap' },
    ],
    PAYMENT: [
      { value: 'stripe', label: 'Stripe' },
      { value: 'paypal', label: 'PayPal' },
      { value: 'square', label: 'Square' },
      { value: 'braintree', label: 'Braintree' },
    ],
    ECOMMERCE: [
      { value: 'shopify', label: 'Shopify' },
      { value: 'woocommerce', label: 'WooCommerce' },
      { value: 'bigcommerce', label: 'BigCommerce' },
      { value: 'magento', label: 'Magento' },
    ],
    WEBHOOK: [
      { value: 'custom', label: 'Custom Webhook' },
    ],
    API: [
      { value: 'rest', label: 'REST API' },
      { value: 'graphql', label: 'GraphQL' },
    ],
  });
});

// Form field types
router.get('/form-field-types', (req, res) => {
  res.json([
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'date', label: 'Date' },
    { value: 'file', label: 'File Upload' },
    { value: 'hidden', label: 'Hidden' },
  ]);
});

// Custom field types
router.get('/custom-field-types', (req, res) => {
  res.json([
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'DROPDOWN', label: 'Dropdown' },
    { value: 'CHECKBOX', label: 'Checkbox' },
    { value: 'URL', label: 'URL' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
  ]);
});

// Segment rule fields
router.get('/segment-rule-fields', (req, res) => {
  res.json([
    { value: 'status', label: 'Status' },
    { value: 'source', label: 'Source' },
    { value: 'email', label: 'Email contains' },
    { value: 'company', label: 'Company contains' },
    { value: 'createdAfter', label: 'Created After' },
    { value: 'createdBefore', label: 'Created Before' },
    { value: 'hasTag', label: 'Has Tag' },
    { value: 'noTag', label: 'Does Not Have Tag' },
    { value: 'openedCampaign', label: 'Opened Campaign' },
    { value: 'clickedLink', label: 'Clicked Link' },
    { value: 'lastActivity', label: 'Last Activity' },
  ]);
});

// Segment rule operators
router.get('/segment-rule-operators', (req, res) => {
  res.json([
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater Than or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less Than or Equal' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
  ]);
});

// AI content types
router.get('/ai-content-types', (req, res) => {
  res.json([
    { value: 'blog', label: 'Blog Post' },
    { value: 'email', label: 'Email Copy' },
    { value: 'ad', label: 'Ad Copy' },
    { value: 'social', label: 'Social Post' },
    { value: 'landing', label: 'Landing Page' },
    { value: 'sms', label: 'SMS Message' },
    { value: 'product', label: 'Product Description' },
    { value: 'headline', label: 'Headlines' },
  ]);
});

// AI tones
router.get('/ai-tones', (req, res) => {
  res.json([
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'formal', label: 'Formal' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'persuasive', label: 'Persuasive' },
  ]);
});

// Social media platforms
router.get('/social-platforms', (req, res) => {
  res.json([
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'pinterest', label: 'Pinterest' },
  ]);
});

// Ad platforms
router.get('/ad-platforms', (req, res) => {
  res.json([
    { value: 'facebook', label: 'Facebook Ads' },
    { value: 'google', label: 'Google Ads' },
    { value: 'instagram', label: 'Instagram Ads' },
    { value: 'linkedin', label: 'LinkedIn Ads' },
    { value: 'twitter', label: 'Twitter Ads' },
    { value: 'tiktok', label: 'TikTok Ads' },
    { value: 'pinterest', label: 'Pinterest Ads' },
    { value: 'microsoft', label: 'Microsoft Ads' },
  ]);
});

// Timezones
router.get('/timezones', (req, res) => {
  res.json([
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
  ]);
});

// Analytics periods
router.get('/analytics-periods', (req, res) => {
  res.json([
    { value: 7, label: 'Last 7 days' },
    { value: 14, label: 'Last 14 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 60, label: 'Last 60 days' },
    { value: 90, label: 'Last 90 days' },
    { value: 180, label: 'Last 6 months' },
    { value: 365, label: 'Last year' },
  ]);
});

// Rating options
router.get('/ratings', (req, res) => {
  res.json([
    { value: 5, label: '5 Stars' },
    { value: 4, label: '4 Stars' },
    { value: 3, label: '3 Stars' },
    { value: 2, label: '2 Stars' },
    { value: 1, label: '1 Star' },
  ]);
});

// Get all options at once (for initial load)
router.get('/all', (req, res) => {
  res.json({
    campaignTypes: [
      { value: 'EMAIL', label: 'Email' },
      { value: 'SMS', label: 'SMS' },
      { value: 'SOCIAL_MEDIA', label: 'Social Media' },
      { value: 'MULTI_CHANNEL', label: 'Multi-Channel' },
    ],
    campaignStatuses: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'SCHEDULED', label: 'Scheduled' },
      { value: 'SENDING', label: 'Sending' },
      { value: 'SENT', label: 'Sent' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'PAUSED', label: 'Paused' },
      { value: 'COMPLETED', label: 'Completed' },
    ],
    templateTypes: [
      { value: 'EMAIL', label: 'Email' },
      { value: 'SMS', label: 'SMS' },
      { value: 'SOCIAL_POST', label: 'Social Post' },
    ],
    automationTypes: [
      { value: 'WELCOME', label: 'Welcome Series' },
      { value: 'DRIP', label: 'Drip Campaign' },
      { value: 'TRIGGER', label: 'Trigger-Based' },
      { value: 'BIRTHDAY', label: 'Birthday' },
      { value: 'REENGAGEMENT', label: 'Re-engagement' },
    ],
    automationStatuses: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'PAUSED', label: 'Paused' },
    ],
    contactStatuses: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
      { value: 'BOUNCED', label: 'Bounced' },
      { value: 'INACTIVE', label: 'Inactive' },
    ],
    reviewPlatforms: [
      { value: 'GOOGLE', label: 'Google' },
      { value: 'YELP', label: 'Yelp' },
      { value: 'FACEBOOK', label: 'Facebook' },
    ],
    reviewStatuses: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'RESPONDED', label: 'Responded' },
      { value: 'IGNORED', label: 'Ignored' },
    ],
  });
});

export default router;
