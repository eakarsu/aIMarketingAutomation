import { Router, Response } from 'express';
import { PrismaClient, ContactStatus } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all contacts
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { status, search, tagId, segmentId, page = '1', limit = '50', sortBy, sortOrder } = req.query;

    const where: any = { userId: req.userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (tagId) {
      where.tags = { some: { tagId: tagId as string } };
    }
    if (segmentId) {
      where.segments = { some: { segmentId: segmentId as string } };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const allowedSortFields = ['firstName', 'lastName', 'email', 'company', 'status', 'createdAt'];
    const orderField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          segments: { include: { segment: { select: { id: true, name: true } } } },
          customFieldValues: { include: { customField: true } },
        },
        orderBy: { [orderField]: orderDir },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      contacts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// Get single contact
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        tags: { include: { tag: true } },
        segments: { include: { segment: true } },
        customFieldValues: { include: { customField: true } },
        campaignRecipients: {
          include: { campaign: { select: { id: true, name: true, type: true, sentAt: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        formSubmissions: {
          include: { form: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        automationEnrollments: {
          include: { automation: { select: { id: true, name: true, type: true } } },
          orderBy: { enrolledAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

// Create contact
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { email, phone, firstName, lastName, company, source, birthday, tagIds, customFields } = req.body;

    const contact = await prisma.contact.create({
      data: {
        userId: req.userId!,
        email,
        phone,
        firstName,
        lastName,
        company,
        source,
        birthday: birthday ? new Date(birthday) : null,
      },
    });

    // Add tags
    if (tagIds && tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId: string) => ({
          contactId: contact.id,
          tagId,
        })),
      });
    }

    // Add custom field values
    if (customFields && customFields.length > 0) {
      await prisma.customFieldValue.createMany({
        data: customFields.map((cf: { fieldId: string; value: string }) => ({
          contactId: contact.id,
          customFieldId: cf.fieldId,
          value: cf.value,
        })),
      });
    }

    const result = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        tags: { include: { tag: true } },
        customFieldValues: { include: { customField: true } },
      },
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Create contact error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Contact with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { email, phone, firstName, lastName, company, status, source, birthday, tagIds, customFields } = req.body;

    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        email,
        phone,
        firstName,
        lastName,
        company,
        status: status as ContactStatus,
        source,
        birthday: birthday ? new Date(birthday) : null,
      },
    });

    // Update tags
    if (tagIds !== undefined) {
      await prisma.contactTag.deleteMany({ where: { contactId: req.params.id } });
      if (tagIds.length > 0) {
        await prisma.contactTag.createMany({
          data: tagIds.map((tagId: string) => ({
            contactId: req.params.id,
            tagId,
          })),
        });
      }
    }

    // Update custom fields
    if (customFields !== undefined) {
      await prisma.customFieldValue.deleteMany({ where: { contactId: req.params.id } });
      if (customFields.length > 0) {
        await prisma.customFieldValue.createMany({
          data: customFields.map((cf: { fieldId: string; value: string }) => ({
            contactId: req.params.id,
            customFieldId: cf.fieldId,
            value: cf.value,
          })),
        });
      }
    }

    const result = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        tags: { include: { tag: true } },
        customFieldValues: { include: { customField: true } },
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.contact.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Bulk delete contacts
router.post('/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { ids } = req.body;

    const result = await prisma.contact.deleteMany({
      where: { id: { in: ids }, userId: req.userId },
    });

    res.json({ message: `${result.count} contacts deleted` });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    res.status(500).json({ error: 'Failed to delete contacts' });
  }
});

// Bulk update contacts
router.put('/bulk-update', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No contact IDs provided' });
    }

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status as ContactStatus;

    const result = await prisma.contact.updateMany({
      where: { id: { in: ids }, userId: req.userId },
      data: updateData,
    });

    // Add tag if specified
    if (updates.addTagId) {
      for (const contactId of ids) {
        await prisma.contactTag.upsert({
          where: { contactId_tagId: { contactId, tagId: updates.addTagId } },
          update: {},
          create: { contactId, tagId: updates.addTagId },
        }).catch(() => {}); // ignore if contact doesn't exist
      }
    }

    res.json({ message: `${result.count} contacts updated` });
  } catch (error) {
    console.error('Bulk update contacts error:', error);
    res.status(500).json({ error: 'Failed to bulk update contacts' });
  }
});

// Import contacts
router.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { contacts: contactsData, tagIds } = req.body;

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const data of contactsData) {
      try {
        const contact = await prisma.contact.create({
          data: {
            userId: req.userId!,
            email: data.email,
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            company: data.company,
            source: 'import',
          },
        });

        if (tagIds && tagIds.length > 0) {
          await prisma.contactTag.createMany({
            data: tagIds.map((tagId: string) => ({
              contactId: contact.id,
              tagId,
            })),
          });
        }

        results.imported++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          results.skipped++;
        } else {
          results.errors.push(`Error importing ${data.email}: ${error.message}`);
        }
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Import contacts error:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

// Export contacts
router.get('/export/csv', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: {
        tags: { include: { tag: true } },
        customFieldValues: { include: { customField: true } },
      },
    });

    const headers = ['email', 'firstName', 'lastName', 'phone', 'company', 'status', 'source', 'tags', 'createdAt'];
    const rows = contacts.map(c => [
      c.email,
      c.firstName || '',
      c.lastName || '',
      c.phone || '',
      c.company || '',
      c.status,
      c.source || '',
      c.tags.map(t => t.tag.name).join(';'),
      c.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export contacts error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// Opt-out contact
router.post('/:id/opt-out', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.contact.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        status: 'UNSUBSCRIBED',
        optedOutAt: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact opted out' });
  } catch (error) {
    console.error('Opt-out contact error:', error);
    res.status(500).json({ error: 'Failed to opt-out contact' });
  }
});

// Get contact statuses for dropdown
router.get('/options/statuses', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'ACTIVE', label: 'Active' },
    { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
    { value: 'BOUNCED', label: 'Bounced' },
    { value: 'INACTIVE', label: 'Inactive' },
  ]);
});

export default router;
