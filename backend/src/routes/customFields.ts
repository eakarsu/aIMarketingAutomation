import { Router, Response } from 'express';
import { PrismaClient, FieldType } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all custom fields
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const customFields = await prisma.customField.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(customFields);
  } catch (error) {
    console.error('Get custom fields error:', error);
    res.status(500).json({ error: 'Failed to get custom fields' });
  }
});

// Get single custom field
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const customField = await prisma.customField.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        values: { include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } } },
      },
    });

    if (!customField) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json(customField);
  } catch (error) {
    console.error('Get custom field error:', error);
    res.status(500).json({ error: 'Failed to get custom field' });
  }
});

// Create custom field
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, fieldType, options, required } = req.body;

    const customField = await prisma.customField.create({
      data: {
        userId: req.userId!,
        name,
        fieldType: fieldType as FieldType,
        options: options ? JSON.stringify(options) : null,
        required: required || false,
      },
    });

    res.status(201).json(customField);
  } catch (error: any) {
    console.error('Create custom field error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Custom field with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// Update custom field
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, fieldType, options, required } = req.body;

    const existing = await prisma.customField.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    const customField = await prisma.customField.update({
      where: { id: req.params.id },
      data: {
        name,
        fieldType: fieldType as FieldType,
        options: options ? JSON.stringify(options) : null,
        required,
      },
    });

    res.json(customField);
  } catch (error) {
    console.error('Update custom field error:', error);
    res.status(500).json({ error: 'Failed to update custom field' });
  }
});

// Delete custom field
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.customField.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json({ message: 'Custom field deleted' });
  } catch (error) {
    console.error('Delete custom field error:', error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

// Get field types for dropdown
router.get('/options/types', async (req: AuthRequest, res: Response) => {
  res.json([
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'DROPDOWN', label: 'Dropdown' },
    { value: 'CHECKBOX', label: 'Checkbox' },
    { value: 'URL', label: 'URL' },
  ]);
});

export default router;
