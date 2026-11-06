import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@codecraft/database';
import { z } from 'zod';
import {
  calculateProjectEstimate,
  ProjectCategoryEnum,
  ScopingInputSchema,
} from '../services/scopingEngine.js';

export const CreateProjectSchema = z.object({
  client: z.object({
    email: z.string().email('Valid client email is required'),
    name: z.string().optional(),
  }),
  title: z.string().min(1, 'Project title is required'),
  description: z.string().optional(),
  category: ProjectCategoryEnum,
  hasBrandAssets: z.boolean(),
  hasWrittenContent: z.boolean(),
  hasDomainAndDns: z.boolean(),
  designPreference: z.enum(['component_library', 'bespoke_scratch']),
  hourlyRateCents: z.number().int().positive().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/projects/estimate
  fastify.post('/estimate', async (request, reply) => {
    const parseResult = ScopingInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid project scoping payload',
        issues: parseResult.error.format(),
      });
    }

    const estimate = calculateProjectEstimate(parseResult.data);
    return reply.status(200).send(estimate);
  });

  // POST /api/projects
  fastify.post('/', async (request, reply) => {
    const parseResult = CreateProjectSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Missing or invalid project creation fields',
        issues: parseResult.error.format(),
      });
    }

    const { client, title, description, category, hasBrandAssets, hasWrittenContent, hasDomainAndDns, designPreference, hourlyRateCents } = parseResult.data;

    // Run deterministic scoping engine
    const scoping = calculateProjectEstimate({
      category,
      hasBrandAssets,
      hasWrittenContent,
      hasDomainAndDns,
      designPreference,
      hourlyRateCents: hourlyRateCents ?? 8000,
    });

    const [minHours, maxHours] = scoping.estimatedHourRange;
    const hardCapHours = maxHours + 5;

    try {
      // Find or create Client User
      const clientUser = await prisma.user.upsert({
        where: { email: client.email.toLowerCase().trim() },
        update: {
          name: client.name ?? undefined,
        },
        create: {
          email: client.email.toLowerCase().trim(),
          name: client.name ?? null,
          role: 'CLIENT',
        },
      });

      // Insert Project record with status PENDING_DEPOSIT
      const project = await prisma.project.create({
        data: {
          title,
          description: description ?? null,
          category,
          status: 'PENDING_DEPOSIT',
          appliedRulesSnapshot: scoping.appliedRulesSnapshot as any,
          minEstimatedHours: minHours,
          maxEstimatedHours: maxHours,
          hourlyRateCents: scoping.hourlyRateCents,
          hardCapHours,
          clientId: clientUser.id,
        },
        include: {
          client: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return reply.status(201).send({
        project,
        initialDepositCents: scoping.initialDepositCents,
        totalEstimatedCostRangeCents: scoping.totalEstimatedCostRangeCents,
      });
    } catch (error) {
      request.log.error(error, 'Failed to create project');
      return reply.status(500).send({
        error: 'Database Error',
        message: 'Failed to create project record',
      });
    }
  });
};
