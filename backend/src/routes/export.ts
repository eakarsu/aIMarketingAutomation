import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const router = Router();
router.use(authMiddleware);

function drawTableRow(doc: PDFKit.PDFDocument, y: number, cells: string[], colWidths: number[], isHeader = false) {
  let x = 50;
  if (isHeader) {
    doc.font('Helvetica-Bold').fontSize(9);
  } else {
    doc.font('Helvetica').fontSize(8);
  }
  cells.forEach((cell, i) => {
    const text = (cell || '').substring(0, 30);
    doc.text(text, x, y, { width: colWidths[i], ellipsis: true });
    x += colWidths[i];
  });
  return y + 18;
}

// Export campaigns as PDF
router.get('/pdf/campaigns', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=campaigns.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Campaigns Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    const headers = ['Name', 'Type', 'Status', 'Subject', 'Created'];
    const colWidths = [180, 100, 80, 180, 100];
    let y = drawTableRow(doc, doc.y, headers, colWidths, true);

    doc.moveTo(50, y - 4).lineTo(690, y - 4).stroke();

    for (const c of campaigns) {
      if (y > 500) {
        doc.addPage();
        y = 50;
        y = drawTableRow(doc, y, headers, colWidths, true);
        doc.moveTo(50, y - 4).lineTo(690, y - 4).stroke();
      }
      y = drawTableRow(doc, y, [c.name, c.type, c.status, c.subject || '', c.createdAt.toLocaleDateString()], colWidths);
    }

    doc.end();
  } catch (error) {
    console.error('Export campaigns PDF error:', error);
    res.status(500).json({ error: 'Failed to export campaigns' });
  }
});

// Export contacts as PDF
router.get('/pdf/contacts', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Contacts Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()} | Total: ${contacts.length}`, { align: 'center' });
    doc.moveDown();

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Created'];
    const colWidths = [120, 140, 100, 120, 80, 80];
    let y = drawTableRow(doc, doc.y, headers, colWidths, true);

    doc.moveTo(50, y - 4).lineTo(690, y - 4).stroke();

    for (const c of contacts) {
      if (y > 500) {
        doc.addPage();
        y = 50;
        y = drawTableRow(doc, y, headers, colWidths, true);
        doc.moveTo(50, y - 4).lineTo(690, y - 4).stroke();
      }
      y = drawTableRow(doc, y, [
        `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        c.email, c.phone || '', c.company || '', c.status, c.createdAt.toLocaleDateString(),
      ], colWidths);
    }

    doc.end();
  } catch (error) {
    console.error('Export contacts PDF error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// Export analytics as PDF
router.get('/pdf/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.userId, status: 'SENT' },
      include: { analytics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Analytics Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();

    const headers = ['Campaign', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Bounced', 'Revenue'];
    const colWidths = [150, 70, 80, 70, 70, 70, 80];
    let y = drawTableRow(doc, doc.y, headers, colWidths, true);

    doc.moveTo(50, y - 4).lineTo(640, y - 4).stroke();

    for (const c of campaigns) {
      if (y > 500) { doc.addPage(); y = 50; y = drawTableRow(doc, y, headers, colWidths, true); }
      const a = c.analytics[0];
      if (a) {
        y = drawTableRow(doc, y, [
          c.name, String(a.totalSent), String(a.delivered), String(a.opened),
          String(a.clicked), String(a.bounced), `$${a.revenue.toFixed(0)}`,
        ], colWidths);
      }
    }

    doc.end();
  } catch (error) {
    console.error('Export analytics PDF error:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Export reviews as PDF
router.get('/pdf/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const reviews = await prisma.review.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reviews.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Reviews Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()} | Total: ${reviews.length}`, { align: 'center' });
    doc.moveDown();

    const headers = ['Author', 'Platform', 'Rating', 'Status', 'Content', 'Date'];
    const colWidths = [100, 80, 60, 80, 250, 80];
    let y = drawTableRow(doc, doc.y, headers, colWidths, true);

    doc.moveTo(50, y - 4).lineTo(700, y - 4).stroke();

    for (const r of reviews) {
      if (y > 500) { doc.addPage(); y = 50; y = drawTableRow(doc, y, headers, colWidths, true); }
      y = drawTableRow(doc, y, [
        r.authorName, r.platform, `${r.rating}/5`, r.status,
        (r.content || '').substring(0, 50), r.createdAt.toLocaleDateString(),
      ], colWidths);
    }

    doc.end();
  } catch (error) {
    console.error('Export reviews PDF error:', error);
    res.status(500).json({ error: 'Failed to export reviews' });
  }
});

export default router;
