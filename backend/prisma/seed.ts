import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      company: 'Marketing Pro Inc.',
      phone: '+1-555-123-4567',
      timezone: 'America/New_York',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created user:', user.email);

  // ============= TAGS (15+) =============
  const tagData = [
    { name: 'VIP', color: '#FFD700' },
    { name: 'New Customer', color: '#22C55E' },
    { name: 'Newsletter', color: '#3B82F6' },
    { name: 'Lead', color: '#F97316' },
    { name: 'Inactive', color: '#6B7280' },
    { name: 'Hot Lead', color: '#EF4444' },
    { name: 'Warm Lead', color: '#F59E0B' },
    { name: 'Cold Lead', color: '#94A3B8' },
    { name: 'Churned', color: '#DC2626' },
    { name: 'Enterprise', color: '#7C3AED' },
    { name: 'Small Business', color: '#06B6D4' },
    { name: 'Referral', color: '#10B981' },
    { name: 'Event Attendee', color: '#8B5CF6' },
    { name: 'Webinar', color: '#EC4899' },
    { name: 'E-commerce', color: '#14B8A6' },
    { name: 'B2B', color: '#6366F1' },
    { name: 'B2C', color: '#F472B6' },
  ];

  const tags: any[] = [];
  for (const t of tagData) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId: user.id, name: t.name } },
      update: {},
      create: { userId: user.id, name: t.name, color: t.color },
    });
    tags.push(tag);
  }
  console.log('✅ Created tags:', tags.length);

  // ============= CUSTOM FIELDS (15+) =============
  const customFieldData = [
    { name: 'Industry', fieldType: 'DROPDOWN', options: ['Technology', 'Healthcare', 'Retail', 'Finance', 'Manufacturing', 'Education', 'Other'] },
    { name: 'Company Size', fieldType: 'DROPDOWN', options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
    { name: 'Website', fieldType: 'URL', options: null },
    { name: 'Birthday', fieldType: 'DATE', options: null },
    { name: 'Annual Revenue', fieldType: 'DROPDOWN', options: ['Under $100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+'] },
    { name: 'Lead Source', fieldType: 'DROPDOWN', options: ['Website', 'Referral', 'Social Media', 'Trade Show', 'Cold Outreach', 'Advertisement'] },
    { name: 'Job Title', fieldType: 'TEXT', options: null },
    { name: 'Department', fieldType: 'DROPDOWN', options: ['Marketing', 'Sales', 'IT', 'HR', 'Finance', 'Operations', 'Executive'] },
    { name: 'LinkedIn URL', fieldType: 'URL', options: null },
    { name: 'Preferred Contact Time', fieldType: 'DROPDOWN', options: ['Morning', 'Afternoon', 'Evening'] },
    { name: 'Products Interested', fieldType: 'TEXT', options: null },
    { name: 'Last Purchase Date', fieldType: 'DATE', options: null },
    { name: 'Customer Since', fieldType: 'DATE', options: null },
    { name: 'Subscription Plan', fieldType: 'DROPDOWN', options: ['Free', 'Starter', 'Professional', 'Enterprise'] },
    { name: 'NPS Score', fieldType: 'NUMBER', options: null },
    { name: 'Notes', fieldType: 'TEXT', options: null },
  ];

  const customFields: any[] = [];
  for (const cf of customFieldData) {
    const field = await prisma.customField.upsert({
      where: { userId_name: { userId: user.id, name: cf.name } },
      update: {},
      create: {
        userId: user.id,
        name: cf.name,
        fieldType: cf.fieldType as any,
        options: cf.options ? JSON.stringify(cf.options) : null,
      },
    });
    customFields.push(field);
  }
  console.log('✅ Created custom fields:', customFields.length);

  // ============= CONTACTS (20+) =============
  const contactData = [
    { email: 'john.smith@techcorp.com', firstName: 'John', lastName: 'Smith', phone: '+1-555-101-0001', company: 'Tech Corp', source: 'website' },
    { email: 'jane.doe@designstudio.com', firstName: 'Jane', lastName: 'Doe', phone: '+1-555-101-0002', company: 'Design Studio', source: 'referral' },
    { email: 'bob.wilson@marketingagency.com', firstName: 'Bob', lastName: 'Wilson', phone: '+1-555-101-0003', company: 'Marketing Agency', source: 'form' },
    { email: 'alice.brown@startupinc.com', firstName: 'Alice', lastName: 'Brown', phone: '+1-555-101-0004', company: 'Startup Inc', source: 'import' },
    { email: 'charlie.davis@consulting.com', firstName: 'Charlie', lastName: 'Davis', phone: '+1-555-101-0005', company: 'Consulting LLC', source: 'website' },
    { email: 'emma.johnson@retailplus.com', firstName: 'Emma', lastName: 'Johnson', phone: '+1-555-101-0006', company: 'Retail Plus', source: 'tradeshow' },
    { email: 'michael.lee@financegroup.com', firstName: 'Michael', lastName: 'Lee', phone: '+1-555-101-0007', company: 'Finance Group', source: 'referral' },
    { email: 'sarah.miller@healthco.com', firstName: 'Sarah', lastName: 'Miller', phone: '+1-555-101-0008', company: 'HealthCo', source: 'website' },
    { email: 'david.taylor@manufacturing.com', firstName: 'David', lastName: 'Taylor', phone: '+1-555-101-0009', company: 'Manufacturing Inc', source: 'cold_email' },
    { email: 'lisa.anderson@education.org', firstName: 'Lisa', lastName: 'Anderson', phone: '+1-555-101-0010', company: 'Education First', source: 'form' },
    { email: 'james.thomas@logistics.com', firstName: 'James', lastName: 'Thomas', phone: '+1-555-101-0011', company: 'Logistics Pro', source: 'advertisement' },
    { email: 'jennifer.white@realestate.com', firstName: 'Jennifer', lastName: 'White', phone: '+1-555-101-0012', company: 'Real Estate Group', source: 'referral' },
    { email: 'robert.harris@software.io', firstName: 'Robert', lastName: 'Harris', phone: '+1-555-101-0013', company: 'Software.io', source: 'website' },
    { email: 'patricia.clark@foodservice.com', firstName: 'Patricia', lastName: 'Clark', phone: '+1-555-101-0014', company: 'Food Service Co', source: 'import' },
    { email: 'william.lewis@automotive.com', firstName: 'William', lastName: 'Lewis', phone: '+1-555-101-0015', company: 'Automotive Solutions', source: 'tradeshow' },
    { email: 'elizabeth.walker@media.com', firstName: 'Elizabeth', lastName: 'Walker', phone: '+1-555-101-0016', company: 'Media Group', source: 'form' },
    { email: 'joseph.hall@construction.com', firstName: 'Joseph', lastName: 'Hall', phone: '+1-555-101-0017', company: 'Construction LLC', source: 'referral' },
    { email: 'margaret.allen@travel.com', firstName: 'Margaret', lastName: 'Allen', phone: '+1-555-101-0018', company: 'Travel Agency', source: 'website' },
    { email: 'charles.young@insurance.com', firstName: 'Charles', lastName: 'Young', phone: '+1-555-101-0019', company: 'Insurance Plus', source: 'cold_email' },
    { email: 'susan.king@hospitality.com', firstName: 'Susan', lastName: 'King', phone: '+1-555-101-0020', company: 'Hospitality Group', source: 'advertisement' },
  ];

  const contacts: any[] = [];
  for (const c of contactData) {
    const contact = await prisma.contact.upsert({
      where: { userId_email: { userId: user.id, email: c.email } },
      update: {},
      create: {
        userId: user.id,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        company: c.company,
        source: c.source,
        status: 'ACTIVE',
      },
    });
    contacts.push(contact);
  }
  console.log('✅ Created contacts:', contacts.length);

  // Add tags to contacts
  for (let i = 0; i < contacts.length; i++) {
    const tagIndex1 = i % tags.length;
    const tagIndex2 = (i + 3) % tags.length;
    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId: contacts[i].id, tagId: tags[tagIndex1].id } },
      update: {},
      create: { contactId: contacts[i].id, tagId: tags[tagIndex1].id },
    });
    if (tagIndex1 !== tagIndex2) {
      await prisma.contactTag.upsert({
        where: { contactId_tagId: { contactId: contacts[i].id, tagId: tags[tagIndex2].id } },
        update: {},
        create: { contactId: contacts[i].id, tagId: tags[tagIndex2].id },
      });
    }
  }
  console.log('✅ Added tags to contacts');

  // ============= SEGMENTS (15+) =============
  const segmentData = [
    { name: 'Active Subscribers', description: 'All active email subscribers', rules: [{ field: 'status', operator: 'eq', value: 'ACTIVE' }] },
    { name: 'VIP Customers', description: 'High-value customers with VIP tag', rules: [{ field: 'hasTag', operator: 'eq', value: 'VIP' }] },
    { name: 'New Leads', description: 'Contacts added in the last 30 days', rules: [{ field: 'createdAfter', operator: 'gte', value: '30days' }] },
    { name: 'Enterprise Accounts', description: 'Enterprise-level customers', rules: [{ field: 'hasTag', operator: 'eq', value: 'Enterprise' }] },
    { name: 'Inactive 60+ Days', description: 'Contacts with no engagement in 60+ days', rules: [{ field: 'lastEngagement', operator: 'gt', value: '60days' }] },
    { name: 'Newsletter Subscribers', description: 'Opted-in to newsletter', rules: [{ field: 'hasTag', operator: 'eq', value: 'Newsletter' }] },
    { name: 'Hot Leads', description: 'High-intent leads ready to convert', rules: [{ field: 'hasTag', operator: 'eq', value: 'Hot Lead' }] },
    { name: 'E-commerce Customers', description: 'Online store customers', rules: [{ field: 'hasTag', operator: 'eq', value: 'E-commerce' }] },
    { name: 'B2B Prospects', description: 'Business-to-business contacts', rules: [{ field: 'hasTag', operator: 'eq', value: 'B2B' }] },
    { name: 'Event Attendees', description: 'Attended company events', rules: [{ field: 'hasTag', operator: 'eq', value: 'Event Attendee' }] },
    { name: 'Webinar Registrants', description: 'Registered for webinars', rules: [{ field: 'hasTag', operator: 'eq', value: 'Webinar' }] },
    { name: 'Churned Customers', description: 'Previously churned accounts', rules: [{ field: 'hasTag', operator: 'eq', value: 'Churned' }] },
    { name: 'Referral Sources', description: 'Contacts who referred others', rules: [{ field: 'hasTag', operator: 'eq', value: 'Referral' }] },
    { name: 'Small Business', description: 'Small business customers', rules: [{ field: 'hasTag', operator: 'eq', value: 'Small Business' }] },
    { name: 'High Openers', description: 'Contacts with high email open rates', rules: [{ field: 'openRate', operator: 'gt', value: '50' }] },
    { name: 'Clicked Last Week', description: 'Clicked a link in the last 7 days', rules: [{ field: 'lastClick', operator: 'lt', value: '7days' }] },
  ];

  const segments: any[] = [];
  for (let i = 0; i < segmentData.length; i++) {
    const s = segmentData[i];
    const segment = await prisma.segment.upsert({
      where: { id: `segment-${i + 1}` },
      update: {},
      create: {
        id: `segment-${i + 1}`,
        userId: user.id,
        name: s.name,
        description: s.description,
        rules: JSON.stringify(s.rules),
      },
    });
    segments.push(segment);
  }
  console.log('✅ Created segments:', segments.length);

  // ============= TEMPLATES (15+) =============
  const templateData = [
    { name: 'Welcome Email', type: 'EMAIL', category: 'Welcome', subject: 'Welcome to {{company_name}}!', content: 'Hi {{first_name}},\n\nWelcome to our community!' },
    { name: 'Newsletter Template', type: 'EMAIL', category: 'Newsletter', subject: '{{month}} Newsletter', content: 'Hi {{first_name}},\n\nHere are the latest updates...' },
    { name: 'Promotional SMS', type: 'SMS', category: 'Promotional', subject: null, content: '{{company}}: Flash Sale! Get 20% off with code FLASH20' },
    { name: 'Product Launch', type: 'SOCIAL_POST', category: 'Promotional', subject: null, content: 'Excited to announce our latest product! #newproduct #launch' },
    { name: 'Abandoned Cart', type: 'EMAIL', category: 'Transactional', subject: 'You left something behind!', content: 'Hi {{first_name}},\n\nYour cart is waiting...' },
    { name: 'Order Confirmation', type: 'EMAIL', category: 'Transactional', subject: 'Order Confirmed: {{order_number}}', content: 'Thank you for your order!' },
    { name: 'Appointment Reminder', type: 'SMS', category: 'Reminder', subject: null, content: 'Reminder: Your appointment is tomorrow at {{time}}' },
    { name: 'Birthday Greeting', type: 'EMAIL', category: 'Engagement', subject: 'Happy Birthday, {{first_name}}!', content: 'Wishing you a wonderful birthday!' },
    { name: 'Re-engagement Email', type: 'EMAIL', category: 'Engagement', subject: 'We miss you, {{first_name}}!', content: 'It\'s been a while...' },
    { name: 'Survey Request', type: 'EMAIL', category: 'Feedback', subject: 'We value your opinion', content: 'Please take a moment to share your feedback' },
    { name: 'Flash Sale SMS', type: 'SMS', category: 'Promotional', subject: null, content: '24 HOUR FLASH SALE! Use code SAVE30 for 30% off!' },
    { name: 'Event Invitation', type: 'EMAIL', category: 'Events', subject: 'You\'re Invited: {{event_name}}', content: 'Join us for an exclusive event!' },
    { name: 'Webinar Registration', type: 'EMAIL', category: 'Events', subject: 'Register for our upcoming webinar', content: 'Don\'t miss this opportunity to learn!' },
    { name: 'Thank You Email', type: 'EMAIL', category: 'Engagement', subject: 'Thank you for your purchase!', content: 'We appreciate your business!' },
    { name: 'Social Proof Post', type: 'SOCIAL_POST', category: 'Social', subject: null, content: 'See what our customers are saying! ⭐⭐⭐⭐⭐ #testimonials' },
    { name: 'Company Update', type: 'EMAIL', category: 'Newsletter', subject: 'Big News from {{company_name}}!', content: 'We have exciting updates to share!' },
  ];

  const templates: any[] = [];
  for (const t of templateData) {
    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: t.name,
        type: t.type as any,
        category: t.category,
        subject: t.subject,
        content: t.content,
        htmlContent: `<div style="font-family: Arial, sans-serif;">${t.content.replace(/\n/g, '<br>')}</div>`,
      },
    });
    templates.push(template);
  }
  console.log('✅ Created templates:', templates.length);

  // ============= CAMPAIGNS (15+) =============
  const campaignData = [
    { name: 'Welcome Series - Week 1', type: 'EMAIL', status: 'SENT', subject: 'Welcome to Our Community!' },
    { name: 'December Newsletter', type: 'EMAIL', status: 'DRAFT', subject: 'December Newsletter - Year in Review' },
    { name: 'Holiday Sale SMS', type: 'SMS', status: 'SCHEDULED', subject: null },
    { name: 'Black Friday Promo', type: 'EMAIL', status: 'SENT', subject: 'Black Friday - Biggest Sale of the Year!' },
    { name: 'Cyber Monday Follow-up', type: 'EMAIL', status: 'SENT', subject: 'Last Chance - Cyber Monday Deals!' },
    { name: 'New Year Campaign', type: 'MULTI_CHANNEL', status: 'DRAFT', subject: 'Start 2024 Right!' },
    { name: 'Valentine\'s Day Special', type: 'EMAIL', status: 'SCHEDULED', subject: 'Show Some Love - Valentine\'s Deals' },
    { name: 'Spring Collection Launch', type: 'EMAIL', status: 'DRAFT', subject: 'Spring Is Here!' },
    { name: 'Customer Appreciation', type: 'EMAIL', status: 'SENT', subject: 'Thank You for Being Awesome!' },
    { name: 'Flash Sale Alert', type: 'SMS', status: 'SENT', subject: null },
    { name: 'Product Update Announcement', type: 'EMAIL', status: 'SENT', subject: 'Exciting New Features!' },
    { name: 'Re-engagement Campaign', type: 'EMAIL', status: 'SENDING', subject: 'We Miss You!' },
    { name: 'Webinar Invitation', type: 'EMAIL', status: 'SENT', subject: 'Join Our Exclusive Webinar' },
    { name: 'Social Media Contest', type: 'SOCIAL_MEDIA', status: 'SENDING', subject: null },
    { name: 'End of Season Sale', type: 'MULTI_CHANNEL', status: 'DRAFT', subject: 'Clearance Event!' },
    { name: 'Back to School', type: 'EMAIL', status: 'SENT', subject: 'Back to School Savings!' },
  ];

  const campaigns: any[] = [];
  for (let i = 0; i < campaignData.length; i++) {
    const c = campaignData[i];
    const sentDaysAgo = Math.floor(Math.random() * 30) + 1;
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: c.name,
        type: c.type as any,
        status: c.status as any,
        subject: c.subject,
        content: `Campaign content for ${c.name}`,
        templateId: templates[i % templates.length].id,
        sentAt: c.status === 'SENT' ? new Date(Date.now() - sentDaysAgo * 24 * 60 * 60 * 1000) : null,
        scheduledAt: c.status === 'SCHEDULED' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
    });
    campaigns.push(campaign);

    // Add analytics for sent campaigns
    if (c.status === 'SENT') {
      const totalSent = Math.floor(Math.random() * 500) + 100;
      await prisma.campaignAnalytics.create({
        data: {
          campaignId: campaign.id,
          totalSent,
          delivered: Math.floor(totalSent * 0.95),
          opened: Math.floor(totalSent * (0.15 + Math.random() * 0.25)),
          clicked: Math.floor(totalSent * (0.02 + Math.random() * 0.08)),
          bounced: Math.floor(totalSent * 0.02),
          unsubscribed: Math.floor(totalSent * 0.01),
          conversions: Math.floor(totalSent * 0.01 * Math.random()),
          revenue: Math.floor(Math.random() * 1000),
        },
      });
    }
  }
  console.log('✅ Created campaigns:', campaigns.length);

  // ============= AUTOMATIONS (15+) =============
  const automationData = [
    { name: 'Welcome Sequence', type: 'WELCOME', status: 'ACTIVE', trigger: { event: 'contact_created' } },
    { name: 'Re-engagement Campaign', type: 'REENGAGEMENT', status: 'ACTIVE', trigger: { event: 'no_activity', days: 30 } },
    { name: 'Birthday Wishes', type: 'BIRTHDAY', status: 'ACTIVE', trigger: { event: 'birthday' } },
    { name: 'Abandoned Cart Recovery', type: 'DRIP', status: 'ACTIVE', trigger: { event: 'cart_abandoned' } },
    { name: 'Post-Purchase Follow-up', type: 'DRIP', status: 'ACTIVE', trigger: { event: 'purchase_completed' } },
    { name: 'Lead Nurturing', type: 'DRIP', status: 'ACTIVE', trigger: { event: 'lead_created' } },
    { name: 'Onboarding Series', type: 'WELCOME', status: 'ACTIVE', trigger: { event: 'signup_completed' } },
    { name: 'Renewal Reminder', type: 'TRIGGER', status: 'ACTIVE', trigger: { event: 'subscription_expiring', days: 14 } },
    { name: 'Win-back Campaign', type: 'REENGAGEMENT', status: 'INACTIVE', trigger: { event: 'no_purchase', days: 90 } },
    { name: 'Review Request', type: 'TRIGGER', status: 'ACTIVE', trigger: { event: 'purchase_delivered', delay: 7 } },
    { name: 'Upsell Campaign', type: 'DRIP', status: 'ACTIVE', trigger: { event: 'purchase_completed', product_category: 'starter' } },
    { name: 'Event Follow-up', type: 'TRIGGER', status: 'INACTIVE', trigger: { event: 'event_attended' } },
    { name: 'Loyalty Rewards', type: 'TRIGGER', status: 'ACTIVE', trigger: { event: 'points_threshold', threshold: 1000 } },
    { name: 'Survey Automation', type: 'TRIGGER', status: 'INACTIVE', trigger: { event: 'nps_score_low' } },
    { name: 'VIP Upgrade', type: 'TRIGGER', status: 'ACTIVE', trigger: { event: 'spending_threshold', amount: 500 } },
    { name: 'Cross-sell Campaign', type: 'DRIP', status: 'ACTIVE', trigger: { event: 'product_purchased' } },
  ];

  const automations: any[] = [];
  for (const a of automationData) {
    const automation = await prisma.automation.create({
      data: {
        userId: user.id,
        name: a.name,
        type: a.type as any,
        status: a.status as any,
        trigger: JSON.stringify(a.trigger),
        steps: {
          create: [
            { order: 1, type: 'EMAIL', templateId: templates[0].id, delayMinutes: 0 },
            { order: 2, type: 'WAIT', delayMinutes: 1440 },
            { order: 3, type: 'EMAIL', templateId: templates[1].id, delayMinutes: 0 },
          ],
        },
      },
    });
    automations.push(automation);
  }
  console.log('✅ Created automations:', automations.length);

  // ============= REVIEWS (15+) =============
  const reviewData = [
    { platform: 'GOOGLE', rating: 5, content: 'Excellent service! Very professional and responsive team.', authorName: 'John D.', status: 'RESPONDED' },
    { platform: 'YELP', rating: 4, content: 'Great experience overall. Would recommend.', authorName: 'Sarah M.', status: 'PENDING' },
    { platform: 'GOOGLE', rating: 3, content: 'Decent service, but room for improvement.', authorName: 'Mike R.', status: 'PENDING' },
    { platform: 'FACEBOOK', rating: 5, content: 'Best in the business! Highly recommend.', authorName: 'Emily T.', status: 'RESPONDED' },
    { platform: 'GOOGLE', rating: 5, content: 'Outstanding customer support. They went above and beyond.', authorName: 'David L.', status: 'RESPONDED' },
    { platform: 'YELP', rating: 4, content: 'Very happy with the results. Will use again.', authorName: 'Lisa K.', status: 'PENDING' },
    { platform: 'GOOGLE', rating: 2, content: 'Had some issues but they were resolved eventually.', authorName: 'Robert P.', status: 'RESPONDED' },
    { platform: 'FACEBOOK', rating: 5, content: 'Amazing team! They really understand our needs.', authorName: 'Jennifer H.', status: 'RESPONDED' },
    { platform: 'GOOGLE', rating: 4, content: 'Solid service, fair pricing.', authorName: 'William S.', status: 'PENDING' },
    { platform: 'YELP', rating: 5, content: 'Fantastic results! Exceeded all expectations.', authorName: 'Amanda B.', status: 'RESPONDED' },
    { platform: 'GOOGLE', rating: 3, content: 'Good service but communication could be better.', authorName: 'Christopher N.', status: 'PENDING' },
    { platform: 'FACEBOOK', rating: 4, content: 'Very professional team. Happy with the outcome.', authorName: 'Michelle G.', status: 'PENDING' },
    { platform: 'GOOGLE', rating: 5, content: 'Top-notch quality and great customer care.', authorName: 'Daniel F.', status: 'RESPONDED' },
    { platform: 'YELP', rating: 4, content: 'Reliable service. Would recommend to others.', authorName: 'Jessica W.', status: 'PENDING' },
    { platform: 'GOOGLE', rating: 5, content: 'Been using them for years. Never disappointed!', authorName: 'Thomas C.', status: 'RESPONDED' },
    { platform: 'FACEBOOK', rating: 1, content: 'Very disappointed with the service.', authorName: 'Karen V.', status: 'RESPONDED' },
  ];

  const reviews: any[] = [];
  for (let i = 0; i < reviewData.length; i++) {
    const r = reviewData[i];
    const daysAgo = Math.floor(Math.random() * 60) + 1;
    const review = await prisma.review.create({
      data: {
        userId: user.id,
        platform: r.platform as any,
        rating: r.rating,
        content: r.content,
        authorName: r.authorName,
        authorEmail: `${r.authorName.toLowerCase().replace(' ', '.')}@email.com`,
        status: r.status as any,
        response: r.status === 'RESPONDED' ? `Thank you for your feedback, ${r.authorName}! We appreciate your review.` : null,
        respondedAt: r.status === 'RESPONDED' ? new Date() : null,
        publishedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      },
    });
    reviews.push(review);
  }
  console.log('✅ Created reviews:', reviews.length);

  // ============= FORMS (15+) =============
  const formData = [
    { name: 'Newsletter Signup', description: 'Subscribe to our newsletter', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }] },
    { name: 'Contact Form', description: 'General contact form', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'message', type: 'textarea', label: 'Message', required: true }] },
    { name: 'Demo Request', description: 'Request a product demo', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'company', type: 'text', label: 'Company', required: true }] },
    { name: 'Event Registration', description: 'Register for upcoming events', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'event', type: 'select', label: 'Event', required: true }] },
    { name: 'Feedback Survey', description: 'Share your feedback', fields: [{ name: 'rating', type: 'select', label: 'Rating', required: true }, { name: 'comments', type: 'textarea', label: 'Comments', required: false }] },
    { name: 'Quote Request', description: 'Get a custom quote', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'project', type: 'textarea', label: 'Project Details', required: true }] },
    { name: 'Webinar Registration', description: 'Sign up for webinar', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'firstName', type: 'text', label: 'First Name', required: true }] },
    { name: 'Free Trial', description: 'Start your free trial', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'password', type: 'text', label: 'Password', required: true }] },
    { name: 'Consultation Booking', description: 'Book a consultation', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'phone', type: 'tel', label: 'Phone', required: true }] },
    { name: 'Download Guide', description: 'Download our free guide', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }] },
    { name: 'Partner Application', description: 'Apply to become a partner', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'company', type: 'text', label: 'Company', required: true }] },
    { name: 'Support Request', description: 'Submit a support ticket', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'issue', type: 'textarea', label: 'Issue', required: true }] },
    { name: 'Referral Program', description: 'Refer a friend', fields: [{ name: 'email', type: 'email', label: 'Your Email', required: true }, { name: 'friendEmail', type: 'email', label: 'Friend Email', required: true }] },
    { name: 'Contest Entry', description: 'Enter our contest', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'answer', type: 'text', label: 'Answer', required: true }] },
    { name: 'Unsubscribe Form', description: 'Manage email preferences', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'reason', type: 'select', label: 'Reason', required: false }] },
    { name: 'Beta Signup', description: 'Join our beta program', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }, { name: 'useCase', type: 'textarea', label: 'Use Case', required: true }] },
  ];

  const forms: any[] = [];
  for (const f of formData) {
    const form = await prisma.form.create({
      data: {
        userId: user.id,
        name: f.name,
        description: f.description,
        fields: JSON.stringify(f.fields),
      },
    });
    forms.push(form);

    // Add some submissions
    const submissionCount = Math.floor(Math.random() * 20) + 5;
    for (let i = 0; i < submissionCount; i++) {
      await prisma.formSubmission.create({
        data: {
          formId: form.id,
          data: JSON.stringify({ email: `user${i}@example.com`, source: 'organic' }),
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        },
      });
    }
  }
  console.log('✅ Created forms:', forms.length);

  // ============= LANDING PAGES (15+) =============
  const landingPageData = [
    { name: 'Newsletter Signup', slug: 'newsletter', isPublished: true },
    { name: 'Product Demo', slug: 'demo', isPublished: true },
    { name: 'Free Trial', slug: 'free-trial', isPublished: true },
    { name: 'Webinar Registration', slug: 'webinar', isPublished: true },
    { name: 'E-book Download', slug: 'ebook', isPublished: true },
    { name: 'Contact Us', slug: 'contact', isPublished: true },
    { name: 'Pricing Page', slug: 'pricing', isPublished: true },
    { name: 'Case Studies', slug: 'case-studies', isPublished: true },
    { name: 'About Us', slug: 'about', isPublished: true },
    { name: 'Black Friday Sale', slug: 'black-friday', isPublished: false },
    { name: 'Holiday Promo', slug: 'holiday-promo', isPublished: false },
    { name: 'New Product Launch', slug: 'new-product', isPublished: true },
    { name: 'Partner Program', slug: 'partners', isPublished: true },
    { name: 'Careers Page', slug: 'careers', isPublished: true },
    { name: 'Event Landing', slug: 'event', isPublished: true },
    { name: 'Coming Soon', slug: 'coming-soon', isPublished: true },
  ];

  const landingPages: any[] = [];
  for (const lp of landingPageData) {
    const views = Math.floor(Math.random() * 1000) + 100;
    const page = await prisma.landingPage.upsert({
      where: { slug: lp.slug },
      update: {},
      create: {
        userId: user.id,
        name: lp.name,
        slug: lp.slug,
        htmlContent: `<div class="landing"><h1>${lp.name}</h1><p>Welcome to our ${lp.name.toLowerCase()} page!</p></div>`,
        cssContent: '.landing { max-width: 800px; margin: 0 auto; padding: 40px; text-align: center; }',
        isPublished: lp.isPublished,
        views,
        conversions: Math.floor(views * (0.02 + Math.random() * 0.08)),
      },
    });
    landingPages.push(page);
  }
  console.log('✅ Created landing pages:', landingPages.length);

  // ============= INTEGRATIONS (15+) =============
  const integrationData = [
    { type: 'EMAIL_SENDGRID', name: 'SendGrid Email', status: 'ACTIVE' },
    { type: 'SMS_TWILIO', name: 'Twilio SMS', status: 'ACTIVE' },
    { type: 'SOCIAL_FACEBOOK', name: 'Facebook Pages', status: 'ACTIVE' },
    { type: 'SOCIAL_INSTAGRAM', name: 'Instagram Business', status: 'ACTIVE' },
    { type: 'SOCIAL_TWITTER', name: 'Twitter/X', status: 'INACTIVE' },
    { type: 'CRM_SALESFORCE', name: 'Salesforce CRM', status: 'ACTIVE' },
    { type: 'CRM_HUBSPOT', name: 'HubSpot CRM', status: 'INACTIVE' },
    { type: 'ADS_GOOGLE', name: 'Google Ads', status: 'ACTIVE' },
    { type: 'ADS_FACEBOOK', name: 'Facebook Ads', status: 'ACTIVE' },
    { type: 'EMAIL_MAILGUN', name: 'Mailgun Backup', status: 'INACTIVE' },
    { type: 'BOOKING_CALENDLY', name: 'Calendly Booking', status: 'ACTIVE' },
    { type: 'SOCIAL_LINKEDIN', name: 'LinkedIn Pages', status: 'ACTIVE' },
    { type: 'REVIEW_GOOGLE', name: 'Google Reviews', status: 'ACTIVE' },
    { type: 'REVIEW_YELP', name: 'Yelp Reviews', status: 'ACTIVE' },
    { type: 'EMAIL_SES', name: 'Amazon SES', status: 'INACTIVE' },
    { type: 'SMS_MESSAGEBIRD', name: 'MessageBird SMS', status: 'INACTIVE' },
  ];

  const integrations: any[] = [];
  for (const i of integrationData) {
    const integration = await prisma.integration.create({
      data: {
        userId: user.id,
        type: i.type as any,
        name: i.name,
        config: JSON.stringify({ apiKey: 'demo-key', enabled: i.status === 'ACTIVE' }),
        status: i.status as any,
      },
    });
    integrations.push(integration);
  }
  console.log('✅ Created integrations:', integrations.length);

  // ============= IMAGES (15+) =============
  // Using placeholder images from picsum.photos
  const imageData = [
    { name: 'Logo Primary', mimeType: 'image/jpeg', size: 25000, seed: 'logo1' },
    { name: 'Logo White', mimeType: 'image/jpeg', size: 22000, seed: 'logo2' },
    { name: 'Hero Banner', mimeType: 'image/jpeg', size: 150000, seed: 'hero' },
    { name: 'Product Shot 1', mimeType: 'image/jpeg', size: 85000, seed: 'product1' },
    { name: 'Product Shot 2', mimeType: 'image/jpeg', size: 92000, seed: 'product2' },
    { name: 'Team Photo', mimeType: 'image/jpeg', size: 200000, seed: 'team' },
    { name: 'Office Interior', mimeType: 'image/jpeg', size: 175000, seed: 'office' },
    { name: 'Email Header', mimeType: 'image/jpeg', size: 45000, seed: 'email' },
    { name: 'Social Banner', mimeType: 'image/jpeg', size: 65000, seed: 'social' },
    { name: 'Icon Set', mimeType: 'image/jpeg', size: 15000, seed: 'icons' },
    { name: 'Background Pattern', mimeType: 'image/jpeg', size: 35000, seed: 'pattern' },
    { name: 'Customer Photo 1', mimeType: 'image/jpeg', size: 55000, seed: 'customer1' },
    { name: 'Customer Photo 2', mimeType: 'image/jpeg', size: 48000, seed: 'customer2' },
    { name: 'Event Photo', mimeType: 'image/jpeg', size: 125000, seed: 'event' },
    { name: 'Infographic', mimeType: 'image/jpeg', size: 180000, seed: 'infographic' },
    { name: 'Holiday Banner', mimeType: 'image/jpeg', size: 95000, seed: 'holiday' },
  ];

  const images: any[] = [];
  for (let i = 0; i < imageData.length; i++) {
    const img = imageData[i];
    const filename = `placeholder-${img.seed}.jpg`;
    const image = await prisma.imageLibrary.create({
      data: {
        userId: user.id,
        name: img.name,
        filename: filename,
        url: `https://picsum.photos/seed/${img.seed}/400/300`,
        mimeType: img.mimeType,
        size: img.size,
      },
    });
    images.push(image);
  }
  console.log('✅ Created images:', images.length);

  // ============= AI GENERATIONS (15+) =============
  const aiData = [
    { type: 'CONTENT', prompt: 'Write a welcome email', result: 'Welcome to our community!' },
    { type: 'SUBJECT_LINE', prompt: 'Generate subject lines for sale', result: '["Flash Sale!", "Don\'t Miss Out!"]' },
    { type: 'REVIEW_RESPONSE', prompt: 'Respond to 5-star review', result: 'Thank you for your wonderful feedback!' },
    { type: 'SOCIAL_POST', prompt: 'Create Instagram post', result: 'Exciting news coming soon! #announcement' },
    { type: 'AD_COPY', prompt: 'Facebook ad for product', result: '{"headline": "Discover...", "body": "Transform..."}' },
    { type: 'CONTENT', prompt: 'Blog post about marketing', result: 'Marketing trends for 2024...' },
    { type: 'SUBJECT_LINE', prompt: 'Newsletter subject', result: '["Your Weekly Update", "What\'s New"]' },
    { type: 'SEGMENTATION', prompt: 'Suggest segments', result: '[{"name": "VIP", "count": 50}]' },
    { type: 'CAMPAIGN_IDEA', prompt: 'Holiday campaign ideas', result: '[{"title": "Holiday Cheer"}]' },
    { type: 'CONTENT', prompt: 'SMS promotional text', result: 'Flash sale! 20% off today only!' },
    { type: 'SEND_TIME', prompt: 'Best send time', result: '{"bestDay": "Tuesday", "bestTime": "10:00"}' },
    { type: 'PREDICTION', prompt: 'Campaign performance', result: '{"openRate": "25%", "clickRate": "5%"}' },
    { type: 'CONTENT', prompt: 'Landing page copy', result: 'Transform your business today...' },
    { type: 'REVIEW_RESPONSE', prompt: 'Respond to negative review', result: 'We apologize for your experience...' },
    { type: 'SOCIAL_POST', prompt: 'LinkedIn announcement', result: 'Proud to announce our latest milestone!' },
    { type: 'AD_COPY', prompt: 'Google Ads copy', result: '{"headline": "Best Solution", "description": "..."}' },
  ];

  for (const ai of aiData) {
    await prisma.aIGeneration.create({
      data: {
        userId: user.id,
        type: ai.type as any,
        prompt: ai.prompt,
        result: ai.result,
      },
    });
  }
  console.log('✅ Created AI generations:', aiData.length);

  console.log('\n========================================');
  console.log('✅ Seed completed successfully!');
  console.log('========================================');
  console.log('\nDemo credentials:');
  console.log('  Email: demo@example.com');
  console.log('  Password: demo123');
  console.log('\nData created:');
  console.log(`  - ${tags.length} tags`);
  console.log(`  - ${customFields.length} custom fields`);
  console.log(`  - ${contacts.length} contacts`);
  console.log(`  - ${segments.length} segments`);
  console.log(`  - ${templates.length} templates`);
  console.log(`  - ${campaigns.length} campaigns`);
  console.log(`  - ${automations.length} automations`);
  console.log(`  - ${reviews.length} reviews`);
  console.log(`  - ${forms.length} forms`);
  console.log(`  - ${landingPages.length} landing pages`);
  console.log(`  - ${integrations.length} integrations`);
  console.log(`  - ${images.length} images`);
  console.log(`  - ${aiData.length} AI generations`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
