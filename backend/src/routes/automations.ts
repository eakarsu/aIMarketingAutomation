import { Router, Response } from 'express';
import { PrismaClient, AutomationType, AutomationStatus, StepType } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all automations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { type, status, sortBy, sortOrder } = req.query;

    const where: any = { userId: req.userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const allowedSort = ['name', 'type', 'status', 'createdAt'];
    const oField = allowedSort.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const oDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const automations = await prisma.automation.findMany({
      where,
      include: {
        segment: { select: { id: true, name: true } },
        _count: { select: { steps: true, enrollments: true } },
      },
      orderBy: { [oField]: oDir },
    });

    res.json(automations);
  } catch (error) {
    console.error('Get automations error:', error);
    res.status(500).json({ error: 'Failed to get automations' });
  }
});

// Get single automation
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        segment: true,
        steps: {
          include: { template: { select: { id: true, name: true } } },
          orderBy: { order: 'asc' },
        },
        enrollments: {
          include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } },
          orderBy: { enrolledAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json(automation);
  } catch (error) {
    console.error('Get automation error:', error);
    res.status(500).json({ error: 'Failed to get automation' });
  }
});

// Create automation
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, type, trigger, segmentId, steps } = req.body;

    const automation = await prisma.automation.create({
      data: {
        userId: req.userId!,
        name,
        description,
        type: type as AutomationType,
        trigger: JSON.stringify(trigger || {}),
        segmentId,
      },
    });

    // Create steps
    if (steps && steps.length > 0) {
      await prisma.automationStep.createMany({
        data: steps.map((step: any, index: number) => ({
          automationId: automation.id,
          order: index + 1,
          type: step.type as StepType,
          delayMinutes: step.delayMinutes || 0,
          templateId: step.templateId,
          config: step.config ? JSON.stringify(step.config) : null,
        })),
      });
    }

    const result = await prisma.automation.findUnique({
      where: { id: automation.id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        segment: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create automation error:', error);
    res.status(500).json({ error: 'Failed to create automation' });
  }
});

// Update automation
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, description, type, status, trigger, segmentId, steps } = req.body;

    const existing = await prisma.automation.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    await prisma.automation.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        type: type as AutomationType,
        status: status as AutomationStatus,
        trigger: trigger ? JSON.stringify(trigger) : undefined,
        segmentId,
      },
    });

    // Update steps
    if (steps !== undefined) {
      await prisma.automationStep.deleteMany({ where: { automationId: req.params.id } });
      if (steps.length > 0) {
        await prisma.automationStep.createMany({
          data: steps.map((step: any, index: number) => ({
            automationId: req.params.id,
            order: index + 1,
            type: step.type as StepType,
            delayMinutes: step.delayMinutes || 0,
            templateId: step.templateId,
            config: step.config ? JSON.stringify(step.config) : null,
          })),
        });
      }
    }

    const result = await prisma.automation.findUnique({
      where: { id: req.params.id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        segment: { select: { id: true, name: true } },
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Update automation error:', error);
    res.status(500).json({ error: 'Failed to update automation' });
  }
});

// Delete automation
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.automation.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ message: 'Automation deleted' });
  } catch (error) {
    console.error('Delete automation error:', error);
    res.status(500).json({ error: 'Failed to delete automation' });
  }
});

// Activate automation
router.post('/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.automation.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status: 'ACTIVE' },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ message: 'Automation activated' });
  } catch (error) {
    console.error('Activate automation error:', error);
    res.status(500).json({ error: 'Failed to activate automation' });
  }
});

// Pause automation
router.post('/:id/pause', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const result = await prisma.automation.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { status: 'PAUSED' },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    res.json({ message: 'Automation paused' });
  } catch (error) {
    console.error('Pause automation error:', error);
    res.status(500).json({ error: 'Failed to pause automation' });
  }
});

// Enroll contact in automation
router.post('/:id/enroll', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { contactIds } = req.body;

    const automation = await prisma.automation.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }

    const enrollments = await Promise.all(
      contactIds.map(async (contactId: string) => {
        const enrollment = await prisma.automationEnrollment.create({
          data: {
            automationId: automation.id,
            contactId,
          },
        });

        // Create enrollment steps
        if (automation.steps.length > 0) {
          await prisma.enrollmentStep.createMany({
            data: automation.steps.map(step => ({
              enrollmentId: enrollment.id,
              stepId: step.id,
              status: step.order === 1 ? 'SCHEDULED' : 'PENDING',
              scheduledAt: step.order === 1 ? new Date(Date.now() + step.delayMinutes * 60000) : null,
            })),
          });
        }

        return enrollment;
      })
    );

    res.json({ message: 'Contacts enrolled', count: enrollments.length });
  } catch (error) {
    console.error('Enroll contacts error:', error);
    res.status(500).json({ error: 'Failed to enroll contacts' });
  }
});

// Get automation types for dropdown
router.get('/options/types', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'DRIP', label: 'Drip Campaign' },
    { value: 'TRIGGER', label: 'Trigger-based' },
    { value: 'BIRTHDAY', label: 'Birthday Campaign' },
    { value: 'REENGAGEMENT', label: 'Re-engagement' },
    { value: 'WELCOME', label: 'Welcome Sequence' },
  ]);
});

// Get step types for dropdown
router.get('/options/step-types', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'EMAIL', label: 'Send Email' },
    { value: 'SMS', label: 'Send SMS' },
    { value: 'WAIT', label: 'Wait/Delay' },
    { value: 'CONDITION', label: 'Condition' },
    { value: 'TAG_ADD', label: 'Add Tag' },
    { value: 'TAG_REMOVE', label: 'Remove Tag' },
    { value: 'WEBHOOK', label: 'Webhook' },
  ]);
});

export default router;
