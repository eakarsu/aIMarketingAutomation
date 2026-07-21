/**
 * automationEngine — walks AutomationEnrollments through their AutomationSteps.
 *
 * Each tick:
 *   1. Fetch all ACTIVE enrollments for ACTIVE automations.
 *   2. For each enrollment, find the next step (by `currentStep` index).
 *   3. Compute the scheduled time as (lastStepExecutedAt OR enrolledAt) + step.delayMinutes.
 *   4. If the scheduled time has arrived, execute the step:
 *        EMAIL/SMS → rejected here; governed campaign delivery owns outreach
 *        WAIT   → just advance
 *        TAG_ADD/TAG_REMOVE → mutate ContactTag
 *        CONDITION → JSON config { field, op, value }; advance if true, skip if false
 *        WEBHOOK → POST step.config to URL
 *   5. Increment currentStep. When past last step, mark enrollment COMPLETED.
 *
 * The engine is idempotent enough for short cron intervals because it advances by step index.
 */

import { PrismaClient, EnrollmentStatus, StepStatus } from '@prisma/client';

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
        throw new Error('Direct automation email is disabled; enqueue an approved campaign through the governed delivery queue');
      } else if (step.type === 'SMS') {
        throw new Error('Direct automation SMS is disabled; enqueue an approved campaign through the governed delivery queue');
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
          const url = new URL(cfg.url);
          if (url.protocol !== 'https:') throw new Error('automation webhooks must use HTTPS');
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: e.contact, event: 'automation_step', stepId: step.id }),
            signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) throw new Error(`automation webhook returned HTTP ${response.status}`);
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
    if (success) {
      await prisma.automationEnrollment.update({
        where: { id: e.id },
        data: { currentStep: e.currentStep + 1 },
      });
      stepsExecuted++;
    }
  }

  return { enrollmentsProcessed: enrollments.length, stepsExecuted };
}
