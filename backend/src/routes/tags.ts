import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all tags
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      include: {
        _count: { select: { contacts: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Get single tag
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const tag = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        contacts: { include: { contact: true } },
      },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ error: 'Failed to get tag' });
  }
});

// Create tag
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, color } = req.body;

    const tag = await prisma.tag.create({
      data: {
        userId: req.userId!,
        name,
        color: color || '#3B82F6',
      },
      include: {
        _count: { select: { contacts: true } },
      },
    });

    res.status(201).json(tag);
  } catch (error: any) {
    console.error('Create tag error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, color } = req.body;

    const existing = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const tag = await prisma.tag.update({
      where: { id: req.params.id },
      data: { name, color },
      include: {
        _count: { select: { contacts: true } },
      },
    });

    res.json(tag);
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const result = await prisma.tag.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Add tag to contacts
router.post('/:id/contacts', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { contactIds } = req.body;

    const tag = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await prisma.contactTag.createMany({
      data: contactIds.map((contactId: string) => ({
        contactId,
        tagId: req.params.id,
      })),
      skipDuplicates: true,
    });

    res.json({ message: 'Tag added to contacts' });
  } catch (error) {
    console.error('Add tag to contacts error:', error);
    res.status(500).json({ error: 'Failed to add tag to contacts' });
  }
});

// Remove tag from contact
router.delete('/:id/contacts/:contactId', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    await prisma.contactTag.deleteMany({
      where: {
        tagId: req.params.id,
        contactId: req.params.contactId,
      },
    });

    res.json({ message: 'Tag removed from contact' });
  } catch (error) {
    console.error('Remove tag from contact error:', error);
    res.status(500).json({ error: 'Failed to remove tag from contact' });
  }
});

export default router;
