/**
 * automationEngine — walks AutomationEnrollments through their AutomationSteps.
 *
 * Each tick:
 *   1. Fetch all ACTIVE enrollments for ACTIVE automations.
 *   2. For each enrollment, find the next step (by `currentStep` index).
 *   3. Compute the scheduled time as (lastStepExecutedAt OR enrolledAt) + step.delayMinutes.
 *   4. If the scheduled time has arrived, execute the step:
 *        EMAIL  → send via nodemailer (or simulate)
 *        SMS    → send via twilio (or simulate)
 *        WAIT   → just advance
 *        TAG_ADD/TAG_REMOVE → mutate ContactTag
 *        CONDITION → JSON config { field, op, value }; advance if true, skip if false
 *        WEBHOOK → POST step.config to URL
 *   5. Increment currentStep. When past last step, mark enrollment COMPLETED.
 *
 * The engine is idempotent enough for short cron intervals because it advances by step index.
 */

import { PrismaClient, EnrollmentStatus, StepStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

let mailer: nodemailer.Transporter | null = null;
let twilioClient: any = null;

function getMailer() {
  if (mailer) return mailer;
  if (!process.env.SMTP_HOST) return null;
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return mailer;
}
function getTwilio() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

export async function runAutomationEngine(prisma: PrismaClient): Promise<{ enrollmentsProcessed: number; stepsExecuted: number }> {
  const enrollments = await prisma.automationEnrollment.findMany({
    where: { status: 'ACTIVE' },
    include: {
      automation: { include: { steps: { orderBy: { order: 'asc' } } } },
      contact: true,
    },
    take: 100,
  });

  let stepsExecuted = 0;
  for (const e of enrollments) {
    if (e.automation.status !== 'ACTIVE') continue;
    const steps = e.automation.steps;
    if (e.currentStep >= steps.length) {
      await prisma.automationEnrollment.update({ where: { id: e.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      continue;
    }
    const step = steps[e.currentStep];

    // Find when the previous step finished (or use enrollment time)
    const lastEnrollmentStep = await prisma.enrollmentStep.findFirst({
      where: { enrollmentId: e.id, status: 'EXECUTED' },
      orderBy: { executedAt: 'desc' },
    });
    const baseTime = lastEnrollmentStep?.executedAt || e.enrolledAt;
    const scheduledAt = new Date(baseTime.getTime() + (step.delayMinutes || 0) * 60_000);

    if (scheduledAt > new Date()) continue; // not due yet

    let success = true;
    try {
      if (step.type === 'EMAIL') {
        if (e.contact.email) {
          const m = getMailer();
          let subject = 'Automation Step';
          let body = '';
          let html = '';
          if (step.templateId) {
            const tmpl = await prisma.template.findUnique({ where: { id: step.templateId } });
            if (tmpl) { subject = tmpl.subject || tmpl.name; body = tmpl.content || ''; html = tmpl.htmlContent || tmpl.content || ''; }
          }
          if (m) await m.sendMail({ from: process.env.SMTP_FROM || 'noreply@example.com', to: e.contact.email, subject, text: body, html });
        }
      } else if (step.type === 'SMS') {
        if (e.contact.phone) {
          const t = getTwilio();
          let body = '';
          if (step.templateId) {
            const tmpl = await prisma.template.findUnique({ where: { id: step.templateId } });
            if (tmpl) body = tmpl.content || '';
          }
          if (t && process.env.TWILIO_FROM_NUMBER) {
            await t.messages.create({ to: e.contact.phone, from: process.env.TWILIO_FROM_NUMBER, body });
          }
        }
      } else if (step.type === 'WAIT') {
        // no-op; delay is already accounted for
      } else if (step.type === 'TAG_ADD' || step.type === 'TAG_REMOVE') {
        const cfg = step.config ? JSON.parse(step.config) : {};
        if (cfg.tagId) {
          if (step.type === 'TAG_ADD') {
            await prisma.contactTag.upsert({
              where: { contactId_tagId: { contactId: e.contactId, tagId: cfg.tagId } },
              create: { contactId: e.contactId, tagId: cfg.tagId },
              update: {},
            }).catch(() => {});
          } else {
            await prisma.contactTag.deleteMany({ where: { contactId: e.contactId, tagId: cfg.tagId } });
          }
        }
      } else if (step.type === 'CONDITION') {
        const cfg = step.config ? JSON.parse(step.config) : {};
        // very simple: { field: 'status', op: 'eq', value: 'ACTIVE' }
        const v = (e.contact as any)[cfg.field];
        const passed = cfg.op === 'eq' ? v === cfg.value : cfg.op === 'neq' ? v !== cfg.value : true;
        if (!passed) {
          await prisma.automationEnrollment.update({ where: { id: e.id }, data: { status: 'CANCELLED', completedAt: new Date() } });
          continue;
        }
      } else if (step.type === 'WEBHOOK') {
        const cfg = step.config ? JSON.parse(step.config) : {};
        if (cfg.url) {
          await fetch(cfg.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: e.contact, event: 'automation_step', stepId: step.id }),
          }).catch(() => {});
        }
      }
    } catch (err) {
      success = false;
      console.error('[automationEngine] step failed:', step.id, err);
    }

    await prisma.enrollmentStep.create({
      data: {
        enrollmentId: e.id,
        stepId: step.id,
        status: success ? 'EXECUTED' : 'FAILED',
        scheduledAt,
        executedAt: new Date(),
      },
    });
    await prisma.automationEnrollment.update({
      where: { id: e.id },
      data: { currentStep: e.currentStep + 1 },
    });
    stepsExecuted++;
  }

  return { enrollmentsProcessed: enrollments.length, stepsExecuted };
}
