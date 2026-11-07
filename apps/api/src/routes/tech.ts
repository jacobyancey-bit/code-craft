import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@codecraft/database';
import { z } from 'zod';
import { scheduleClaimExpiration } from '../services/claimQueue.js';

const TechIdQuerySchema = z.object({
  techId: z.string().uuid('Valid techId UUID is required'),
});

const ClaimJobBodySchema = z.object({
  techId: z.string().uuid('Valid techId UUID is required').optional(),
});

const ProjectIdParamSchema = z.object({
  projectId: z.string().uuid('Valid projectId UUID is required'),
});

const LogTimeBodySchema = z.object({
  techId: z.string().uuid('Valid techId UUID is required').optional(),
  hoursLogged: z
    .number()
    .positive('Hours must be greater than 0')
    .max(8.0, 'Hours logged cannot exceed 8.0 in a single entry'),
  notes: z.string().optional(),
  gitCommitHash: z.string().optional(),
});

export const techRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tech/jobs/available?techId=...
  fastify.get('/jobs/available', async (request, reply) => {
    const parseResult = TechIdQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid or missing techId query parameter',
        issues: parseResult.error.format(),
      });
    }

    const { techId } = parseResult.data;

    // Verify technician existence and role
    const tech = await prisma.user.findUnique({
      where: { id: techId },
      include: { techUnlocks: true },
    });

    if (!tech || tech.role !== 'TECH') {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Technician account not found',
      });
    }

    // Check concurrency cap (< 2 active jobs)
    if (tech.activeJobs >= 2) {
      return reply.status(200).send({
        availableProjects: [],
        message: 'Concurrency limit reached: You currently have 2 active jobs.',
      });
    }

    const unlockedCategories = tech.techUnlocks.map((u) => u.category);

    if (unlockedCategories.length === 0) {
      return reply.status(200).send({
        availableProjects: [],
        message: 'No unlocked skill categories found for this technician.',
      });
    }

    const now = new Date();

    const availableProjects = await prisma.project.findMany({
      where: {
        category: { in: unlockedCategories },
        OR: [
          { status: 'OPEN_FOR_CLAIM' },
          {
            status: 'CLAIMED',
            isClaimConfirmed: false,
            claimHoldExpiresAt: { lte: now },
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({
      techId,
      activeJobs: tech.activeJobs,
      unlockedCategories,
      availableCount: availableProjects.length,
      availableProjects,
    });
  });

  // POST /api/tech/jobs/:projectId/claim
  fastify.post('/jobs/:projectId/claim', async (request, reply) => {
    const paramResult = ProjectIdParamSchema.safeParse(request.params);
    const bodyResult = ClaimJobBodySchema.safeParse(request.body);

    if (!paramResult.success || !bodyResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid projectId param or techId body',
      });
    }

    const { projectId } = paramResult.data;
    const userPayload = (request as any).user;
    const techId = bodyResult.data.techId || userPayload?.id;

    if (!techId) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'techId must be provided in request body or via Authorization header',
      });
    }

    try {
      // Execute within interactive transaction using PostgreSQL row locking (SELECT ... FOR UPDATE)
      const result = await prisma.$transaction(async (tx) => {
        // 1. Lock the project row pessimistically
        const projects = await tx.$queryRaw<any[]>`
          SELECT * FROM projects
          WHERE id = ${projectId}
          FOR UPDATE
        `;

        if (!projects || projects.length === 0) {
          throw new Error('PROJECT_NOT_FOUND');
        }

        const project = projects[0];
        const now = new Date();

        const isHoldActive =
          project.claimedById &&
          project.claimHoldExpiresAt &&
          new Date(project.claimHoldExpiresAt) > now;

        if (project.status !== 'OPEN_FOR_CLAIM' && !(project.status === 'CLAIMED' && !isHoldActive)) {
          throw new Error('JOB_NOT_AVAILABLE');
        }

        if (isHoldActive && project.claimedById !== techId) {
          throw new Error('JOB_HELD_BY_ANOTHER_TECH');
        }

        // Verify Tech exists, role is TECH, and activeJobs < 2
        const tech = await tx.user.findUnique({
          where: { id: techId },
          include: { techUnlocks: true },
        });

        if (!tech || tech.role !== 'TECH') {
          throw new Error('INVALID_TECHNICIAN');
        }

        if (tech.activeJobs >= 2) {
          throw new Error('CONCURRENCY_LIMIT_REACHED');
        }

        const hasSkill = tech.techUnlocks.some((u) => u.category === project.category);
        if (!hasSkill) {
          throw new Error('MISSING_CATEGORY_UNLOCK');
        }

        // Set 15-minute hold
        const holdStartedAt = new Date();
        const holdExpiresAt = new Date(holdStartedAt.getTime() + 15 * 60 * 1000);

        const updatedProject = await tx.project.update({
          where: { id: projectId },
          data: {
            status: 'CLAIMED',
            claimedById: techId,
            claimHoldStartedAt: holdStartedAt,
            claimHoldExpiresAt: holdExpiresAt,
            isClaimConfirmed: false,
          },
        });

        return { updatedProject, holdExpiresAt };
      });

      // Schedule Redis/BullMQ delayed expiration job
      await scheduleClaimExpiration(projectId, techId, 15 * 60 * 1000);

      return reply.status(200).send({
        success: true,
        message: '15-minute claim hold acquired. Please confirm acceptance.',
        projectId: result.updatedProject.id,
        status: result.updatedProject.status,
        claimedById: result.updatedProject.claimedById,
        claimHoldExpiresAt: result.holdExpiresAt,
      });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
      }
      if (err.message === 'JOB_HELD_BY_ANOTHER_TECH' || err.message === 'JOB_NOT_AVAILABLE') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Job is not available or is currently held by another technician.',
        });
      }
      if (err.message === 'CONCURRENCY_LIMIT_REACHED') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Technician has reached the maximum of 2 active jobs.',
        });
      }
      if (err.message === 'MISSING_CATEGORY_UNLOCK') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Technician is not certified in this project category.',
        });
      }
      request.log.error(err, 'Failed to claim job');
      return reply.status(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // POST /api/tech/jobs/:projectId/confirm
  fastify.post('/jobs/:projectId/confirm', async (request, reply) => {
    const paramResult = ProjectIdParamSchema.safeParse(request.params);
    const bodyResult = ClaimJobBodySchema.safeParse(request.body);

    if (!paramResult.success || !bodyResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid projectId param or techId body',
      });
    }

    const { projectId } = paramResult.data;
    const userPayload = (request as any).user;
    const techId = bodyResult.data.techId || userPayload?.id;

    if (!techId) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'techId must be provided in request body or via Authorization header',
      });
    }

    try {
      const confirmedProject = await prisma.$transaction(async (tx) => {
        const projects = await tx.$queryRaw<any[]>`
          SELECT * FROM projects
          WHERE id = ${projectId}
          FOR UPDATE
        `;

        if (!projects || projects.length === 0) {
          throw new Error('PROJECT_NOT_FOUND');
        }

        const project = projects[0];
        const now = new Date();

        if (project.claimedById !== techId) {
          throw new Error('NOT_CLAIMED_BY_THIS_TECH');
        }

        if (project.claimHoldExpiresAt && new Date(project.claimHoldExpiresAt) <= now) {
          throw new Error('CLAIM_HOLD_EXPIRED');
        }

        if (project.status === 'IN_PROGRESS' && project.isClaimConfirmed) {
          return project;
        }

        // Lock permanently: status IN_PROGRESS, isClaimConfirmed true
        const updated = await tx.project.update({
          where: { id: projectId },
          data: {
            status: 'IN_PROGRESS',
            isClaimConfirmed: true,
          },
        });

        // Increment tech's activeJobs count
        await tx.user.update({
          where: { id: techId },
          data: {
            activeJobs: { increment: 1 },
          },
        });

        return updated;
      });

      return reply.status(200).send({
        success: true,
        message: 'Job confirmed and moved to IN_PROGRESS',
        projectId: confirmedProject.id,
        status: confirmedProject.status,
        isClaimConfirmed: confirmedProject.isClaimConfirmed,
      });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
      }
      if (err.message === 'CLAIM_HOLD_EXPIRED') {
        return reply.status(410).send({
          error: 'Gone',
          message: 'The 15-minute claim hold has expired. The job has been released.',
        });
      }
      if (err.message === 'NOT_CLAIMED_BY_THIS_TECH') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'This project is not tentatively held by you.',
        });
      }
      request.log.error(err, 'Failed to confirm job acceptance');
      return reply.status(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // POST /api/tech/projects/:projectId/log-time
  fastify.post('/projects/:projectId/log-time', async (request, reply) => {
    const paramResult = ProjectIdParamSchema.safeParse(request.params);
    const bodyResult = LogTimeBodySchema.safeParse(request.body);

    if (!paramResult.success || !bodyResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid projectId param or log-time payload',
        issues: bodyResult.success ? undefined : bodyResult.error.format(),
      });
    }

    const { projectId } = paramResult.data;
    const userPayload = (request as any).user;
    const techId = bodyResult.data.techId || userPayload?.id;

    if (!techId) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'techId must be provided in request body or via Authorization header',
      });
    }

    const { hoursLogged, notes, gitCommitHash } = bodyResult.data;

    // Optional git commit SHA sanity check (7 to 40 hex characters)
    if (gitCommitHash && !/^[0-9a-fA-F]{7,40}$/.test(gitCommitHash)) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid git commit hash format. Must be 7-40 hex characters.',
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Pessimistic lock on project
        const projects = await tx.$queryRaw<any[]>`
          SELECT * FROM projects
          WHERE id = ${projectId}
          FOR UPDATE
        `;

        if (!projects || projects.length === 0) {
          throw new Error('PROJECT_NOT_FOUND');
        }

        const project = projects[0];

        if (project.status !== 'IN_PROGRESS') {
          throw new Error('PROJECT_NOT_IN_PROGRESS');
        }

        if (project.claimedById !== techId) {
          throw new Error('TECH_NOT_ASSIGNED');
        }

        // Insert TimeLog record with isAutoApproved: false
        const timeLog = await tx.timeLog.create({
          data: {
            projectId,
            techId,
            hours: hoursLogged,
            notes: notes ?? null,
            gitCommitHash: gitCommitHash ?? null,
            isAutoApproved: false,
            autoApprovalTriggered: false,
          },
        });

        // Deduct hoursLogged from remaining funded balance (consumedHours += hoursLogged)
        const updatedConsumed = project.consumedHours + hoursLogged;
        let updatedFunded = project.fundedHours;
        let autoReplenishTriggered = false;

        const remainingBalance = updatedFunded - updatedConsumed;
        const replenishThreshold = 5.0; // 5 hours

        // Auto-Replenish Check:
        // If (fundedHours - consumedHours) <= 5.0 AND consumedHours < hardCapHours
        if (remainingBalance <= replenishThreshold && updatedConsumed < project.hardCapHours) {
          const reloadBlockHours = 20.0;
          const chargeAmountCents = reloadBlockHours * project.hourlyRateCents;

          autoReplenishTriggered = true;
          updatedFunded += reloadBlockHours;

          request.log.info(
            `[Auto-Replenish Triggered] Project ${projectId}: remaining balance ${remainingBalance}h <= 5h. Off-session Stripe charge for 20h block ($${chargeAmountCents / 100}).`
          );
        }

        // Update project consumed and funded hours
        const updatedProject = await tx.project.update({
          where: { id: projectId },
          data: {
            consumedHours: updatedConsumed,
            fundedHours: updatedFunded,
          },
        });

        return {
          timeLog,
          consumedHours: updatedProject.consumedHours,
          fundedHours: updatedProject.fundedHours,
          remainingFundedHours: updatedProject.fundedHours - updatedProject.consumedHours,
          hardCapHours: updatedProject.hardCapHours,
          autoReplenishTriggered,
        };
      });

      return reply.status(201).send({
        success: true,
        message: 'Time logged successfully',
        timeLog: result.timeLog,
        balance: {
          hoursLogged,
          consumedHours: result.consumedHours,
          fundedHours: result.fundedHours,
          remainingFundedHours: result.remainingFundedHours,
          hardCapHours: result.hardCapHours,
          autoReplenishTriggered: result.autoReplenishTriggered,
        },
      });
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        return reply.status(404).send({ error: 'Not Found', message: 'Project not found' });
      }
      if (err.message === 'PROJECT_NOT_IN_PROGRESS') {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Time can only be logged for projects with status IN_PROGRESS',
        });
      }
      if (err.message === 'TECH_NOT_ASSIGNED') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You are not the technician assigned to this project',
        });
      }
      request.log.error(err, 'Failed to log time');
      return reply.status(500).send({ error: 'Internal Error', message: err.message });
    }
  });
};
