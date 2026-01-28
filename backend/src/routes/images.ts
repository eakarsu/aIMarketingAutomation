import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/avif',
      'image/heic',
      'image/heif',
      'image/bmp',
      'image/tiff',
    ];
    // Also check file extension for cases where mime type is not correctly detected
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.heic', '.heif', '.bmp', '.tiff', '.tif'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

// Get all images
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { search, aiGenerated } = req.query;

    const where: any = { userId: req.userId };
    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }
    if (aiGenerated !== undefined) {
      where.isAIGenerated = aiGenerated === 'true';
    }

    const images = await prisma.imageLibrary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(images);
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Failed to get images' });
  }
});

// Get single image
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const image = await prisma.imageLibrary.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to get image' });
  }
});

// Upload image
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const prisma: PrismaClient = req.app.get('prisma');
    const { name } = req.body;

    const image = await prisma.imageLibrary.create({
      data: {
        userId: req.userId!,
        name: name || req.file.originalname,
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });

    res.status(201).json(image);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/upload-multiple', upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const prisma: PrismaClient = req.app.get('prisma');

    const images = await Promise.all(
      files.map(file =>
        prisma.imageLibrary.create({
          data: {
            userId: req.userId!,
            name: file.originalname,
            filename: file.filename,
            url: `/uploads/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
          },
        })
      )
    );

    res.status(201).json(images);
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Update image metadata
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name } = req.body;

    const existing = await prisma.imageLibrary.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = await prisma.imageLibrary.update({
      where: { id: req.params.id },
      data: { name },
    });

    res.json(image);
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Delete image
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const image = await prisma.imageLibrary.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.imageLibrary.delete({ where: { id: req.params.id } });

    res.json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Bulk delete images
router.post('/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { ids } = req.body;

    const images = await prisma.imageLibrary.findMany({
      where: { id: { in: ids }, userId: req.userId },
    });

    // Delete files from disk
    for (const image of images) {
      const filePath = path.join(process.cwd(), 'uploads', image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const result = await prisma.imageLibrary.deleteMany({
      where: { id: { in: ids }, userId: req.userId },
    });

    res.json({ message: `${result.count} images deleted` });
  } catch (error) {
    console.error('Bulk delete images error:', error);
    res.status(500).json({ error: 'Failed to delete images' });
  }
});

export default router;
