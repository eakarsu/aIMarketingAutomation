import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all forms
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const forms = await prisma.form.findMany({
      where: { userId: req.userId },
      include: {
        landingPage: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(forms);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Failed to get forms' });
  }
});

// Get single form
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const form = await prisma.form.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        landingPage: true,
        submissions: {
          include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Failed to get form' });
  }
});

// Create form
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, fields, submitAction, landingPageId } = req.body;

    const form = await prisma.form.create({
      data: {
        userId: req.userId!,
        name,
        description,
        fields: JSON.stringify(fields || []),
        submitAction: submitAction ? JSON.stringify(submitAction) : null,
        landingPageId,
      },
    });

    res.status(201).json(form);
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// Update form
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, fields, submitAction, landingPageId } = req.body;

    const existing = await prisma.form.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = await prisma.form.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        fields: fields ? JSON.stringify(fields) : undefined,
        submitAction: submitAction ? JSON.stringify(submitAction) : null,
        landingPageId,
      },
    });

    res.json(form);
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// Delete form
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.form.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ message: 'Form deleted' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// Submit form (public endpoint - remove auth for production)
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { data } = req.body;

    const form = await prisma.form.findUnique({
      where: { id: req.params.id },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Try to find or create contact
    let contactId = null;
    if (data.email) {
      const existingContact = await prisma.contact.findFirst({
        where: { userId: form.userId, email: data.email },
      });

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const newContact = await prisma.contact.create({
          data: {
            userId: form.userId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            source: 'form',
          },
        });
        contactId = newContact.id;
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        contactId,
        data: JSON.stringify(data),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Update landing page conversions if linked
    if (form.landingPageId) {
      await prisma.landingPage.update({
        where: { id: form.landingPageId },
        data: { conversions: { increment: 1 } },
      });
    }

    res.status(201).json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// Get form submissions
router.get('/:id/submissions', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { page = '1', limit = '50' } = req.query;

    const form = await prisma.form.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where: { formId: form.id },
        include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.formSubmission.count({ where: { formId: form.id } }),
    ]);

    res.json({
      submissions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get form submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Export form submissions as CSV
router.get('/:id/submissions/export', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const form = await prisma.form.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: form.id },
      include: { contact: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Get all unique keys from submissions
    const allKeys = new Set<string>();
    submissions.forEach(s => {
      const data = JSON.parse(s.data);
      Object.keys(data).forEach(k => allKeys.add(k));
    });

    const headers = ['submissionId', 'email', ...Array.from(allKeys), 'createdAt'];
    const rows = submissions.map(s => {
      const data = JSON.parse(s.data);
      return [
        s.id,
        s.contact?.email || '',
        ...Array.from(allKeys).map(k => data[k] || ''),
        s.createdAt.toISOString(),
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=form-${form.id}-submissions.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export form submissions error:', error);
    res.status(500).json({ error: 'Failed to export submissions' });
  }
});

export default router;
