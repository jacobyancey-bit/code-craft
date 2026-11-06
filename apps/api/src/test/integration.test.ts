import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@codecraft/database';
import { projectRoutes } from '../routes/projects.js';
import { paymentRoutes, webhookRoutes } from '../routes/payments.js';
import { techRoutes } from '../routes/tech.js';

describe('Full Monorepo End-to-End Lifecycle (Steps 3 through 7)', () => {
  let app: FastifyInstance;
  let testClientId: string;
  let testProjectId: string;
  let techUser1Id: string;
  let techUser2Id: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(cors);
    await app.register(projectRoutes, { prefix: '/api/projects' });
    await app.register(paymentRoutes, { prefix: '/api/payments' });
    await app.register(webhookRoutes, { prefix: '/api/webhooks' });
    await app.register(techRoutes, { prefix: '/api/tech' });
    await app.ready();

    // Create test technicians with category unlocks
    const tech1 = await prisma.user.create({
      data: {
        email: `tech1_${Date.now()}@codecraft.dev`,
        name: 'Senior Tech 1',
        role: 'TECH',
        activeJobs: 0,
        techUnlocks: {
          create: {
            skill: 'Frontend',
            category: 'WEBSITE_CREATION',
          },
        },
      },
    });
    techUser1Id = tech1.id;

    const tech2 = await prisma.user.create({
      data: {
        email: `tech2_${Date.now()}@codecraft.dev`,
        name: 'Senior Tech 2',
        role: 'TECH',
        activeJobs: 0,
        techUnlocks: {
          create: {
            skill: 'Frontend',
            category: 'WEBSITE_CREATION',
          },
        },
      },
    });
    techUser2Id = tech2.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    if (testProjectId) {
      await prisma.timeLog.deleteMany({ where: { projectId: testProjectId } });
      await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    }
    if (techUser1Id) {
      await prisma.techUnlock.deleteMany({ where: { userId: techUser1Id } });
      await prisma.user.delete({ where: { id: techUser1Id } }).catch(() => {});
    }
    if (techUser2Id) {
      await prisma.techUnlock.deleteMany({ where: { userId: techUser2Id } });
      await prisma.user.delete({ where: { id: techUser2Id } }).catch(() => {});
    }
    if (testClientId) {
      await prisma.user.delete({ where: { id: testClientId } }).catch(() => {});
    }
    await app.close();
  });

  // Step 4 Verification: Project Creation & Draft State
  it('Step 4: creates a project with status PENDING_DEPOSIT and frozen rules snapshot', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: {
        client: {
          email: `client_${Date.now()}@acme.org`,
          name: 'Acme Corp',
        },
        title: 'Full Website Redesign',
        category: 'WEBSITE_CREATION',
        hasBrandAssets: true,
        hasWrittenContent: true,
        hasDomainAndDns: true,
        designPreference: 'component_library',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    expect(body.project.status).toBe('PENDING_DEPOSIT');
    expect(body.project.minEstimatedHours).toBe(16);
    expect(body.project.maxEstimatedHours).toBe(28);
    expect(body.project.hardCapHours).toBe(33); // 28 + 5
    expect(body.initialDepositCents).toBe(64000); // 16h * $80 * 0.5
    expect(body.project.appliedRulesSnapshot.category).toBe('WEBSITE_CREATION');

    testProjectId = body.project.id;
    testClientId = body.project.clientId;
  });

  // Step 5 Verification: Stripe Deposit & Webhook Transition
  it('Step 5: creates deposit session and webhook transitions project to OPEN_FOR_CLAIM with funded hours', async () => {
    // 1. Create deposit session
    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/payments/create-deposit-session',
      payload: { projectId: testProjectId },
    });

    expect(sessionRes.statusCode).toBe(200);
    const sessionBody = JSON.parse(sessionRes.body);
    expect(sessionBody.depositAmountCents).toBe(64000);
    expect(sessionBody.depositHours).toBe(8);

    // 2. Trigger simulated Stripe webhook
    const webhookRes = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: sessionBody.paymentIntentId,
            customer: 'cus_test_e2e_123',
            payment_method: 'pm_card_test_e2e',
            metadata: { projectId: testProjectId },
          },
        },
      },
    });

    expect(webhookRes.statusCode).toBe(200);
    const webhookBody = JSON.parse(webhookRes.body);
    expect(webhookBody.status).toBe('OPEN_FOR_CLAIM');
    expect(webhookBody.fundedHours).toBe(8);

    // Verify in DB
    const dbProject = await prisma.project.findUnique({ where: { id: testProjectId } });
    expect(dbProject?.status).toBe('OPEN_FOR_CLAIM');
    expect(dbProject?.fundedHours).toBe(8);
  });

  // Step 6 Verification: FCFS Claim Engine with 15-Minute Hold & Concurrency
  it('Step 6: available jobs query, concurrent race condition locking, and confirm acceptance', async () => {
    // 1. Available jobs query
    const availableRes = await app.inject({
      method: 'GET',
      url: `/api/tech/jobs/available?techId=${techUser1Id}`,
    });

    expect(availableRes.statusCode).toBe(200);
    const availableBody = JSON.parse(availableRes.body);
    expect(availableBody.availableProjects.some((p: any) => p.id === testProjectId)).toBe(true);

    // 2. Concurrent race condition test: Tech 1 and Tech 2 hit claim simultaneously
    const [claim1Res, claim2Res] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/api/tech/jobs/${testProjectId}/claim`,
        payload: { techId: techUser1Id },
      }),
      app.inject({
        method: 'POST',
        url: `/api/tech/jobs/${testProjectId}/claim`,
        payload: { techId: techUser2Id },
      }),
    ]);

    // Exactly one should succeed (200), the other should fail with 409 Conflict
    const statuses = [claim1Res.statusCode, claim2Res.statusCode];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const winnerRes = claim1Res.statusCode === 200 ? claim1Res : claim2Res;
    const winnerBody = JSON.parse(winnerRes.body);
    expect(winnerBody.status).toBe('CLAIMED');
    expect(winnerBody.claimedById).toBeDefined();

    const winnerTechId = winnerBody.claimedById;

    // 3. Confirm Acceptance
    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/tech/jobs/${testProjectId}/confirm`,
      payload: { techId: winnerTechId },
    });

    expect(confirmRes.statusCode).toBe(200);
    const confirmBody = JSON.parse(confirmRes.body);
    expect(confirmBody.status).toBe('IN_PROGRESS');
    expect(confirmBody.isClaimConfirmed).toBe(true);

    // Verify tech activeJobs was incremented to 1
    const techUser = await prisma.user.findUnique({ where: { id: winnerTechId } });
    expect(techUser?.activeJobs).toBe(1);
  });

  // Step 7 Verification: Time Logging, Balance Decrement, and Auto-Replenish Trigger
  it('Step 7: logs time, decrements remaining balance, and fires auto-replenish when balance <= 5h', async () => {
    const project = await prisma.project.findUnique({ where: { id: testProjectId } });
    const assignedTechId = project!.claimedById!;

    // Log 3.5 hours
    // Initial funded was 8h. 8h - 3.5h = 4.5h remaining.
    // 4.5h <= 5.0h replenish threshold -> Auto-replenish adds 20h block!
    const logRes = await app.inject({
      method: 'POST',
      url: `/api/tech/projects/${testProjectId}/log-time`,
      payload: {
        techId: assignedTechId,
        hoursLogged: 3.5,
        notes: 'Implemented homepage hero section and header layout',
        gitCommitHash: 'a1b2c3d4e5f6789012345678901234567890abcd',
      },
    });

    expect(logRes.statusCode).toBe(201);
    const logBody = JSON.parse(logRes.body);

    expect(logBody.balance.consumedHours).toBe(3.5);
    expect(logBody.balance.autoReplenishTriggered).toBe(true);
    // 8h initial + 20h auto-reload = 28h funded
    expect(logBody.balance.fundedHours).toBe(28);
    // 28h funded - 3.5h consumed = 24.5h remaining
    expect(logBody.balance.remainingFundedHours).toBe(24.5);

    // Verify TimeLog record in database
    const timeLog = await prisma.timeLog.findFirst({
      where: { projectId: testProjectId },
    });
    expect(timeLog).toBeDefined();
    expect(timeLog?.hours).toBe(3.5);
    expect(timeLog?.isAutoApproved).toBe(false);
    expect(timeLog?.gitCommitHash).toBe('a1b2c3d4e5f6789012345678901234567890abcd');
  });
});

