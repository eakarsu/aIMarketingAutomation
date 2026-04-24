import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user (ADMIN, emailVerified)
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { emailVerified: true },
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      company: 'Marketing Pro Inc.',
      phone: '+1-555-123-4567',
      timezone: 'America/New_York',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log('✅ Created admin user:', user.email);

  // Create regular user (USER role, emailVerified: false)
  const regularPassword = await bcrypt.hash('Demo123!', 10);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: regularPassword,
      firstName: 'Regular',
      lastName: 'User',
      company: 'Marketing Pro Inc.',
      phone: '+1-555-987-6543',
      timezone: 'America/New_York',
      role: 'USER',
      emailVerified: false,
    },
  });
  console.log('✅ Created regular user:', regularUser.email);

  // Create PasswordReset records (10 used, 5 expired-unused)
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const isUsed = i < 10;
    const isExpired = !isUsed;
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: `reset-token-${Date.now()}-${i}`,
        expiresAt: isExpired
          ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 60 * 60 * 1000),
        used: isUsed,
      },
    });
  }
  console.log('✅ Created 15 password reset records');

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

  // ============= AI SEGMENTS (15+) =============
  const aiSegmentData = [
    { name: 'High-Value Customers', description: 'Customers with lifetime value > $1000', contactCount: 150, confidence: 92, criteria: [{ field: 'lifetime_value', operator: 'gt', value: '1000' }], insights: ['Strong purchase history', 'High engagement'] },
    { name: 'At-Risk Churners', description: 'Customers showing signs of disengagement', contactCount: 85, confidence: 87, criteria: [{ field: 'days_since_engagement', operator: 'gt', value: '30' }], insights: ['Declining open rates', 'No recent purchases'] },
    { name: 'New Subscribers', description: 'Contacts added in the last 7 days', contactCount: 42, confidence: 95, criteria: [{ field: 'created_days', operator: 'lt', value: '7' }], insights: ['High engagement potential', 'Welcome series candidates'] },
    { name: 'Email Openers', description: 'Contacts who consistently open emails', contactCount: 320, confidence: 88, criteria: [{ field: 'open_rate', operator: 'gt', value: '50' }], insights: ['Engaged audience', 'Good for promotions'] },
    { name: 'Social Media Followers', description: 'Contacts who follow on social', contactCount: 180, confidence: 75, criteria: [{ field: 'social_follower', operator: 'eq', value: 'true' }], insights: ['Multi-channel potential', 'Brand advocates'] },
    { name: 'Birthday This Month', description: 'Contacts with birthdays this month', contactCount: 28, confidence: 98, criteria: [{ field: 'birthday_month', operator: 'eq', value: 'current' }], insights: ['Personal touch opportunity', 'Special offer candidates'] },
    { name: 'Enterprise Leads', description: 'High-value B2B prospects', contactCount: 65, confidence: 82, criteria: [{ field: 'company_size', operator: 'gt', value: '500' }], insights: ['Long sales cycle', 'High deal value potential'] },
    { name: 'Frequent Buyers', description: 'Customers with 5+ purchases', contactCount: 95, confidence: 90, criteria: [{ field: 'purchase_count', operator: 'gt', value: '5' }], insights: ['Loyal customers', 'Upsell opportunities'] },
    { name: 'Inactive 90 Days', description: 'No activity in 90 days', contactCount: 210, confidence: 85, criteria: [{ field: 'last_activity', operator: 'gt', value: '90days' }], insights: ['Re-engagement needed', 'Consider sunset flow'] },
    { name: 'Mobile Users', description: 'Primarily opens on mobile', contactCount: 450, confidence: 88, criteria: [{ field: 'device', operator: 'eq', value: 'mobile' }], insights: ['Mobile-optimized content', 'SMS candidates'] },
    { name: 'Newsletter Subscribers', description: 'Opted-in for newsletter', contactCount: 680, confidence: 95, criteria: [{ field: 'newsletter_opt_in', operator: 'eq', value: 'true' }], insights: ['Content consumers', 'Blog traffic drivers'] },
    { name: 'High Spenders', description: 'Average order value > $200', contactCount: 78, confidence: 91, criteria: [{ field: 'avg_order_value', operator: 'gt', value: '200' }], insights: ['Premium product buyers', 'VIP treatment candidates'] },
    { name: 'Cart Abandoners', description: 'Abandoned cart in last 30 days', contactCount: 125, confidence: 86, criteria: [{ field: 'abandoned_cart', operator: 'eq', value: 'true' }], insights: ['High purchase intent', 'Urgency messaging effective'] },
    { name: 'Referral Sources', description: 'Customers who referred others', contactCount: 45, confidence: 94, criteria: [{ field: 'referrals', operator: 'gt', value: '0' }], insights: ['Brand advocates', 'Referral program candidates'] },
    { name: 'Product Reviewers', description: 'Left product reviews', contactCount: 62, confidence: 89, criteria: [{ field: 'reviews_count', operator: 'gt', value: '0' }], insights: ['Engaged customers', 'Social proof providers'] },
    { name: 'Click-Through Champions', description: 'High email click rates', contactCount: 185, confidence: 87, criteria: [{ field: 'click_rate', operator: 'gt', value: '10' }], insights: ['Action-oriented', 'Conversion ready'] },
  ];

  const aiSegments: any[] = [];
  for (const s of aiSegmentData) {
    const segment = await prisma.aISegment.create({
      data: {
        userId: user.id,
        name: s.name,
        description: s.description,
        contactCount: s.contactCount,
        confidence: s.confidence,
        criteria: JSON.stringify(s.criteria),
        insights: JSON.stringify(s.insights),
      },
    });
    aiSegments.push(segment);
  }
  console.log('✅ Created AI segments:', aiSegments.length);

  // ============= AI JOURNEYS (15+) =============
  const aiJourneyData = [
    { name: 'Lead to Customer Journey', description: 'Optimized path from lead capture to first purchase', conversionRate: 15.5, stages: [{ name: 'Awareness', order: 1 }, { name: 'Interest', order: 2 }, { name: 'Decision', order: 3 }, { name: 'Purchase', order: 4 }] },
    { name: 'Onboarding Flow', description: 'New customer welcome and activation', conversionRate: 78.2, stages: [{ name: 'Welcome', order: 1 }, { name: 'Setup', order: 2 }, { name: 'First Use', order: 3 }, { name: 'Activated', order: 4 }] },
    { name: 'Retention Journey', description: 'Keep customers engaged long-term', conversionRate: 65.0, stages: [{ name: 'Active', order: 1 }, { name: 'Engaged', order: 2 }, { name: 'Loyal', order: 3 }, { name: 'Advocate', order: 4 }] },
    { name: 'Re-engagement Flow', description: 'Win back inactive customers', conversionRate: 12.8, stages: [{ name: 'Inactive', order: 1 }, { name: 'Reached', order: 2 }, { name: 'Interested', order: 3 }, { name: 'Reactivated', order: 4 }] },
    { name: 'Upsell Journey', description: 'Move customers to higher tiers', conversionRate: 22.5, stages: [{ name: 'Current Plan', order: 1 }, { name: 'Awareness', order: 2 }, { name: 'Trial', order: 3 }, { name: 'Upgraded', order: 4 }] },
    { name: 'Cross-sell Path', description: 'Introduce complementary products', conversionRate: 18.3, stages: [{ name: 'Single Product', order: 1 }, { name: 'Discovery', order: 2 }, { name: 'Interest', order: 3 }, { name: 'Multi-Product', order: 4 }] },
    { name: 'Trial Conversion', description: 'Free trial to paid conversion', conversionRate: 25.0, stages: [{ name: 'Trial Start', order: 1 }, { name: 'Activation', order: 2 }, { name: 'Value Discovery', order: 3 }, { name: 'Converted', order: 4 }] },
    { name: 'Event Registration', description: 'Event discovery to attendance', conversionRate: 45.0, stages: [{ name: 'Discovery', order: 1 }, { name: 'Interest', order: 2 }, { name: 'Registered', order: 3 }, { name: 'Attended', order: 4 }] },
    { name: 'Referral Journey', description: 'Customer to referrer conversion', conversionRate: 8.5, stages: [{ name: 'Satisfied', order: 1 }, { name: 'Invited', order: 2 }, { name: 'Shared', order: 3 }, { name: 'Referred', order: 4 }] },
    { name: 'Feedback Collection', description: 'Customer feedback loop', conversionRate: 35.0, stages: [{ name: 'Experience', order: 1 }, { name: 'Prompted', order: 2 }, { name: 'Responded', order: 3 }, { name: 'Advocate', order: 4 }] },
    { name: 'Cart Recovery', description: 'Abandoned cart recovery flow', conversionRate: 28.5, stages: [{ name: 'Abandoned', order: 1 }, { name: 'Reminder', order: 2 }, { name: 'Incentive', order: 3 }, { name: 'Recovered', order: 4 }] },
    { name: 'Subscription Renewal', description: 'Annual renewal journey', conversionRate: 72.0, stages: [{ name: 'Active Sub', order: 1 }, { name: 'Reminder', order: 2 }, { name: 'Renewal', order: 3 }, { name: 'Renewed', order: 4 }] },
    { name: 'Lead Nurturing', description: 'Cold to warm lead progression', conversionRate: 10.5, stages: [{ name: 'Cold', order: 1 }, { name: 'Engaged', order: 2 }, { name: 'Qualified', order: 3 }, { name: 'Sales Ready', order: 4 }] },
    { name: 'Product Launch', description: 'New product introduction', conversionRate: 18.0, stages: [{ name: 'Teaser', order: 1 }, { name: 'Reveal', order: 2 }, { name: 'Interest', order: 3 }, { name: 'Early Adopter', order: 4 }] },
    { name: 'VIP Upgrade', description: 'Regular to VIP customer', conversionRate: 5.5, stages: [{ name: 'Regular', order: 1 }, { name: 'Qualified', order: 2 }, { name: 'Invited', order: 3 }, { name: 'VIP', order: 4 }] },
    { name: 'Webinar Funnel', description: 'Webinar registration to sale', conversionRate: 12.0, stages: [{ name: 'Registered', order: 1 }, { name: 'Attended', order: 2 }, { name: 'Engaged', order: 3 }, { name: 'Converted', order: 4 }] },
  ];

  const aiJourneys: any[] = [];
  for (const j of aiJourneyData) {
    const journey = await prisma.aIJourney.create({
      data: {
        userId: user.id,
        name: j.name,
        description: j.description,
        conversionRate: j.conversionRate,
        stages: JSON.stringify(j.stages),
        touchpoints: JSON.stringify([]),
        recommendations: JSON.stringify(['Optimize touchpoints', 'A/B test messaging']),
      },
    });
    aiJourneys.push(journey);
  }
  console.log('✅ Created AI journeys:', aiJourneys.length);

  // ============= AI ATTRIBUTIONS (15+) =============
  const aiAttributionData = [
    { name: 'Q4 2023 Attribution', modelType: 'data-driven', revenue: 125000, conversions: 850, channels: [{ name: 'Email', attribution: 35 }, { name: 'Social', attribution: 25 }, { name: 'PPC', attribution: 25 }, { name: 'Organic', attribution: 15 }] },
    { name: 'Holiday Campaign', modelType: 'first-touch', revenue: 85000, conversions: 620, channels: [{ name: 'Paid Social', attribution: 40 }, { name: 'Email', attribution: 30 }, { name: 'Display', attribution: 20 }, { name: 'Direct', attribution: 10 }] },
    { name: 'Product Launch', modelType: 'linear', revenue: 45000, conversions: 320, channels: [{ name: 'PR', attribution: 25 }, { name: 'Social', attribution: 25 }, { name: 'Email', attribution: 25 }, { name: 'Influencer', attribution: 25 }] },
    { name: 'Lead Gen Analysis', modelType: 'last-touch', revenue: 65000, conversions: 480, channels: [{ name: 'Content', attribution: 35 }, { name: 'Webinars', attribution: 30 }, { name: 'LinkedIn', attribution: 25 }, { name: 'Other', attribution: 10 }] },
    { name: 'Brand Campaign', modelType: 'time-decay', revenue: 92000, conversions: 710, channels: [{ name: 'TV', attribution: 30 }, { name: 'Digital', attribution: 35 }, { name: 'Social', attribution: 25 }, { name: 'OOH', attribution: 10 }] },
    { name: 'E-commerce Q1', modelType: 'data-driven', revenue: 156000, conversions: 1250, channels: [{ name: 'Google Ads', attribution: 40 }, { name: 'Facebook', attribution: 30 }, { name: 'Email', attribution: 20 }, { name: 'Affiliate', attribution: 10 }] },
    { name: 'B2B Pipeline', modelType: 'linear', revenue: 280000, conversions: 45, channels: [{ name: 'LinkedIn', attribution: 35 }, { name: 'Content', attribution: 30 }, { name: 'Events', attribution: 20 }, { name: 'Sales', attribution: 15 }] },
    { name: 'App Install', modelType: 'first-touch', revenue: 32000, conversions: 8500, channels: [{ name: 'App Store', attribution: 35 }, { name: 'Facebook', attribution: 30 }, { name: 'Google UAC', attribution: 25 }, { name: 'Organic', attribution: 10 }] },
    { name: 'Subscription Model', modelType: 'data-driven', revenue: 78000, conversions: 520, channels: [{ name: 'Organic', attribution: 30 }, { name: 'Referral', attribution: 25 }, { name: 'PPC', attribution: 25 }, { name: 'Social', attribution: 20 }] },
    { name: 'Local Business', modelType: 'last-touch', revenue: 42000, conversions: 380, channels: [{ name: 'Google Local', attribution: 40 }, { name: 'Yelp', attribution: 25 }, { name: 'Facebook', attribution: 20 }, { name: 'Direct', attribution: 15 }] },
    { name: 'SaaS Trial', modelType: 'time-decay', revenue: 95000, conversions: 280, channels: [{ name: 'Content', attribution: 35 }, { name: 'G2/Capterra', attribution: 25 }, { name: 'PPC', attribution: 25 }, { name: 'Referral', attribution: 15 }] },
    { name: 'Event Marketing', modelType: 'linear', revenue: 52000, conversions: 165, channels: [{ name: 'Email', attribution: 35 }, { name: 'Social', attribution: 30 }, { name: 'Partners', attribution: 20 }, { name: 'Direct', attribution: 15 }] },
    { name: 'Retail Omni', modelType: 'data-driven', revenue: 185000, conversions: 2100, channels: [{ name: 'In-Store', attribution: 30 }, { name: 'Online', attribution: 35 }, { name: 'Mobile', attribution: 25 }, { name: 'Catalog', attribution: 10 }] },
    { name: 'Nonprofit Fundraising', modelType: 'first-touch', revenue: 125000, conversions: 850, channels: [{ name: 'Email', attribution: 40 }, { name: 'Direct Mail', attribution: 30 }, { name: 'Events', attribution: 20 }, { name: 'Social', attribution: 10 }] },
    { name: 'Education Leads', modelType: 'time-decay', revenue: 68000, conversions: 420, channels: [{ name: 'Search', attribution: 35 }, { name: 'Content', attribution: 30 }, { name: 'Webinars', attribution: 25 }, { name: 'Referral', attribution: 10 }] },
    { name: 'Healthcare Marketing', modelType: 'data-driven', revenue: 145000, conversions: 380, channels: [{ name: 'Search', attribution: 40 }, { name: 'Content', attribution: 25 }, { name: 'Referral', attribution: 25 }, { name: 'Social', attribution: 10 }] },
  ];

  const aiAttributions: any[] = [];
  for (const a of aiAttributionData) {
    const attribution = await prisma.aIAttribution.create({
      data: {
        userId: user.id,
        name: a.name,
        modelType: a.modelType,
        revenue: a.revenue,
        conversions: a.conversions,
        channels: JSON.stringify(a.channels),
        insights: JSON.stringify(['Email drives highest ROI', 'Social assists conversions']),
      },
    });
    aiAttributions.push(attribution);
  }
  console.log('✅ Created AI attributions:', aiAttributions.length);

  // ============= AI BUDGETS (15+) =============
  const aiBudgetData = [
    { name: 'Q1 Marketing Budget', totalBudget: 50000, projectedROI: 3.5, allocations: [{ channel: 'Email', amount: 10000 }, { channel: 'Social Ads', amount: 15000 }, { channel: 'PPC', amount: 15000 }, { channel: 'Content', amount: 10000 }] },
    { name: 'Product Launch Budget', totalBudget: 25000, projectedROI: 4.2, allocations: [{ channel: 'PR', amount: 8000 }, { channel: 'Influencers', amount: 10000 }, { channel: 'Social', amount: 5000 }, { channel: 'Email', amount: 2000 }] },
    { name: 'Annual Brand Spend', totalBudget: 200000, projectedROI: 2.8, allocations: [{ channel: 'Digital', amount: 80000 }, { channel: 'Events', amount: 50000 }, { channel: 'Content', amount: 40000 }, { channel: 'Other', amount: 30000 }] },
    { name: 'Holiday Campaign', totalBudget: 35000, projectedROI: 5.0, allocations: [{ channel: 'Paid Social', amount: 15000 }, { channel: 'Email', amount: 5000 }, { channel: 'Display', amount: 10000 }, { channel: 'Retargeting', amount: 5000 }] },
    { name: 'Lead Gen Monthly', totalBudget: 15000, projectedROI: 3.8, allocations: [{ channel: 'LinkedIn', amount: 6000 }, { channel: 'Content', amount: 4000 }, { channel: 'Webinars', amount: 3000 }, { channel: 'SEO', amount: 2000 }] },
    { name: 'Startup Growth', totalBudget: 10000, projectedROI: 4.5, allocations: [{ channel: 'Performance', amount: 5000 }, { channel: 'Content', amount: 2500 }, { channel: 'Social', amount: 1500 }, { channel: 'PR', amount: 1000 }] },
    { name: 'Enterprise Sales', totalBudget: 75000, projectedROI: 6.0, allocations: [{ channel: 'Events', amount: 30000 }, { channel: 'ABM', amount: 25000 }, { channel: 'Content', amount: 15000 }, { channel: 'Sales Tools', amount: 5000 }] },
    { name: 'E-commerce Q4', totalBudget: 100000, projectedROI: 4.0, allocations: [{ channel: 'Google', amount: 40000 }, { channel: 'Facebook', amount: 30000 }, { channel: 'Email', amount: 15000 }, { channel: 'Affiliate', amount: 15000 }] },
    { name: 'Brand Awareness', totalBudget: 45000, projectedROI: 2.0, allocations: [{ channel: 'Video', amount: 20000 }, { channel: 'Display', amount: 15000 }, { channel: 'Social', amount: 7000 }, { channel: 'Influencer', amount: 3000 }] },
    { name: 'Retention Focus', totalBudget: 20000, projectedROI: 5.5, allocations: [{ channel: 'Email', amount: 8000 }, { channel: 'Loyalty', amount: 6000 }, { channel: 'Community', amount: 4000 }, { channel: 'Support', amount: 2000 }] },
    { name: 'App Marketing', totalBudget: 30000, projectedROI: 3.2, allocations: [{ channel: 'Apple Search', amount: 12000 }, { channel: 'Google UAC', amount: 10000 }, { channel: 'Social', amount: 5000 }, { channel: 'ASO', amount: 3000 }] },
    { name: 'Local Business', totalBudget: 8000, projectedROI: 4.8, allocations: [{ channel: 'Google Local', amount: 3500 }, { channel: 'Facebook', amount: 2500 }, { channel: 'Yelp', amount: 1500 }, { channel: 'Direct Mail', amount: 500 }] },
    { name: 'B2B SaaS', totalBudget: 60000, projectedROI: 4.2, allocations: [{ channel: 'Content', amount: 20000 }, { channel: 'LinkedIn', amount: 20000 }, { channel: 'SEO', amount: 12000 }, { channel: 'PPC', amount: 8000 }] },
    { name: 'Seasonal Promotion', totalBudget: 18000, projectedROI: 5.8, allocations: [{ channel: 'Email', amount: 5000 }, { channel: 'Social', amount: 7000 }, { channel: 'SMS', amount: 3000 }, { channel: 'Display', amount: 3000 }] },
    { name: 'Non-Profit Awareness', totalBudget: 12000, projectedROI: 2.5, allocations: [{ channel: 'Social', amount: 5000 }, { channel: 'Email', amount: 3000 }, { channel: 'Events', amount: 2500 }, { channel: 'PR', amount: 1500 }] },
    { name: 'Healthcare Marketing', totalBudget: 55000, projectedROI: 3.0, allocations: [{ channel: 'Search', amount: 25000 }, { channel: 'Content', amount: 15000 }, { channel: 'Social', amount: 10000 }, { channel: 'Local', amount: 5000 }] },
  ];

  const aiBudgets: any[] = [];
  for (const b of aiBudgetData) {
    const budget = await prisma.aIBudget.create({
      data: {
        userId: user.id,
        name: b.name,
        totalBudget: b.totalBudget,
        projectedROI: b.projectedROI,
        allocations: JSON.stringify(b.allocations),
        recommendations: JSON.stringify(['Increase email spend for better ROI', 'Test new channels']),
      },
    });
    aiBudgets.push(budget);
  }
  console.log('✅ Created AI budgets:', aiBudgets.length);

  // ============= AI FATIGUES (15+) =============
  const aiFatigueData = [
    { segmentName: 'High-Frequency Recipients', fatigueScore: 78, emailFrequency: 12, openRateDecline: -18, recommendations: ['Reduce to 2x/week', 'Add preference center'] },
    { segmentName: 'Declining Engagement', fatigueScore: 65, emailFrequency: 6, openRateDecline: -12, recommendations: ['Send re-engagement campaign', 'Test content types'] },
    { segmentName: 'At-Risk Unsubscribers', fatigueScore: 85, emailFrequency: 10, openRateDecline: -25, recommendations: ['Pause for 2 weeks', 'Survey preferences'] },
    { segmentName: 'Newsletter Fatigue', fatigueScore: 52, emailFrequency: 4, openRateDecline: -8, recommendations: ['Improve content quality', 'Test send times'] },
    { segmentName: 'Promotional Overload', fatigueScore: 72, emailFrequency: 8, openRateDecline: -15, recommendations: ['Reduce promotional emails', 'Add value content'] },
    { segmentName: 'Low-Value Segment', fatigueScore: 45, emailFrequency: 4, openRateDecline: -5, recommendations: ['Consider reducing frequency', 'Test personalization'] },
    { segmentName: 'Holiday Burnout', fatigueScore: 88, emailFrequency: 15, openRateDecline: -30, recommendations: ['Immediate pause needed', 'Review holiday strategy'] },
    { segmentName: 'Mobile Users', fatigueScore: 55, emailFrequency: 5, openRateDecline: -10, recommendations: ['Optimize for mobile', 'Test SMS alternative'] },
    { segmentName: 'B2B Contacts', fatigueScore: 42, emailFrequency: 3, openRateDecline: -4, recommendations: ['Consider increasing frequency', 'More targeted content'] },
    { segmentName: 'Trial Users', fatigueScore: 68, emailFrequency: 7, openRateDecline: -14, recommendations: ['Space out onboarding', 'Trigger-based sends only'] },
    { segmentName: 'Cart Abandoners', fatigueScore: 58, emailFrequency: 5, openRateDecline: -9, recommendations: ['Limit reminders to 3', 'Improve incentives'] },
    { segmentName: 'Re-engaged Contacts', fatigueScore: 38, emailFrequency: 3, openRateDecline: -3, recommendations: ['Maintain current frequency', 'Monitor closely'] },
    { segmentName: 'VIP Customers', fatigueScore: 32, emailFrequency: 4, openRateDecline: -2, recommendations: ['Exclusive content working', 'Can test slight increase'] },
    { segmentName: 'New Subscribers', fatigueScore: 25, emailFrequency: 5, openRateDecline: 0, recommendations: ['Good engagement', 'Continue welcome series'] },
    { segmentName: 'Webinar Registrants', fatigueScore: 62, emailFrequency: 6, openRateDecline: -11, recommendations: ['Reduce pre-webinar emails', 'Better segmentation'] },
    { segmentName: 'Product Users', fatigueScore: 48, emailFrequency: 4, openRateDecline: -6, recommendations: ['In-app messaging alternative', 'More relevant content'] },
  ];

  const aiFatigues: any[] = [];
  for (const f of aiFatigueData) {
    const fatigue = await prisma.aIFatigue.create({
      data: {
        userId: user.id,
        segmentName: f.segmentName,
        fatigueScore: f.fatigueScore,
        emailFrequency: f.emailFrequency,
        openRateDecline: f.openRateDecline,
        recommendations: JSON.stringify(f.recommendations),
      },
    });
    aiFatigues.push(fatigue);
  }
  console.log('✅ Created AI fatigues:', aiFatigues.length);

  // ============= AI PERSONAS (15+) =============
  const aiPersonaData = [
    { name: 'Marketing Manager Mary', avatar: 'professional-woman', demographics: { age: '35-45', income: '$75K-$120K', occupation: 'Marketing Manager' }, painPoints: ['Limited budget', 'Proving ROI'], goals: ['Increase leads', 'Improve efficiency'] },
    { name: 'Startup Steve', avatar: 'young-entrepreneur', demographics: { age: '25-35', income: '$60K-$100K', occupation: 'Founder/CEO' }, painPoints: ['Time constraints', 'Limited resources'], goals: ['Scale quickly', 'Find product-market fit'] },
    { name: 'Enterprise Emma', avatar: 'executive-woman', demographics: { age: '40-55', income: '$150K+', occupation: 'VP Marketing' }, painPoints: ['Complex approval process', 'Integration challenges'], goals: ['Digital transformation', 'Brand consistency'] },
    { name: 'Small Business Bob', avatar: 'business-owner', demographics: { age: '40-55', income: '$50K-$80K', occupation: 'Business Owner' }, painPoints: ['Wearing many hats', 'Budget constraints'], goals: ['Local visibility', 'Customer retention'] },
    { name: 'E-commerce Elena', avatar: 'retail-manager', demographics: { age: '28-40', income: '$55K-$90K', occupation: 'E-commerce Manager' }, painPoints: ['Cart abandonment', 'Competition'], goals: ['Increase AOV', 'Reduce CAC'] },
    { name: 'Content Creator Chris', avatar: 'creative-professional', demographics: { age: '22-35', income: '$40K-$70K', occupation: 'Content Manager' }, painPoints: ['Content fatigue', 'Measuring impact'], goals: ['Engagement', 'Thought leadership'] },
    { name: 'Data-Driven Dana', avatar: 'analyst-woman', demographics: { age: '28-38', income: '$70K-$110K', occupation: 'Analytics Manager' }, painPoints: ['Data silos', 'Attribution complexity'], goals: ['Unified reporting', 'Actionable insights'] },
    { name: 'Agency Andy', avatar: 'agency-professional', demographics: { age: '30-45', income: '$80K-$140K', occupation: 'Agency Director' }, painPoints: ['Client demands', 'Proving value'], goals: ['Client retention', 'Scalable processes'] },
    { name: 'Healthcare Hannah', avatar: 'healthcare-professional', demographics: { age: '35-50', income: '$65K-$100K', occupation: 'Marketing Director' }, painPoints: ['Compliance', 'Trust building'], goals: ['Patient acquisition', 'Reputation'] },
    { name: 'Tech Startup Tom', avatar: 'tech-founder', demographics: { age: '25-40', income: '$100K+', occupation: 'CTO/Co-founder' }, painPoints: ['User adoption', 'Technical debt'], goals: ['Product growth', 'Developer community'] },
    { name: 'Nonprofit Nancy', avatar: 'nonprofit-director', demographics: { age: '35-55', income: '$45K-$75K', occupation: 'Development Director' }, painPoints: ['Limited budget', 'Donor fatigue'], goals: ['Donor acquisition', 'Awareness'] },
    { name: 'Retail Rachel', avatar: 'retail-professional', demographics: { age: '30-45', income: '$55K-$85K', occupation: 'Retail Marketing Manager' }, painPoints: ['Omnichannel', 'Inventory sync'], goals: ['Foot traffic', 'Online sales'] },
    { name: 'Finance Frank', avatar: 'finance-professional', demographics: { age: '40-55', income: '$120K+', occupation: 'CMO Financial Services' }, painPoints: ['Regulations', 'Trust'], goals: ['Lead quality', 'Brand trust'] },
    { name: 'Education Emily', avatar: 'educator', demographics: { age: '30-50', income: '$50K-$80K', occupation: 'Marketing Coordinator' }, painPoints: ['Enrollment cycles', 'Competition'], goals: ['Student enrollment', 'Brand awareness'] },
    { name: 'SaaS Sam', avatar: 'saas-professional', demographics: { age: '28-42', income: '$85K-$130K', occupation: 'Growth Marketing Manager' }, painPoints: ['Churn', 'Feature adoption'], goals: ['MRR growth', 'Reduce churn'] },
    { name: 'Freelancer Fiona', avatar: 'freelancer', demographics: { age: '25-40', income: '$40K-$80K', occupation: 'Freelance Consultant' }, painPoints: ['Client acquisition', 'Time management'], goals: ['Steady pipeline', 'Passive income'] },
  ];

  const aiPersonas: any[] = [];
  for (const p of aiPersonaData) {
    const persona = await prisma.aIPersona.create({
      data: {
        userId: user.id,
        name: p.name,
        avatar: p.avatar,
        demographics: JSON.stringify(p.demographics),
        psychographics: JSON.stringify({ values: ['Efficiency', 'Growth'] }),
        behaviors: JSON.stringify({ buyingHabits: 'Research-driven' }),
        painPoints: JSON.stringify(p.painPoints),
        goals: JSON.stringify(p.goals),
        preferredChannels: JSON.stringify(['Email', 'LinkedIn']),
        contentPreferences: JSON.stringify(['Case studies', 'How-to guides']),
      },
    });
    aiPersonas.push(persona);
  }
  console.log('✅ Created AI personas:', aiPersonas.length);

  // ============= AI INFLUENCERS (15+) =============
  const aiInfluencerData = [
    { name: 'Sarah Marketing Pro', platform: 'Instagram', niche: 'Marketing', followers: 85000, engagementRate: 4.8, matchScore: 94, estimatedCost: 800 },
    { name: 'Digital Dan', platform: 'Instagram', niche: 'Business', followers: 52000, engagementRate: 5.2, matchScore: 88, estimatedCost: 450 },
    { name: 'Business Bella', platform: 'LinkedIn', niche: 'B2B', followers: 120000, engagementRate: 3.5, matchScore: 82, estimatedCost: 1200 },
    { name: 'Tech Talk Tim', platform: 'YouTube', niche: 'Technology', followers: 250000, engagementRate: 2.8, matchScore: 78, estimatedCost: 2500 },
    { name: 'Startup Sally', platform: 'Twitter', niche: 'Startups', followers: 45000, engagementRate: 6.1, matchScore: 91, estimatedCost: 350 },
    { name: 'Content Queen Carla', platform: 'TikTok', niche: 'Content', followers: 180000, engagementRate: 8.5, matchScore: 86, estimatedCost: 1500 },
    { name: 'E-commerce Eric', platform: 'Instagram', niche: 'E-commerce', followers: 68000, engagementRate: 4.2, matchScore: 85, estimatedCost: 600 },
    { name: 'Growth Guru Greg', platform: 'LinkedIn', niche: 'Growth', followers: 95000, engagementRate: 3.8, matchScore: 89, estimatedCost: 950 },
    { name: 'Analytics Amy', platform: 'Twitter', niche: 'Analytics', followers: 32000, engagementRate: 5.5, matchScore: 83, estimatedCost: 280 },
    { name: 'Branding Bob', platform: 'Instagram', niche: 'Branding', followers: 110000, engagementRate: 4.0, matchScore: 81, estimatedCost: 1100 },
    { name: 'SEO Sarah', platform: 'YouTube', niche: 'SEO', followers: 78000, engagementRate: 3.2, matchScore: 87, estimatedCost: 750 },
    { name: 'Social Media Mike', platform: 'TikTok', niche: 'Social', followers: 220000, engagementRate: 7.2, matchScore: 79, estimatedCost: 1800 },
    { name: 'Email Expert Emma', platform: 'LinkedIn', niche: 'Email Marketing', followers: 42000, engagementRate: 4.5, matchScore: 92, estimatedCost: 400 },
    { name: 'PPC Pro Pete', platform: 'Twitter', niche: 'PPC', followers: 28000, engagementRate: 5.8, matchScore: 84, estimatedCost: 250 },
    { name: 'UX Designer Uma', platform: 'Instagram', niche: 'Design', followers: 95000, engagementRate: 4.6, matchScore: 76, estimatedCost: 900 },
    { name: 'Copywriter Chris', platform: 'LinkedIn', niche: 'Copywriting', followers: 55000, engagementRate: 4.1, matchScore: 90, estimatedCost: 500 },
  ];

  const aiInfluencers: any[] = [];
  for (const i of aiInfluencerData) {
    const influencer = await prisma.aIInfluencer.create({
      data: {
        userId: user.id,
        name: i.name,
        platform: i.platform,
        niche: i.niche,
        followers: i.followers,
        engagementRate: i.engagementRate,
        matchScore: i.matchScore,
        estimatedReach: Math.floor(i.followers * 0.5),
        estimatedCost: i.estimatedCost,
      },
    });
    aiInfluencers.push(influencer);
  }
  console.log('✅ Created AI influencers:', aiInfluencers.length);

  // ============= AI HASHTAGS (15+) =============
  const aiHashtagData = [
    { topic: 'Digital Marketing', platform: 'Instagram', hashtags: ['#marketing', '#digitalmarketing', '#socialmedia', '#business'] },
    { topic: 'Small Business', platform: 'Instagram', hashtags: ['#smallbusiness', '#entrepreneur', '#businessowner', '#startup'] },
    { topic: 'Content Marketing', platform: 'LinkedIn', hashtags: ['#contentmarketing', '#content', '#marketingtips', '#b2b'] },
    { topic: 'E-commerce', platform: 'Instagram', hashtags: ['#ecommerce', '#onlineshopping', '#shopnow', '#retail'] },
    { topic: 'SaaS', platform: 'Twitter', hashtags: ['#saas', '#software', '#tech', '#startup'] },
    { topic: 'Email Marketing', platform: 'LinkedIn', hashtags: ['#emailmarketing', '#email', '#newsletter', '#marketing'] },
    { topic: 'SEO', platform: 'Twitter', hashtags: ['#seo', '#searchengine', '#google', '#digitalmarketing'] },
    { topic: 'Social Media Marketing', platform: 'Instagram', hashtags: ['#socialmediamarketing', '#smm', '#social', '#marketing'] },
    { topic: 'Growth Hacking', platform: 'Twitter', hashtags: ['#growthhacking', '#growth', '#startup', '#marketing'] },
    { topic: 'Branding', platform: 'Instagram', hashtags: ['#branding', '#brand', '#design', '#creative'] },
    { topic: 'PPC Advertising', platform: 'LinkedIn', hashtags: ['#ppc', '#advertising', '#googleads', '#facebookads'] },
    { topic: 'Analytics', platform: 'Twitter', hashtags: ['#analytics', '#data', '#insights', '#marketing'] },
    { topic: 'Copywriting', platform: 'Instagram', hashtags: ['#copywriting', '#copy', '#writing', '#content'] },
    { topic: 'Lead Generation', platform: 'LinkedIn', hashtags: ['#leadgeneration', '#leads', '#b2b', '#sales'] },
    { topic: 'Customer Experience', platform: 'Twitter', hashtags: ['#customerexperience', '#cx', '#customer', '#service'] },
    { topic: 'Influencer Marketing', platform: 'Instagram', hashtags: ['#influencermarketing', '#influencer', '#collab', '#sponsored'] },
  ];

  const aiHashtags: any[] = [];
  for (const h of aiHashtagData) {
    const hashtag = await prisma.aIHashtag.create({
      data: {
        userId: user.id,
        topic: h.topic,
        platform: h.platform,
        hashtags: JSON.stringify(h.hashtags.map(tag => ({ tag, popularity: 'high', recommended: true }))),
        popularity: JSON.stringify(h.hashtags.map(tag => ({ tag, level: 'high' }))),
        recommendations: JSON.stringify(['Mix popular and niche hashtags', 'Use 5-10 hashtags per post']),
      },
    });
    aiHashtags.push(hashtag);
  }
  console.log('✅ Created AI hashtags:', aiHashtags.length);

  // ============= AI LANDING PAGES (15+) =============
  const aiLandingPageData = [
    { name: 'Lead Gen Page', purpose: 'Lead Generation', headline: 'Transform Your Marketing Today', subheadline: 'Join 10,000+ businesses', ctaText: 'Get Started Free' },
    { name: 'Product Launch', purpose: 'Product Launch', headline: 'Introducing Our Revolutionary Solution', subheadline: 'Be the first to experience', ctaText: 'Join Waitlist' },
    { name: 'Webinar Registration', purpose: 'Webinar', headline: 'Free Webinar: Marketing Secrets Revealed', subheadline: 'Learn from industry experts', ctaText: 'Register Now' },
    { name: 'Free Trial', purpose: 'Trial', headline: 'Try Premium Free for 14 Days', subheadline: 'No credit card required', ctaText: 'Start Free Trial' },
    { name: 'Demo Request', purpose: 'Demo', headline: 'See Our Platform in Action', subheadline: 'Personalized demo for your team', ctaText: 'Book Demo' },
    { name: 'E-book Download', purpose: 'Content', headline: 'The Ultimate Guide to Growth', subheadline: 'Download your free copy', ctaText: 'Download Now' },
    { name: 'Newsletter Signup', purpose: 'Newsletter', headline: 'Stay Ahead of the Curve', subheadline: 'Weekly insights delivered to your inbox', ctaText: 'Subscribe' },
    { name: 'Event Landing', purpose: 'Event', headline: 'Join Us at Marketing Summit 2024', subheadline: 'Network with industry leaders', ctaText: 'Get Tickets' },
    { name: 'Pricing Page', purpose: 'Pricing', headline: 'Simple, Transparent Pricing', subheadline: 'Choose the plan that fits your needs', ctaText: 'View Plans' },
    { name: 'Case Study', purpose: 'Social Proof', headline: 'How Company X Grew 300%', subheadline: 'Real results from real customers', ctaText: 'Read Case Study' },
    { name: 'Comparison Page', purpose: 'Comparison', headline: 'Why We Are Different', subheadline: 'See how we stack up', ctaText: 'Compare Now' },
    { name: 'Contact Us', purpose: 'Contact', headline: 'Get In Touch', subheadline: 'We would love to hear from you', ctaText: 'Contact Us' },
    { name: 'Coming Soon', purpose: 'Pre-launch', headline: 'Something Big Is Coming', subheadline: 'Be the first to know', ctaText: 'Notify Me' },
    { name: 'Black Friday', purpose: 'Promotion', headline: 'Black Friday: 50% Off Everything', subheadline: 'Limited time only', ctaText: 'Shop Now' },
    { name: 'Referral Program', purpose: 'Referral', headline: 'Give $20, Get $20', subheadline: 'Invite friends and earn rewards', ctaText: 'Start Referring' },
    { name: 'App Download', purpose: 'App', headline: 'Take Us Wherever You Go', subheadline: 'Download our mobile app', ctaText: 'Download App' },
  ];

  const aiLandingPages: any[] = [];
  for (const lp of aiLandingPageData) {
    const page = await prisma.aILandingPageTemplate.create({
      data: {
        userId: user.id,
        name: lp.name,
        purpose: lp.purpose,
        headline: lp.headline,
        subheadline: lp.subheadline,
        bodyCopy: `Discover how our solution can help you achieve ${lp.purpose.toLowerCase()} success. Join thousands of satisfied customers today.`,
        ctaText: lp.ctaText,
        ctaColor: '#4F46E5',
        layout: JSON.stringify('hero-features-cta'),
        colorScheme: JSON.stringify({ primary: '#4F46E5', secondary: '#10B981' }),
        conversionTips: JSON.stringify(['Add urgency', 'Include social proof', 'Minimize form fields']),
      },
    });
    aiLandingPages.push(page);
  }
  console.log('✅ Created AI landing pages:', aiLandingPages.length);

  // AI Email Campaigns seed data
  await prisma.aIEmailCampaign.createMany({
    data: [
      {
        userId: user.id,
        name: 'Spring Sale Announcement',
        campaignType: 'promotional',
        subject: 'Spring Into Savings — 40% Off Everything This Week',
        previewText: 'Your wardrobe refresh starts here. Limited time only.',
        body: JSON.stringify([
          { type: 'header', heading: 'Spring Has Sprung!', subheading: 'And so have our biggest deals of the season' },
          { type: 'body', heading: 'Fresh Styles, Fresh Savings', content: 'Say goodbye to winter and hello to 40% off our entire spring collection. From breezy dresses to lightweight jackets, everything you need for the new season is on sale.' },
          { type: 'feature', heading: 'Why Shop Now?', items: ['40% off everything — no exclusions', 'Free shipping on orders over $50', 'New arrivals added daily', 'Easy 30-day returns'] },
          { type: 'cta', heading: 'Don\'t Wait — Sale Ends Sunday', buttonText: 'Shop the Sale', urgency: 'Only 4 days left!' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Spring Has Sprung!', subheading: 'And so have our biggest deals of the season' },
          { type: 'body', heading: 'Fresh Styles, Fresh Savings', content: 'Say goodbye to winter and hello to 40% off our entire spring collection.' },
          { type: 'feature', heading: 'Why Shop Now?', items: ['40% off everything', 'Free shipping over $50', 'New arrivals daily', '30-day returns'] },
          { type: 'cta', heading: 'Don\'t Wait', buttonText: 'Shop the Sale', urgency: 'Only 4 days left!' }
        ]),
        ctaText: 'Shop the Sale',
        tone: 'exciting',
        industry: 'Fashion & Retail',
        audience: 'Fashion-conscious shoppers 25-45',
        estimatedOpenRate: 32.5,
        estimatedClickRate: 5.8,
        abVariants: JSON.stringify([
          { subject: 'Your Spring Wardrobe Awaits ✨', angle: 'Aspiration' },
          { subject: '40% Off — This Week Only!', angle: 'Urgency' },
          { subject: 'We saved your favorites (and 40%)', angle: 'Personalization' }
        ]),
        sendTimeRec: 'Tuesday 10:00 AM EST',
        tips: JSON.stringify(['Use recipient first name in subject', 'Add countdown timer for urgency', 'Include product images', 'Segment by past purchase category', 'A/B test subject lines'])
      },
      {
        userId: user.id,
        name: 'Welcome Series - Day 1',
        campaignType: 'welcome',
        subject: 'Welcome to the Family! Here\'s Your Exclusive Gift 🎁',
        previewText: 'We\'re thrilled to have you. Let\'s get started.',
        body: JSON.stringify([
          { type: 'header', heading: 'Welcome Aboard!', subheading: 'You just made a great decision' },
          { type: 'body', heading: 'What Happens Next', content: 'Over the next few days, we\'ll show you exactly how to get the most out of your account. But first, here\'s a special welcome gift just for you.' },
          { type: 'feature', heading: 'Your Member Benefits', items: ['15% off your first order', 'Exclusive member-only deals', 'Early access to new products', 'Free priority support'] },
          { type: 'testimonial', quote: 'Signing up was the best decision. The onboarding was smooth and the deals are unbeatable.', author: 'Maria Chen', role: 'Customer since 2024' },
          { type: 'cta', heading: 'Claim Your Welcome Gift', buttonText: 'Get 15% Off Now', urgency: 'Your code expires in 72 hours' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Welcome Aboard!', subheading: 'You just made a great decision' },
          { type: 'body', heading: 'What Happens Next', content: 'We\'ll show you how to get the most out of your account.' },
          { type: 'feature', heading: 'Your Member Benefits', items: ['15% off first order', 'Member-only deals', 'Early access', 'Priority support'] },
          { type: 'cta', heading: 'Claim Your Gift', buttonText: 'Get 15% Off', urgency: 'Expires in 72 hours' }
        ]),
        ctaText: 'Get 15% Off Now',
        tone: 'warm',
        industry: 'E-commerce',
        audience: 'New subscribers',
        estimatedOpenRate: 45.2,
        estimatedClickRate: 8.1,
        abVariants: JSON.stringify([
          { subject: 'Welcome! Your 15% off code is inside', angle: 'Value' },
          { subject: 'You\'re in! Let\'s get started 🚀', angle: 'Excitement' },
          { subject: 'Hey {first_name}, welcome to the club', angle: 'Personal' }
        ]),
        sendTimeRec: 'Immediately after signup',
        tips: JSON.stringify(['Send within 1 hour of signup', 'Include clear next steps', 'Set expectations for email frequency', 'Make the discount code prominent', 'Link to top-selling products'])
      },
      {
        userId: user.id,
        name: 'Monthly Newsletter - March',
        campaignType: 'newsletter',
        subject: 'The Marketing Pulse: 5 Trends You Can\'t Ignore',
        previewText: 'AI, short-form video, and the death of third-party cookies.',
        body: JSON.stringify([
          { type: 'header', heading: 'The Marketing Pulse', subheading: 'March 2025 Edition — Your monthly dose of marketing intelligence' },
          { type: 'body', heading: 'This Month\'s Top Story', content: 'AI-generated content is reshaping email marketing. Brands using AI personalization are seeing 41% higher click rates. Here\'s how to get started without losing your brand voice.' },
          { type: 'feature', heading: '5 Trends to Watch', items: ['AI email personalization at scale', 'Short-form video in email campaigns', 'Interactive email elements (polls, carousels)', 'Privacy-first marketing strategies', 'Hyper-segmentation with behavioral data'] },
          { type: 'cta', heading: 'Deep Dive Into AI Marketing', buttonText: 'Read the Full Report', urgency: '' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'The Marketing Pulse', subheading: 'March 2025 Edition' },
          { type: 'body', heading: 'Top Story', content: 'AI-generated content is reshaping email marketing.' },
          { type: 'feature', heading: '5 Trends', items: ['AI personalization', 'Short-form video', 'Interactive emails', 'Privacy-first', 'Hyper-segmentation'] },
          { type: 'cta', heading: 'Deep Dive', buttonText: 'Read Report', urgency: '' }
        ]),
        ctaText: 'Read the Full Report',
        tone: 'informative',
        industry: 'Marketing & Technology',
        audience: 'Marketing professionals',
        estimatedOpenRate: 28.7,
        estimatedClickRate: 4.3,
        abVariants: JSON.stringify([
          { subject: '5 Marketing Trends Reshaping 2025', angle: 'Curiosity' },
          { subject: 'Your March Marketing Briefing Is Here', angle: 'Routine' },
          { subject: 'What top marketers are doing differently', angle: 'Social proof' }
        ]),
        sendTimeRec: 'Thursday 9:00 AM EST',
        tips: JSON.stringify(['Keep newsletter under 500 words', 'Use clear section headers for scanability', 'Include one primary CTA per section', 'Add social sharing buttons', 'Track which sections get most clicks'])
      },
      {
        userId: user.id,
        name: 'Cart Abandonment Recovery',
        campaignType: 're-engagement',
        subject: 'You Left Something Behind...',
        previewText: 'Your cart is waiting — and we saved you 10% off.',
        body: JSON.stringify([
          { type: 'header', heading: 'Forget Something?', subheading: 'Your cart is patiently waiting for you' },
          { type: 'body', heading: 'Your Items Are Selling Fast', content: 'We noticed you left some great items in your cart. Don\'t worry — we saved them for you. But stock is limited, so we\'d hate for you to miss out.' },
          { type: 'feature', heading: 'Why Complete Your Order?', items: ['Free shipping on your order', '10% off with code COMEBACK10', '30-day hassle-free returns', '24/7 customer support'] },
          { type: 'cta', heading: 'Complete Your Purchase', buttonText: 'Return to Cart', urgency: 'Your 10% discount expires in 24 hours' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Forget Something?', subheading: 'Your cart is waiting' },
          { type: 'body', heading: 'Items Selling Fast', content: 'We saved your items but stock is limited.' },
          { type: 'feature', heading: 'Complete Your Order', items: ['Free shipping', '10% off code', '30-day returns', '24/7 support'] },
          { type: 'cta', heading: 'Complete Purchase', buttonText: 'Return to Cart', urgency: '24 hours left' }
        ]),
        ctaText: 'Return to Cart',
        tone: 'friendly',
        industry: 'E-commerce',
        audience: 'Cart abandoners',
        estimatedOpenRate: 38.9,
        estimatedClickRate: 7.2,
        abVariants: JSON.stringify([
          { subject: 'Oops — did you forget these?', angle: 'Casual' },
          { subject: 'Your cart misses you (+ 10% off)', angle: 'Incentive' },
          { subject: 'Still thinking it over?', angle: 'Empathy' }
        ]),
        sendTimeRec: '1 hour after abandonment',
        tips: JSON.stringify(['Send within 1-3 hours of abandonment', 'Show product images from cart', 'Offer escalating discounts in sequence', 'Include social proof near products', 'Make checkout link go directly to cart'])
      },
      {
        userId: user.id,
        name: 'Product Launch Announcement',
        campaignType: 'product-launch',
        subject: 'Introducing ProMax 3.0 — The Future Is Here',
        previewText: 'Be the first to experience our most powerful release yet.',
        body: JSON.stringify([
          { type: 'header', heading: 'Meet ProMax 3.0', subheading: 'Built by users. Designed for the future.' },
          { type: 'body', heading: 'Everything You Asked For', content: 'After months of development and thousands of customer feedback sessions, we\'re proud to unveil ProMax 3.0. It\'s faster, smarter, and more intuitive than ever — with features you\'ve been requesting since day one.' },
          { type: 'feature', heading: 'What\'s New', items: ['AI-powered workflow automation', 'Real-time collaboration for teams', 'Advanced analytics dashboard', 'Native mobile apps (iOS & Android)', '50+ new integrations'] },
          { type: 'testimonial', quote: 'ProMax 3.0 cut our workflow time in half. The AI features alone are worth the upgrade.', author: 'David Park', role: 'CTO, ScaleUp Inc.' },
          { type: 'cta', heading: 'Be the First to Try It', buttonText: 'Start Free Trial', urgency: 'Early adopters get 3 months free' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Meet ProMax 3.0', subheading: 'The future is here' },
          { type: 'body', heading: 'Everything You Asked For', content: 'Faster, smarter, more intuitive.' },
          { type: 'feature', heading: 'What\'s New', items: ['AI automation', 'Real-time collab', 'Advanced analytics', 'Mobile apps', '50+ integrations'] },
          { type: 'cta', heading: 'Try It First', buttonText: 'Start Free Trial', urgency: '3 months free for early adopters' }
        ]),
        ctaText: 'Start Free Trial',
        tone: 'exciting',
        industry: 'SaaS / Technology',
        audience: 'Existing customers and trial users',
        estimatedOpenRate: 35.4,
        estimatedClickRate: 6.9,
        abVariants: JSON.stringify([
          { subject: 'It\'s finally here: ProMax 3.0 🚀', angle: 'Excitement' },
          { subject: 'You asked, we built it — ProMax 3.0', angle: 'Community' },
          { subject: 'Your early access to ProMax 3.0 awaits', angle: 'Exclusivity' }
        ]),
        sendTimeRec: 'Wednesday 11:00 AM EST',
        tips: JSON.stringify(['Segment by user activity level', 'Send teaser email 3 days before', 'Include product demo video', 'Offer exclusive early-bird pricing', 'Follow up with feature spotlight series'])
      },
      {
        userId: user.id,
        name: 'Holiday Gift Guide',
        campaignType: 'seasonal',
        subject: 'The Ultimate Holiday Gift Guide Is Here 🎄',
        previewText: 'Curated gifts for everyone on your list. All under $100.',
        body: JSON.stringify([
          { type: 'header', heading: 'Holiday Gift Guide 2025', subheading: 'Thoughtful gifts they\'ll actually love' },
          { type: 'body', heading: 'Shopping Made Simple', content: 'Finding the perfect gift shouldn\'t be stressful. We\'ve curated our top picks by personality type and budget, so you can check everyone off your list with confidence.' },
          { type: 'feature', heading: 'Gift Categories', items: ['For the Tech Lover — under $50', 'For the Homebody — under $75', 'For the Adventurer — under $100', 'For the Foodie — under $40'] },
          { type: 'cta', heading: 'Start Shopping', buttonText: 'Browse Gift Guide', urgency: 'Order by Dec 18 for guaranteed delivery' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Holiday Gift Guide', subheading: 'Gifts they\'ll love' },
          { type: 'body', heading: 'Shopping Made Simple', content: 'Curated picks by personality and budget.' },
          { type: 'feature', heading: 'Categories', items: ['Tech Lover', 'Homebody', 'Adventurer', 'Foodie'] },
          { type: 'cta', heading: 'Start Shopping', buttonText: 'Browse Guide', urgency: 'Order by Dec 18' }
        ]),
        ctaText: 'Browse Gift Guide',
        tone: 'warm',
        industry: 'E-commerce / Retail',
        audience: 'Holiday shoppers',
        estimatedOpenRate: 31.2,
        estimatedClickRate: 5.5,
        abVariants: JSON.stringify([
          { subject: 'Gift ideas for everyone on your list', angle: 'Helpful' },
          { subject: 'Stuck on gifts? We\'ve got you covered', angle: 'Problem-solving' },
          { subject: 'Last-minute gifts that look anything but', angle: 'Urgency' }
        ]),
        sendTimeRec: 'Saturday 10:00 AM EST',
        tips: JSON.stringify(['Segment by gift budget preference', 'Include price ranges in previews', 'Add gift wrapping option', 'Create urgency with shipping deadlines', 'Follow up with category-specific emails'])
      },
      {
        userId: user.id,
        name: 'Webinar Invitation',
        campaignType: 'event',
        subject: 'Free Webinar: Scale Your Business with AI in 2025',
        previewText: 'Join 2,000+ marketers learning AI strategies. Register now.',
        body: JSON.stringify([
          { type: 'header', heading: 'You\'re Invited', subheading: 'Free Live Webinar — March 28, 2025 at 2:00 PM EST' },
          { type: 'body', heading: 'What You\'ll Learn', content: 'Join our CEO and three industry experts for a 60-minute deep dive into how AI is transforming marketing in 2025. From personalization at scale to predictive analytics, you\'ll leave with actionable strategies you can implement immediately.' },
          { type: 'feature', heading: 'Agenda', items: ['AI-powered email personalization tactics', 'Predictive customer segmentation', 'Automating content creation without losing quality', 'Live Q&A with the panel'] },
          { type: 'testimonial', quote: 'The last webinar completely changed how we approach our email strategy. Highly recommend.', author: 'Lisa Wang', role: 'VP Marketing, GrowthCo' },
          { type: 'cta', heading: 'Seats Are Limited', buttonText: 'Reserve Your Spot', urgency: 'Only 150 seats remaining' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'You\'re Invited', subheading: 'Free Webinar — March 28' },
          { type: 'body', heading: 'What You\'ll Learn', content: 'AI strategies you can implement immediately.' },
          { type: 'feature', heading: 'Agenda', items: ['AI personalization', 'Predictive segmentation', 'Content automation', 'Live Q&A'] },
          { type: 'cta', heading: 'Limited Seats', buttonText: 'Reserve Spot', urgency: '150 seats left' }
        ]),
        ctaText: 'Reserve Your Spot',
        tone: 'professional',
        industry: 'Marketing & Technology',
        audience: 'Marketing managers and directors',
        estimatedOpenRate: 29.8,
        estimatedClickRate: 6.1,
        abVariants: JSON.stringify([
          { subject: 'Learn AI marketing from industry leaders', angle: 'Authority' },
          { subject: 'Your competitors are using AI. Are you?', angle: 'FOMO' },
          { subject: '[Free Webinar] AI strategies for 2025', angle: 'Direct' }
        ]),
        sendTimeRec: 'Tuesday 9:00 AM EST',
        tips: JSON.stringify(['Send invite 2 weeks before event', 'Follow up 3 days and 1 day before', 'Include speaker photos and bios', 'Mention replay availability', 'Add calendar invite attachment'])
      },
      {
        userId: user.id,
        name: 'Customer Win-Back Campaign',
        campaignType: 're-engagement',
        subject: 'We Miss You — Here\'s 25% Off to Come Back',
        previewText: 'It\'s been a while. Let us make it worth your while.',
        body: JSON.stringify([
          { type: 'header', heading: 'It\'s Been Too Long', subheading: 'And we\'ve got something special to welcome you back' },
          { type: 'body', heading: 'A Lot Has Changed', content: 'Since your last visit, we\'ve added 20+ new features, redesigned our interface, and improved performance by 3x. We think you\'ll love what we\'ve done — and we want to prove it with a special comeback offer.' },
          { type: 'feature', heading: 'What\'s New Since You Left', items: ['Complete UI redesign', 'AI-powered recommendations', '3x faster performance', 'New mobile app'] },
          { type: 'cta', heading: 'Come Back and Save', buttonText: 'Reactivate & Save 25%', urgency: 'Offer valid for 7 days only' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'We Miss You', subheading: 'Something special to welcome you back' },
          { type: 'body', heading: 'A Lot Has Changed', content: '20+ new features and 3x performance.' },
          { type: 'feature', heading: 'What\'s New', items: ['New UI', 'AI recommendations', '3x faster', 'Mobile app'] },
          { type: 'cta', heading: 'Come Back', buttonText: 'Reactivate & Save', urgency: '7 days only' }
        ]),
        ctaText: 'Reactivate & Save 25%',
        tone: 'empathetic',
        industry: 'SaaS / Technology',
        audience: 'Churned customers (90+ days inactive)',
        estimatedOpenRate: 22.3,
        estimatedClickRate: 4.7,
        abVariants: JSON.stringify([
          { subject: 'Can we win you back? (25% off inside)', angle: 'Direct' },
          { subject: 'Things are different now — come see', angle: 'Curiosity' },
          { subject: 'Your account is waiting for you', angle: 'Reminder' }
        ]),
        sendTimeRec: 'Wednesday 2:00 PM EST',
        tips: JSON.stringify(['Acknowledge their absence directly', 'Highlight improvements since they left', 'Offer escalating incentives in sequence', 'Include one-click reactivation link', 'Remove from sequence if they return'])
      },
      {
        userId: user.id,
        name: 'Referral Program Launch',
        campaignType: 'announcement',
        subject: 'Give $20, Get $20 — Invite Friends & Earn',
        previewText: 'Share the love and earn rewards. It\'s that simple.',
        body: JSON.stringify([
          { type: 'header', heading: 'Share the Love', subheading: 'Introducing our new referral program' },
          { type: 'body', heading: 'How It Works', content: 'It\'s simple: share your unique referral link with friends. When they sign up and make their first purchase, you both get $20 off. There\'s no limit to how many friends you can refer.' },
          { type: 'feature', heading: '3 Easy Steps', items: ['Share your unique referral link', 'Friend makes their first purchase', 'You both get $20 credit — instantly'] },
          { type: 'cta', heading: 'Start Sharing Today', buttonText: 'Get Your Referral Link', urgency: 'Bonus: Refer 5 friends this month for a $50 bonus!' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Share the Love', subheading: 'New referral program' },
          { type: 'body', heading: 'How It Works', content: 'Share, they buy, you both save $20.' },
          { type: 'feature', heading: '3 Steps', items: ['Share link', 'Friend purchases', 'Both get $20'] },
          { type: 'cta', heading: 'Start Sharing', buttonText: 'Get Link', urgency: 'Refer 5 for $50 bonus' }
        ]),
        ctaText: 'Get Your Referral Link',
        tone: 'enthusiastic',
        industry: 'E-commerce',
        audience: 'Loyal customers with 3+ purchases',
        estimatedOpenRate: 33.1,
        estimatedClickRate: 5.4,
        abVariants: JSON.stringify([
          { subject: 'Earn $20 for every friend you refer', angle: 'Value' },
          { subject: 'Your friends will thank you (and so will we)', angle: 'Social' },
          { subject: 'New: Unlimited referral rewards 🎉', angle: 'Excitement' }
        ]),
        sendTimeRec: 'Monday 11:00 AM EST',
        tips: JSON.stringify(['Target customers with high NPS scores', 'Make sharing as frictionless as possible', 'Include pre-written share messages', 'Show a referral leaderboard', 'Send reminder after 7 days if no referrals'])
      },
      {
        userId: user.id,
        name: 'Flash Sale Alert',
        campaignType: 'promotional',
        subject: '⚡ 24-HOUR FLASH SALE — Up to 60% Off',
        previewText: 'Biggest discounts of the year. Today only.',
        body: JSON.stringify([
          { type: 'header', heading: 'Flash Sale Is LIVE', subheading: '24 hours only — up to 60% off everything' },
          { type: 'body', heading: 'No Rainchecks, No Exceptions', content: 'This is not a drill. For the next 24 hours, enjoy our deepest discounts of the entire year. Every category, every product — nothing is excluded. When the clock hits zero, these prices are gone.' },
          { type: 'feature', heading: 'Category Deals', items: ['Electronics: up to 60% off', 'Fashion: up to 50% off', 'Home & Garden: up to 45% off', 'Beauty & Wellness: up to 40% off'] },
          { type: 'cta', heading: 'Clock Is Ticking', buttonText: 'Shop Flash Sale Now', urgency: 'Ends tonight at 11:59 PM EST' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Flash Sale LIVE', subheading: '24 hours only' },
          { type: 'body', heading: 'Deepest Discounts', content: 'Every category, every product.' },
          { type: 'feature', heading: 'Deals', items: ['Electronics 60%', 'Fashion 50%', 'Home 45%', 'Beauty 40%'] },
          { type: 'cta', heading: 'Clock Is Ticking', buttonText: 'Shop Now', urgency: 'Ends tonight 11:59 PM' }
        ]),
        ctaText: 'Shop Flash Sale Now',
        tone: 'urgent',
        industry: 'E-commerce',
        audience: 'All active subscribers',
        estimatedOpenRate: 36.8,
        estimatedClickRate: 8.9,
        abVariants: JSON.stringify([
          { subject: '60% OFF — 24 hours only ⏰', angle: 'Urgency' },
          { subject: 'Our biggest sale ever starts NOW', angle: 'Superlative' },
          { subject: 'You have 24 hours to save big', angle: 'Direct' }
        ]),
        sendTimeRec: 'Friday 8:00 AM EST',
        tips: JSON.stringify(['Send at the start of the sale window', 'Include countdown timer in email', 'Follow up 4 hours before sale ends', 'Highlight top sellers first', 'Use urgency language throughout'])
      },
      {
        userId: user.id,
        name: 'Feature Spotlight Series',
        campaignType: 'newsletter',
        subject: 'Did You Know? 3 Hidden Features That Save Hours',
        previewText: 'Unlock productivity features most users don\'t know about.',
        body: JSON.stringify([
          { type: 'header', heading: 'Hidden Features Unlocked', subheading: 'Tips and tricks from our power users' },
          { type: 'body', heading: 'You\'re Missing Out', content: 'Our platform has dozens of time-saving features that most users never discover. This week, we\'re spotlighting three game-changers that our power users swear by. Each one takes less than 2 minutes to set up.' },
          { type: 'feature', heading: 'This Week\'s Picks', items: ['Keyboard shortcuts that cut task time by 50%', 'Smart templates that auto-populate from your data', 'Scheduled reports delivered to your inbox daily'] },
          { type: 'cta', heading: 'Try Them Now', buttonText: 'Explore Features', urgency: '' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Hidden Features', subheading: 'Power user tips' },
          { type: 'body', heading: 'You\'re Missing Out', content: 'Three game-changers you should try.' },
          { type: 'feature', heading: 'This Week', items: ['Keyboard shortcuts', 'Smart templates', 'Scheduled reports'] },
          { type: 'cta', heading: 'Try Now', buttonText: 'Explore', urgency: '' }
        ]),
        ctaText: 'Explore Features',
        tone: 'helpful',
        industry: 'SaaS / Technology',
        audience: 'Active users on free or basic plans',
        estimatedOpenRate: 26.4,
        estimatedClickRate: 5.1,
        abVariants: JSON.stringify([
          { subject: '3 features you\'re not using (but should)', angle: 'Curiosity' },
          { subject: 'Save 2 hours/week with these tips', angle: 'Benefit' },
          { subject: 'Power user secrets revealed', angle: 'Exclusivity' }
        ]),
        sendTimeRec: 'Thursday 10:00 AM EST',
        tips: JSON.stringify(['Include GIF demos of each feature', 'Link to help docs for each tip', 'Track which features drive the most clicks', 'Use this data to inform product roadmap', 'Segment by plan type for upsell opportunities'])
      },
      {
        userId: user.id,
        name: 'Annual Review / Year in Review',
        campaignType: 'newsletter',
        subject: 'Your 2025 Year in Review — You Did Amazing Things',
        previewText: 'A personalized look back at your biggest wins.',
        body: JSON.stringify([
          { type: 'header', heading: 'Your Year in Review', subheading: '2025 was a big year — let\'s celebrate your wins' },
          { type: 'body', heading: 'By the Numbers', content: 'This year, you sent 1,247 campaigns, reached 89,340 contacts, and generated $142K in tracked revenue. That\'s 3x more than last year. Here\'s the full breakdown of your marketing success story.' },
          { type: 'feature', heading: 'Your Highlights', items: ['1,247 campaigns sent', '89,340 contacts reached', '$142K revenue generated', '32.5% average open rate'] },
          { type: 'cta', heading: 'Keep the Momentum Going', buttonText: 'Plan Your 2026 Strategy', urgency: '' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Year in Review', subheading: 'Celebrate your wins' },
          { type: 'body', heading: 'By the Numbers', content: '1,247 campaigns, 89K contacts, $142K revenue.' },
          { type: 'feature', heading: 'Highlights', items: ['1,247 campaigns', '89K contacts', '$142K revenue', '32.5% open rate'] },
          { type: 'cta', heading: 'Keep Going', buttonText: 'Plan 2026', urgency: '' }
        ]),
        ctaText: 'Plan Your 2026 Strategy',
        tone: 'celebratory',
        industry: 'General',
        audience: 'All active users',
        estimatedOpenRate: 42.1,
        estimatedClickRate: 7.3,
        abVariants: JSON.stringify([
          { subject: '2025 Wrapped: Your marketing year in review', angle: 'Spotify-style' },
          { subject: 'You sent 1,247 campaigns this year 🎉', angle: 'Specific data' },
          { subject: 'Look what you accomplished in 2025', angle: 'Achievement' }
        ]),
        sendTimeRec: 'Last week of December',
        tips: JSON.stringify(['Use actual user data for personalization', 'Include shareable social graphics', 'Compare to previous year if available', 'End with forward-looking CTA', 'Make it feel celebratory not salesy'])
      },
      {
        userId: user.id,
        name: 'Upgrade / Upsell Campaign',
        campaignType: 'promotional',
        subject: 'You\'re Outgrowing Your Plan — Time to Level Up?',
        previewText: 'Unlock advanced features before your next big campaign.',
        body: JSON.stringify([
          { type: 'header', heading: 'Ready for More?', subheading: 'You\'ve been crushing it — let\'s take it to the next level' },
          { type: 'body', heading: 'You\'ve Hit Some Limits', content: 'Based on your usage, you\'ve hit 85% of your plan limits this month. Upgrading to Pro unlocks unlimited contacts, advanced analytics, and AI-powered features that will help you scale your marketing without scaling your workload.' },
          { type: 'feature', heading: 'What Pro Unlocks', items: ['Unlimited contacts and sends', 'AI-powered email writer', 'Advanced segmentation engine', 'Priority support (2-hour response)', 'Custom branded emails'] },
          { type: 'testimonial', quote: 'Upgrading to Pro was the best ROI decision we made. Our email revenue doubled in 60 days.', author: 'Rachel Torres', role: 'Founder, Bloom Skincare' },
          { type: 'cta', heading: 'Upgrade Today', buttonText: 'See Pro Plans', urgency: 'Lock in annual pricing — save 25%' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Ready for More?', subheading: 'Take it to the next level' },
          { type: 'body', heading: 'Hitting Your Limits', content: 'You\'ve used 85% of your plan. Time to upgrade.' },
          { type: 'feature', heading: 'Pro Features', items: ['Unlimited contacts', 'AI email writer', 'Advanced segments', 'Priority support', 'Custom branding'] },
          { type: 'cta', heading: 'Upgrade', buttonText: 'See Plans', urgency: 'Save 25% annually' }
        ]),
        ctaText: 'See Pro Plans',
        tone: 'persuasive',
        industry: 'SaaS',
        audience: 'Free and basic plan users at usage limits',
        estimatedOpenRate: 30.6,
        estimatedClickRate: 5.8,
        abVariants: JSON.stringify([
          { subject: 'You\'re at 85% capacity — what\'s next?', angle: 'Data-driven' },
          { subject: 'Unlock unlimited everything', angle: 'Value' },
          { subject: 'Pro users grow 2x faster — here\'s why', angle: 'Social proof' }
        ]),
        sendTimeRec: 'Monday 10:00 AM EST',
        tips: JSON.stringify(['Trigger when user hits 80% of plan limits', 'Show their specific usage data', 'Offer monthly trial of pro features', 'Include ROI calculator link', 'A/B test discount vs feature messaging'])
      },
      {
        userId: user.id,
        name: 'Customer Survey Request',
        campaignType: 'announcement',
        subject: 'Quick Question — We\'d Love Your Feedback (2 min)',
        previewText: 'Help shape the future of our product. Takes only 2 minutes.',
        body: JSON.stringify([
          { type: 'header', heading: 'Your Voice Matters', subheading: 'Help us build what you need most' },
          { type: 'body', heading: 'A Quick 2-Minute Survey', content: 'We\'re planning our product roadmap for the next quarter and want to make sure we\'re building the features that matter most to you. This short survey takes less than 2 minutes and directly influences what we build next.' },
          { type: 'feature', heading: 'What We\'re Asking About', items: ['Which features you use most', 'What you wish we\'d improve', 'New features you\'d love to see', 'Your overall satisfaction'] },
          { type: 'cta', heading: 'Take the Survey', buttonText: 'Share Your Feedback', urgency: 'Survey closes Friday — every response earns a $5 credit' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'Your Voice Matters', subheading: 'Shape our product' },
          { type: 'body', heading: '2-Minute Survey', content: 'Influence what we build next.' },
          { type: 'feature', heading: 'We\'re Asking', items: ['Feature usage', 'Improvements', 'New features', 'Satisfaction'] },
          { type: 'cta', heading: 'Take Survey', buttonText: 'Share Feedback', urgency: '$5 credit for each response' }
        ]),
        ctaText: 'Share Your Feedback',
        tone: 'humble',
        industry: 'SaaS / Technology',
        audience: 'Active users (30+ days)',
        estimatedOpenRate: 25.8,
        estimatedClickRate: 4.2,
        abVariants: JSON.stringify([
          { subject: 'Got 2 minutes? We need your input', angle: 'Time-conscious' },
          { subject: 'Shape our next big feature release', angle: 'Empowerment' },
          { subject: 'We built [feature] from your feedback — what\'s next?', angle: 'Proof' }
        ]),
        sendTimeRec: 'Tuesday 11:00 AM EST',
        tips: JSON.stringify(['Keep survey under 5 questions', 'Offer incentive for completion', 'Send reminder to non-completers after 3 days', 'Share results summary with respondents', 'Close the loop by announcing features built from feedback'])
      },
      {
        userId: user.id,
        name: 'VIP Early Access Invitation',
        campaignType: 'promotional',
        subject: 'VIP Only: Early Access to Our Summer Collection',
        previewText: 'Shop 48 hours before everyone else. You earned it.',
        body: JSON.stringify([
          { type: 'header', heading: 'VIP Early Access', subheading: 'Exclusive — you\'re seeing this 48 hours before everyone else' },
          { type: 'body', heading: 'Because You\'re Our Best', content: 'As one of our most valued customers, you\'ve earned something special: exclusive early access to our brand-new Summer 2025 collection. These styles haven\'t even hit the website yet. You get first pick before anyone else.' },
          { type: 'feature', heading: 'Your VIP Perks', items: ['48-hour early access', 'Additional 15% VIP discount', 'Free express shipping', 'Complimentary gift wrapping'] },
          { type: 'cta', heading: 'Shop Before Everyone', buttonText: 'Access VIP Sale', urgency: 'VIP window closes in 48 hours' }
        ]),
        sections: JSON.stringify([
          { type: 'header', heading: 'VIP Early Access', subheading: '48 hours before everyone' },
          { type: 'body', heading: 'You Earned This', content: 'First pick of Summer 2025 collection.' },
          { type: 'feature', heading: 'VIP Perks', items: ['48-hour access', '15% VIP discount', 'Free express shipping', 'Gift wrapping'] },
          { type: 'cta', heading: 'Shop First', buttonText: 'Access Sale', urgency: '48 hours only' }
        ]),
        ctaText: 'Access VIP Sale',
        tone: 'exclusive',
        industry: 'Fashion & Retail',
        audience: 'VIP customers (top 10% by LTV)',
        estimatedOpenRate: 41.5,
        estimatedClickRate: 9.2,
        abVariants: JSON.stringify([
          { subject: 'You\'re invited: VIP early access starts now', angle: 'Invitation' },
          { subject: 'Psst — Summer collection, just for VIPs', angle: 'Secrecy' },
          { subject: 'Your exclusive access code is inside', angle: 'Mystery' }
        ]),
        sendTimeRec: 'Thursday 8:00 AM EST',
        tips: JSON.stringify(['Segment strictly by customer LTV', 'Use exclusive language throughout', 'Create dedicated landing page for VIPs', 'Include personalized product recommendations', 'Follow up with "last chance" email at 24 hours'])
      },
    ],
  });

  console.log('✅ Seeded 15 AI email campaigns');

  console.log('\n========================================');
  console.log('✅ Seed completed successfully!');
  console.log('========================================');
  console.log('\nDemo credentials:');
  console.log('  Admin: demo@example.com / demo123');
  console.log('  User:  user@example.com / Demo123!');
  console.log('\nData created:');
  console.log('  - 2 users (admin + regular)');
  console.log('  - 15 password resets');
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
  console.log(`  - ${aiSegments.length} AI segments`);
  console.log(`  - ${aiJourneys.length} AI journeys`);
  console.log(`  - ${aiAttributions.length} AI attributions`);
  console.log(`  - ${aiBudgets.length} AI budgets`);
  console.log(`  - ${aiFatigues.length} AI fatigues`);
  console.log(`  - ${aiPersonas.length} AI personas`);
  console.log(`  - ${aiInfluencers.length} AI influencers`);
  console.log(`  - ${aiHashtags.length} AI hashtags`);
  console.log(`  - ${aiLandingPages.length} AI landing pages`);
  console.log('  - 15 AI email campaigns');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
