import nodemailer from 'nodemailer';

let transport: nodemailer.Transporter | null = null;

function publicAppUrl(): string {
  const value = process.env.APP_PUBLIC_URL;
  if (!value) throw new Error('APP_PUBLIC_URL is required for transactional email links');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') throw new Error('APP_PUBLIC_URL must use HTTPS outside local development');
  return url.toString().replace(/\/$/, '');
}

function mailTransport(): nodemailer.Transporter {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error('SMTP_HOST and SMTP_FROM are required for transactional email');
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transport;
}

async function sendLink(to: string, subject: string, label: string, pathName: string, token: string): Promise<void> {
  const link = `${publicAppUrl()}${pathName}?token=${encodeURIComponent(token)}`;
  const receipt = await mailTransport().sendMail({ from: process.env.SMTP_FROM!, to, subject, text: `${label}: ${link}` });
  if (!receipt.messageId) throw new Error('transactional email provider did not return a message ID');
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  return sendLink(to, 'Reset your password', 'Reset your password using this one-time link', '/reset-password', token);
}

export function sendVerificationEmail(to: string, token: string): Promise<void> {
  return sendLink(to, 'Verify your email', 'Verify your email using this one-time link', '/verify-email', token);
}

