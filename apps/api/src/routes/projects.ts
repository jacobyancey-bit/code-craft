import { FastifyPluginAsync } from 'fastify';
import {
  calculateProjectEstimate,
  ScopingInputSchema,
} from '../services/scopingEngine.js';

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
};

